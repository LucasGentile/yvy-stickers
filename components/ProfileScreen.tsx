'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPersonalInsights, PersonalInsights } from '@/actions/getPersonalInsights'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function StatTile({
  label,
  value,
  sub,
  color = 'default',
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'default'
}) {
  const valueColor = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    red: 'text-red-500',
    purple: 'text-purple-600',
    default: 'text-yvy-dark',
  }[color]
  return (
    <div className="bg-yvy-surface rounded-xl p-3 flex flex-col gap-0.5 shadow-sm">
      <span className="text-[10px] font-semibold text-yvy-muted uppercase tracking-wide leading-tight">
        {label}
      </span>
      <span className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</span>
      {sub && <span className="text-[10px] text-yvy-muted leading-tight">{sub}</span>}
    </div>
  )
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-base">{emoji}</span>
      <span className="text-xs font-bold text-yvy-dark uppercase tracking-wide">{title}</span>
    </div>
  )
}

function ProgressBar({ pct, color = 'green' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 bg-yvy-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-${color}-500 transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function ProfileScreen() {
  const [data, setData] = useState<PersonalInsights | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const id = localStorage.getItem('userId')
    if (!id) { setLoading(false); return }
    const result = await getPersonalInsights(id)
    setData(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-yvy-muted text-sm">Carregando perfil…</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-yvy-muted text-sm">Não foi possível carregar o perfil.</span>
      </div>
    )
  }

  const completionColor =
    data.completionPct >= 80 ? 'green-500' : data.completionPct >= 50 ? 'amber-500' : 'blue-500'

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-5">

      {/* ── Profile card ────────────────────────────────────────────── */}
      <div className="bg-yvy-surface rounded-2xl shadow-sm p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-yvy-accent flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">{initials(data.name)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-yvy-dark text-base truncate">{data.name}</p>
          <p className="text-xs text-yvy-muted">Torre {data.tower} · Apt {data.apartment}</p>
          <p className="text-xs text-yvy-muted">
            No app há {data.accountAgeDays === 0 ? 'menos de 1 dia' : `${data.accountAgeDays} dia${data.accountAgeDays !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* ── Album progress ──────────────────────────────────────────── */}
      <div className="bg-yvy-surface rounded-2xl shadow-sm p-4 space-y-2">
        <SectionHeader emoji="📖" title="Meu Álbum" />
        <div className="flex items-end justify-between mb-1">
          <span className="text-3xl font-bold tabular-nums text-yvy-dark">{data.ownedCount}</span>
          <span className="text-sm text-yvy-muted">/ {data.totalStickers} figurinhas</span>
        </div>
        <ProgressBar pct={data.completionPct} color={completionColor.replace('-500', '')} />
        <div className="flex justify-between text-[11px] text-yvy-muted pt-1">
          <span>{data.completionPct}% concluído</span>
          <span>Faltam {data.missingCount}</span>
        </div>
      </div>

      {/* ── Investment ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionHeader emoji="💸" title="Investimento" />
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Pacotes estimados"
            value={data.estimatedPacksBought}
            sub="figurinhas compradas"
            color="amber"
          />
          <StatTile
            label="Gasto estimado"
            value={`R$${data.estimatedSpentBrl}`}
            sub={`~R$7 por pacote de 7`}
            color="amber"
          />
          <StatTile
            label="Economizado em trocas"
            value={`R$${data.estimatedSavedBrl}`}
            sub={`${data.fromTradeCount} figurinha${data.fromTradeCount !== 1 ? 's' : ''} recebidas`}
            color="green"
          />
          <StatTile
            label="Compradas vs trocas"
            value={`${data.purchasedCount} / ${data.fromTradeCount}`}
            sub="compradas · de trocas"
            color="default"
          />
        </div>
      </div>

      {/* ── Trading ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionHeader emoji="🤝" title="Histórico de Trocas" />
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Trocas feitas"
            value={data.completedTrades}
            color="blue"
          />
          <StatTile
            label="Dadas"
            value={data.stickersGiven}
            sub="figurinhas"
            color="red"
          />
          <StatTile
            label="Recebidas"
            value={data.stickersReceived}
            sub="figurinhas"
            color="green"
          />
        </div>
        {data.bestTradeFriend && (
          <div className="bg-yvy-surface rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-[10px] font-semibold text-yvy-muted uppercase tracking-wide">
                Melhor parceiro de trocas
              </p>
              <p className="font-bold text-yvy-dark">{data.bestTradeFriend}</p>
              <p className="text-[11px] text-yvy-muted">
                {data.bestTradeFriendTrades} troca{data.bestTradeFriendTrades !== 1 ? 's' : ''} juntos
              </p>
            </div>
          </div>
        )}
        {data.completedTrades === 0 && (
          <p className="text-xs text-yvy-muted text-center py-2">
            Você ainda não fez nenhuma troca pelo app. Que tal começar?
          </p>
        )}
      </div>

      {/* ── Duplicates ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionHeader emoji="🔁" title="Repetidas" />
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Total de cópias extras"
            value={data.totalDuplicateCopies}
            sub={`${data.tradedDuplicateCopies} já trocadas`}
            color="purple"
          />
          <StatTile
            label="Aproveitamento"
            value={`${data.tradedDuplicatesPct}%`}
            sub="das repetidas foram trocadas"
            color="green"
          />
          {data.mostDuplicatedSticker && (
            <StatTile
              label="Mais repetida"
              value={data.mostDuplicatedSticker}
              sub={`${data.mostDuplicatedStickerCount}x — mais cópias`}
              color="purple"
            />
          )}
          {data.leastDuplicatedSticker && (
            <StatTile
              label="Menos repetida"
              value={data.leastDuplicatedSticker}
              sub={`${data.leastDuplicatedStickerCount}x — menos cópias`}
              color="default"
            />
          )}
        </div>
        {(data.mostDuplicatedCountryName || data.leastDuplicatedCountryName) && (
          <div className="grid grid-cols-2 gap-2">
            {data.mostDuplicatedCountryName && (
              <div className="bg-yvy-surface rounded-xl p-3 flex items-start gap-2 shadow-sm">
                <span className="text-lg mt-0.5">📦</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-yvy-muted uppercase tracking-wide leading-tight">
                    País mais repetido
                  </p>
                  <p className="font-bold text-yvy-dark text-sm truncate">{data.mostDuplicatedCountryName}</p>
                  <p className="text-[11px] text-yvy-muted">
                    {data.mostDuplicatedCountryCount} cópia{data.mostDuplicatedCountryCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
            {data.leastDuplicatedCountryName && (
              <div className="bg-yvy-surface rounded-xl p-3 flex items-start gap-2 shadow-sm">
                <span className="text-lg mt-0.5">🔍</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-yvy-muted uppercase tracking-wide leading-tight">
                    País menos repetido
                  </p>
                  <p className="font-bold text-yvy-dark text-sm truncate">{data.leastDuplicatedCountryName}</p>
                  <p className="text-[11px] text-yvy-muted">
                    {data.leastDuplicatedCountryCount} cópia{data.leastDuplicatedCountryCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {data.totalDuplicateCopies === 0 && (
          <p className="text-xs text-yvy-muted text-center py-2">
            Nenhuma repetida registrada ainda.
          </p>
        )}
      </div>

      {/* ── Collection highlights ────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionHeader emoji="🌍" title="Destaques da Coleção" />
        {data.mostCompleteTeam && (
          <div className="bg-yvy-surface rounded-xl p-3 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-yvy-muted uppercase tracking-wide">
                  Seleção mais completa
                </p>
                <p className="font-bold text-yvy-dark">{data.mostCompleteTeam}</p>
              </div>
              <span
                className={`text-lg font-bold ${data.mostCompleteTeamPct === 100 ? 'text-green-600' : 'text-yvy-dark'}`}
              >
                {data.mostCompleteTeamPct}%
                {data.mostCompleteTeamPct === 100 && ' ✅'}
              </span>
            </div>
            <ProgressBar pct={data.mostCompleteTeamPct} color="green" />
          </div>
        )}
        {data.leastCompleteTeam && data.leastCompleteTeamPct < 100 && (
          <div className="bg-yvy-surface rounded-xl p-3 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-yvy-muted uppercase tracking-wide">
                  Seleção mais incompleta
                </p>
                <p className="font-bold text-yvy-dark">{data.leastCompleteTeam}</p>
              </div>
              <span className="text-lg font-bold text-red-500">{data.leastCompleteTeamPct}%</span>
            </div>
            <ProgressBar pct={data.leastCompleteTeamPct} color="red" />
          </div>
        )}
      </div>

      <div className="pb-4" />
    </div>
  )
}
