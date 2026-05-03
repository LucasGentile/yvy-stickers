import { describe, it, expect } from 'vitest'
import { parseStickerFile } from '@/lib/parser'

describe('parseStickerFile', () => {
  it('parses valid semicolon-separated input', () => {
    const result = parseStickerFile('1;5;23;105;300')
    expect(result).toEqual({ valid: true, stickers: [1, 5, 23, 105, 300] })
  })

  it('strips spaces around numbers', () => {
    const result = parseStickerFile(' 1 ; 5 ; 23 ')
    expect(result).toEqual({ valid: true, stickers: [1, 5, 23] })
  })

  it('deduplicates repeated numbers', () => {
    const result = parseStickerFile('5;5;10;10')
    expect(result).toEqual({ valid: true, stickers: [5, 10] })
  })

  it('rejects numbers below 1', () => {
    const result = parseStickerFile('0;5')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('0'))).toBe(true)
    }
  })

  it('rejects numbers above 980', () => {
    const result = parseStickerFile('981;5')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('981'))).toBe(true)
    }
  })

  it('rejects non-numeric values', () => {
    const result = parseStickerFile('abc;5')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('abc'))).toBe(true)
    }
  })

  it('returns error for empty input', () => {
    const result = parseStickerFile('   ')
    expect(result.valid).toBe(false)
  })

  it('accepts boundary values 1 and 980', () => {
    const result = parseStickerFile('1;980')
    expect(result).toEqual({ valid: true, stickers: [1, 980] })
  })
})
