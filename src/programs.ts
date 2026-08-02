import programs from '../data/2026/programs.json'

export type Program = {
  id: string
  day: string
  dayId: string
  startTime: string
  title: string
  type: string
  location: string
  active: boolean
}

export default programs as Program[]
