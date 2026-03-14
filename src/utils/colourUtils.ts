/** Derive a light tint background from a hex colour (10% opacity feel). */
export function lightTint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * 0.88)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
