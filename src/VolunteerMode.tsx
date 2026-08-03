import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, getProgrammeRequestors, getVolunteerOverview } from './api'
import type { ProgrammeRequestors, VolunteerOverview } from './api'
import { getDailyChance } from './chances'
import { currentEnvironment, festivalDates, festivalDayDates, festivalDayLabels } from './config'
import programs from './programs'

const unavailableMessage = 'Most nem érjük el a közös adatokat.\n\nPróbáld újra egy kicsit később.'
const requestorUnavailableMessage = 'Most nem érjük el a névsort.\n\nPróbáld újra egy kicsit később.'
const volunteerAccessCodeKey = 'sorszamvadasz.volunteerAccessCode'

type RequestorTarget = { programmeId: string; title: string }
type RequestorPopup = RequestorTarget & {
  state: 'loading' | 'ready' | 'error'
  requestors?: ProgrammeRequestors
}

function getStoredVolunteerAccessCode() {
  try {
    return sessionStorage.getItem(volunteerAccessCodeKey)
  } catch {
    return null
  }
}

function saveVolunteerAccessCode(accessCode: string) {
  try {
    sessionStorage.setItem(volunteerAccessCodeKey, accessCode)
  } catch {
    // The current request can still continue when session storage is unavailable.
  }
}

function clearVolunteerAccessCode() {
  try {
    sessionStorage.removeItem(volunteerAccessCodeKey)
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

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
  const [requestorPopup, setRequestorPopup] = useState<RequestorPopup | null>(null)
  const [accessCodeTarget, setAccessCodeTarget] = useState<RequestorTarget | null>(null)
  const [accessCode, setAccessCode] = useState('')
  const [accessCodeError, setAccessCodeError] = useState('')
  const [isOpeningRequestors, setIsOpeningRequestors] = useState(false)
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

  async function loadRequestors(target: RequestorTarget, code: string) {
    setRequestorPopup({ ...target, state: 'loading' })

    try {
      const requestors = await getProgrammeRequestors(currentEnvironment, target.programmeId, code)
      setRequestorPopup({ ...target, state: 'ready', requestors })
    } catch (exception) {
      if (exception instanceof ApiError && exception.code === 'ACCESS_DENIED') {
        clearVolunteerAccessCode()
        setRequestorPopup(null)
        setAccessCodeTarget(target)
        setAccessCode('')
        setAccessCodeError('Hibás önkéntes kód.')
        return
      }

      setRequestorPopup({ ...target, state: 'error' })
    }
  }

  function openRequestors(target: RequestorTarget) {
    const storedAccessCode = getStoredVolunteerAccessCode()

    if (!storedAccessCode) {
      setAccessCodeTarget(target)
      setAccessCode('')
      setAccessCodeError('')
      return
    }

    void loadRequestors(target, storedAccessCode)
  }

  async function submitAccessCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessCodeTarget) return

    setIsOpeningRequestors(true)
    setAccessCodeError('')

    try {
      const requestors = await getProgrammeRequestors(currentEnvironment, accessCodeTarget.programmeId, accessCode)
      saveVolunteerAccessCode(accessCode)
      setRequestorPopup({ ...accessCodeTarget, state: 'ready', requestors })
      setAccessCodeTarget(null)
      setAccessCode('')
    } catch (exception) {
      setAccessCodeError(
        exception instanceof ApiError && exception.code === 'ACCESS_DENIED'
          ? 'Hibás önkéntes kód.'
          : requestorUnavailableMessage,
      )
      if (exception instanceof ApiError && exception.code === 'ACCESS_DENIED') setAccessCode('')
    } finally {
      setIsOpeningRequestors(false)
    }
  }

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
            <button
              className="volunteer-programme-card"
              key={programme.id}
              type="button"
              onClick={() => openRequestors({ programmeId: programme.id, title: programme.title })}
              aria-label={`${programme.title}: kérők megnyitása`}
            >
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
            </button>
          ))}
        </div>
      </section>

      {requestorPopup && (
        <section className="requestor-popup" role="dialog" aria-modal="false" aria-labelledby="requestor-popup-title">
          <div className="requestor-popup-header">
            <h2 id="requestor-popup-title">{requestorPopup.title}</h2>
            <button type="button" className="requestor-popup-close" onClick={() => setRequestorPopup(null)} aria-label="Névsor bezárása">✕</button>
          </div>
          {requestorPopup.state === 'loading' && <p className="requestor-popup-status">Névsor betöltése…</p>}
          {requestorPopup.state === 'error' && (
            <div className="requestor-popup-status requestor-popup-error">
              <p>{requestorUnavailableMessage}</p>
              <button type="button" onClick={() => openRequestors(requestorPopup)}>Újra</button>
            </div>
          )}
          {requestorPopup.state === 'ready' && requestorPopup.requestors && (
            <div className="requestor-columns">
              <section>
                <h3>❤️ {requestorPopup.requestors.want.length}</h3>
                {requestorPopup.requestors.want.map((requestor) => <p key={requestor.displayName}>{requestor.displayName}</p>)}
              </section>
              <section>
                <h3>💛 {requestorPopup.requestors.ifAvailable.length}</h3>
                {requestorPopup.requestors.ifAvailable.map((requestor) => <p key={requestor.displayName}>{requestor.displayName}</p>)}
              </section>
            </div>
          )}
        </section>
      )}

      {accessCodeTarget && (
        <section className="access-code-popup" role="dialog" aria-modal="true" aria-labelledby="access-code-title">
          <div className="access-code-popup-content">
            <h2 id="access-code-title">Önkéntes kód</h2>
            <p>A névsor megnyitásához add meg az önkéntes kódot.</p>
            <form onSubmit={submitAccessCode}>
              <label htmlFor="volunteer-access-code">Önkéntes kód</label>
              <input
                id="volunteer-access-code"
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                autoComplete="off"
                aria-invalid={Boolean(accessCodeError)}
              />
              {accessCodeError && <p className="access-code-error" role="status">{accessCodeError}</p>}
              <div className="access-code-actions">
                <button type="button" onClick={() => setAccessCodeTarget(null)} disabled={isOpeningRequestors}>Mégse</button>
                <button type="submit" disabled={isOpeningRequestors}>{isOpeningRequestors ? 'Megnyitás…' : 'Megnyitás'}</button>
              </div>
            </form>
          </div>
        </section>
      )}
    </main>
  )
}

export default VolunteerMode
