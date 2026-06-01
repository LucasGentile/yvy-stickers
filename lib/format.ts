const LOWER_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'na', 'no', 'nas', 'nos'])

export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
}

export function formatName(name: string): string {
  if (!name) return name
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word, i) => {
      if (i > 0 && LOWER_WORDS.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
