import { describe, it, expect } from 'vitest'
import { parseStickerList } from '@/lib/parseStickerList'

// ---------------------------------------------------------------------------
// FORMAT A — "other app" style: emoji + SECTION: num, num, num
// ---------------------------------------------------------------------------

describe('Format A — emoji + section header', () => {
  it('parses a clean other-app export', () => {
    const input = `🏆 FWC: 5
🇧🇷 BRA: 5, 18
🇨🇼 CUW: 1
🇦🇷 ARG: 1
🇨🇨 CC: 3, 6, 7, 8, 9`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(
      expect.arrayContaining([
        'FWC5',
        'BRA5',
        'BRA18',
        'CUW1',
        'ARG1',
        'CC3',
        'CC6',
        'CC7',
        'CC8',
        'CC9',
      ])
    )
    expect(codes).toHaveLength(10)
    expect(unrecognized).toHaveLength(0)
  })

  it('handles a large multi-section other-app export', () => {
    const input = `🏆 FWC: 1, 3, 7, 11, 14, 19
🇲🇽 MEX: 2, 9, 15
🇧🇷 BRA: 1, 4, 6, 12, 17, 20
🇩🇪 GER: 3, 8
🇫🇷 FRA: 5, 10, 16
🇪🇸 ESP: 2, 13
🇵🇹 POR: 7, 18
🇦🇷 ARG: 9, 14
🇨🇨 CC: 1, 4, 9, 12`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toHaveLength(6 + 3 + 6 + 2 + 3 + 2 + 2 + 2 + 4) // 30
    expect(unrecognized).toHaveLength(0)
  })

  it('handles semicolons as number separator inside section line', () => {
    const input = `🇺🇸 USA: 3; 7; 12; 19`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['USA3', 'USA7', 'USA12', 'USA19']))
    expect(unrecognized).toHaveLength(0)
  })

  it('handles section header without emoji', () => {
    const input = `BRA: 5, 18
ARG: 1, 9
FWC: 3, 7`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'BRA18', 'ARG1', 'ARG9', 'FWC3', 'FWC7']))
    expect(unrecognized).toHaveLength(0)
  })

  it('handles FWC00 (zero sticker)', () => {
    const input = `🏆 FWC: 00, 1, 2`
    const { codes } = parseStickerList(input)
    expect(codes).toContain('FWC00')
    expect(codes).toContain('FWC1')
    expect(codes).toContain('FWC2')
  })

  it('handles extra whitespace around colon and numbers', () => {
    const input = `BRA  :  5 ,  18 ,  20`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'BRA18', 'BRA20']))
    expect(unrecognized).toHaveLength(0)
  })

  it('handles mixed emoji flags and trophy emoji in same input', () => {
    const input = `🏅 NED: 4, 11
⚽ ENG: 2, 7, 15
🥇 POR: 1`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(
      expect.arrayContaining(['NED4', 'NED11', 'ENG2', 'ENG7', 'ENG15', 'POR1'])
    )
    expect(unrecognized).toHaveLength(0)
  })

  it('reports unknown section codes as unrecognized', () => {
    const input = `🏆 FWC: 5, 6
🌍 XYZ: 3, 4`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['FWC5', 'FWC6']))
    expect(unrecognized.some((t) => t.includes('XYZ'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// FORMAT B — our repetidas export: SECTIONnum xCount
// ---------------------------------------------------------------------------

describe('Format B — repetidas export (SECTIONnum xCount)', () => {
  it('parses a typical repetidas export', () => {
    const input = `Minhas repetidas:
BRA1 x2
BRA3 x1
ARG5 x3
MEX2 x1
FWC7 x2
CC4 x1`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA1', 'BRA3', 'ARG5', 'MEX2', 'FWC7', 'CC4']))
    expect(codes).toHaveLength(6)
    expect(unrecognized).toHaveLength(0)
  })

  it('ignores the count — does not duplicate codes', () => {
    const input = `BRA5 x5
ARG9 x3`
    const { codes } = parseStickerList(input)
    expect(codes).toEqual(['BRA5', 'ARG9'])
  })

  it('parses export with reservation annotation', () => {
    const input = `BRA1 x3 (2 livres · 1 reservada)
ARG4 x2 (reservada)
MEX7 x1`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA1', 'ARG4', 'MEX7']))
    expect(unrecognized).toHaveLength(0)
  })

  it('handles lowercase section codes from export', () => {
    const input = `bra1 x2\narg5 x1`
    const { codes } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA1', 'ARG5']))
  })
})

// ---------------------------------------------------------------------------
// FORMAT C — bare codes (semicolon / comma / newline / space separated)
// ---------------------------------------------------------------------------

describe('Format C — bare sticker codes', () => {
  it('parses semicolon-separated codes', () => {
    const input = `BRA5;BRA18;ARG1;FWC3;CC7`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(['BRA5', 'BRA18', 'ARG1', 'FWC3', 'CC7'])
    expect(unrecognized).toHaveLength(0)
  })

  it('parses comma-separated codes', () => {
    const input = `ESP2, ESP9, ESP14, ENG3, ENG17`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['ESP2', 'ESP9', 'ESP14', 'ENG3', 'ENG17']))
    expect(unrecognized).toHaveLength(0)
  })

  it('parses newline-separated codes', () => {
    const input = `FRA1\nFRA8\nFRA15\nCC2\nCC11`
    const { codes } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['FRA1', 'FRA8', 'FRA15', 'CC2', 'CC11']))
  })

  it('parses mixed separators', () => {
    const input = `GER3; GER11\nBEL4, BEL9\nJPN2`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['GER3', 'GER11', 'BEL4', 'BEL9', 'JPN2']))
    expect(unrecognized).toHaveLength(0)
  })

  it('deduplicates repeated codes', () => {
    const input = `BRA5;BRA5;ARG1;ARG1;ARG1`
    const { codes } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'ARG1']))
    expect(codes).toHaveLength(2)
  })

  it('handles CRLF line endings', () => {
    const input = `NED6\r\nJPN13\r\nSWE2`
    const { codes } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['NED6', 'JPN13', 'SWE2']))
  })
})

