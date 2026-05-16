'use client'

export function PartnerChip({
  name,
  selected,
  onSelect,
}: {
  name: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
        selected
          ? 'bg-yvy-dark text-white'
          : 'bg-yvy-bg text-yvy-muted border border-yvy-border hover:border-yvy-dark hover:text-yvy-dark'
      }`}
    >
      {name}
    </button>
  )
}

export function VerifiedFilterChip({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
        active
          ? 'bg-amber-500 text-white'
          : 'bg-yvy-bg text-amber-700 border border-amber-300 hover:border-amber-500'
      }`}
    >
      Apenas não verificadas
    </button>
  )
}

export function FilterChipDivider() {
  return <span className="w-px h-4 bg-yvy-border mx-1" />
}
