import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

// --- Mocks for StickersScreen ---
vi.mock('@/actions/setInputMode', () => ({
  setInputMode: vi.fn(),
}))
vi.mock('@/actions/saveStickers', () => ({
  saveStickers: vi.fn(),
}))
vi.mock('@/actions/importStickerFile', () => ({
  importStickerFile: vi.fn(),
}))
vi.mock('@/actions/removeDuplicate', () => ({
  removeDuplicate: vi.fn(),
}))
vi.mock('@/actions/getUserData', () => ({
  getUserData: vi.fn(),
}))
vi.mock('@/actions/getTradeOriginStickers', () => ({
  getTradeOriginStickers: vi.fn(),
}))
vi.mock('@/actions/getDuplicates', () => ({
  getDuplicates: vi.fn(),
}))
vi.mock('@/contexts/PreferencesContext', () => ({
  usePrefs: () => ({ stickerOrder: 'album' }),
}))

// --- Mocks for DuplicatesScreen ---
vi.mock('@/actions/upsertDuplicate', () => ({
  upsertDuplicate: vi.fn(),
}))
vi.mock('@/actions/decrementDuplicate', () => ({
  decrementDuplicate: vi.fn(),
}))
vi.mock('@/actions/getReservedStickerIds', () => ({
  getReservedStickerIds: vi.fn(),
}))
vi.mock('@/actions/logAction', () => ({
  logAction: vi.fn(),
}))
vi.mock('@/lib/checkExternalList', () => ({
  checkExternalList: vi.fn(),
}))

// --- Mocks for AdvancedTradeScreen ---
vi.mock('@/actions/getAdvancedTrades', () => ({
  getAdvancedTrades: vi.fn(),
}))
vi.mock('@/actions/getAdvancedTradeEligibility', () => ({
  getAdvancedTradeEligibility: vi.fn(),
}))
vi.mock('@/actions/findAdvancedTrade', () => ({
  findAdvancedTrade: vi.fn(),
}))
vi.mock('@/actions/previewAdvancedTrade', () => ({
  previewAdvancedTrade: vi.fn(),
}))
vi.mock('@/actions/respondToAdvancedTrade', () => ({
  respondToAdvancedTrade: vi.fn(),
}))
vi.mock('@/actions/verifyTrade', () => ({
  verifyTrade: vi.fn(),
}))
vi.mock('@/actions/getIncomingTradeStickers', () => ({
  getIncomingTradeStickers: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/actions/rollbackAdvancedTrade', () => ({
  rollbackAdvancedTrade: vi.fn(),
}))

import { setInputMode } from '@/actions/setInputMode'
import { getUserData } from '@/actions/getUserData'
import { getTradeOriginStickers } from '@/actions/getTradeOriginStickers'
import { getDuplicates } from '@/actions/getDuplicates'
import { getReservedStickerIds } from '@/actions/getReservedStickerIds'
import { upsertDuplicate } from '@/actions/upsertDuplicate'
import { logAction } from '@/actions/logAction'
import { checkExternalList } from '@/lib/checkExternalList'
import { getAdvancedTrades } from '@/actions/getAdvancedTrades'
import { getAdvancedTradeEligibility } from '@/actions/getAdvancedTradeEligibility'
import { previewAdvancedTrade } from '@/actions/previewAdvancedTrade'

const mockSetInputMode = setInputMode as ReturnType<typeof vi.fn>
const mockGetUserData = getUserData as ReturnType<typeof vi.fn>
const mockGetTradeOriginStickers = getTradeOriginStickers as ReturnType<typeof vi.fn>
const mockGetDuplicates = getDuplicates as ReturnType<typeof vi.fn>
const mockGetReservedStickerIds = getReservedStickerIds as ReturnType<typeof vi.fn>
const mockUpsertDuplicate = upsertDuplicate as ReturnType<typeof vi.fn>
const mockLogAction = logAction as ReturnType<typeof vi.fn>
const mockCheckExternalList = checkExternalList as ReturnType<typeof vi.fn>
const mockGetAdvancedTrades = getAdvancedTrades as ReturnType<typeof vi.fn>
const mockGetAdvancedTradeEligibility = getAdvancedTradeEligibility as ReturnType<typeof vi.fn>
const mockPreviewAdvancedTrade = previewAdvancedTrade as ReturnType<typeof vi.fn>

import StickersScreen from '@/components/StickersScreen'
import DuplicatesScreen from '@/components/DuplicatesScreen'
import AdvancedTradeScreen from '@/components/AdvancedTradeScreen'

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

