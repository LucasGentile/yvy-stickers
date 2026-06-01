'use client'
import LoadingScreen from '@/components/LoadingScreen'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserData } from '@/actions/getUserData'
import {
  ALL_STICKER_IDS,
  ALL_TEAMS,
  isChromeSticker,
  isCocaColaSticker,
  sortByAlbumOrder,
  sortAlphabetically,
} from '@/lib/stickers'
import { checkExternalList } from '@/lib/checkExternalList'
import { logAction } from '@/actions/logAction'
import { getDuplicates, DuplicateEntry } from '@/actions/getDuplicates'
import { getReservedStickerIds } from '@/actions/getReservedStickerIds'
import { upsertDuplicate } from '@/actions/upsertDuplicate'
import { decrementDuplicate } from '@/actions/decrementDuplicate'
import { removeDuplicate } from '@/actions/removeDuplicate'
import { useNotification } from '@/contexts/NotificationContext'
import DuplicatePicker from './DuplicatePicker'
import { getStickerTeamCode, TEAM_FLAG } from '@/lib/teamColors'
import { normalizeSearch } from '@/lib/format'

const TEAM_NAME_BY_CODE = Object.fromEntries(
  ALL_TEAMS.map((t) => [t.code.toLowerCase(), normalizeSearch(t.name)])
)

function matchesSearch(id: string, q: string): boolean {
  if (id.toLowerCase().includes(q)) return true
  const code = id.replace(/\d+$/, '').toLowerCase()
  const teamName = TEAM_NAME_BY_CODE[code]
  return !!teamName && teamName.includes(q)
}

