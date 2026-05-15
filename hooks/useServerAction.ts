'use client'

import { useState, useCallback, useRef } from 'react'

export function useServerAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>
) {
  const [isPending, setIsPending] = useState(false)
  const inflightRef = useRef(false)

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (inflightRef.current) return undefined
      inflightRef.current = true
      setIsPending(true)
      try {
        return await action(...args)
      } finally {
        inflightRef.current = false
        setIsPending(false)
      }
    },
    [action]
  )

  return { execute, isPending }
}
