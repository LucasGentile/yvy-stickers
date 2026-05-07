'use client'

import { useActionState, useState, useEffect } from 'react'
import { registerUser, RegisterUserResult } from '@/actions/registerUser'
import { loginByPhone, LoginResult } from '@/actions/loginByPhone'

const initialState = null

export default function RegistrationForm() {
  const [mode, setMode] = useState<'register' | 'login'>('register')

  const [regState, regAction, regPending] = useActionState(
    async (_prev: RegisterUserResult | null, formData: FormData) => registerUser(formData),
    initialState
  )

  const [loginState, loginAction, loginPending] = useActionState(
    async (_prev: LoginResult | null, formData: FormData) => loginByPhone(formData),
    initialState
  )

  useEffect(() => {
    if (localStorage.getItem('userId')) {
      window.location.href = '/stickers'
    }
  }, [])

  useEffect(() => {
    const result = mode === 'register' ? regState : loginState
    if (result?.success) {
      localStorage.setItem('userId', result.userId)
      localStorage.setItem('displayKey', result.displayKey)
      window.location.href = '/stickers'
    }
  }, [regState, loginState, mode])

  const error = mode === 'register'
    ? (regState && !regState.success ? regState.error : null)
    : (loginState && !loginState.success ? loginState.error : null)

  const pending = mode === 'register' ? regPending : loginPending

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-yvy-border overflow-hidden text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 py-2 transition-colors ${
            mode === 'register'
              ? 'bg-yvy-dark text-white'
              : 'bg-yvy-bg text-yvy-muted hover:bg-yvy-border'
          }`}
        >
          Novo cadastro
        </button>
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 py-2 transition-colors ${
            mode === 'login'
              ? 'bg-yvy-dark text-white'
              : 'bg-yvy-bg text-yvy-muted hover:bg-yvy-border'
          }`}
        >
          Já sou cadastrado
        </button>
      </div>

      {mode === 'register' ? (
        <form action={regAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-yvy-text mb-1">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="ex: Lucas Gentile"
              className="w-full rounded-lg border border-yvy-border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yvy-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="apartment" className="block text-sm font-medium text-yvy-text mb-1">
                Apartamento
              </label>
              <input
                id="apartment"
                name="apartment"
                type="text"
                required
                maxLength={4}
                placeholder="ex: 0806"
                className="w-full rounded-lg border border-yvy-border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yvy-accent"
              />
            </div>
            <div>
              <label htmlFor="tower" className="block text-sm font-medium text-yvy-text mb-1">
                Torre
              </label>
              <input
                id="tower"
                name="tower"
                type="text"
                required
                maxLength={2}
                placeholder="ex: 2"
                className="w-full rounded-lg border border-yvy-border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yvy-accent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-sm font-medium text-yvy-text mb-1">
              WhatsApp (com DDD)
            </label>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              required
              placeholder="ex: 51999998888"
              className="w-full rounded-lg border border-yvy-border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yvy-accent"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-yvy-dark hover:bg-yvy-dark-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-base transition-colors"
          >
            {pending ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
      ) : (
        <form action={loginAction} className="space-y-4">
          <div>
            <label htmlFor="login-phone" className="block text-sm font-medium text-yvy-text mb-1">
              WhatsApp (com DDD)
            </label>
            <input
              id="login-phone"
              name="phone"
              type="tel"
              required
              autoFocus
              placeholder="ex: 51999998888"
              className="w-full rounded-lg border border-yvy-border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yvy-accent"
            />
            <p className="text-xs text-yvy-muted mt-1.5">
              Use o mesmo número com que você se cadastrou no celular.
            </p>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-yvy-dark hover:bg-yvy-dark-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-base transition-colors"
          >
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      )}
    </div>
  )
}
