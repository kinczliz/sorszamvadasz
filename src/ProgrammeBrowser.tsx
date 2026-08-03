import { useEffect, useRef, useState } from 'react'
import type { DayStatus } from './api'
import { getDailyChance } from './chances'
import { festivalDayDates } from './config'
import programs from './programs'
import { selectionLimits } from './selectionLimits'
import type { SelectionPriority, Selections } from './storage'

type ProgrammeBrowserProps = {
  displayName: string
  selections: Selections
  dayStatuses: Record<string, DayStatus>
  volunteerDays: string[]
  syncMessage: string
  onSelectionsChange: (selections: Selections) => boolean
  onVolunteerStatusChange: (date: string, active: boolean) => Promise<void>
}

type SelectionSummary = {
  want: number
  ifAvailable: number
}

type LimitMessage = {
  eventId: string
  priority: SelectionPriority
}

function groupProgramsByDay() {
  return programs.reduce<Map<string, typeof programs>>((groups, program) => {
    const dayPrograms = groups.get(program.day) ?? []
    dayPrograms.push(program)
    groups.set(program.day, dayPrograms)

    return groups
  }, new Map())
}

function getSelectionSummary(selections: Selections, eventIds: string[]): SelectionSummary {
  return eventIds.reduce(
    (summary, eventId) => {
      if (selections[eventId] === 'WANT') {
        summary.want += 1
      }

      if (selections[eventId] === 'IF_AVAILABLE') {
        summary.ifAvailable += 1
      }

      return summary
    },
    { want: 0, ifAvailable: 0 },
  )
}

function SelectionSummary({
  summary,
  dayCount = 1,
  className = '',
}: {
  summary: SelectionSummary
  dayCount?: number
  className?: string
}) {
  const wantLimit = selectionLimits.maxWantPerDay * dayCount
  const ifAvailableLimit = selectionLimits.maxIfAvailablePerDay * dayCount

  return (
    <p
      className={`selection-summary ${className}`}
      aria-label={`${summary.want} / ${wantLimit} Szeretném, ${summary.ifAvailable} / ${ifAvailableLimit} Ha marad`}
    >
      <span aria-hidden="true">❤️</span>
      <span className={summary.want >= wantLimit ? 'is-limit-reached' : ''}>
        {summary.want}/{wantLimit}
      </span>
      <span aria-hidden="true">💛</span>
      <span className={summary.ifAvailable >= ifAvailableLimit ? 'is-limit-reached' : ''}>
        {summary.ifAvailable}/{ifAvailableLimit}
      </span>
    </p>
  )
}

function DailyChance({ dayStatus }: { dayStatus?: DayStatus }) {
  const chance = getDailyChance(dayStatus?.chance)

  return (
    <p className="daily-chance">
      <span>Esély</span>
      <span>{chance.icon}</span>
      <span>{chance.label}</span>
      {dayStatus && dayStatus.state !== 'OPEN' && <span>· Kérések lezárva</span>}
    </p>
  )
}

