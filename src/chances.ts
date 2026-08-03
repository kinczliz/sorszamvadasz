import type { Chance } from './api'

export type ChanceIndicator = {
  icon: string
  label: string
}

const chanceIndicators: Record<Chance, ChanceIndicator> = {
  VERY_GOOD: { icon: '🟢', label: 'Remek' },
  GOOD: { icon: '🟡', label: 'Jó' },
  LOW: { icon: '⚪', label: 'Kicsi' },
  VERY_LOW: { icon: '🟠', label: 'Alig' },
  HOPELESS: { icon: '🔴', label: 'Felejtős' },
}

export function getDailyChance(chance: Chance | null | undefined): ChanceIndicator {
  return chance ? chanceIndicators[chance] : { icon: '⚪', label: 'Még nincs adat' }
}
