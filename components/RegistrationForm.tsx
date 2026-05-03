'use client'

import { useActionState } from 'react'
import { useEffect } from 'react'
import { registerUser, RegisterUserResult } from '@/actions/registerUser'

const initialState: RegisterUserResult | null = null

export default function RegistrationForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: RegisterUserResult | null, formData: FormData) => {
      return registerUser(formData)
    },
    initialState
  )

  // Returning user: already identified — skip straight to stickers
  useEffect(() => {
    if (localStorage.getItem('userId')) {
      window.location.href = '/stickers'
    }
  }, [])

  useEffect(() => {
    if (state?.success) {
      localStorage.setItem('userId', state.userId)
      localStorage.setItem('displayKey', state.displayKey)
      window.location.href = '/stickers'
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nome completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="ex: Lucas Gentile"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-1">
            Apartamento
          </label>
          <input
            id="apartment"
            name="apartment"
            type="text"
            required
            maxLength={4}
            placeholder="ex: 0806"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label htmlFor="tower" className="block text-sm font-medium text-gray-700 mb-1">
            Torre
          </label>
          <input
            id="tower"
            name="tower"
            type="text"
            required
            maxLength={2}
            placeholder="ex: 2"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          WhatsApp (com DDD)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="ex: 11999998888"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {state && !state.success && <p className="text-red-600 text-sm">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-base transition-colors"
      >
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
