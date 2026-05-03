'use client'

import { useState, useEffect, useCallback } from 'react'
import { setInputMode } from '@/actions/setInputMode'
import { saveStickers } from '@/actions/saveStickers'
import { getUserData } from '@/actions/getUserData'
import { parseStickerFile } from '@/lib/parser'
import StickerGrid from './StickerGrid'

type Mode = 'have' | 'need'
type Step = 'mode' | 'input'

export default function StickersScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<Mode>('have')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    setUserId(id)
    if (!id) {
      setLoading(false)
      return
    }
    getUserData(id).then((data) => {
      if (data) {
        setMode(data.inputMode)
        setSelected(new Set(data.stickerIds))
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
    setSaving(true)
    setSaveMsg(null)
    const ids = Array.from(selected)
    const result = await saveStickers(userId, ids)
    setSaving(false)
    if (result.success) {
      setSaveMsg(`✓ ${result.count} figurinhas salvas com sucesso!`)
    } else {
      setSaveMsg(`Erro: ${result.error}`)
    }
  }, [userId, selected])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Você precisa se identificar primeiro.</p>
        <a href="/" className="text-green-600 underline mt-2 inline-block">
          Ir para o cadastro
        </a>
      </div>
    )
  }

  if (step === 'mode') {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Como você quer informar suas figurinhas?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Escolha um modo. Ele não pode ser alterado depois sem apagar tudo.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => handleModeSelect('have')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-4 rounded-xl text-left transition-colors"
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
              className="w-full bg-white hover:bg-gray-50 border-2 border-green-600 text-green-700 font-semibold py-4 px-4 rounded-xl text-left transition-colors"
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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {mode === 'have' ? 'Figurinhas que TENHO' : 'Figurinhas que PRECISO'}
        </h2>
        <button
          onClick={() => {
            if (!confirm('Isso vai apagar sua seleção atual. Deseja trocar o modo?')) return
            setSelected(new Set())
            setSaveMsg(null)
            setStep('mode')
          }}
          className="text-xs text-gray-400 underline"
        >
          Trocar modo
        </button>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Carregar por arquivo (.txt)</p>
        <p className="text-xs text-gray-400 mb-3">
          Formato: números separados por ponto-e-vírgula. Ex: <code>1;5;23;105</code>
        </p>
        <input
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:font-medium hover:file:bg-green-100"
        />
        {parseErrors.length > 0 && (
          <div className="mt-2 text-xs text-red-600 space-y-0.5">
            {parseErrors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Ou selecione na grade</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set(Array.from({ length: 980 }, (_, i) => i + 1)))}
              className="text-xs text-green-600 underline"
            >
              Todas
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-400 underline"
            >
              Limpar
            </button>
          </div>
        </div>
        <StickerGrid selected={selected} onChange={setSelected} />
      </div>

      {/* Save */}
      <div className="sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-base transition-colors shadow-lg"
        >
          {saving
            ? 'Salvando...'
            : `Salvar ${selected.size} figurinha${selected.size !== 1 ? 's' : ''}`}
        </button>
        {saveMsg && <p className="text-center text-sm mt-2 text-gray-600">{saveMsg}</p>}
        {selected.size > 0 && (
          <div className="text-center mt-3">
            <a href="/matches" className="text-green-600 text-sm underline">
              Ver trocas disponíveis →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
