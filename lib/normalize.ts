export function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

export function buildDisplayKey(name: string, apartment: string, tower: string): string {
  return `${normalizeText(name)}-${normalizeText(apartment)}-${normalizeText(tower)}`
}
