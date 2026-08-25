export function getTier(points: number) {
  if (points >= 500) return {
    label: 'Gold' as const,
    color: '#b8860b',
    bg: 'rgba(184,134,11,0.1)',
    bar: '#b8860b',
    next: null as number | null,
    nextLabel: null as string | null,
    min: 500,
    max: 500,
  }
  if (points >= 200) return {
    label: 'Silver' as const,
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
    bar: '#6b7280',
    next: 500 as number | null,
    nextLabel: 'Gold' as string | null,
    min: 200,
    max: 500,
  }
  return {
    label: 'Bronze' as const,
    color: '#b45309',
    bg: 'rgba(180,83,9,0.1)',
    bar: '#b45309',
    next: 200 as number | null,
    nextLabel: 'Silver' as string | null,
    min: 0,
    max: 200,
  }
}
