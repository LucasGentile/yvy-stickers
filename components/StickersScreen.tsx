'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { setInputMode } from '@/actions/setInputMode'
import { saveStickers } from '@/actions/saveStickers'
import { getUserData } from '@/actions/getUserData'
import { parseStickerFile } from '@/lib/parser'
import { ALL_STICKER_IDS } from '@/lib/stickers'
import StickerGrid from './StickerGrid'
import CountrySearch from './CountrySearch'

type Mode = 'have' | 'need'
type Step = 'mode' | 'input' | 'pending'

export default function StickersScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<Mode>('have')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fileOpen, setFileOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; prev: Set<string> } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<Set<string>>(new Set())

  function showToast(message: string, prev: Set<string>) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, prev })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  function handleUndo() {
    if (!toast) return
    setSelected(new Set(toast.prev))
    setToast(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }

  useEffect(() => {
    const id = localStorage.getItem('userId')
    setUserId(id)
    if (!id) {
      setLoading(false)
      return
    }
    getUserData(id).then((data) => {
      if (data) {
        if (!data.approved) {
          setStep('pending' as Step)
          setLoading(false)
          return
        }
        setMode(data.inputMode)
        const loaded = new Set<string>(data.stickerIds)
        setSelected(loaded)
        lastSaved.current = new Set(loaded)
        if (data.stickerIds.length > 0 || data.inputMode) {
          setStep('input')
        }
      }
      setLoading(false)
    })
  }, [])

  async function handleModeSelect(m: Mode) {
    if (!userId) return
    await setInputMode(userId, m)
    setMode(m)
    setStep('input')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const result = parseStickerFile(content)
      if (!result.valid) {
        setParseErrors(result.errors)
        return
      }
      setParseErrors([])
      setSelected(new Set(result.stickers))
      setSaveMsg(
        `${result.stickers.length} figurinhas carregadas. Clique em Salvar para confirmar.`
      )
    }
    reader.readAsText(file)
  }

  const handleSave = useCallback(async () => {
    if (!userId) return

    const removed = [...lastSaved.current].filter((id) => !selected.has(id))
    if (removed.length > 0) {
      const ok = confirm(
        `Você está removendo ${removed.length} figurinha${removed.length !== 1 ? 's' : ''} que tinha marcada${removed.length !== 1 ? 's' : ''} (${removed.slice(0, 5).join(', ')}${removed.length > 5 ? ` e mais ${removed.length - 5}` : ''}). Confirmar?`
      )
      if (!ok) return
    }

    setSaving(true)
    setSaveMsg(null)
    const ids = Array.from(selected)
    const result = await saveStickers(userId, ids)
    setSaving(false)
    if (result.success) {
      lastSaved.current = new Set(selected)
      setSaveMsg(`✓ ${result.count} figurinhas salvas com sucesso!`)
    } else {
      setSaveMsg(`Erro: ${result.error}`)
    }
  }, [userId, selected])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>Você precisa se identificar primeiro.</p>
        <a href="/" className="text-yvy-accent underline mt-2 inline-block">
          Ir para o cadastro
        </a>
      </div>
    )
  }

  if (step === 'pending') {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">⏳</div>
          <h2 className="text-lg font-bold text-yvy-dark">Cadastro em análise</h2>
          <p className="text-sm text-yvy-muted leading-relaxed">
            Seu cadastro foi recebido e está aguardando aprovação do administrador. Assim que
            liberado, você poderá acessar o app normalmente.
          </p>
          <p className="text-xs text-yvy-muted">
            Se precisar, entre em contato pelo grupo do WhatsApp do condomínio.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'mode') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-yvy-dark text-center mb-2">
            Como você quer informar suas figurinhas?
          </h2>
          <p className="text-sm text-yvy-muted text-center mb-6">
            Escolha um modo. Ele não pode ser alterado depois sem apagar tudo.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => handleModeSelect('have')}
              className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-4 px-4 rounded-xl text-left transition-colors"
            >
              <div className="text-base">
                Vou informar as figurinhas que <strong>TENHO</strong>
              </div>
              <div className="text-xs font-normal opacity-80 mt-1">
                O sistema calcula as que faltam automaticamente
              </div>
            </button>
            <button
              onClick={() => handleModeSelect('need')}
              className="w-full bg-yvy-surface hover:bg-yvy-bg border-2 border-yvy-dark text-yvy-dark font-semibold py-4 px-4 rounded-xl text-left transition-colors"
            >
              <div className="text-base">
                Vou informar as figurinhas que <strong>PRECISO</strong>
              </div>
              <div className="text-xs font-normal opacity-60 mt-1">
                O sistema assume que você tem todas as outras
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
      <div className="bg-yvy-surface/90 backdrop-blur rounded-xl border border-yvy-border px-4 py-2.5 shadow-md">
        <h2 className="text-lg font-bold text-yvy-dark">Minhas Figurinhas</h2>
      </div>

      {/* Grid */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4">
        <div className="mb-3">
          <CountrySearch />
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-yvy-text">Selecione na grade</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                showToast('Todas as figurinhas marcadas', new Set(selected))
                setSelected(new Set(ALL_STICKER_IDS))
              }}
              className="text-xs text-yvy-accent underline"
            >
              Todas
            </button>
            <button
              onClick={() => {
                showToast('Seleção limpa', new Set(selected))
                setSelected(new Set())
              }}
              className="text-xs text-yvy-muted underline"
            >
              Limpar
            </button>
          </div>
        </div>
        <StickerGrid
          selected={selected}
          onChange={setSelected}
          onBulkChange={(next, message) => {
            showToast(message, new Set(selected))
            setSelected(next)
          }}
        />
      </div>

      {/* File upload — collapsible */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => setFileOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-yvy-text hover:bg-yvy-bg transition-colors"
        >
          <span>Carregar por arquivo (.txt)</span>
          <span className="text-yvy-muted text-xs">{fileOpen ? '▲ fechar' : '▼ expandir'}</span>
        </button>
        {fileOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-yvy-border">
            <p className="text-xs text-yvy-muted pt-3">
              Formato: códigos separados por ponto-e-vírgula. Ex:{' '}
              <code>MEX1;BRA5;FWC00;CC14</code>
            </p>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-yvy-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-yvy-bg file:text-yvy-dark file:font-medium hover:file:bg-yvy-border"
            />
            {parseErrors.length > 0 && (
              <div className="text-xs text-red-600 space-y-0.5">
                {parseErrors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-yvy-border">
              <p className="text-xs text-yvy-muted mb-2">
                Escolheu o modo errado? Você pode redefinir, mas isso apagará todas as figurinhas salvas.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!confirm('Isso vai apagar toda a sua seleção e redefinir o modo. Tem certeza?')) return
                  setSelected(new Set())
                  setSaveMsg(null)
                  setStep('mode')
                }}
                className="text-xs text-red-600 underline"
              >
                Trocar modo de preenchimento
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer: nav + save */}
      {(() => {
        const added = [...selected].filter((id) => !lastSaved.current.has(id)).length
        const removed = [...lastSaved.current].filter((id) => !selected.has(id)).length
        const hasChanges = added > 0 || removed > 0

        let label: string
        if (saving) {
          label = 'Salvando...'
        } else if (!hasChanges) {
          label = lastSaved.current.size === 0 && selected.size === 0
            ? 'Nenhuma figurinha selecionada'
            : 'Tudo salvo'
        } else if (added > 0 && removed === 0) {
          label = `Salvar +${added} figurinha${added !== 1 ? 's' : ''}`
        } else if (removed > 0 && added === 0) {
          label = `Salvar −${removed} figurinha${removed !== 1 ? 's' : ''}`
        } else {
          label = `Salvar +${added} / −${removed} figurinha${added + removed !== 1 ? 's' : ''}`
        }

        return (
          <div className="sticky bottom-4 space-y-2">
            {selected.size > 0 && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => router.push('/matches')}
                  className="flex-1 bg-yvy-surface border border-yvy-dark text-yvy-dark font-semibold py-2 rounded-xl text-xs transition-colors hover:bg-yvy-dark hover:text-white shadow-md"
                >
                  Trocas
                </button>
                <button
                  onClick={() => router.push('/duplicates')}
                  className="flex-1 bg-yvy-surface border border-yvy-border text-yvy-muted font-medium py-2 rounded-xl text-xs transition-colors hover:bg-yvy-border shadow-md"
                >
                  Repetidas
                </button>
                <button
                  onClick={() => router.push('/missing')}
                  className="flex-1 bg-yvy-surface border border-yvy-border text-yvy-muted font-medium py-2 rounded-xl text-xs transition-colors hover:bg-yvy-border shadow-md"
                >
                  Faltam
                </button>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="w-full bg-yvy-dark hover:bg-yvy-dark-hover disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base transition-colors shadow-lg"
            >
              {label}
            </button>
            {saveMsg && <p className="text-center text-sm mt-2 text-yvy-muted">{saveMsg}</p>}
          </div>
        )
      })()}

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
          <div className="bg-yvy-dark text-white rounded-xl px-4 py-3 flex items-center gap-4 shadow-lg w-full max-w-sm">
            <p className="text-sm flex-1">{toast.message}</p>
            <button onClick={handleUndo} className="text-yvy-accent font-semibold text-sm whitespace-nowrap">
              Desfazer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