export default function DuplicatesScreen() {
  const { showSuccess, showError } = useNotification()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownedSet, setOwnedSet] = useState<Set<string>>(new Set())
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([])
  const [selectedSticker, setSelectedSticker] = useState('')
  const [addCount, setAddCount] = useState(1)
  const [reservedCounts, setReservedCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [listOrder, setListOrder] = useState<'album' | 'alpha'>('album')
  const [listSearch, setListSearch] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [includeReserved, setIncludeReserved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checkOpen, setCheckOpen] = useState(false)
  const [checkText, setCheckText] = useState('')
  const [checkFile, setCheckFile] = useState<File | null>(null)
  const [checkResult, setCheckResult] = useState<{
    needed: string[]
    owned: string[]
    invalid: string[]
  } | null>(null)
  const [checking, setChecking] = useState(false)
  const [tradesBlocked, setTradesBlocked] = useState(false)
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
          setTradesBlocked(userData.tradesBlocked)
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

  useEffect(() => {
    const id = localStorage.getItem('userId')
    if (!id) return
    const handlePullRefresh = () => refreshDuplicates(id)
    window.addEventListener('pull-refresh', handlePullRefresh)
    return () => window.removeEventListener('pull-refresh', handlePullRefresh)
  }, [refreshDuplicates])

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
    if (!userId || !selectedSticker || saving) return
    setSaving(true)
    if (addCount === 0) {
      const inList = duplicates.some((d) => d.stickerId === selectedSticker)
      if (!inList) {
        setSaving(false)
        showError(`${selectedSticker} não tem cópias registradas para remover.`)
        return
      }
      await removeDuplicate(userId, selectedSticker)
      setSaving(false)
      showSuccess(`${selectedSticker} removida das repetidas.`)
      setSelectedSticker('')
      setAddCount(1)
      await refreshDuplicates(userId)
      return
    }
    const result = await upsertDuplicate(userId, selectedSticker, addCount)
    setSaving(false)
    if (result.success) {
      showSuccess(`${selectedSticker} salva com ${addCount} repetida${addCount !== 1 ? 's' : ''}.`)
      setSelectedSticker('')
      setAddCount(1)
      await refreshDuplicates(userId)
    } else {
      showError(`Erro ao registrar repetida: ${result.error} Tente novamente ou procure ajuda.`)
    }
  }, [
    userId,
    selectedSticker,
    addCount,
    saving,
    duplicates,
    refreshDuplicates,
    showSuccess,
    showError,
  ])

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

  // Derived values used by both the list and the export function
  const sortedIds =
    duplicates.length > 0
      ? listOrder === 'album'
        ? sortByAlbumOrder(duplicates.map((d) => d.stickerId))
        : sortAlphabetically(duplicates.map((d) => d.stickerId))
      : []
  const filteredIds = listSearch.trim()
    ? sortedIds.filter((id) => matchesSearch(id, normalizeSearch(listSearch.trim())))
    : sortedIds
  const dupeMap = Object.fromEntries(duplicates.map((d) => [d.stickerId, d.count]))
  const totalCount = duplicates.reduce((sum, d) => sum + d.count, 0)
  const totalReserved = Object.values(reservedCounts).reduce((sum, n) => sum + n, 0)

  function buildExportText(): string {
    const lines: string[] = ['Minhas repetidas:']
    for (const id of sortedIds) {
      const count = dupeMap[id]
      if (count === undefined) continue
      const reserved = reservedCounts[id] ?? 0
      const available = count - reserved
      if (!includeReserved) {
        if (available <= 0) continue
        lines.push(`${id} x${available}`)
      } else {
        if (reserved === 0) {
          lines.push(`${id} x${count}`)
        } else if (available > 0) {
          lines.push(
            `${id} x${count} (${available} livre${available !== 1 ? 's' : ''} · ${reserved} reservada${reserved !== 1 ? 's' : ''})`
          )
        } else {
          lines.push(`${id} x${count} (reservada${count !== 1 ? 's' : ''})`)
        }
      }
    }
    return lines.join('\n')
  }

  async function handleCheck() {
    if (checking) return
    let content = checkText
    if (checkFile) content = await checkFile.text()
    if (!content.trim()) return

    setChecking(true)
    const result = checkExternalList(content, ownedSet)
    setCheckResult(result)
    if (userId && result.needed.length + result.owned.length > 0) {
      await logAction(userId, 'external_list_check', {
        checkedCount: result.needed.length + result.owned.length,
        neededCount: result.needed.length,
      })
    }
    setChecking(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildExportText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    const text = buildExportText()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'repetidas.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <LoadingScreen />
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
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Minhas repetidas
        </h2>
        <a href="/stickers" className="text-xs text-yvy-muted underline">
          ← Figurinhas
        </a>
      </div>

      {tradesBlocked && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-medium">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round" />
          </svg>
          Você está oculto nas buscas de troca. Vá em{' '}
          <a href="/matches" className="underline font-semibold">
            Ranking de Trocas
          </a>{' '}
          para desbloquear.
        </div>
      )}

      {/* Add form */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-gold/20 shadow-md p-4 space-y-3">
        <p className="text-sm font-medium text-yvy-text">Adicionar repetida</p>

        <DuplicatePicker
          ownedSet={ownedSet}
          selectedId={selectedSticker}
          duplicatesMap={Object.fromEntries(duplicates.map((d) => [d.stickerId, d.count]))}
          onSelect={(id, currentCount) => {
            setSelectedSticker(id)
            setAddCount(currentCount ?? 1)
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
              onClick={() => setAddCount((c) => Math.max(0, c - 1))}
              disabled={saving}
              className="w-10 h-10 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-xl font-bold leading-none flex items-center justify-center disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-yvy-dark">{addCount}</span>
            <button
              type="button"
              onClick={() => setAddCount((c) => c + 1)}
              disabled={saving}
              className="w-10 h-10 rounded-lg border border-yvy-border bg-yvy-bg text-yvy-dark text-xl font-bold leading-none flex items-center justify-center disabled:opacity-40"
            >
              +
            </button>

            <button
              onClick={handleAdd}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 whitespace-nowrap ${
                addCount === 0 ? 'bg-red-600 text-white' : 'bg-yvy-dark text-yvy-gold'
              }`}
            >
              {saving ? '...' : addCount === 0 ? 'Remover' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      {/* Check external list */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-gold/20 shadow-md p-4 space-y-3">
        <button
          type="button"
          onClick={() => {
            setCheckOpen((o) => !o)
            setCheckResult(null)
          }}
          className="w-full flex items-center justify-between"
        >
          <p className="text-sm font-medium text-yvy-text">O que preciso desta lista?</p>
          <span className="text-yvy-muted text-xs">{checkOpen ? '▲ fechar' : '▼ expandir'}</span>
        </button>

        {checkOpen && (
          <div className="space-y-3">
            <p className="text-xs text-yvy-muted">
              Cole os códigos de figurinhas que alguém oferece (separados por{' '}
              <span className="font-mono">;</span> ou por linha). O app mostra quais você ainda
              precisa.
            </p>

            <textarea
              value={checkText}
              onChange={(e) => {
                setCheckText(e.target.value)
                setCheckFile(null)
                setCheckResult(null)
              }}
              placeholder={'BRA1; BRA3; ARG2\nou um por linha'}
              rows={3}
              className="w-full rounded-lg border border-yvy-border bg-yvy-bg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yvy-accent resize-none"
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-yvy-muted hover:text-yvy-text transition-colors">
                <input
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setCheckFile(f)
                    if (f) setCheckText('')
                    setCheckResult(null)
                  }}
                />
                <span className="px-2.5 py-1.5 rounded-lg border border-yvy-border bg-yvy-bg font-medium text-xs text-yvy-dark hover:bg-yvy-border transition-colors">
                  Escolher .txt
                </span>
                {checkFile && (
                  <span className="truncate max-w-[120px] text-yvy-accent font-medium">
                    {checkFile.name}
                  </span>
                )}
              </label>

              <button
                type="button"
                onClick={handleCheck}
                disabled={checking || (!checkText.trim() && !checkFile)}
                className="ml-auto px-4 py-1.5 rounded-lg bg-yvy-dark text-yvy-gold text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                {checking ? 'Verificando...' : 'Verificar'}
              </button>
            </div>

            {checkResult && (
              <div className="space-y-3 pt-1">
                {checkResult.invalid.length > 0 && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Código{checkResult.invalid.length !== 1 ? 's' : ''} não reconhecido
                    {checkResult.invalid.length !== 1 ? 's' : ''} (ignorado
                    {checkResult.invalid.length !== 1 ? 's' : ''}
                    ):{' '}
                    <span className="font-mono font-semibold">
                      {checkResult.invalid.slice(0, 8).join(', ')}
                      {checkResult.invalid.length > 8 &&
                        ` e mais ${checkResult.invalid.length - 8}`}
                    </span>
                  </p>
                )}

                {checkResult.needed.length === 0 && checkResult.owned.length === 0 && (
                  <p className="text-sm text-yvy-muted text-center py-2">
                    Nenhuma figurinha válida encontrada.
                  </p>
                )}

                {checkResult.needed.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-green-700 mb-1.5">
                      Preciso ({checkResult.needed.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {checkResult.needed.map((id) => (
                        <span
                          key={id}
                          className={`text-xs font-mono font-semibold px-2 py-1 rounded-lg ${
                            isChromeSticker(id)
                              ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : isCocaColaSticker(id)
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : 'bg-green-100 text-green-800 border border-green-300'
                          }`}
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {checkResult.owned.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-yvy-muted mb-1.5">
                      Já tenho ({checkResult.owned.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {checkResult.owned.map((id) => (
                        <span
                          key={id}
                          className="text-xs font-mono font-semibold px-2 py-1 rounded-lg bg-yvy-bg text-yvy-muted border border-yvy-border"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Duplicates list */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-gold/20 shadow-md p-4">
        <div className="mb-3 space-y-2">
          {duplicates.length === 0 ? (
            <p className="text-sm font-medium text-yvy-text">Nenhuma repetida cadastrada ainda.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-yvy-text">
                    {totalCount} cópia{totalCount !== 1 ? 's' : ''} repetida
                    {totalCount !== 1 ? 's' : ''} · {duplicates.length} figurinha
                    {duplicates.length !== 1 ? 's' : ''} diferente
                    {duplicates.length !== 1 ? 's' : ''}
                  </p>
                  {totalReserved > 0 && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {totalReserved} cópia{totalReserved !== 1 ? 's' : ''} reservada
                      {totalReserved !== 1 ? 's' : ''} em trocas pendentes
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {(['album', 'alpha'] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setListOrder(val)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        listOrder === val
                          ? 'bg-yvy-dark text-yvy-gold'
                          : 'bg-yvy-border text-yvy-muted hover:bg-yvy-dark/20'
                      }`}
                    >
                      {val === 'album' ? 'Álbum' : 'A–Z'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExportOpen((o) => !o)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                      exportOpen
                        ? 'bg-yvy-accent text-white'
                        : 'bg-yvy-border text-yvy-muted hover:bg-yvy-dark/20'
                    }`}
                  >
                    Exportar
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yvy-muted text-xs pointer-events-none">
                  🔍
                </span>
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Filtrar por código..."
                  className="w-full rounded-lg border border-yvy-border pl-7 pr-7 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg"
                />
                {listSearch && (
                  <button
                    type="button"
                    onClick={() => setListSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-yvy-muted text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {exportOpen && (
                <div className="bg-yvy-bg border border-yvy-border rounded-xl px-3 py-3 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeReserved}
                      onChange={(e) => setIncludeReserved(e.target.checked)}
                      className="w-4 h-4 accent-yvy-accent"
                    />
                    <span className="text-xs text-yvy-text font-medium">
                      Incluir reservadas{' '}
                      <span className="text-yvy-muted font-normal">
                        (marcadas com quantidade livre · reservada)
                      </span>
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 py-2 rounded-lg bg-yvy-dark text-yvy-gold text-xs font-semibold transition-colors"
                    >
                      {copied ? 'Copiado ✓' : 'Copiar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex-1 py-2 rounded-lg border border-yvy-border bg-yvy-surface text-yvy-dark text-xs font-semibold hover:bg-yvy-bg transition-colors"
                    >
                      Baixar .txt
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {duplicates.length > 0 && (
          <div className="divide-y divide-yvy-gold/20">
            {filteredIds.length === 0 && listSearch.trim() && (
              <p className="text-sm text-yvy-muted text-center py-4">
                Nenhuma repetida com &ldquo;{listSearch.trim()}&rdquo;.
              </p>
            )}
            {filteredIds.map((stickerId) => {
              const count = dupeMap[stickerId]
              if (count === undefined) return null
              const busy = savingId === stickerId
              const reserved = reservedCounts[stickerId] ?? 0
              const available = count - reserved
              return (
                <div key={stickerId} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-yvy-dark whitespace-nowrap">
                      {(() => {
                        const flag = TEAM_FLAG[getStickerTeamCode(stickerId) ?? '']
                        const sup = flag ? (
                          <span className="text-[9px] align-super ml-px">{flag}</span>
                        ) : null
                        if (isChromeSticker(stickerId))
                          return (
                            <span className="font-bold text-amber-500">
                              {stickerId}
                              {sup}
                            </span>
                          )
                        if (isCocaColaSticker(stickerId))
                          return (
                            <span className="font-bold text-red-500">
                              {stickerId}
                              {sup}
                            </span>
                          )
                        return (
                          <>
                            {stickerId}
                            {sup}
                          </>
                        )
                      })()}
                    </span>
                    {reserved > 0 && (
                      <span className="text-[10px] font-semibold text-red-500 border border-red-200 bg-red-50 rounded px-1.5 py-0.5 leading-none w-fit">
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
