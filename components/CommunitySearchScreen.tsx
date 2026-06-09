'use client'

import LoadingScreen from '@/components/LoadingScreen'
import { useState, useEffect, useTransition } from 'react'
import { parseStickerList } from '@/lib/parseStickerList'
import {
  searchCommunityDuplicates,
  type CommunitySearchResult,
} from '@/actions/searchCommunityDuplicates'
import { getPurchaseRequests } from '@/actions/getPurchaseRequests'
import { StickerChip } from './StickerChip'
import { PurchaseRequestModal } from './PurchaseRequestModal'

export default function CommunitySearchScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [results, setResults] = useState<CommunitySearchResult[] | null>(null)
  const [isSearching, startSearch] = useTransition()
  const [pendingSellerIds, setPendingSellerIds] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<CommunitySearchResult | null>(null)

  const parsed = parseStickerList(input)
  const hasInput = parsed.codes.length > 0

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    setUserId(uid)
    if (!uid) {
      setLoading(false)
      return
    }
    // Pre-load pending outgoing requests so we can disable "Solicitar" for existing ones
    getPurchaseRequests(uid)
      .then((r) => {
        const ids = new Set(r.outgoing.filter((p) => p.status === 'pending').map((p) => p.sellerId))
        setPendingSellerIds(ids)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSearch() {
    if (!userId || parsed.codes.length === 0) return
    startSearch(async () => {
      const r = await searchCommunityDuplicates(userId, parsed.codes)
      setResults(r)
    })
  }

  function handleModalSuccess() {
    setModal(null)
    if (!userId) return
    // Refresh pending seller ids
    getPurchaseRequests(userId)
      .then((r) => {
        const ids = new Set(r.outgoing.filter((p) => p.status === 'pending').map((p) => p.sellerId))
        setPendingSellerIds(ids)
      })
      .catch(() => {})
  }

  if (loading) return <LoadingScreen />

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
    <>
      {modal && (
        <PurchaseRequestModal
          buyerId={userId}
          seller={modal}
          stickerIds={modal.availableStickers}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
        <div>
          <h2 className="text-lg font-bold text-yvy-dark border-l-4 border-yvy-accent pl-3 mb-1">
            Buscar Figurinhas
          </h2>
          <p className="text-xs text-yvy-muted pl-3">
            Cole a lista de figurinhas que você precisa. Aceitamos diferentes formatos.
          </p>
        </div>

        {/* Input area */}
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setResults(null)
            }}
            placeholder={`Cole a lista aqui. Exemplos:\n🇧🇷 BRA: 5, 18\nFWC: 3, 7\nARG3;CC5`}
            rows={6}
            className="w-full text-sm border border-yvy-border rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg font-mono"
          />

          {/* Live parse preview */}
          {input.trim() && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {parsed.codes.length > 0 && (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                  ✓ {parsed.codes.length} figurinha{parsed.codes.length !== 1 ? 's' : ''}{' '}
                  reconhecida{parsed.codes.length !== 1 ? 's' : ''}
                </span>
              )}
              {parsed.codes.length === 0 && (
                <span className="text-xs text-yvy-muted">Nenhuma figurinha reconhecida ainda…</span>
              )}
              {parsed.unrecognized.map((t) => (
                <span
                  key={t}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-mono"
                >
                  ⚠ {t}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={!hasInput || isSearching}
            className="w-full py-3 rounded-xl bg-yvy-accent text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {isSearching ? 'Buscando…' : 'Buscar na comunidade'}
          </button>
        </div>

        {/* Results */}
        {results !== null && !isSearching && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-yvy-dark">
              {results.length === 0
                ? 'Nenhum morador tem essas figurinhas disponíveis'
                : `${results.length} morador${results.length !== 1 ? 'es' : ''} com figurinhas disponíveis`}
            </h3>

            {results.length === 0 && (
              <p className="text-sm text-yvy-muted">
                Nenhuma das figurinhas da sua lista está disponível como repetida entre os moradores
                do YVY no momento.
              </p>
            )}

            {results.map((r) => {
              const alreadyPending = pendingSellerIds.has(r.userId)
              return (
                <div
                  key={r.userId}
                  className="rounded-xl border border-yvy-border bg-yvy-surface p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-yvy-dark">{r.displayName}</p>
                      <p className="text-xs text-yvy-muted">
                        Apto {r.apartment} – Torre {r.tower}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-yvy-accent whitespace-nowrap">
                      {r.availableStickers.length} disponív
                      {r.availableStickers.length !== 1 ? 'eis' : 'el'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {r.availableStickers.map((id) => (
                      <StickerChip key={id} id={id} variant="green" />
                    ))}
                  </div>

                  <button
                    onClick={() => setModal(r)}
                    disabled={alreadyPending}
                    title={alreadyPending ? 'Pedido já enviado' : undefined}
                    className="w-full py-2 rounded-lg bg-yvy-accent text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    {alreadyPending
                      ? 'Pedido já enviado'
                      : `Solicitar estas ${r.availableStickers.length}`}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
