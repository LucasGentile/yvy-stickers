import { describe, it, expect } from 'vitest'
import { checkExternalList } from '@/lib/checkExternalList'

describe('checkExternalList', () => {
  it('returns empty arrays for empty input', () => {
    expect(checkExternalList('', new Set())).toEqual({ needed: [], owned: [], invalid: [] })
    expect(checkExternalList('   ', new Set())).toEqual({ needed: [], owned: [], invalid: [] })
  })

  it('splits on semicolons and newlines', () => {
    const result = checkExternalList('FWC1;FWC2\nFWC3', new Set())
    expect(result.needed).toEqual(expect.arrayContaining(['FWC1', 'FWC2', 'FWC3']))
    expect(result.needed).toHaveLength(3)
  })

  it('normalizes input to uppercase', () => {
    const result = checkExternalList('fwc1', new Set())
    expect(result.needed).toContain('FWC1')
  })

  it('normalizes "00" to "FWC00"', () => {
    const result = checkExternalList('00', new Set())
    expect(result.needed).toContain('FWC00')
    expect(result.invalid).toHaveLength(0)
  })

  it('puts owned stickers in owned array', () => {
    const owned = new Set(['FWC1', 'FWC2'])
    const result = checkExternalList('FWC1;FWC2;FWC3', owned)
    expect(result.owned).toEqual(expect.arrayContaining(['FWC1', 'FWC2']))
    expect(result.needed).toEqual(['FWC3'])
  })

  it('puts unknown sticker codes in invalid array', () => {
    const result = checkExternalList('FWC1;NOTREAL;FAKE123', new Set())
    expect(result.needed).toContain('FWC1')
    expect(result.invalid).toEqual(expect.arrayContaining(['NOTREAL', 'FAKE123']))
  })

  it('deduplicates stickers (keeps first occurrence)', () => {
    const result = checkExternalList('FWC1;FWC1;FWC1', new Set())
    expect(result.needed).toEqual(['FWC1'])
    expect(result.needed).toHaveLength(1)
  })

  it('deduplication works across owned and needed', () => {
    const owned = new Set(['FWC1'])
    const result = checkExternalList('FWC1;FWC1', owned)
    expect(result.owned).toEqual(['FWC1'])
    expect(result.needed).toHaveLength(0)
  })
})
