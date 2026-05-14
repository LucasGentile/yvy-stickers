'use client'

import { useState } from 'react'
import { upsertDuplicate } from '@/actions/upsertDuplicate'
import { isChromeSticker, isCocaColaSticker } from '@/lib/stickers'

export function DuplicateQuickAdd({
  id,
  currentCount,
  userId,
  onClose,
  onSaved,
}: {
  id: string
  currentCount: number
  userId: string
  onClose: () => void
  onSaved: (id: string, count: number) => void
}) {
  const [count, setCount] = useState(currentCount + 1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await upsertDuplicate(userId, id, count)
    if (result.success) {
      onSaved(id, count)
    } else {
      setError(result.error)
      setSaving(false)
    }
  }

  const chrome = isChromeSticker(id)
  const coke = isCocaColaSticker(id)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-yvy-surface rounded-t-2xl shadow-2xl px-6 pt-4 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-yvy-border rounded-full mx-auto mb-5" />

        <p className="text-xs font-semibold uppercase tracking-wide text-yvy-muted mb-2">
          Adicionar repetida
        </p>

        <p className={`text-3xl font-mono font-bold mb-1 ${
          chrome ? 'text-amber-500' : coke ? 'text-red-500' : 'text-yvy-dark'
        }`}>
          {id}{chrome && <span className="text-xl ml-1">✨</span>}
        </p>

        <p className="text-xs text-yvy-muted mb-7">
          {currentCount > 0
            ? `Já tem ${currentCount} repetida${currentCount !== 1 ? 's' : ''} — defina o total`
            : 'Nenhuma repetida registrada ainda'}
        </p>

        {/* Counter */}
        <div className="flex items-center justify-center gap-8 mb-7">
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            disabled={count <= 1}
            className="w-14 h-14 rounded-full bg-yvy-bg border-2 border-yvy-border text-2xl font-bold text-yvy-text flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
          >
            −
          </button>
          <span className="text-5xl font-bold text-yvy-dark w-16 text-center tabular-nums">
            {count}
          </span>
          <button
            type="button"
            onClick={() => setCount((c) => Math.min(100, c + 1))}
            disabled={count >= 100}
            className="w-14 h-14 rounded-full bg-yvy-bg border-2 border-yvy-border text-2xl font-bold text-yvy-text flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
          >
            +
          </button>
        </div>

        {error && <p className="text-xs text-red-600 text-center mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-yvy-accent text-white font-bold py-3.5 rounded-2xl text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : `Salvar ${count} repetida${count !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
