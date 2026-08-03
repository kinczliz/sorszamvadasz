import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, getDayStatus, getParticipant, register, setVolunteerStatus, syncSelections } from './api'
import type { DayStatus } from './api'
import ProgrammeBrowser from './ProgrammeBrowser'
import VolunteerMode from './VolunteerMode'
import { currentEnvironment } from './config'
import {
  clearUserId,
  clearPendingRegistrationId,
  getPendingSync,
  getPendingRegistrationId,
  getStoredDisplayName,
  getStoredSelections,
  getStoredUserId,
  saveDisplayName,
  savePendingRegistrationId,
  savePendingSync,
  saveSelections,
  saveUserId,
} from './storage'
import type { Selections } from './storage'

const duplicateNameMessage = 'Ez a név már használatban van.\n\nKérlek válassz egy olyan nevet,\namiről a többiek biztosan felismernek.'
const temporaryRegistrationMessage = 'Most nem érjük el a közös rendszert.\n\nPróbáld újra egy kicsit később.'
const temporarySyncMessage = 'A módosítás elmentve ezen az eszközön.\n\nA közös rendszerrel később szinkronizáljuk.'
const missingConfigurationMessage = 'A közös rendszer címe nincs beállítva.'

function createRegistrationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16))
}

function ParticipantApp() {
  const [userId, setUserId] = useState(getStoredUserId)
  const [displayName, setDisplayName] = useState(getStoredDisplayName)
  const [selections, setSelections] = useState(getStoredSelections)
  const [dayStatuses, setDayStatuses] = useState<Record<string, DayStatus>>({})
  const [volunteerDays, setVolunteerDays] = useState<string[]>([])
  const [draftName, setDraftName] = useState(getStoredDisplayName() ?? '')
  const [errorMessage, setErrorMessage] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const syncAttempt = useRef(0)

  useEffect(() => {
    void loadDayStatus()

    if (userId) {
      void loadParticipant(userId, getPendingSync())
    }
  }, [])

  async function loadDayStatus() {
    try {
      const response = await getDayStatus()
      setDayStatuses(Object.fromEntries(response.days.map((day) => [day.date, day])))
    } catch {
      // The programme remains usable with its existing local presentation.
    }
  }

  async function loadParticipant(storedUserId: string, retryPendingSync: boolean) {
    const localSelections = getStoredSelections()

    try {
      const response = await getParticipant(storedUserId)

      setDisplayName(response.user.displayName)
      setSelections(response.selections)
      setVolunteerDays(response.volunteerDays)
      saveDisplayName(response.user.displayName)
      saveSelections(response.selections)
      setDayStatuses((current) => Object.fromEntries(
        Object.entries(response.dayStates).map(([date, state]) => [
          date,
          { ...current[date], date, state },
        ]),
      ))

      if (retryPendingSync) {
        setSelections(localSelections)
        saveSelections(localSelections)
        void synchronizeSelections(storedUserId, localSelections)
      }
    } catch (exception) {
      if (exception instanceof ApiError && exception.code === 'USER_NOT_FOUND') {
        clearUserId()
        setUserId(null)
        setDraftName(getStoredDisplayName() ?? '')
        return
      }

      setSyncMessage('A közös rendszer átmenetileg nem érhető el.')
    }
  }

  async function handleVolunteerStatusChange(date: string, active: boolean) {
    if (!userId) return
    const previousDays = volunteerDays
    const nextDays = active ? [...new Set([...previousDays, date])].sort() : previousDays.filter((day) => day !== date)
    setVolunteerDays(nextDays)

    try {
      const response = await setVolunteerStatus(currentEnvironment, userId, date, active)
      setVolunteerDays((current) => response.active ? [...new Set([...current, response.date])].sort() : current.filter((day) => day !== response.date))
    } catch (exception) {
      setVolunteerDays(previousDays)
      throw exception
    }
  }

  async function synchronizeSelections(activeUserId: string, nextSelections: Selections) {
    const attempt = ++syncAttempt.current

    try {
      const response = await syncSelections(activeUserId, nextSelections)

      if (attempt === syncAttempt.current) {
        setSelections(response.selections)
        saveSelections(response.selections)
        savePendingSync(false)
        setSyncMessage('')
      }
    } catch (exception) {
      if (attempt !== syncAttempt.current) {
        return
      }

      if (exception instanceof ApiError && (exception.code === 'DAILY_LIMIT_EXCEEDED' || exception.code === 'DAY_NOT_OPEN')) {
        savePendingSync(false)
        await loadParticipant(activeUserId, false)
        return
      }

      savePendingSync(true)
      setSyncMessage(temporarySyncMessage)
    }
  }

  function handleSelectionsChange(nextSelections: Selections): boolean {
    if (!saveSelections(nextSelections)) {
      return false
    }

    setSelections(nextSelections)

    if (userId) {
      void synchronizeSelections(userId, nextSelections)
    }

    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextDisplayName = draftName.trim()

    if (!nextDisplayName) {
      setErrorMessage('Kérjük, add meg a nevedet.')
      return
    }

    setIsRegistering(true)
    const registrationId = getPendingRegistrationId() ?? createRegistrationId()
    savePendingRegistrationId(registrationId)

    try {
      const response = await register(nextDisplayName, selections, registrationId)

      saveUserId(response.user.id)
      saveDisplayName(response.user.displayName)
      saveSelections(response.selections)
      savePendingSync(false)
      clearPendingRegistrationId()
      setUserId(response.user.id)
      setDisplayName(response.user.displayName)
      setSelections(response.selections)
      setErrorMessage('')
    } catch (exception) {
      setErrorMessage(
        exception instanceof ApiError
          ? exception.code === 'DISPLAY_NAME_TAKEN'
            ? duplicateNameMessage
            : exception.code === 'CONFIGURATION'
              ? missingConfigurationMessage
              : temporaryRegistrationMessage
          : temporaryRegistrationMessage,
      )
    } finally {
      setIsRegistering(false)
    }
  }

  if (userId && displayName) {
    return (
      <ProgrammeBrowser
        displayName={displayName}
        selections={selections}
        dayStatuses={dayStatuses}
        volunteerDays={volunteerDays}
        syncMessage={syncMessage}
        onSelectionsChange={handleSelectionsChange}
        onVolunteerStatusChange={handleVolunteerStatusChange}
      />
    )
  }

  return (
    <main className="participant" aria-labelledby="app-title">
      <header>
        <p className="festival-name">Ördögkatlan</p>
        <h1 id="app-title">Sorszámvadász</h1>
      </header>

      <section className="name-form" aria-labelledby="name-form-title">
        <h2 id="name-form-title">Hogy szólíthatunk?</h2>
        <p className="description">
          Add meg azt a nevet, amelyről a többiek felismernek.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="display-name">Neved</label>
          <input
            id="display-name"
            name="display-name"
            type="text"
            value={draftName}
            onChange={(event) => {
              if (event.target.value !== draftName) clearPendingRegistrationId()
              setDraftName(event.target.value)
              setErrorMessage('')
            }}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={40}
            placeholder="Például: Kovács Anna"
            aria-describedby={errorMessage ? 'name-hint name-error' : 'name-hint'}
            aria-invalid={Boolean(errorMessage)}
            required
          />
          <p id="name-hint" className="hint">
            Válassz könnyen felismerhető, megkülönböztető nevet.
          </p>
          {errorMessage && (
            <p id="name-error" className="error" role="alert">
              {errorMessage}
            </p>
          )}
          <button type="submit" disabled={isRegistering}>
            {isRegistering ? 'Egy pillanat…' : 'Tovább'}
          </button>
        </form>
      </section>
    </main>
  )
}

function App() {
  return new URLSearchParams(window.location.search).get('mode') === 'volunteer'
    ? <VolunteerMode />
    : <ParticipantApp />
}

export default App
