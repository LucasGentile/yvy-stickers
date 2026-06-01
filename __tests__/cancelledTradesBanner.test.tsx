import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockGetUnacknowledged = vi.fn()
vi.mock('@/actions/getUnacknowledgedCancellations', () => ({
  getUnacknowledgedCancellations: (...args: unknown[]) => mockGetUnacknowledged(...args),
}))

import CancelledTradesBanner from '@/components/CancelledTradesBanner'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('CancelledTradesBanner', () => {
  it('renders nothing when no userId in localStorage', async () => {
    mockGetUnacknowledged.mockResolvedValue([])
    const { container } = render(<CancelledTradesBanner />)
    await waitFor(() => expect(mockGetUnacknowledged).not.toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when there are no unacknowledged cancellations', async () => {
    localStorage.setItem('userId', 'user-a')
    mockGetUnacknowledged.mockResolvedValue([])
    const { container } = render(<CancelledTradesBanner />)
    await waitFor(() => expect(mockGetUnacknowledged).toHaveBeenCalledWith('user-a'))
    expect(container.firstChild).toBeNull()
  })

  it('renders banner with partner name and sticker count', async () => {
    localStorage.setItem('userId', 'user-a')
    mockGetUnacknowledged.mockResolvedValue([
      {
        id: 'trade-1',
        otherUserName: 'Diego Estima',
        myGivingIds: ['BRA1', 'ARG1'],
        status: 'cancelled',
      },
    ])
    render(<CancelledTradesBanner />)
    await waitFor(() => screen.getByText(/Diego Estima/))
    expect(screen.getByText(/2 figurinhas/)).toBeInTheDocument()
  })

  it('shows singular figurinha for single sticker', async () => {
    localStorage.setItem('userId', 'user-a')
    mockGetUnacknowledged.mockResolvedValue([
      { id: 'trade-1', otherUserName: 'Alice', myGivingIds: ['MEX1'], status: 'cancelled' },
    ])
    render(<CancelledTradesBanner />)
    await waitFor(() => screen.getByText(/Alice/))
    expect(screen.getByText(/a figurinha/)).toBeInTheDocument()
  })

  it('navigates to /matches when clicked', async () => {
    localStorage.setItem('userId', 'user-a')
    mockGetUnacknowledged.mockResolvedValue([
      { id: 'trade-1', otherUserName: 'Alice', myGivingIds: ['MEX1'], status: 'cancelled' },
    ])
    render(<CancelledTradesBanner />)
    await waitFor(() => screen.getByText(/Alice/))
    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/matches')
  })

  it('lists multiple partners with "e" conjunction', async () => {
    localStorage.setItem('userId', 'user-a')
    mockGetUnacknowledged.mockResolvedValue([
      { id: 'trade-1', otherUserName: 'Alice', myGivingIds: ['MEX1'], status: 'cancelled' },
      { id: 'trade-2', otherUserName: 'Bob', myGivingIds: ['BRA1'], status: 'rejected' },
    ])
    render(<CancelledTradesBanner />)
    await waitFor(() => screen.getByText(/Alice e Bob/))
  })
})