function ProgrammeBrowser({
  displayName,
  selections,
  dayStatuses,
  volunteerDays,
  syncMessage,
  onSelectionsChange,
  onVolunteerStatusChange,
}: ProgrammeBrowserProps) {
  const programsByDay = groupProgramsByDay()
  const [statusMessage, setStatusMessage] = useState('')
  const [limitMessage, setLimitMessage] = useState<LimitMessage | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const resetDialogRef = useRef<HTMLDialogElement>(null)
  const overallSummary = getSelectionSummary(
    selections,
    programs.map((program) => program.id),
  )
  const hasSelections = overallSummary.want + overallSummary.ifAvailable > 0

  useEffect(() => {
    if (!limitMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setLimitMessage(null), 3000)

    return () => window.clearTimeout(timeoutId)
  }, [limitMessage])

  useEffect(() => {
    const dialog = resetDialogRef.current

    if (!dialog) {
      return
    }

    if (isResetDialogOpen && !dialog.open) {
      dialog.showModal()
    }

    if (!isResetDialogOpen && dialog.open) {
      dialog.close()
    }
  }, [isResetDialogOpen])

  function updateSelection(eventId: string, day: string, priority: SelectionPriority, title: string) {
    const currentPriority = selections[eventId]
    const nextSelections = { ...selections }
    const isRemovingSelection = currentPriority === priority
    const dayPrograms = programsByDay.get(day) ?? []
    const daySummary = getSelectionSummary(
      selections,
      dayPrograms.map((program) => program.id),
    )
    const limit = priority === 'WANT'
      ? selectionLimits.maxWantPerDay
      : selectionLimits.maxIfAvailablePerDay
    const selectionCount = priority === 'WANT' ? daySummary.want : daySummary.ifAvailable

    if (!isRemovingSelection && selectionCount >= limit) {
      setLimitMessage({ eventId, priority })
      return
    }

    if (isRemovingSelection) {
      delete nextSelections[eventId]
    } else {
      nextSelections[eventId] = priority
    }

    if (!onSelectionsChange(nextSelections)) {
      setStatusMessage('A választást most nem tudtuk elmenteni ezen az eszközön.')
      return
    }

    setLimitMessage(null)
    setStatusMessage(
      isRemovingSelection
        ? `${title}: választás törölve.`
        : `${title}: ${priority === 'WANT' ? 'Szeretném' : 'Ha marad'} elmentve.`,
    )
  }

  function resetSelections() {
    if (!onSelectionsChange({})) {
      setStatusMessage('A kiválasztásokat most nem tudtuk törölni ezen az eszközön.')
      return
    }

    setStatusMessage('Minden kiválasztás törölve.')
    setIsResetDialogOpen(false)
  }

  async function toggleVolunteerStatus(date: string) {
    const active = !volunteerDays.includes(date)

    try {
      await onVolunteerStatusChange(date, active)
    } catch {
      // The parent restores the previously confirmed state.
    }
  }

  return (
    <main className="programme-browser" aria-labelledby="app-title">
      <header className="programme-header">
        <p className="festival-name">Ördögkatlan</p>
        <h1 id="app-title">Sorszámvadász</h1>
        <a className="volunteer-link" href={`?mode=volunteer&environment=${new URLSearchParams(window.location.search).get('environment') === 'DEMO' ? 'DEMO' : 'LIVE'}`} aria-label="Önkéntes mód megnyitása" title="Önkéntes mód">😇</a>
        <div className="greeting">
          <p className="eyebrow">Szia, {displayName}!</p>
          {hasSelections && (
            <button
              type="button"
              className="restart-button"
              onClick={() => setIsResetDialogOpen(true)}
            >
              Újrakezdem
            </button>
          )}
        </div>
        <SelectionSummary
          summary={overallSummary}
          dayCount={programsByDay.size}
          className="selection-summary-overall"
        />
      </header>

      <section aria-labelledby="programme-title">
        <h2 id="programme-title">Programok</h2>
        <p className="selection-status" role="status" aria-live="polite">
          {statusMessage}
        </p>
        {syncMessage && <p className="selection-status" role="status" aria-live="polite">{syncMessage}</p>}

        {[...programsByDay].map(([day, dayPrograms]) => (
          <section className="programme-day" key={day} aria-labelledby={`day-${day}`}>
            <div className="programme-day-header">
              <h3 id={`day-${day}`}>{day}</h3>
              <DailyChance dayStatus={dayStatuses[festivalDayDates[day]]} />
              <div className="volunteer-control">
                <button
                  type="button"
                  className={volunteerDays.includes(festivalDayDates[day]) ? 'is-selected' : ''}
                  disabled={dayStatuses[festivalDayDates[day]]?.state === 'FINISHED'}
                  aria-pressed={volunteerDays.includes(festivalDayDates[day])}
                  onClick={() => void toggleVolunteerStatus(festivalDayDates[day])}
                >
                  {volunteerDays.includes(festivalDayDates[day]) ? `✓ ${day}: ÖNKÉNTES VAGYOK` : `${day}: önkéntes vagyok`}
                </button>
              </div>
              <SelectionSummary
                summary={getSelectionSummary(
                  selections,
                  dayPrograms.map((program) => program.id),
                )}
              />
            </div>
            <div className="programme-list">
              {dayPrograms.map((program) => (
                <article className="programme-card" key={program.id}>
                  <time dateTime={program.startTime}>{program.startTime}</time>
                  <div>
                    <h4>{program.title}</h4>
                    <p>{program.type}</p>
                    <p>{program.location}</p>
                    <div className="selection-controls" aria-label={`${program.title} választásai`}>
                      <button
                        type="button"
                        className={selections[program.id] === 'WANT' ? 'is-selected' : ''}
                        aria-pressed={selections[program.id] === 'WANT'}
                        disabled={dayStatuses[festivalDayDates[program.day]]?.state !== undefined && dayStatuses[festivalDayDates[program.day]]?.state !== 'OPEN'}
                        onClick={() => updateSelection(program.id, program.day, 'WANT', program.title)}
                      >
                        Szeretném
                      </button>
                      <button
                        type="button"
                        className={selections[program.id] === 'IF_AVAILABLE' ? 'is-selected' : ''}
                        aria-pressed={selections[program.id] === 'IF_AVAILABLE'}
                        disabled={dayStatuses[festivalDayDates[program.day]]?.state !== undefined && dayStatuses[festivalDayDates[program.day]]?.state !== 'OPEN'}
                        onClick={() => updateSelection(program.id, program.day, 'IF_AVAILABLE', program.title)}
                      >
                        Ha marad
                      </button>
                    </div>
                    {limitMessage?.eventId === program.id && (
                      <p className="limit-notification" role="status" aria-live="polite">
                        <span>Kis telhetetlen...</span>
                        <span>Előbb törölj egy másik {limitMessage.priority === 'WANT' ? '❤️' : '💛'} jelölést.</span>
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>

      <dialog
        ref={resetDialogRef}
        className="reset-dialog"
        aria-labelledby="reset-dialog-title"
        onClose={() => setIsResetDialogOpen(false)}
      >
        <h2 id="reset-dialog-title">Újrakezded?</h2>
        <p>Minden kiválasztásod törlődni fog.</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={() => setIsResetDialogOpen(false)}>
            Mégse
          </button>
          <button type="button" onClick={resetSelections}>Újrakezdem</button>
        </div>
      </dialog>
    </main>
  )
}

export default ProgrammeBrowser
