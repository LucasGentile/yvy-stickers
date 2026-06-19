import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/stickers',
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album', setStickerOrder: vi.fn(), setFontIndex: vi.fn() }),
}))

vi.mock('@/contexts/MuralTabContext', () => ({
  useMuralTab: () => ({ tab: 'trocas', setTab: vi.fn() }),
  MURAL_TABS: [],
}))

vi.mock('@/components/NotificationBanner', () => ({ default: () => null }))
vi.mock('@/components/CancelledTradesBanner', () => ({ default: () => null }))

vi.mock('@/actions/getBadgeCounts', () => ({
  getBadgeCounts: vi.fn().mockResolvedValue({
    pendingTrades: 0,
    pendingApproval: null,
    purchaseRequests: 0,
    advancedTradePending: 0,
    advancedTradeEligible: false,
  }),
}))

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
)

import Header from '@/components/Header'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('Header logout', () => {
  it('removes userId and displayKey from localStorage and redirects to / on logout', async () => {
    localStorage.setItem('userId', 'user-123')
    localStorage.setItem('displayKey', 'ABC')

    await act(async () => {
      render(<Header />)
    })

    fireEvent.click(screen.getByLabelText('Abrir menu'))
    fireEvent.click(screen.getByText('Sair'))

    expect(localStorage.getItem('userId')).toBeNull()
    expect(localStorage.getItem('displayKey')).toBeNull()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('does not affect unrelated localStorage keys on logout', async () => {
    localStorage.setItem('userId', 'user-123')
    localStorage.setItem('displayKey', 'ABC')
    localStorage.setItem('stickerOrder', 'alpha')
    localStorage.setItem('fontSize', '1')

    await act(async () => {
      render(<Header />)
    })

    fireEvent.click(screen.getByLabelText('Abrir menu'))
    fireEvent.click(screen.getByText('Sair'))

    expect(localStorage.getItem('stickerOrder')).toBe('alpha')
    expect(localStorage.getItem('fontSize')).toBe('1')
  })
})
