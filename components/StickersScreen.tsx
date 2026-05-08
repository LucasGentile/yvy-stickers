'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { setInputMode } from '@/actions/setInputMode'
import { saveStickers } from '@/actions/saveStickers'
import { importStickerFile } from '@/actions/importStickerFile'
import { getUserData } from '@/actions/getUserData'
import { parseStickerFile } from '@/lib/parser'
import { ALL_STICKER_IDS } from '@/lib/stickers'
import StickerGrid from './StickerGrid'
import CountrySearch from './CountrySearch'

type Mode = 'have' | 'need'
type Step = 'mode' | 'input' | 'pending'

export default function StickersScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('mode')
  const [, setMode] = useState<Mode>('have')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fileOpen, setFileOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; prev: Set<string> } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<Set<string>>(new Set())

  // Compute unsaved diff at component scope so effects can read it
  const addedCount = [...selected].filter((id) => !lastSaved.current.has(id)).length
  const removedCount = [...lastSaved.current].filter((id) => !selected.has(id)).length
  const hasChanges = addedCount > 0 || removedCount > 0

  // Warn before tab close / refresh when unsaved
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

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
    if (!file || !userId) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const content = ev.target?.result as string
      const parsed = parseStickerFile(content)
      if (!parsed.valid) {
        setParseErrors(parsed.errors)
        return
      }
      setParseErrors([])
      setImporting(true)
      const result = await importStickerFile(userId, parsed.stickers, parsed.counts)
      setImporting(false)
      if (!result.success) {
        setSaveMsg(`Erro na importação: ${result.error}`)
        return
      }
      const loaded = new Set<string>(parsed.stickers)
      setSelected(loaded)
      lastSaved.current = new Set(loaded)
      setStep('input')

      const parts: string[] = [`${result.totalStickers} figurinhas salvas`]
      if (result.newDuplicates > 0)
        parts.push(`${result.newDuplicates} repetidas (${result.totalDuplicateCopies} cópias extras)`)
      const failures = [...result.failedStickers, ...result.failedDuplicates]
      if (failures.length > 0)
        parts.push(`${failures.length} não salvos: ${failures.slice(0, 5).join(', ')}${failures.length > 5 ? ` e mais ${failures.length - 5}` : ''}`)
      setSaveMsg(failures.length > 0 ? `Importado com erros — ${parts.join(' · ')}` : `✓ ${parts.join(' · ')}`)
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
    <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Minhas Figurinhas
        </h2>
        <span className="text-sm font-semibold text-yvy-accent">
          {selected.size}
          <span className="text-yvy-muted font-normal">/{ALL_STICKER_IDS.length}</span>
        </span>
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
              Códigos separados por <code>;</code> ou por linha. Repita um código para marcar como
              repetida (ex: <code>MEX1;MEX1</code> = 1 no álbum + 1 repetida). O álbum e as
              repetidas serão atualizados automaticamente ao carregar.
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
                Escolheu o modo errado? Você pode redefinir, mas isso apagará todas as figurinhas
                salvas.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (
                    !confirm('Isso vai apagar toda a sua seleção e redefinir o modo. Tem certeza?')
                  )
                    return
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

      {/* Sticky footer: save */}
      {(() => {
        let label: string
        if (saving) {
          label = 'Salvando...'
        } else if (!hasChanges) {
          label =
            lastSaved.current.size === 0 && selected.size === 0
              ? 'Nenhuma figurinha selecionada'
              : 'Tudo salvo ✓'
        } else if (addedCount > 0 && removedCount === 0) {
          label = `Salvar +${addedCount} figurinha${addedCount !== 1 ? 's' : ''}`
        } else if (removedCount > 0 && addedCount === 0) {
          label = `Salvar −${removedCount} figurinha${removedCount !== 1 ? 's' : ''}`
        } else {
          label = `Salvar +${addedCount} / −${removedCount} figurinha${addedCount + removedCount !== 1 ? 's' : ''}`
        }

        return (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-yvy-bg/95 backdrop-blur border-t border-yvy-border px-4 pt-3 pb-4">
            <div className="max-w-lg mx-auto">
              {hasChanges && (
                <p className="text-[11px] text-center text-amber-600 font-medium mb-1.5">
                  Alterações não salvas — não feche o app antes de salvar
                </p>
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
          </div>
        )
      })()}

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
          <div className="bg-yvy-dark text-white rounded-xl px-4 py-3 flex items-center gap-4 shadow-lg w-full max-w-sm">
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={handleUndo}
              className="text-yvy-accent font-semibold text-sm whitespace-nowrap"
            >
              Desfazer
            </button>
          </div>
        </div>
      )}

      {/* Importing overlay */}
      {importing && (
        <div className="fixed inset-0 z-[60] bg-yvy-bg/95 backdrop-blur flex flex-col items-center justify-center gap-4 px-8">
          <div className="w-10 h-10 border-4 border-yvy-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-bold text-yvy-dark">Importando álbum...</p>
          <p className="text-sm text-yvy-muted text-center">
            Salvando figurinhas e repetidas. Não feche o app.
          </p>
        </div>
      )}
    </div>
  )
}
