import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album', fontIndex: 0 }),
}))

vi.mock('@/components/CountryFlag', () => ({
  CountryFlag: () => <span data-testid="flag" />,
}))

vi.mock('@/lib/stickers', () => {
  const group = {
    type: 'group',
    label: 'Test Group',
    teams: [
      {
        code: 'AAA',
        name: 'Team AAA',
        flag: '🏳',
        flagCode: 'aa',
        stickers: ['AAA1', 'AAA2'],
      },
      {
        code: 'BBB',
        name: 'Team BBB',
        flag: '🏳',
        flagCode: 'bb',
        stickers: ['BBB1', 'BBB2'],
      },
    ],
  }
  const special = {
    type: 'special',
    label: 'Special Section',
    icon: '⭐',
    stickers: ['FWC01', 'FWC02'],
  }
  return {
    ALL_STICKER_SECTIONS: [group, special],
    isChromeSticker: () => false,
    isCocaColaSticker: () => false,
  }
})

import StickerGrid from '@/components/StickerGrid'

const noop = () => {}

describe('StickerGrid filterPending', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows all sections when filterPending is false', () => {
    render(<StickerGrid selected={new Set()} onChange={noop} filterPending={false} />)
    expect(screen.getByText('Test Group')).toBeInTheDocument()
    expect(screen.getByText('Special Section')).toBeInTheDocument()
  })

  it('hides a section where all stickers are owned', () => {
    const allOwned = new Set(['AAA1', 'AAA2', 'BBB1', 'BBB2'])
    render(<StickerGrid selected={allOwned} onChange={noop} filterPending={true} />)
    expect(screen.queryByText('Test Group')).not.toBeInTheDocument()
  })

  it('shows a section that still has at least one pending sticker', () => {
    const partial = new Set(['AAA1', 'AAA2', 'BBB1'])
    render(<StickerGrid selected={partial} onChange={noop} filterPending={true} />)
    expect(screen.getByText('Test Group')).toBeInTheDocument()
  })

  it('hides a complete team within a visible group section', () => {
    const partial = new Set(['AAA1', 'AAA2'])
    render(<StickerGrid selected={partial} onChange={noop} filterPending={true} />)
    expect(screen.queryByText('Team AAA')).not.toBeInTheDocument()
    expect(screen.getByText('Team BBB')).toBeInTheDocument()
  })

  it('hides special section when all its stickers are owned', () => {
    const allSpecialOwned = new Set(['FWC01', 'FWC02', 'AAA1', 'AAA2', 'BBB1', 'BBB2'])
    render(<StickerGrid selected={allSpecialOwned} onChange={noop} filterPending={true} />)
    expect(screen.queryByText('Special Section')).not.toBeInTheDocument()
  })

  it('shows album complete message when all stickers are owned', () => {
    const all = new Set(['AAA1', 'AAA2', 'BBB1', 'BBB2', 'FWC01', 'FWC02'])
    render(<StickerGrid selected={all} onChange={noop} filterPending={true} />)
    expect(screen.getByText(/Álbum completo/i)).toBeInTheDocument()
  })

  it('does not show album complete message when filterPending is false and all owned', () => {
    const all = new Set(['AAA1', 'AAA2', 'BBB1', 'BBB2', 'FWC01', 'FWC02'])
    render(<StickerGrid selected={all} onChange={noop} filterPending={false} />)
    expect(screen.queryByText(/Álbum completo/i)).not.toBeInTheDocument()
  })
})
