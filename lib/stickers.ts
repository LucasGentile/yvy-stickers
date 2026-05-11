const range20 = Array.from({ length: 20 }, (_, i) => i + 1)

export type Team = {
  code: string
  name: string
  flag: string
  flagCode: string
  stickers: string[]
}

export type StickerGroup = {
  type: 'group'
  label: string
  teams: Team[]
}

export type StickerSpecial = {
  type: 'special'
  label: string
  icon: string
  stickers: string[]
}

export type StickerSection = StickerGroup | StickerSpecial

// [code, name, flag emoji, flagcdn.com ISO code]
const GROUPS: { label: string; teams: [string, string, string, string][] }[] = [
  {
    label: 'Grupo A',
    teams: [
      ['MEX', 'México', '🇲🇽', 'mx'],
      ['RSA', 'África do Sul', '🇿🇦', 'za'],
      ['KOR', 'Coréia do Sul', '🇰🇷', 'kr'],
      ['CZE', 'Rep. Tcheca', '🇨🇿', 'cz'],
    ],
  },
  {
    label: 'Grupo B',
    teams: [
      ['CAN', 'Canadá', '🇨🇦', 'ca'],
      ['BIH', 'Bósnia', '🇧🇦', 'ba'],
      ['QAT', 'Catar', '🇶🇦', 'qa'],
      ['SUI', 'Suíça', '🇨🇭', 'ch'],
    ],
  },
  {
    label: 'Grupo C',
    teams: [
      ['BRA', 'Brasil', '🇧🇷', 'br'],
      ['MAR', 'Marrocos', '🇲🇦', 'ma'],
      ['HAI', 'Haiti', '🇭🇹', 'ht'],
      ['SCO', 'Escócia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'gb-sct'],
    ],
  },
  {
    label: 'Grupo D',
    teams: [
      ['USA', 'Estados Unidos', '🇺🇸', 'us'],
      ['PAR', 'Paraguai', '🇵🇾', 'py'],
      ['AUS', 'Austrália', '🇦🇺', 'au'],
      ['TUR', 'Turquia', '🇹🇷', 'tr'],
    ],
  },
  {
    label: 'Grupo E',
    teams: [
      ['GER', 'Alemanha', '🇩🇪', 'de'],
      ['CUW', 'Curaçao', '🇨🇼', 'cw'],
      ['CIV', 'Costa do Marfim', '🇨🇮', 'ci'],
      ['ECU', 'Equador', '🇪🇨', 'ec'],
    ],
  },
  {
    label: 'Grupo F',
    teams: [
      ['NED', 'Holanda', '🇳🇱', 'nl'],
      ['JPN', 'Japão', '🇯🇵', 'jp'],
      ['SWE', 'Suécia', '🇸🇪', 'se'],
      ['TUN', 'Tunísia', '🇹🇳', 'tn'],
    ],
  },
  {
    label: 'Grupo G',
    teams: [
      ['BEL', 'Bélgica', '🇧🇪', 'be'],
      ['EGY', 'Egito', '🇪🇬', 'eg'],
      ['IRN', 'Irã', '🇮🇷', 'ir'],
      ['NZL', 'Nova Zelândia', '🇳🇿', 'nz'],
    ],
  },
  {
    label: 'Grupo H',
    teams: [
      ['ESP', 'Espanha', '🇪🇸', 'es'],
      ['CPV', 'Cabo Verde', '🇨🇻', 'cv'],
      ['KSA', 'Arábia Saudita', '🇸🇦', 'sa'],
      ['URU', 'Uruguai', '🇺🇾', 'uy'],
    ],
  },
  {
    label: 'Grupo I',
    teams: [
      ['FRA', 'França', '🇫🇷', 'fr'],
      ['SEN', 'Senegal', '🇸🇳', 'sn'],
      ['IRQ', 'Iraque', '🇮🇶', 'iq'],
      ['NOR', 'Noruega', '🇳🇴', 'no'],
    ],
  },
  {
    label: 'Grupo J',
    teams: [
      ['ARG', 'Argentina', '🇦🇷', 'ar'],
      ['ALG', 'Argélia', '🇩🇿', 'dz'],
      ['AUT', 'Áustria', '🇦🇹', 'at'],
      ['JOR', 'Jordânia', '🇯🇴', 'jo'],
    ],
  },
  {
    label: 'Grupo K',
    teams: [
      ['POR', 'Portugal', '🇵🇹', 'pt'],
      ['COD', 'Congo', '🇨🇩', 'cd'],
      ['UZB', 'Uzbequistão', '🇺🇿', 'uz'],
      ['COL', 'Colômbia', '🇨🇴', 'co'],
    ],
  },
  {
    label: 'Grupo L',
    teams: [
      ['ENG', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'gb-eng'],
      ['CRO', 'Croácia', '🇭🇷', 'hr'],
      ['GHA', 'Gana', '🇬🇭', 'gh'],
      ['PAN', 'Panamá', '🇵🇦', 'pa'],
    ],
  },
]

export const ALL_STICKER_SECTIONS: StickerSection[] = [
  {
    type: 'special',
    label: 'Página Inicial',
    icon: '⚽',
    stickers: ['FWC00', 'FWC1', 'FWC2', 'FWC3', 'FWC4', 'FWC5', 'FWC6', 'FWC7', 'FWC8'],
  },
  ...GROUPS.map(({ label, teams }) => ({
    type: 'group' as const,
    label,
    teams: teams.map(([code, name, flag, flagCode]) => ({
      code,
      name,
      flag,
      flagCode,
      stickers: range20.map((n) => `${code}${n}`),
    })),
  })),
  {
    type: 'special',
    label: 'FIFA World Cup History',
    icon: '🏆',
    stickers: Array.from({ length: 11 }, (_, i) => `FWC${i + 9}`),
  },
  {
    type: 'special',
    label: 'Figurinhas Coca-Cola',
    icon: '🥤',
    stickers: Array.from({ length: 14 }, (_, i) => `CC${i + 1}`),
  },
]

export const ALL_STICKER_IDS: string[] = ALL_STICKER_SECTIONS.flatMap((s) =>
  s.type === 'group' ? s.teams.flatMap((t) => t.stickers) : s.stickers
)

export const STICKER_SET = new Set(ALL_STICKER_IDS)

const STICKER_ORDER = new Map(ALL_STICKER_IDS.map((id, i) => [id, i]))

export function sortByAlbumOrder(ids: string[]): string[] {
  return [...ids].sort((a, b) => (STICKER_ORDER.get(a) ?? 9999) - (STICKER_ORDER.get(b) ?? 9999))
}

export const ALL_TEAMS: Team[] = ALL_STICKER_SECTIONS.filter(
  (s): s is StickerGroup => s.type === 'group'
).flatMap((s) => s.teams)

// Chrome (cromadas): all FWC stickers + first sticker (#1) of every country team
export const CHROME_STICKER_IDS: Set<string> = new Set([
  ...ALL_STICKER_SECTIONS
    .filter((s): s is StickerSpecial => s.type === 'special' && s.label !== 'Figurinhas Coca-Cola')
    .flatMap((s) => s.stickers),
  ...ALL_STICKER_SECTIONS
    .filter((s): s is StickerGroup => s.type === 'group')
    .flatMap((s) => s.teams.map((t) => t.stickers[0])),
])

export function isChromeSticker(id: string): boolean {
  return CHROME_STICKER_IDS.has(id)
}

export function isCocaColaSticker(id: string): boolean {
  return id.startsWith('CC')
}
