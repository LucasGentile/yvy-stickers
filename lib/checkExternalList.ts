import { STICKER_SET } from './stickers'

export function checkExternalList(
  content: string,
  ownedSet: Set<string>
): { needed: string[]; owned: string[]; invalid: string[] } {
  const parts = content
    .split(/[;\n]/)
    .map((p) => {
      const n = p.trim().toUpperCase()
      return n === '00' ? 'FWC00' : n
    })
    .filter((p) => p !== '')

  const needed: string[] = []
  const owned: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  for (const part of parts) {
    if (!STICKER_SET.has(part)) {
      invalid.push(part)
      continue
    }
    if (seen.has(part)) continue
    seen.add(part)
    if (ownedSet.has(part)) owned.push(part)
    else needed.push(part)
  }

  return { needed, owned, invalid }
}
