import { useEffect, useMemo, useRef, useState } from 'react'
import { getVolunteerOverview } from './api'
import type { VolunteerOverview } from './api'
import { getDailyChance } from './chances'
import { currentEnvironment, festivalDates, festivalDayDates, festivalDayLabels } from './config'
import programs from './programs'

const unavailableMessage = 'Most nem érjük el a közös adatokat.\n\nPróbáld újra egy kicsit később.'

function getDefaultDate() {
  const now = new Date()
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')

  return festivalDates.includes(today) ? today : festivalDates[0]
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function VolunteerMode() {
  const [selectedDate, setSelectedDate] = useState(getDefaultDate)
  const [overview, setOverview] = useState<VolunteerOverview | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const requestId = useRef(0)

  const programmeRows = useMemo(() => {
    const metricsByProgrammeId = new Map(overview?.date === selectedDate
      ? overview.programmes.map((programme) => [programme.programmeId, programme])
      : [])

    return programs
      .filter((programme) => programme.active && festivalDayDates[programme.day] === selectedDate)
      .map((programme) => ({
        programme,
        metrics: metricsByProgrammeId.get(programme.id) ?? { wantCount: 0, ifAvailableCount: 0 },
      }))
      .sort((first, second) => (
        second.metrics.wantCount - first.metrics.wantCount
        || second.metrics.ifAvailableCount - first.metrics.ifAvailableCount
        || first.programme.startTime.localeCompare(second.programme.startTime)
        || first.programme.title.localeCompare(second.programme.title, 'hu')
      ))
  }, [overview, selectedDate])

  async function loadOverview() {
    const activeRequestId = ++requestId.current
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await getVolunteerOverview(currentEnvironment, selectedDate)

      if (activeRequestId === requestId.current) {
        setOverview(response)
      }
    } catch {
      if (activeRequestId === requestId.current) {
        setOverview((current) => current?.date === selectedDate ? current : null)
        setErrorMessage(unavailableMessage)
      }
    } finally {
      if (activeRequestId === requestId.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [selectedDate])

  const visibleOverview = overview?.date === selectedDate ? overview : null
  const chance = getDailyChance(visibleOverview?.chance)
  const updatedAt = formatUpdatedAt(visibleOverview?.metricsUpdatedAt ?? null)

  return (
    <main className="volunteer-mode" aria-labelledby="volunteer-title">
      <header className="volunteer-header">
        <p className="festival-name">Ördögkatlan</p>
        <h1 id="volunteer-title">Sorszámvadász</h1>
        <p className="eyebrow">Önkéntes mód</p>
      </header>

      <div className="volunteer-day-picker">
        <label htmlFor="volunteer-day">Nap</label>
        <select
          id="volunteer-day"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        >
          {festivalDates.map((date) => <option key={date} value={date}>{festivalDayLabels[date]}</option>)}
        </select>
        <button type="button" className="volunteer-refresh" onClick={() => void loadOverview()} disabled={isLoading}>
          {isLoading ? 'Frissül…' : 'Frissítés'}
        </button>
      </div>

      <section className="volunteer-summary" aria-labelledby="volunteer-day-title">
        <h2 id="volunteer-day-title">{festivalDayLabels[selectedDate]}</h2>
        <div className="volunteer-statistics">
          <p><span>Önkéntesek</span><strong>{visibleOverview?.volunteerCount ?? 0}</strong></p>
          <p><span>Kapacitás</span><strong>{visibleOverview?.capacity ?? 0}</strong></p>
        </div>
        <p className="volunteer-chance">{visibleOverview?.chance ? <>Esély: {chance.icon} {chance.label}</> : 'Esély még nincs'}</p>
        {updatedAt && <p className="volunteer-updated">Frissítve: {updatedAt}</p>}
        {errorMessage && <p className="volunteer-error" role="status">{errorMessage}</p>}
      </section>

      <section aria-labelledby="volunteer-programmes-title">
        <h2 id="volunteer-programmes-title">Programok</h2>
        <div className="volunteer-programme-list">
          {programmeRows.map(({ programme, metrics }) => (
            <article className="volunteer-programme-card" key={programme.id}>
              <time dateTime={programme.startTime}>{programme.startTime}</time>
              <div>
                <h3>{programme.title}</h3>
                <p>{programme.type}</p>
                <p>{programme.location}</p>
              </div>
              <p className="volunteer-demand" aria-label={`${metrics.wantCount} szeretném, ${metrics.ifAvailableCount} ha marad`}>
                <span>❤️ {metrics.wantCount}</span>
                <span>💛 {metrics.ifAvailableCount}</span>
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default VolunteerMode
