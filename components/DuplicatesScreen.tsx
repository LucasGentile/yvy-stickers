'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserData } from '@/actions/getUserData'
import { ALL_STICKER_IDS } from '@/lib/stickers'
import { getDuplicates, DuplicateEntry } from '@/actions/getDuplicates'
import { upsertDuplicate } from '@/actions/upsertDuplicate'
import { decrementDuplicate } from '@/actions/decrementDuplicate'
import { removeDuplicate } from '@/actions/removeDuplicate'
import DuplicatePicker from './DuplicatePicker'

export default function DuplicatesScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownedSet, setOwnedSet] = useState<Set<string>>(new Set())
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([])
  const [stickerInput, setStickerInput] = useState('')
  const [countInput, setCountInput] = useState(1)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; onUndo: () => Promise<void> } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    setUserId(id)
    if (!id) {
      setLoading(false)
      return
    }
    Promise.all([getUserData(id), getDuplicates(id)]).then(([userData, dupes]) => {
      if (userData) {
        const marked = new Set(userData.stickerIds)
        const owned =
          userData.inputMode === 'have'
            ? marked
            : new Set(ALL_STICKER_IDS.filter((id) => !marked.has(id)))
        setOwnedSet(owned)
      }
      setDuplicates(dupes)
      setLoading(false)
    })
  }, [])

  const refreshDuplicates = useCallback(async (id: string) => {
    const fresh = await getDuplicates(id)
    setDuplicates(fresh)
  }, [])

  const showToast = useCallback((message: string, onUndo: () => Promise<void>) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, onUndo })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  const handleUndo = useCallback(async () => {
    if (!toast || !userId) return
    await toast.onUndo()
    setToast(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    await refreshDuplicates(userId)
  }, [toast, userId, refreshDuplicates])

  const handleSave = useCallback(async () => {
    if (!userId) return
    const code = stickerInput.trim().toUpperCase()
    if (!code) {
      setMsg({ text: 'Informe o código da figurinha.', ok: false })
      return
    }
    if (!ownedSet.has(code)) {
      setMsg({ text: `Figurinha ${code} não está na sua coleção.`, ok: false })
      return
    }
    setSaving(true)
    setMsg(null)
    const result = await upsertDuplicate(userId, code, countInput)
    setSaving(false)
    if (result.success) {
      setStickerInput('')
      setCountInput(1)
      setMsg({
        text: `✓ Figurinha ${code} salva com ${countInput} repetida${countInput !== 1 ? 's' : ''}.`,
        ok: true,
      })
      await refreshDuplicates(userId)
    } else {
      setMsg({ text: `Erro: ${result.error}`, ok: false })
    }
  }, [userId, stickerInput, countInput, ownedSet, refreshDuplicates])

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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yvy-dark">Minhas repetidas</h2>
        <a href="/stickers" className="text-xs text-yvy-muted underline">
          ← Figurinhas
        </a>
      </div>

      {/* Add / update form */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-sm p-4 space-y-3">
        <p className="text-sm font-medium text-yvy-text">Adicionar ou atualizar</p>
        <p className="text-xs text-yvy-muted">
          Busque pelo país e selecione a figurinha, ou digite o código diretamente.
        </p>

        <DuplicatePicker
          ownedSet={ownedSet}
          onSelect={(id) => setStickerInput(id)}
        />

        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={stickerInput}
            onChange={(e) => setStickerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="ex: MEX1, FWC5"
            className="flex-1 rounded-lg border border-yvy-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent"
          />
          <button
            type="button"
            onClick={() => setCountInput((c) => Math.max(1, c - 1))}
            className="w-9 h-9 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-lg font-bold leading-none"
          >
            −
          </button>
          <span className="w-5 text-center text-sm font-semibold text-yvy-dark">{countInput}</span>
          <button
            type="button"
            onClick={() => setCountInput((c) => c + 1)}
            className="w-9 h-9 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-lg font-bold leading-none"
          >
            +
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !stickerInput}
            className="px-3 py-2 rounded-lg bg-yvy-dark text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? '...' : 'Salvar'}
          </button>
        </div>
        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-yvy-accent' : 'text-red-600'}`}>{msg.text}</p>
        )}
      </div>

      {/* Duplicates list */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-sm p-4">
        <p className="text-sm font-medium text-yvy-text mb-3">
          {duplicates.length === 0
            ? 'Nenhuma repetida cadastrada ainda.'
            : `${duplicates.length} figurinha${duplicates.length !== 1 ? 's' : ''} com repetidas`}
        </p>
        {duplicates.length > 0 && (
          <div className="divide-y divide-yvy-border">
            {duplicates.map(({ stickerId, count }) => (
              <div key={stickerId} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-yvy-text">
                  <strong>#{stickerId}</strong>
                  <span className="ml-2 text-yvy-muted">
                    {count} repetida{count !== 1 ? 's' : ''}
                  </span>
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      const prev = count
                      await decrementDuplicate(userId, stickerId)
                      await refreshDuplicates(userId)
                      showToast(
                        prev === 1
                          ? `Figurinha #${stickerId} removida`
                          : `Figurinha #${stickerId}: ${prev} → ${prev - 1} repetida${prev - 1 !== 1 ? 's' : ''}`,
                        async () => { await upsertDuplicate(userId, stickerId, prev) }
                      )
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark font-medium hover:bg-yvy-border transition-colors"
                    title="Registrar troca (−1)"
                  >
                    −1
                  </button>
                  <button
                    onClick={async () => {
                      const prev = count
                      await removeDuplicate(userId, stickerId)
                      await refreshDuplicates(userId)
                      showToast(
                        `Figurinha #${stickerId} removida`,
                        async () => { await upsertDuplicate(userId, stickerId, prev) }
                      )
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  )
}
