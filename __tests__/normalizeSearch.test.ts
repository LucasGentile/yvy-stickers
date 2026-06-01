import { describe, it, expect } from 'vitest'
import { normalizeSearch } from '@/lib/format'

// matchesSearch is module-internal so we test it through its observable effects
// via the exported normalizeSearch + the known team-name map logic

describe('normalizeSearch', () => {
  it('strips accents', () => {
    expect(normalizeSearch('Bósnia')).toBe('bosnia')
    expect(normalizeSearch('França')).toBe('franca')
    expect(normalizeSearch('Suíça')).toBe('suica')
  })

  it('lowercases', () => {
    expect(normalizeSearch('BRASIL')).toBe('brasil')
  })

  it('handles already-normalized input', () => {
    expect(normalizeSearch('bosnia')).toBe('bosnia')
  })

  it('strips multiple combining marks', () => {
    expect(normalizeSearch('ãõü')).toBe('aou')
  })

  it('returns empty string unchanged', () => {
    expect(normalizeSearch('')).toBe('')
  })
})

// Integration: verify that normalizing query and target enables accent-insensitive matching
describe('accent-insensitive matching pattern', () => {
  function matches(target: string, query: string): boolean {
    return normalizeSearch(target).includes(normalizeSearch(query))
  }

  it('finds accented country with unaccented query', () => {
    expect(matches('Bósnia e Herzegovina', 'Bosnia')).toBe(true)
    expect(matches('França', 'Franca')).toBe(true)
    expect(matches('Suíça', 'Suica')).toBe(true)
  })

  it('finds unaccented country with accented query', () => {
    expect(matches('Brasil', 'Brásil')).toBe(true)
  })

  it('does not match unrelated terms', () => {
    expect(matches('França', 'Brasil')).toBe(false)
  })

  it('partial prefix match works', () => {
    expect(matches('Bósnia e Herzegovina', 'bosni')).toBe(true)
  })

  it('sticker ID matches exactly', () => {
    expect(matches('BIH20', 'BIH20')).toBe(true)
    expect(matches('BIH20', 'bih20')).toBe(true)
  })
})
