'use client'

import { useEffect, useState } from 'react'
import { getPendingUsers, PendingUser } from '@/actions/getPendingUsers'
import { approveUser } from '@/actions/approveUser'

function formatPhone(phone: string) {
  // stored as digits e.g. "51992167812" → "51 99216-7812"
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    if (!uid) {
      setLoading(false)
      return
    }
    setUserId(uid)
    getPendingUsers(uid)
      .then((data) => {
        if (data === null) {
          setError('Acesso não autorizado.')
        } else {
          setUsers(data)
        }
      })
      .catch(() => setError('Erro ao carregar aprovações.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleApprove(targetId: string) {
    if (!userId) return
    setApproving(targetId)
    const result = await approveUser(userId, targetId)
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== targetId))
    } else {
      setError(result.error)
    }
    setApproving(null)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Carregando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Aprovações Pendentes
        </h2>
        <span className="text-sm font-semibold text-yvy-accent">
          {users.length}
          <span className="text-yvy-muted font-normal"> pendente{users.length !== 1 ? 's' : ''}</span>
        </span>
      </div>

      {users.length === 0 ? (
        <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-8 text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-sm font-medium text-yvy-dark">Nenhuma aprovação pendente</p>
          <p className="text-xs text-yvy-muted">Todos os cadastros foram processados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold text-yvy-dark text-sm leading-snug">{user.name}</p>
                  <p className="text-xs text-yvy-muted">
                    Torre {user.tower} · Apto {user.apartment}
                  </p>
                  <p className="text-xs text-yvy-muted font-mono">📱 {formatPhone(user.phone)}</p>
                  <p className="text-[10px] text-yvy-muted">
                    Cadastro em {formatDate(user.created_at)}
                  </p>
                </div>

                <button
                  onClick={() => handleApprove(user.id)}
                  disabled={approving === user.id}
                  className="shrink-0 bg-yvy-dark hover:bg-yvy-dark-hover disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {approving === user.id ? 'Aprovando...' : 'Aprovar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
