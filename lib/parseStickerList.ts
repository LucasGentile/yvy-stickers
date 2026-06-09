import { STICKER_SET } from '@/lib/stickers'

export type ParseResult = {
  codes: string[]
  unrecognized: string[]
}

// Matches tokens that look like sticker codes: 2-4 letters followed by 1-2 digits.
const CODE_SHAPE = /^[A-Za-z]{2,4}\d{1,2}$/

// Normalize a raw number string + section into a canonical sticker code.
// Handles zero-padding (BRA01 → BRA1) and FWC00 special case.
function resolveCode(section: string, numStr: string): string | null {
  const n = numStr.replace(/\s/g, '')
  if (n === '00') return `${section}00`
  const int = parseInt(n, 10)
  if (isNaN(int)) return null
  return `${section}${int}`
}

// Normalize a raw bare token into a canonical code (handles zero-padding).
function normalizeToken(raw: string): string {
  const upper = raw.toUpperCase()
  if (STICKER_SET.has(upper)) return upper
  // Strip leading zeros from the number part: BRA01 → BRA1
  const denorm = upper.replace(/^([A-Z]{2,4})0+(\d)$/, '$1$2')
  if (STICKER_SET.has(denorm)) return denorm
  return upper // return as-is for unrecognized tracking
}

export function parseStickerList(raw: string): ParseResult {
  const seen = new Set<string>()
  const codes: string[] = []
  const unrecognizedSet = new Set<string>()

  function addCode(candidate: string) {
    const normalized = normalizeToken(candidate)
    if (STICKER_SET.has(normalized)) {
      if (!seen.has(normalized)) {
        seen.add(normalized)
        codes.push(normalized)
      }
    } else if (CODE_SHAPE.test(candidate.trim())) {
      // Looks like a code but isn't valid — report it
      unrecognizedSet.add(candidate.toUpperCase())
    }
  }

  const lines = raw.split(/\r?\n/)

  for (const rawLine of lines) {
    // Strip leading non-letter characters (emoji, flags, bullets, dashes, spaces)
    const line = rawLine.replace(/^[^A-Za-z]+/, '').trim()
    if (!line) continue

    // Format A: SECTION: num, num, num  (other-app format, optional emoji already stripped)
    const matchA = line.match(/^([A-Za-z]{2,4})\s*:\s*(.+)$/)
    if (matchA) {
      const section = matchA[1].toUpperCase()
      const numPart = matchA[2]
      const nums = numPart.split(/[,;]+/)
      for (const numRaw of nums) {
        const numStr = numRaw.trim()
        if (!numStr) continue
        const candidate = resolveCode(section, numStr)
        if (candidate) addCode(candidate)
      }
      continue
    }

    // Format B: SECTIONnum xCount (repetidas export, optional annotation after)
    const matchB = line.match(/^([A-Za-z]{2,4}\d{1,2})\s+x\d+/i)
    if (matchB) {
      addCode(matchB[1])
      continue
    }

    // Format C: tokenize by separators, process only code-shaped tokens
    const tokens = line
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    const codeTokens = tokens.filter((t) => CODE_SHAPE.test(t))

    // If no code-shaped tokens exist, this line is natural language — skip entirely
    if (codeTokens.length === 0) continue

    for (const token of codeTokens) {
      addCode(token)
    }
  }

  return { codes, unrecognized: Array.from(unrecognizedSet) }
}
