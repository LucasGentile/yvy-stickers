'use client'

import { memo } from 'react'

interface Props {
  selected: Set<number>
  onChange: (next: Set<number>) => void
}

const TOTAL = 980

function StickerGrid({ selected, onChange }: Props) {
  function toggle(n: number) {
    const next = new Set(selected)
    if (next.has(n)) {
      next.delete(n)
    } else {
      next.add(n)
    }
    onChange(next)
  }

  return (
    <div
      className="grid gap-1 max-h-80 overflow-y-auto"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))' }}
    >
      {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => {
        const on = selected.has(n)
        return (
          <button
            key={n}
            type="button"
            onClick={() => toggle(n)}
            className={`aspect-square flex items-center justify-center rounded text-xs font-medium transition-colors ${
              on ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

export default memo(StickerGrid)