// ---------------------------------------------------------------------------
// MIXED FORMATS in a single paste
// ---------------------------------------------------------------------------

describe('Mixed format — real-world messy pastes', () => {
  it('handles a paste mixing section headers and bare codes', () => {
    const input = `🇧🇷 BRA: 3, 11
ARG5
ESP9; ESP14
🇩🇪 GER: 7, 20`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(
      expect.arrayContaining(['BRA3', 'BRA11', 'ARG5', 'ESP9', 'ESP14', 'GER7', 'GER20'])
    )
    expect(unrecognized).toHaveLength(0)
  })

  it('handles section header followed immediately by bare codes on next lines', () => {
    const input = `🇺🇾 URU: 2, 8
POR6
POR13
🇳🇱 NED: 5`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['URU2', 'URU8', 'POR6', 'POR13', 'NED5']))
    expect(unrecognized).toHaveLength(0)
  })

  it('handles repetidas export mixed with section-header format', () => {
    const input = `BRA1 x2
🇲🇽 MEX: 4, 9
ARG3 x1
FWC: 6, 12`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA1', 'MEX4', 'MEX9', 'ARG3', 'FWC6', 'FWC12']))
    expect(unrecognized).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// EDGE CASES & NOISY INPUT
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('handles empty input', () => {
    const { codes, unrecognized } = parseStickerList('   ')
    expect(codes).toHaveLength(0)
    expect(unrecognized).toHaveLength(0)
  })

  it('handles input that is only whitespace and newlines', () => {
    const { codes } = parseStickerList('\n\n\t  \n')
    expect(codes).toHaveLength(0)
  })

  it('collects unrecognized tokens without throwing', () => {
    // XYZ3 and ABC99 look like codes (letters+digits) but are invalid sections
    const input = `BRA5
XYZ3
ABC99
ARG3`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'ARG3']))
    expect(unrecognized).toEqual(expect.arrayContaining(['XYZ3', 'ABC99']))
  })

  it('ignores header lines like "Minhas repetidas:" or "Figurinhas que preciso:"', () => {
    const input = `Figurinhas que preciso:
BRA5
ARG3
CC7`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'ARG3', 'CC7']))
    // Header line should not appear as unrecognized — it is skipped
    expect(unrecognized.some((t) => t.toLowerCase().includes('preciso'))).toBe(false)
  })

  it('handles zero-padded numbers (e.g. BRA01)', () => {
    const input = `BRA01;ARG09;FWC00`
    const { codes } = parseStickerList(input)
    expect(codes).toContain('BRA1')
    expect(codes).toContain('ARG9')
    expect(codes).toContain('FWC00')
  })

  it('handles lowercase codes', () => {
    const { codes } = parseStickerList('bra5;arg3;fwc7;cc2')
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'ARG3', 'FWC7', 'CC2']))
  })

  it('handles mixed case codes', () => {
    const { codes } = parseStickerList('Bra5; Arg3; FWC7')
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'ARG3', 'FWC7']))
  })

  it('handles sticker numbers at boundaries (1 and 20)', () => {
    const input = `BRA1;BRA20;CC1;CC14;FWC00;FWC19`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toHaveLength(6)
    expect(unrecognized).toHaveLength(0)
  })

  it('treats out-of-range sticker numbers as unrecognized', () => {
    const input = `BRA21;CC15;FWC20`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toHaveLength(0)
    expect(unrecognized).toHaveLength(3)
  })

  it('handles bullet-point prefixes from WhatsApp copy', () => {
    const input = `• BRA5
• ARG3
• FWC7`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'ARG3', 'FWC7']))
    expect(unrecognized).toHaveLength(0)
  })

  it('handles dash prefixes from WhatsApp lists', () => {
    const input = `- BRA5
- ARG3
- FWC7`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'ARG3', 'FWC7']))
    expect(unrecognized).toHaveLength(0)
  })

  it('handles non-breaking spaces (common in WhatsApp pastes)', () => {
    const input = `BRA:\u00a05,\u00a018\nARG:\u00a01`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(expect.arrayContaining(['BRA5', 'BRA18', 'ARG1']))
    expect(unrecognized).toHaveLength(0)
  })

  it('a realistic full message paste with noise around the list', () => {
    const input = `Oi! Essas são as que me faltam:
🇧🇷 BRA: 2, 6, 14
🏆 FWC: 4, 8, 13
🇨🇨 CC: 5, 10
Se tiver alguma me chama!`
    const { codes, unrecognized } = parseStickerList(input)
    expect(codes).toEqual(
      expect.arrayContaining(['BRA2', 'BRA6', 'BRA14', 'FWC4', 'FWC8', 'FWC13', 'CC5', 'CC10'])
    )
    // Natural-language lines should not blow up unrecognized with many tokens
    // (they are skipped as header/footer noise, not tokenized)
    expect(unrecognized.length).toBeLessThanOrEqual(4)
  })
})
