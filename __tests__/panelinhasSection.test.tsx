import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/actions/getPanelinhas', () => ({
  getPanelinhas: vi.fn(),
}))

import PanelinhasSection from '@/components/PanelinhasSection'
import { getPanelinhas } from '@/actions/getPanelinhas'

const mockGetPanelinhas = getPanelinhas as ReturnType<typeof vi.fn>

function makePairs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    user1Name: `User${i}A`,
    user2Name: `User${i}B`,
    tradeCount: count - i,
  }))
}

describe('PanelinhasSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockGetPanelinhas.mockReturnValue(new Promise(() => {}))
    render(<PanelinhasSection />)
    expect(screen.getByText('Calculando panelinhas...')).toBeInTheDocument()
  })

  it('shows empty state when no pairs exist', async () => {
    mockGetPanelinhas.mockResolvedValue([])
    render(<PanelinhasSection />)
    await waitFor(() => {
      expect(screen.getByText('Nenhuma troca realizada ainda.')).toBeInTheDocument()
    })
  })

  it('renders only the first 5 pairs initially', async () => {
    mockGetPanelinhas.mockResolvedValue(makePairs(12))
    const { container } = render(<PanelinhasSection />)

    await waitFor(() => {
      expect(container.textContent).toContain('User0A')
    })

    expect(container.textContent).toContain('User0A')
    expect(container.textContent).toContain('User4A')
    expect(container.textContent).not.toContain('User5A')
  })

  it('shows "Ver mais" button with remaining count', async () => {
    mockGetPanelinhas.mockResolvedValue(makePairs(12))
    render(<PanelinhasSection />)

    await waitFor(() => {
      expect(screen.getByText(/Ver mais/)).toBeInTheDocument()
    })

    expect(screen.getByText(/7 restantes/)).toBeInTheDocument()
  })

  it('loads next page when "Ver mais" is clicked', async () => {
    mockGetPanelinhas.mockResolvedValue(makePairs(12))
    const { container } = render(<PanelinhasSection />)

    await waitFor(() => {
      expect(screen.getByText(/Ver mais/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Ver mais/))

    expect(container.textContent).toContain('User5A')
    expect(container.textContent).toContain('User9A')
    expect(container.textContent).not.toContain('User10A')
    expect(screen.getByText(/2 restantes/)).toBeInTheDocument()
  })

  it('hides "Ver mais" button when all pairs are visible', async () => {
    mockGetPanelinhas.mockResolvedValue(makePairs(12))
    const { container } = render(<PanelinhasSection />)

    await waitFor(() => {
      expect(screen.getByText(/Ver mais/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Ver mais/))
    fireEvent.click(screen.getByText(/Ver mais/))

    expect(container.textContent).toContain('User11A')
    expect(screen.queryByText(/Ver mais/)).not.toBeInTheDocument()
  })

  it('does not show "Ver mais" when total pairs <= page size', async () => {
    mockGetPanelinhas.mockResolvedValue(makePairs(3))
    const { container } = render(<PanelinhasSection />)

    await waitFor(() => {
      expect(container.textContent).toContain('User0A')
    })

    expect(screen.queryByText(/Ver mais/)).not.toBeInTheDocument()
  })
})
