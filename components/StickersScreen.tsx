'use client'
import LoadingScreen from '@/components/LoadingScreen'

import { useState, useEffect, useCallback, useRef } from 'react'
import { setInputMode } from '@/actions/setInputMode'
import { saveStickers } from '@/actions/saveStickers'
import { importStickerFile } from '@/actions/importStickerFile'
import { removeDuplicate } from '@/actions/removeDuplicate'
import { getUserData } from '@/actions/getUserData'
import { getTradeOriginStickers, type TradeOriginResult } from '@/actions/getTradeOriginStickers'
import { getIncomingTradeStickers } from '@/actions/getIncomingTradeStickers'
import { getReservedStickerIds } from '@/actions/getReservedStickerIds'
import { getDuplicates } from '@/actions/getDuplicates'
import { DuplicateQuickAdd } from './DuplicateQuickAdd'
import { parseStickerFile } from '@/lib/parser'
import { ALL_STICKER_IDS, sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { StickerChip } from './StickerChip'
import StickerGrid from './StickerGrid'
import CountrySearch from './CountrySearch'
import { usePrefs } from '@/contexts/PreferencesContext'

type Mode = 'have' | 'need'
type Step = 'mode' | 'input' | 'pending'

export default function StickersScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<Mode>('have')
  const [tradeOrigin, setTradeOrigin] = useState<TradeOriginResult | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dupeWarning, setDupeWarning] = useState<string[] | null>(null)
  const [clearingDupes, setClearingDupes] = useState(false)
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const { stickerOrder } = usePrefs()
  const [fileOpen, setFileOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<{
    addedToAlbumIds: string[]
    duplicateIds: string[]
    totalDuplicateCopies: number
  } | null>(null)
  const [toast, setToast] = useState<{ message: string; prev: Set<string> } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<Set<string>>(new Set())
  const [duplicateMap, setDuplicateMap] = useState<Map<string, number>>(new Map())
  const [longPressedId, setLongPressedId] = useState<string | null>(null)
  const [lockedStickers, setLockedStickers] = useState<Set<string>>(new Set())
  const [incomingStickers, setIncomingStickers] = useState<Set<string>>(new Set())
  const [albumProtected, setAlbumProtected] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('albumProtected') === 'true'
  })
  const [protectionAlert, setProtectionAlert] = useState(false)
  const protectionAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    Promise.all([
      getUserData(id),
      getTradeOriginStickers(id),
      getDuplicates(id),
      getReservedStickerIds(id),
      getIncomingTradeStickers(id),
    ]).then(([data, origin, dupes, reserved, incoming]) => {
      setTradeOrigin(origin)
      setLockedStickers(new Set(Object.keys(reserved)))
      setIncomingStickers(new Set(incoming))
      setDuplicateMap(new Map(dupes.map((d) => [d.stickerId, d.count])))
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

  const [selectingMode, setSelectingMode] = useState(false)

  async function handleModeSelect(m: Mode) {
    if (!userId || selectingMode) return
    setSelectingMode(true)
    await setInputMode(userId, m)
    setMode(m)
    setStep('input')
    setSelectingMode(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPendingFile(file)
    setParseErrors([])
  }

  async function handleFileImport() {
    if (!pendingFile || !userId || importing) return
    const content = await pendingFile.text()
    const parsed = parseStickerFile(content)
    if (!parsed.valid) {
      setParseErrors(parsed.errors)
      return
    }
    setParseErrors([])
    setImporting(true)
    const result = await importStickerFile(userId, parsed.stickers, parsed.counts)
    setImporting(false)
    setPendingFile(null)
    if (!result.success) {
      setSaveMsg(`Erro na importação: ${result.error}`)
      return
    }
    const loaded = new Set<string>(parsed.stickers)
    setSelected(loaded)
    lastSaved.current = new Set(loaded)
    setStep('input')
    setFileOpen(false)

    const failures = [...result.failedStickers, ...result.failedDuplicates]
    if (failures.length > 0)
      setSaveMsg(
        `Importado com erros — ${failures.length} não salvos: ${failures.slice(0, 5).join(', ')}${failures.length > 5 ? ` e mais ${failures.length - 5}` : ''}`
      )
    else setSaveMsg(null)

    setImportSummary({
      addedToAlbumIds: result.addedToAlbumIds,
      duplicateIds: result.duplicateIds,
      totalDuplicateCopies: result.totalDuplicateCopies,
    })
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

    const added = [...selected].filter((id) => !lastSaved.current.has(id))
    setSaving(true)
    setSaveMsg(null)
    const ids = Array.from(selected)
    const result = await saveStickers(userId, ids)
    setSaving(false)
    if (result.success) {
      lastSaved.current = new Set(selected)
      setSaveMsg(`✓ ${result.count} figurinhas salvas com sucesso!`)
      if (result.removedWithDupes.length > 0) setDupeWarning(result.removedWithDupes)
      if (added.length > 0) {
        setTradeOrigin((prev) =>
          prev ? { ...prev, newestIds: [...new Set([...prev.newestIds, ...added])] } : prev
        )
      }
    } else {
      setSaveMsg(`Erro: ${result.error}`)
    }
  }, [userId, selected])

  function toggleProtection() {
    const next = !albumProtected
    setAlbumProtected(next)
    localStorage.setItem('albumProtected', String(next))
  }

  function triggerProtectionAlert() {
    setProtectionAlert(true)
    if (protectionAlertTimer.current) clearTimeout(protectionAlertTimer.current)
    protectionAlertTimer.current = setTimeout(() => setProtectionAlert(false), 2500)
  }

  function exportOwnedStickers() {
    const ownedIds =
      mode === 'have' ? [...selected] : ALL_STICKER_IDS.filter((id) => !selected.has(id))
    if (ownedIds.length === 0) return
    const blob = new Blob(['Minhas figurinhas:\n' + ownedIds.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'minhas-figurinhas.txt'
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
              disabled={selectingMode}
              className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold py-4 px-4 rounded-xl text-left transition-colors disabled:opacity-50"
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
              disabled={selectingMode}
              className="w-full bg-yvy-surface hover:bg-yvy-bg border-2 border-yvy-dark text-yvy-dark font-semibold py-4 px-4 rounded-xl text-left transition-colors disabled:opacity-50"
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Minhas Figurinhas
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleProtection}
            title={
              albumProtected
                ? 'Álbum protegido — clique para desbloquear'
                : 'Clique para proteger o álbum'
            }
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
              albumProtected
                ? 'bg-yvy-dark text-yvy-gold border-yvy-dark'
                : 'bg-yvy-bg text-yvy-muted border-yvy-border hover:border-yvy-dark hover:text-yvy-dark'
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {albumProtected ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10M5 11V7a7 7 0 0114 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              )}
            </svg>
            {albumProtected ? 'Protegido' : 'Proteger'}
          </button>
          <span className="text-sm font-semibold text-yvy-accent">
            {selected.size}
            <span className="text-yvy-muted font-normal">/{ALL_STICKER_IDS.length}</span>
          </span>
        </div>
      </div>

      {protectionAlert && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yvy-dark text-yvy-gold text-xs font-medium">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m0 0v2m0-2h2m-2 0H10M5 11V7a7 7 0 0114 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"
            />
          </svg>
          Álbum protegido — remoções estão bloqueadas
        </div>
      )}

      {/* Country search — sticky */}
      <div className="sticky top-14 z-30 bg-yvy-bg py-2">
        <CountrySearch />
      </div>

      {/* Grid */}
      <div className="bg-yvy-surface rounded-xl border border-yvy-gold/20 shadow-md p-4">
        <div className="flex justify-end mb-3">
          <button
            onClick={exportOwnedStickers}
            title="Baixar lista de figurinhas que tenho"
            className="flex items-center gap-1.5 text-xs text-yvy-muted hover:text-yvy-gold transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
              />
            </svg>
            Baixar minhas figurinhas
          </button>
        </div>

        {mode === 'have' &&
          tradeOrigin &&
          (() => {
            const tradeSet = new Set(tradeOrigin.fromTradeIds)
            const tradeCount = [...selected].filter((id) => tradeSet.has(id)).length
            const boughtCount = selected.size - tradeCount
            return (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-yvy-muted">
                    <span className="w-3 h-4 rounded-[2px] bg-green-600 ring-2 ring-inset ring-green-700 shrink-0" />
                    Comprada
                    <span className="font-semibold text-yvy-text">({boughtCount})</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-yvy-muted">
                    <span className="w-3 h-4 rounded-[2px] bg-blue-500 ring-2 ring-inset ring-blue-400 shrink-0" />
                    Recebida em troca
                    <span className="font-semibold text-yvy-text">({tradeCount})</span>
                  </span>
                  {[...selected].some((id) => !lastSaved.current.has(id)) && (
                    <span className="flex items-center gap-1.5 text-[11px] text-yvy-muted">
                      <span className="w-3 h-4 rounded-[2px] bg-green-400 ring-2 ring-inset ring-green-500 shrink-0" />
                      Marcada, não salva
                    </span>
                  )}
                  {lockedStickers.size > 0 && (
                    <span className="flex items-center gap-1.5 text-[11px] text-yvy-muted">
                      <span className="w-3 h-4 rounded-[1px] bg-white ring-2 ring-inset ring-blue-400 shrink-0" />
                      Comprometida em troca
                      <span className="font-semibold text-yvy-text">({lockedStickers.size})</span>
                    </span>
                  )}
                  {incomingStickers.size > 0 && (
                    <span className="flex items-center gap-1.5 text-[11px] text-yvy-muted">
                      <span className="w-3 h-4 rounded-[1px] bg-white ring-2 ring-inset ring-blue-400 shrink-0" />
                      A receber em troca
                      <span className="font-semibold text-yvy-text">({incomingStickers.size})</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-[11px] text-yvy-muted">
                    <span className="w-3 h-4 rounded-[2px] bg-yvy-bg ring-2 ring-inset ring-yvy-border shrink-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-500 leading-none">1</span>
                    </span>
                    Cromada
                  </span>
                  {tradeOrigin.newestIds.length > 0 && (
                    <span className="flex items-center gap-1.5 text-[11px] text-yvy-muted">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      Troca recente (12h)
                      <span className="font-semibold text-yvy-text">
                        ({tradeOrigin.newestIds.length})
                      </span>
                    </span>
                  )}
                </div>
                {mode === 'have' && (
                  <p className="text-[11px] text-yvy-muted/70 flex items-center gap-1.5">
                    <span>👆</span>
                    Segure uma figurinha marcada para registrar como repetida
                  </p>
                )}
              </>
            )
          })()}

        <div className="mt-6">
          <StickerGrid
            selected={selected}
            onChange={setSelected}
            onBulkChange={(next, message) => {
              showToast(message, new Set(selected))
              setSelected(next)
            }}
            tradeReceived={
              mode === 'have' && tradeOrigin
                ? new Set(tradeOrigin.fromTradeIds.filter((id) => !duplicateMap.has(id)))
                : undefined
            }
            newestFromTrade={
              mode === 'have' && tradeOrigin ? new Set(tradeOrigin.newestIds) : undefined
            }
            staged={
              mode === 'have'
                ? new Set([...selected].filter((id) => !lastSaved.current.has(id)))
                : undefined
            }
            onLongPress={mode === 'have' ? (id) => setLongPressedId(id) : undefined}
            isProtected={mode === 'have' && albumProtected}
            onProtectedRemove={triggerProtectionAlert}
            incomingStickers={
              mode === 'have' && incomingStickers.size > 0 ? incomingStickers : undefined
            }
            tradeLocked={mode === 'have' && lockedStickers.size > 0 ? lockedStickers : undefined}
          />
        </div>
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
              onChange={handleFileSelect}
              className="block w-full text-sm text-yvy-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-yvy-bg file:text-yvy-dark file:font-medium hover:file:bg-yvy-border"
            />
            {pendingFile && (
              <div className="flex items-center justify-between gap-3 bg-yvy-bg rounded-lg px-3 py-2">
                <span className="text-xs text-yvy-text truncate">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={handleFileImport}
                  disabled={importing}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-yvy-dark text-yvy-gold text-xs font-semibold hover:bg-yvy-dark-hover transition-colors disabled:opacity-50"
                >
                  {importing ? 'Importando...' : 'Importar'}
                </button>
              </div>
            )}
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

      {/* Import summary */}
      {importSummary &&
        (() => {
          const sortFn = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically
          const albumIds = sortFn(importSummary.addedToAlbumIds)
          const dupeIds = sortFn(importSummary.duplicateIds)
          const LIMIT = 30

          return (
            <div className="bg-yvy-surface rounded-xl border border-green-200 shadow-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-yvy-dark">✓ Importação concluída</p>
                <button
                  onClick={() => setImportSummary(null)}
                  className="text-yvy-muted text-sm px-1 leading-none"
                >
                  ✕
                </button>
              </div>

              {albumIds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-green-700">
                    Para colar no álbum ({albumIds.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {albumIds.slice(0, LIMIT).map((id) => (
                      <StickerChip key={id} id={id} variant="green" />
                    ))}
                    {albumIds.length > LIMIT && (
                      <span className="text-[11px] text-yvy-muted py-0.5">
                        +{albumIds.length - LIMIT} mais
                      </span>
                    )}
                  </div>
                </div>
              )}

              {dupeIds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Para separar como repetidas ({dupeIds.length})
                    {importSummary.totalDuplicateCopies > dupeIds.length && (
                      <span className="normal-case font-normal">
                        {' '}
                        · {importSummary.totalDuplicateCopies} cópias extras no total
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {dupeIds.slice(0, LIMIT).map((id) => (
                      <StickerChip key={id} id={id} variant="amber" />
                    ))}
                    {dupeIds.length > LIMIT && (
                      <span className="text-[11px] text-yvy-muted py-0.5">
                        +{dupeIds.length - LIMIT} mais
                      </span>
                    )}
                  </div>
                </div>
              )}

              {albumIds.length === 0 && dupeIds.length === 0 && (
                <p className="text-sm text-yvy-muted">Nenhuma figurinha nova detectada.</p>
              )}

              <a href="/historico" className="text-xs text-yvy-accent underline block">
                Abrir assistente completo no Histórico →
              </a>
            </div>
          )
        })()}

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
              <div className="flex gap-2">
                {hasChanges && (
                  <button
                    onClick={() => setSelected(new Set(lastSaved.current))}
                    disabled={saving}
                    className="px-4 py-3.5 rounded-xl border border-yvy-border text-yvy-muted text-sm font-semibold hover:bg-yvy-bg transition-colors disabled:opacity-40 shrink-0"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover disabled:opacity-40 text-yvy-gold font-semibold py-3.5 rounded-xl text-base transition-colors shadow-lg"
                >
                  {label}
                </button>
              </div>
              {saveMsg && <p className="text-center text-sm mt-2 text-yvy-muted">{saveMsg}</p>}
            </div>
          </div>
        )
      })()}

      {/* Duplicate conflict warning */}
      {dupeWarning && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
          <div className="bg-yvy-surface border border-amber-300 rounded-xl px-4 py-3 shadow-lg w-full max-w-sm space-y-2">
            <p className="text-sm font-semibold text-amber-800">
              {dupeWarning.length === 1
                ? `A figurinha ${dupeWarning[0]} foi removida do álbum mas ainda tem repetidas registradas.`
                : `${dupeWarning.length} figurinhas removidas ainda têm repetidas: ${dupeWarning.join(', ')}.`}
            </p>
            <p className="text-xs text-yvy-muted">As repetidas devem ser revisadas ou limpas.</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={async () => {
                  if (!userId) return
                  setClearingDupes(true)
                  for (const id of dupeWarning) await removeDuplicate(userId, id)
                  setClearingDupes(false)
                  setDupeWarning(null)
                }}
                disabled={clearingDupes}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50"
              >
                {clearingDupes ? 'Limpando...' : 'Limpar automaticamente'}
              </button>
              <a
                href="/duplicates"
                className="flex-1 text-center border border-yvy-border text-yvy-text text-xs font-semibold py-2 rounded-lg hover:bg-yvy-bg"
                onClick={() => setDupeWarning(null)}
              >
                Revisar manualmente
              </a>
            </div>
            <button
              onClick={() => setDupeWarning(null)}
              className="w-full text-xs text-yvy-muted underline pt-0.5"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

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

      {/* Duplicate quick-add popup */}
      {longPressedId && userId && (
        <DuplicateQuickAdd
          id={longPressedId}
          currentCount={duplicateMap.get(longPressedId) ?? 0}
          userId={userId}
          onClose={() => setLongPressedId(null)}
          onSaved={(id, count) => {
            setDuplicateMap((prev) => new Map(prev).set(id, count))
            setLongPressedId(null)
          }}
        />
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
