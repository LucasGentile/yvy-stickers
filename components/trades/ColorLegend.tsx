'use client'

export function ColorLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-yvy-muted bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
      <span className="flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-300" />
        Você dá
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300" />
        Você recebe
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-sky-100 border border-sky-200" />
        Terceiro
      </span>
    </div>
  )
}
