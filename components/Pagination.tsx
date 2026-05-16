'use client'

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 pb-4">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="px-3 py-2 rounded-lg text-xs font-medium bg-yvy-surface border border-yvy-border text-yvy-muted hover:bg-yvy-bg hover:text-yvy-dark hover:border-yvy-dark transition-colors disabled:opacity-30 disabled:hover:bg-yvy-surface disabled:hover:text-yvy-muted disabled:hover:border-yvy-border"
      >
        ← Anterior
      </button>
      <span className="text-[11px] text-yvy-muted font-medium min-w-[3rem] text-center">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page === totalPages - 1}
        className="px-3 py-2 rounded-lg text-xs font-medium bg-yvy-surface border border-yvy-border text-yvy-muted hover:bg-yvy-bg hover:text-yvy-dark hover:border-yvy-dark transition-colors disabled:opacity-30 disabled:hover:bg-yvy-surface disabled:hover:text-yvy-muted disabled:hover:border-yvy-border"
      >
        Próxima →
      </button>
    </div>
  )
}
