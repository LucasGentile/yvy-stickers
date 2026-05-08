import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/actions/getAuditLog', () => ({
  getAuditLog: vi.fn(),
}))

vi.mock('@/actions/rollbackTrade', () => ({
  rollbackTrade: vi.fn(),
}))

import AuditScreen from '@/components/AuditScreen'
import { getAuditLog } from '@/actions/getAuditLog'

const mockGetAuditLog = getAuditLog as ReturnType<typeof vi.fn>

// Stub localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('AuditScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('shows login prompt when no userId in localStorage', async () => {
    render(<AuditScreen />)
    expect(await screen.findByText(/identificar/i)).toBeInTheDocument()
  })

  it('shows empty state when user has no entries', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetAuditLog.mockResolvedValue([])

    render(<AuditScreen />)
    expect(await screen.findByText(/nenhuma ação/i)).toBeInTheDocument()
  })

  it('renders a stickers_saved event', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetAuditLog.mockResolvedValue([
      {
        id: 'entry-1',
        action: 'stickers_saved',
        metadata: { total: 42 },
        created_at: new Date().toISOString(),
      },
    ])

    render(<AuditScreen />)
    expect(await screen.findByText('Álbum salvo')).toBeInTheDocument()
    expect(await screen.findByText(/42 figurinhas/i)).toBeInTheDocument()
  })

  it('renders a trade_accepted event with real-life hint', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetAuditLog.mockResolvedValue([
      {
        id: 'entry-2',
        action: 'trade_accepted',
        metadata: { partnerName: 'Ana Lima', givingCount: 2, receivingCount: 3 },
        created_at: new Date().toISOString(),
      },
    ])

    render(<AuditScreen />)
    expect(await screen.findByText(/Troca concluída com Ana Lima/i)).toBeInTheDocument()
    expect(await screen.findByText(/Combine com Ana Lima/i)).toBeInTheDocument()
  })

  it('renders a trade_rejected event', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetAuditLog.mockResolvedValue([
      {
        id: 'entry-3',
        action: 'trade_rejected',
        metadata: { partnerName: 'João Costa', givingCount: 1, receivingCount: 1 },
        created_at: new Date().toISOString(),
      },
    ])

    render(<AuditScreen />)
    expect(await screen.findByText('Troca recusada')).toBeInTheDocument()
  })

  it('shows error message on fetch failure', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetAuditLog.mockRejectedValue(new Error('Network error'))

    render(<AuditScreen />)
    expect(await screen.findByText(/erro ao carregar/i)).toBeInTheDocument()
  })

  it('groups entries under "Hoje" header for today', async () => {
    localStorageMock.setItem('userId', 'user-1')
    mockGetAuditLog.mockResolvedValue([
      {
        id: 'entry-1',
        action: 'stickers_saved',
        metadata: { total: 5 },
        created_at: new Date().toISOString(),
      },
    ])

    render(<AuditScreen />)
    expect(await screen.findByText('Hoje')).toBeInTheDocument()
  })
})
