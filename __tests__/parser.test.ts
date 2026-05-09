import { describe, it, expect } from 'vitest'
import { parseStickerFile } from '@/lib/parser'

describe('parseStickerFile', () => {
  it('parses valid semicolon-separated sticker codes', () => {
    const result = parseStickerFile('MEX1;MEX2;BRA5;FWC00;CC14')
    expect(result).toEqual({
      valid: true,
      stickers: ['MEX1', 'MEX2', 'BRA5', 'FWC00', 'CC14'],
      counts: { MEX1: 1, MEX2: 1, BRA5: 1, FWC00: 1, CC14: 1 },
    })
  })

  it('uppercases and strips spaces', () => {
    const result = parseStickerFile(' mex1 ; bra5 ; fwc00 ')
    expect(result).toEqual({
      valid: true,
      stickers: ['MEX1', 'BRA5', 'FWC00'],
      counts: { MEX1: 1, BRA5: 1, FWC00: 1 },
    })
  })

  it('deduplicates repeated codes and tracks counts', () => {
    const result = parseStickerFile('MEX1;MEX1;BRA5;BRA5;BRA5')
    expect(result).toEqual({
      valid: true,
      stickers: ['MEX1', 'BRA5'],
      counts: { MEX1: 2, BRA5: 3 },
    })
  })

  it('parses newline-separated sticker codes', () => {
    const result = parseStickerFile('MEX1\nMEX2\nBRA5')
    expect(result).toEqual({
      valid: true,
      stickers: ['MEX1', 'MEX2', 'BRA5'],
      counts: { MEX1: 1, MEX2: 1, BRA5: 1 },
    })
  })

  it('parses mixed semicolon and newline separators', () => {
    const result = parseStickerFile('MEX1;MEX2\nBRA5')
    expect(result).toEqual({
      valid: true,
      stickers: ['MEX1', 'MEX2', 'BRA5'],
      counts: { MEX1: 1, MEX2: 1, BRA5: 1 },
    })
  })

  it('handles Windows line endings (CRLF)', () => {
    const result = parseStickerFile('MEX1\r\nMEX2\r\nBRA5')
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.stickers).toEqual(['MEX1', 'MEX2', 'BRA5'])
  })

  it('rejects unknown codes', () => {
    const result = parseStickerFile('XYZ99;MEX1')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('XYZ99'))).toBe(true)
    }
  })

  it('rejects plain numbers (except 00)', () => {
    const result = parseStickerFile('1;5;23')
    expect(result.valid).toBe(false)
  })

  it('normalizes bare 00 to FWC00', () => {
    const result = parseStickerFile('00;MEX1')
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.stickers).toContain('FWC00')
      expect(result.stickers).not.toContain('00')
    }
  })

  it('returns error for empty input', () => {
    const result = parseStickerFile('   ')
    expect(result.valid).toBe(false)
  })

  it('accepts boundary sticker codes', () => {
    const result = parseStickerFile('FWC00;FWC19;CC1;CC14;MEX1;MEX20;PAN20')
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.stickers).toHaveLength(7)
    }
  })

  it('accepts all FWC codes', () => {
    const result = parseStickerFile('FWC9;FWC10;FWC11;FWC19')
    expect(result.valid).toBe(true)
  })
})
