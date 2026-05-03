import { describe, it, expect } from 'vitest'
import { normalizeText, buildDisplayKey } from '@/lib/normalize'

describe('normalizeText', () => {
  it('lowercases the value', () => {
    expect(normalizeText('LUCAS')).toBe('lucas')
  })

  it('trims leading and trailing spaces', () => {
    expect(normalizeText('  Lucas  ')).toBe('lucas')
  })

  it('lowercases and trims together', () => {
    expect(normalizeText('  Lucas Gentile  ')).toBe('lucas gentile')
  })

  it('handles already normalized input', () => {
    expect(normalizeText('lucas')).toBe('lucas')
  })
})

describe('buildDisplayKey', () => {
  it('builds key in name-apartment-tower format', () => {
    expect(buildDisplayKey('Lucas', '0806', '2')).toBe('lucas-0806-2')
  })

  it('normalizes each part', () => {
    expect(buildDisplayKey('  LUCAS  ', '0806', '2')).toBe('lucas-0806-2')
  })
})
