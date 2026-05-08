import { STICKER_SET } from '@/lib/stickers'

export type ParseResult =
  | { valid: true; stickers: string[]; counts: Record<string, number> }
  | { valid: false; errors: string[] }

export function parseStickerFile(content: string): ParseResult {
  if (!content.trim()) {
    return { valid: false, errors: ['O arquivo está vazio.'] }
  }

  const parts = content
    .split(/[;\n]/)
    .map((p) => p.trim().toUpperCase())
    .filter((p) => p !== '')

  const errors: string[] = []
  const seen = new Set<string>()
  const stickers: string[] = []
  const counts: Record<string, number> = {}

  for (const part of parts) {
    if (!STICKER_SET.has(part)) {
      errors.push(`Código inválido: "${part}"`)
      continue
    }
    counts[part] = (counts[part] ?? 0) + 1
    if (!seen.has(part)) {
      seen.add(part)
      stickers.push(part)
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, stickers, counts }
}