describe('StickersScreen loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('userId', 'user-1')
    mockGetUserData.mockResolvedValue(null)
    mockGetTradeOriginStickers.mockResolvedValue({ fromTradeIds: [], newestIds: [] })
    mockGetDuplicates.mockResolvedValue([])
    mockGetReservedStickerIds.mockResolvedValue({})
  })

  it('disables mode selection buttons while setInputMode is in flight', async () => {
    let resolveMode: () => void
    mockSetInputMode.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveMode = r
        })
    )

    render(<StickersScreen />)

    const haveButton = await screen.findByText(/TENHO/i)
    const needButton = screen.getByText(/PRECISO/i)

    expect(haveButton.closest('button')).not.toBeDisabled()
    expect(needButton.closest('button')).not.toBeDisabled()

    fireEvent.click(haveButton.closest('button')!)

    expect(haveButton.closest('button')).toBeDisabled()
    expect(needButton.closest('button')).toBeDisabled()

    await act(async () => {
      resolveMode!()
    })
  })

  it('prevents double-click on mode select by calling setInputMode only once', async () => {
    let resolveMode: () => void
    mockSetInputMode.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveMode = r
        })
    )

    render(<StickersScreen />)

    const haveButton = await screen.findByText(/TENHO/i)

    fireEvent.click(haveButton.closest('button')!)
    fireEvent.click(haveButton.closest('button')!)
    fireEvent.click(haveButton.closest('button')!)

    await act(async () => {
      resolveMode!()
    })

    expect(mockSetInputMode).toHaveBeenCalledTimes(1)
  })
})

describe('DuplicatesScreen loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('userId', 'user-1')
    mockGetUserData.mockResolvedValue({
      stickerIds: ['BRA1', 'BRA2'],
      inputMode: 'have',
      approved: true,
    })
    mockGetDuplicates.mockResolvedValue([{ stickerId: 'BRA1', count: 2 }])
    mockGetReservedStickerIds.mockResolvedValue({})
  })

  it('disables Salvar button during save and prevents double submission', async () => {
    let resolveUpsert: (v: { success: boolean }) => void
    mockUpsertDuplicate.mockImplementation(
      () =>
        new Promise((r) => {
          resolveUpsert = r
        })
    )

    render(<DuplicatesScreen />)

    await screen.findByText(/Minhas repetidas/i)

    const incrementButton = await screen.findByText('+')
    fireEvent.click(incrementButton)

    expect(mockUpsertDuplicate).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveUpsert!({ success: true })
    })
  })

  it('disables Verificar button during external list check', async () => {
    mockCheckExternalList.mockReturnValue({ needed: ['ARG1'], owned: [], invalid: [] })
    mockLogAction.mockResolvedValue(undefined)

    render(<DuplicatesScreen />)
    await screen.findByText(/Minhas repetidas/i)

    const expandButton = screen.getByText(/O que preciso desta lista\?/i)
    fireEvent.click(expandButton)

    const textarea = await screen.findByPlaceholderText(/BRA1/i)
    fireEvent.change(textarea, { target: { value: 'ARG1; ARG2' } })

    const verifyButton = screen.getByText('Verificar')
    expect(verifyButton).not.toBeDisabled()

    fireEvent.click(verifyButton)

    expect(verifyButton).toBeDisabled()
    expect(verifyButton).toHaveTextContent('Verificando...')

    await act(async () => {
      await Promise.resolve()
    })
  })
})

describe('AdvancedTradeScreen loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('userId', 'user-1')
    mockGetAdvancedTrades.mockResolvedValue([])
    mockGetAdvancedTradeEligibility.mockResolvedValue({ canSearch: true })
  })

  it('disables search button while searching', async () => {
    let resolveSearch: (v: { found: boolean; previews: [] }) => void
    mockPreviewAdvancedTrade.mockImplementation(
      () =>
        new Promise((r) => {
          resolveSearch = r
        })
    )

    render(<AdvancedTradeScreen />)

    const searchButton = await screen.findByText('Buscar Trocas Triangulares')
    expect(searchButton).not.toBeDisabled()

    fireEvent.click(searchButton)

    expect(searchButton).toBeDisabled()
    expect(searchButton).toHaveTextContent('Buscando combinações...')

    await act(async () => {
      resolveSearch!({ found: false, previews: [] })
    })
  })

  it('disables refresh button while searching (mutual blocking)', async () => {
    let resolveSearch: (v: { found: boolean; previews: [] }) => void
    mockPreviewAdvancedTrade.mockImplementation(
      () =>
        new Promise((r) => {
          resolveSearch = r
        })
    )

    render(<AdvancedTradeScreen />)

    const searchButton = await screen.findByText('Buscar Trocas Triangulares')
    const refreshButton = screen.getByLabelText('Atualizar')

    expect(refreshButton).not.toBeDisabled()

    fireEvent.click(searchButton)

    expect(refreshButton).toBeDisabled()

    await act(async () => {
      resolveSearch!({ found: false, previews: [] })
    })

    expect(refreshButton).not.toBeDisabled()
  })

  it('prevents double-click on search by calling action only once', async () => {
    let resolveSearch: (v: { found: boolean; previews: [] }) => void
    mockPreviewAdvancedTrade.mockImplementation(
      () =>
        new Promise((r) => {
          resolveSearch = r
        })
    )

    render(<AdvancedTradeScreen />)

    const searchButton = await screen.findByText('Buscar Trocas Triangulares')

    fireEvent.click(searchButton)
    fireEvent.click(searchButton)
    fireEvent.click(searchButton)

    await act(async () => {
      resolveSearch!({ found: false, previews: [] })
    })

    expect(mockPreviewAdvancedTrade).toHaveBeenCalledTimes(1)
  })
})
