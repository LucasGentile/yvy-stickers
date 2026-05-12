'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserData } from '@/actions/getUserData'
import { ALL_STICKER_IDS, isChromeSticker, isCocaColaSticker } from '@/lib/stickers'
import { getDuplicates, DuplicateEntry } from '@/actions/getDuplicates'
import { getReservedStickerIds } from '@/actions/getReservedStickerIds'
import { upsertDuplicate } from '@/actions/upsertDuplicate'
import { decrementDuplicate } from '@/actions/decrementDuplicate'
import { removeDuplicate } from '@/actions/removeDuplicate'
import DuplicatePicker from './DuplicatePicker'

export default function DuplicatesScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownedSet, setOwnedSet] = useState<Set<string>>(new Set())
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([])
  const [selectedSticker, setSelectedSticker] = useState('')
  const [addCount, setAddCount] = useState(1)
  const [reservedCounts, setReservedCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [toast, setToast] = useState<{ message: string; onUndo: () => Promise<void> } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    setUserId(id)
    if (!id) {
      setLoading(false)
      return
    }
    Promise.all([getUserData(id), getDuplicates(id), getReservedStickerIds(id)]).then(
      ([userData, dupes, reserved]) => {
        if (userData) {
          const marked = new Set(userData.stickerIds)
          const owned =
            userData.inputMode === 'have'
              ? marked
              : new Set(ALL_STICKER_IDS.filter((sid) => !marked.has(sid)))
          setOwnedSet(owned)
        }
        setDuplicates(dupes)
        setReservedCounts(reserved)
        setLoading(false)
      }
    )
  }, [])

  const refreshDuplicates = useCallback(async (id: string) => {
    const [fresh, reserved] = await Promise.all([getDuplicates(id), getReservedStickerIds(id)])
    setDuplicates(fresh)
    setReservedCounts(reserved)
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

  // Add / update from the picker form
  const handleAdd = useCallback(async () => {
    if (!userId || !selectedSticker) return
    setSaving(true)
    setMsg(null)
    const result = await upsertDuplicate(userId, selectedSticker, addCount)
    setSaving(false)
    if (result.success) {
      setMsg({
        text: `✓ ${selectedSticker} salva com ${addCount} repetida${addCount !== 1 ? 's' : ''}.`,
        ok: true,
      })
      setSelectedSticker('') // deselect sticker but keep team panel open in picker
      setAddCount(1)
      await refreshDuplicates(userId)
    } else {
      setMsg({ text: `Erro: ${result.error}`, ok: false })
    }
  }, [userId, selectedSticker, addCount, refreshDuplicates])

  // Inline +1 on existing item
  const handleIncrement = useCallback(
    async (stickerId: string, currentCount: number) => {
      if (!userId) return
      setSavingId(stickerId)
      await upsertDuplicate(userId, stickerId, currentCount + 1)
      await refreshDuplicates(userId)
      setSavingId(null)
    },
    [userId, refreshDuplicates]
  )

  // Inline −1 on existing item
  const handleDecrement = useCallback(
    async (stickerId: string, currentCount: number) => {
      if (!userId) return
      setSavingId(stickerId)
      await decrementDuplicate(userId, stickerId)
      await refreshDuplicates(userId)
      setSavingId(null)
      showToast(
        currentCount === 1
          ? `${stickerId} removida das repetidas`
          : `${stickerId}: ${currentCount} → ${currentCount - 1} repetida${currentCount - 1 !== 1 ? 's' : ''}`,
        async () => {
          await upsertDuplicate(userId, stickerId, currentCount)
        }
      )
    },
    [userId, refreshDuplicates, showToast]
  )

  // Remove entirely
  const handleRemove = useCallback(
    async (stickerId: string, currentCount: number) => {
      if (!userId) return
      setSavingId(stickerId)
      await removeDuplicate(userId, stickerId)
      await refreshDuplicates(userId)
      setSavingId(null)
      showToast(`${stickerId} removida das repetidas`, async () => {
        await upsertDuplicate(userId, stickerId, currentCount)
      })
    },
    [userId, refreshDuplicates, showToast]
  )

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
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Minhas repetidas
        </h2>
        <a href="/stickers" className="text-xs text-yvy-muted underline">
          ← Figurinhas
        </a>
      </div>

      {/* Add form */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4 space-y-3">
        <p className="text-sm font-medium text-yvy-text">Adicionar repetida</p>

        <DuplicatePicker
          ownedSet={ownedSet}
          selectedId={selectedSticker}
          duplicatesMap={Object.fromEntries(duplicates.map((d) => [d.stickerId, d.count]))}
          onSelect={(id, currentCount) => {
            setSelectedSticker(id)
            setAddCount(currentCount ?? 1)
            setMsg(null)
          }}
        />

        {selectedSticker && (
          <div className="flex items-center gap-2 pt-1">
            <span className="flex-1 text-sm font-semibold text-yvy-dark bg-yvy-bg border border-yvy-border rounded-lg px-3 py-2">
              {selectedSticker}
            </span>

            {/* Count stepper */}
            <button
              type="button"
              onClick={() => setAddCount((c) => Math.max(1, c - 1))}
              className="w-10 h-10 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-xl font-bold leading-none flex items-center justify-center"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-yvy-dark">{addCount}</span>
            <button
              type="button"
              onClick={() => setAddCount((c) => c + 1)}
              className="w-10 h-10 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-xl font-bold leading-none flex items-center justify-center"
            >
              +
            </button>

            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-yvy-dark text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? '...' : 'Salvar'}
            </button>
          </div>
        )}

        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-yvy-accent' : 'text-red-600'}`}>{msg.text}</p>
        )}
      </div>

      {/* Duplicates list */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4">
        <div className="mb-3 space-y-0.5">
          {duplicates.length === 0 ? (
            <p className="text-sm font-medium text-yvy-text">Nenhuma repetida cadastrada ainda.</p>
          ) : (() => {
            const totalCopies = duplicates.reduce((sum, d) => sum + d.count, 0)
            const totalReserved = Object.values(reservedCounts).reduce((sum, n) => sum + n, 0)
            return (
              <>
                <p className="text-sm font-medium text-yvy-text">
                  {totalCopies} cópia{totalCopies !== 1 ? 's' : ''} repetida{totalCopies !== 1 ? 's' : ''} · {duplicates.length} figurinha{duplicates.length !== 1 ? 's' : ''} diferente{duplicates.length !== 1 ? 's' : ''}
                </p>
                {totalReserved > 0 && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {totalReserved} cópia{totalReserved !== 1 ? 's' : ''} reservada{totalReserved !== 1 ? 's' : ''} em trocas pendentes
                  </p>
                )}
              </>
            )
          })()}
        </div>

        {duplicates.length > 0 && (
          <div className="divide-y divide-yvy-border">
            {duplicates.map(({ stickerId, count }) => {
              const busy = savingId === stickerId
              const reserved = reservedCounts[stickerId] ?? 0
              const available = count - reserved
              return (
                <div key={stickerId} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold min-w-0 truncate text-yvy-dark">
                      {isChromeSticker(stickerId) ? (
                        <span className="font-bold text-amber-500">{stickerId}</span>
                      ) : isCocaColaSticker(stickerId) ? (
                        <span className="font-bold text-red-500">{stickerId}</span>
                      ) : stickerId}
                    </span>
                    {reserved > 0 && (
                      <span className="shrink-0 text-[10px] font-semibold text-red-500 border border-red-200 bg-red-50 rounded px-1.5 py-0.5 leading-none">
                        {reserved} em troca
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={busy || count <= reserved}
                      onClick={() => handleDecrement(stickerId, count)}
                      className="w-8 h-8 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-base font-bold leading-none flex items-center justify-center disabled:opacity-40 hover:bg-yvy-border transition-colors"
                    >
                      −
                    </button>
                    <div className="w-12 text-center">
                      {busy ? (
                        <span className="text-sm font-semibold text-yvy-dark">·</span>
                      ) : reserved > 0 ? (
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-sm font-bold text-yvy-dark">{available}</span>
                          <span className="text-[9px] text-red-400 font-medium">+{reserved}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-yvy-dark">{count}</span>
                      )}
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => handleIncrement(stickerId, count)}
                      className="w-8 h-8 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-base font-bold leading-none flex items-center justify-center disabled:opacity-40 hover:bg-yvy-border transition-colors"
                    >
                      +
                    </button>
                    <button
                      disabled={busy || reserved > 0}
                      onClick={() => handleRemove(stickerId, count)}
                      className="w-8 h-8 rounded-lg border border-red-200 text-red-500 text-sm font-bold flex items-center justify-center disabled:opacity-40 hover:bg-red-50 transition-colors ml-1"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
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
