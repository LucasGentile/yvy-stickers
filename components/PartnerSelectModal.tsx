'use client'

import type { AdvancedTradePartner } from '@/actions/getAdvancedTradePartners'

interface Props {
  open: boolean
  partnersList: AdvancedTradePartner[]
  selectedPartnerIds: Set<string> | null
  onSelectedChange: (ids: Set<string>) => void
  onSearch: (ids: string[] | undefined) => void
  onClose: () => void
}

export function PartnerSelectModal({
  open,
  partnersList,
  selectedPartnerIds,
  onSelectedChange,
  onSearch,
  onClose,
}: Props) {
  if (!open) return null

  const allSelected = selectedPartnerIds !== null && selectedPartnerIds.size === partnersList.length

  function handleToggleAll() {
    onSelectedChange(allSelected ? new Set() : new Set(partnersList.map((p) => p.id)))
  }

  function handleTogglePartner(partnerId: string) {
    const next = new Set(selectedPartnerIds ?? partnersList.map((p) => p.id))
    if (next.has(partnerId)) next.delete(partnerId)
    else next.add(partnerId)
    onSelectedChange(next)
  }

  function handleConfirm() {
    const ids =
      selectedPartnerIds !== null && selectedPartnerIds.size < partnersList.length
        ? Array.from(selectedPartnerIds)
        : undefined
    onSearch(ids)
  }

  const confirmCount = selectedPartnerIds?.size ?? partnersList.length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-yvy-surface rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-yvy-border shrink-0">
          <div>
            <p className="text-sm font-bold text-yvy-dark">Filtrar participantes</p>
            <p className="text-[11px] text-yvy-muted">
              Selecione quem considerar na busca triangular
            </p>
          </div>
          <button onClick={onClose} className="text-yvy-muted text-xl leading-none px-1">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-3 flex-1">
          {partnersList.length === 0 ? (
            <p className="text-sm text-yvy-muted text-center py-6">
              Nenhum participante com repetidas cadastradas.
            </p>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleToggleAll}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-yvy-bg transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    allSelected ? 'bg-yvy-accent border-yvy-accent' : 'border-yvy-border'
                  }`}
                >
                  {allSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                </span>
                <span className="text-sm font-semibold text-yvy-dark">Todos os moradores</span>
              </button>
              <div className="border-t border-yvy-border/50 my-1" />
              {partnersList.map((partner) => {
                const checked = selectedPartnerIds?.has(partner.id) ?? false
                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => handleTogglePartner(partner.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-yvy-bg transition-colors"
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        checked ? 'bg-yvy-accent border-yvy-accent' : 'border-yvy-border'
                      }`}
                    >
                      {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                    </span>
                    <span className="text-sm text-yvy-text capitalize">{partner.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-yvy-border shrink-0 space-y-2">
          {selectedPartnerIds !== null && selectedPartnerIds.size === 0 && (
            <p className="text-xs text-amber-600 text-center">
              Selecione ao menos um participante.
            </p>
          )}
          <button
            onClick={handleConfirm}
            disabled={!selectedPartnerIds || selectedPartnerIds.size === 0}
            className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            Buscar ({confirmCount} participante{confirmCount !== 1 ? 's' : ''})
          </button>
          <button
            onClick={onClose}
            className="w-full border border-yvy-border text-yvy-text font-semibold py-2.5 rounded-xl text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
