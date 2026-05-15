import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServerAction } from '@/hooks/useServerAction'

describe('useServerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns isPending=false initially', () => {
    const action = vi.fn().mockResolvedValue('result')
    const { result } = renderHook(() => useServerAction(action))

    expect(result.current.isPending).toBe(false)
  })

  it('sets isPending=true while action is in flight', async () => {
    let resolve: (v: string) => void
    const action = vi.fn().mockImplementation(
      () =>
        new Promise<string>((r) => {
          resolve = r
        })
    )

    const { result } = renderHook(() => useServerAction(action))

    let promise: Promise<string | undefined> | undefined
    act(() => {
      promise = result.current.execute('arg1') as Promise<string | undefined>
    })

    expect(result.current.isPending).toBe(true)

    await act(async () => {
      resolve!('done')
      await promise!
    })

    expect(result.current.isPending).toBe(false)
  })

  it('returns the action result on success', async () => {
    const action = vi.fn().mockResolvedValue({ success: true, data: 42 })
    const { result } = renderHook(() => useServerAction(action))

    let returnValue: unknown
    await act(async () => {
      returnValue = await result.current.execute()
    })

    expect(returnValue).toEqual({ success: true, data: 42 })
  })

  it('passes arguments through to the action', async () => {
    const action = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useServerAction(action))

    await act(async () => {
      await result.current.execute('userId', 'stickerId', 5)
    })

    expect(action).toHaveBeenCalledWith('userId', 'stickerId', 5)
  })

  it('prevents double execution while action is in flight', async () => {
    let resolve: (v: string) => void
    const action = vi.fn().mockImplementation(
      () =>
        new Promise<string>((r) => {
          resolve = r
        })
    )

    const { result } = renderHook(() => useServerAction(action))

    let firstPromise: Promise<string | undefined> | undefined
    act(() => {
      firstPromise = result.current.execute() as Promise<string | undefined>
    })

    let secondResult: string | undefined
    act(() => {
      secondResult = undefined
      ;(result.current.execute() as Promise<string | undefined>).then((v) => {
        secondResult = v
      })
    })

    await act(async () => {
      resolve!('first-done')
      await firstPromise!
    })

    expect(action).toHaveBeenCalledTimes(1)
    expect(secondResult).toBeUndefined()
  })

  it('allows execution again after first call completes', async () => {
    const action = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useServerAction(action))

    await act(async () => {
      await result.current.execute()
    })

    await act(async () => {
      await result.current.execute()
    })

    expect(action).toHaveBeenCalledTimes(2)
  })

  it('resets isPending after action throws', async () => {
    const action = vi.fn().mockRejectedValue(new Error('network failure'))
    const { result } = renderHook(() => useServerAction(action))

    await act(async () => {
      try {
        await result.current.execute()
      } catch {
        // expected
      }
    })

    expect(result.current.isPending).toBe(false)
  })

  it('propagates errors from the action', async () => {
    const action = vi.fn().mockRejectedValue(new Error('server error'))
    const { result } = renderHook(() => useServerAction(action))

    await expect(
      act(async () => {
        await result.current.execute()
      })
    ).rejects.toThrow('server error')
  })
})
