export type Environment = 'LIVE' | 'DEMO'

export const currentEnvironment: Environment = new URLSearchParams(window.location.search).get('environment') === 'DEMO' ? 'DEMO' : 'LIVE'

export const festivalDayDates: Record<string, string> = {
  KEDD: '2026-08-04',
  SZERDA: '2026-08-05',
  CSÜTÖRTÖK: '2026-08-06',
  PÉNTEK: '2026-08-07',
  SZOMBAT: '2026-08-08',
}

export const festivalDayLabels: Record<string, string> = {
  '2026-08-04': 'KEDD, augusztus 4.',
  '2026-08-05': 'SZERDA, augusztus 5.',
  '2026-08-06': 'CSÜTÖRTÖK, augusztus 6.',
  '2026-08-07': 'PÉNTEK, augusztus 7.',
  '2026-08-08': 'SZOMBAT, augusztus 8.',
}

export const festivalDates = Object.values(festivalDayDates)
