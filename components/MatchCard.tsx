import WhatsAppButton from './WhatsAppButton'
import type { MatchResult } from '@/lib/matching'

export default function MatchCard({ match }: { match: MatchResult }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <p className="font-semibold text-gray-900 text-sm break-all">{match.displayKey}</p>
      <div className="flex gap-4 text-sm text-gray-600">
        <span>
          <strong className="text-green-700 text-base">{match.matchScore}</strong> figurinha
          {match.matchScore !== 1 ? 's' : ''} que eu preciso
        </span>
        <span>
          <strong className="text-blue-700 text-base">{match.reciprocalScore}</strong> que tenho
          para dar
        </span>
      </div>
      <WhatsAppButton phone={match.phone} />
    </div>
  )
}
