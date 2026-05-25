import { ALL_TEAMS } from './stickers'

export const TEAM_FLAG: Record<string, string> = Object.fromEntries(
  ALL_TEAMS.map((t) => [t.code, t.flag])
)

export function getStickerTeamCode(id: string): string | null {
  return id.match(/^([A-Z]+)/)?.[1] ?? null
}
