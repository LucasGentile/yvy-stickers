'use client'

import { isChromeSticker, isCocaColaSticker } from '@/lib/stickers'

export type StickerChipVariant = 'default' | 'green' | 'amber' | 'giving' | 'receiving'

export function StickerChip({
  id,
  variant = 'default',
  selected = false,
  checked = false,
  onToggle,
  disabled = false,
  size = 'sm',
}: {
  id: string
  variant?: StickerChipVariant
  selected?: boolean
  checked?: boolean
  onToggle?: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const isChrome = isChromeSticker(id)
  const isCoke = isCocaColaSticker(id)
  const interactive = !!onToggle

  const sizeClass =
    size === 'md'
      ? 'text-sm font-semibold px-3 py-1.5 rounded-lg border-2'
      : 'text-[11px] px-2 py-0.5 rounded-md border'

  let containerClass = ''
  if (variant === 'default') {
    containerClass = selected
      ? 'bg-yvy-dark text-white border-yvy-dark'
      : `bg-yvy-bg text-yvy-text border-yvy-border${interactive ? ' hover:border-yvy-dark' : ''}`
  } else if (variant === 'green') {
    if (!interactive) {
      containerClass = 'bg-green-50 border-green-200 text-green-700'
    } else {
      containerClass = checked
        ? 'bg-green-100 border-green-200 text-green-300 line-through opacity-50'
        : 'bg-green-50 border-green-300 text-green-700'
    }
  } else if (variant === 'amber') {
    if (!interactive) {
      containerClass = 'bg-amber-50 border-amber-200 text-amber-700'
    } else {
      containerClass = checked
        ? 'bg-amber-100 border-amber-200 text-amber-300 line-through opacity-50'
        : 'bg-amber-50 border-amber-300 text-amber-700'
    }
  } else if (variant === 'giving') {
    containerClass = checked
      ? 'bg-rose-100 border-rose-200 text-rose-300 line-through opacity-50'
      : 'bg-rose-50 border-rose-300 text-rose-700'
  } else if (variant === 'receiving') {
    containerClass = checked
      ? 'bg-green-100 border-green-200 text-green-300 line-through opacity-50'
      : 'bg-green-50 border-green-300 text-green-700'
  }

  const showSparkle = (variant === 'giving' || variant === 'receiving') && isChrome
  const label = showSparkle ? `✨${id}` : id

  const skipSpecialColor = checked && (variant === 'giving' || variant === 'receiving' || variant === 'green' || variant === 'amber')
  const chromeClass = variant === 'default' && selected ? 'font-bold text-amber-300' : 'font-bold text-amber-500'
  const cokeClass = variant === 'default' && selected ? 'font-bold text-red-300' : 'font-bold text-red-500'

  const badgeColor =
    variant === 'giving' ? 'bg-rose-400' :
    variant === 'amber' ? 'bg-amber-500' :
    'bg-green-500'

  const content = (
    <>
      {isChrome && !skipSpecialColor ? (
        <span className={chromeClass}>{label}</span>
      ) : isCoke && !skipSpecialColor ? (
        <span className={cokeClass}>{id}</span>
      ) : (
        label
      )}
      {checked && interactive && variant !== 'default' && (
        <span
          className={`absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center ${badgeColor}`}
        >
          ✓
        </span>
      )}
    </>
  )

  const baseClass = `relative font-mono transition-colors select-none ${sizeClass} ${containerClass}`

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`${baseClass} disabled:opacity-50`}
      >
        {content}
      </button>
    )
  }

  return <span className={`${baseClass} cursor-default`}>{content}</span>
}
