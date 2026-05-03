export type ParseResult =
  | { valid: true; stickers: number[] }
  | { valid: false; errors: string[] }

export function parseStickerFile(content: string): ParseResult {
  if (!content.trim()) {
    return { valid: false, errors: ['O arquivo está vazio.'] }
  }

  const parts = content.split(';').map((p) => p.trim()).filter((p) => p !== '')
  const errors: string[] = []
  const seen = new Set<number>()
  const stickers: number[] = []

  for (const part of parts) {
    const n = Number(part)
    if (!Number.isInteger(n) || isNaN(n)) {
      errors.push(`Valor inválido: "${part}"`)
      continue
    }
    if (n < 1 || n > 980) {
      errors.push(`Número fora do intervalo (1–980): ${n}`)
      continue
    }
    if (!seen.has(n)) {
      seen.add(n)
      stickers.push(n)
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, stickers }
}
