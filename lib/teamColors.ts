import { ALL_TEAMS } from './stickers'

export const TEAM_COLORS: Record<string, string> = {
  MEX: '#006847',
  RSA: '#007A4D',
  KOR: '#CD2E3A',
  CZE: '#D7141A',
  CAN: '#CC0001',
  BIH: '#002395',
  QAT: '#8D1B3D',
  SUI: '#CC0001',
  BRA: '#009C3B',
  MAR: '#C1272D',
  HAI: '#00209F',
  SCO: '#003F87',
  USA: '#B22234',
  PAR: '#D52B1E',
  AUS: '#00247D',
  TUR: '#E30A17',
  GER: '#DD0000',
  CUW: '#002B7F',
  CIV: '#F77F00',
  ECU: '#8B6914',
  NED: '#E07B39',
  JPN: '#BC002D',
  SWE: '#006AA7',
  TUN: '#E70013',
  BEL: '#A08000',
  EGY: '#CE1126',
  IRN: '#239F40',
  NZL: '#00247D',
  ESP: '#C60B1E',
  CPV: '#003893',
  KSA: '#006C35',
  URU: '#3A87C8',
  FRA: '#0055A4',
  SEN: '#00853F',
  IRQ: '#007A3D',
  NOR: '#EF2B2D',
  ARG: '#4A8BC4',
  ALG: '#006233',
  AUT: '#ED2939',
  JOR: '#007A3D',
  POR: '#006600',
  COD: '#0060BF',
  UZB: '#1C75BC',
  COL: '#B8860B',
  ENG: '#CF142B',
  CRO: '#CC0000',
  GHA: '#B8860B',
  PAN: '#D21034',
}

export const TEAM_NAME: Record<string, string> = Object.fromEntries(
  ALL_TEAMS.map((t) => [t.code, t.name])
)

export function getStickerTeamCode(id: string): string | null {
  return id.match(/^([A-Z]+)/)?.[1] ?? null
}
