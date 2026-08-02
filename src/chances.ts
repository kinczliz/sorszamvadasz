export type ChanceIndicator = {
  icon: string
  label: string
}

const placeholderChance: ChanceIndicator = {
  icon: '🟡',
  label: 'Jó',
}

export function getDailyChance(_day: string): ChanceIndicator {
  return placeholderChance
}
