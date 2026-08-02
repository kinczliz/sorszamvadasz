import { useState } from 'react'
import programs from './programs'
import { getStoredSelections, saveSelections } from './selections'
import type { SelectionPriority, Selections } from './selections'

type ProgrammeBrowserProps = {
  displayName: string
}

type SelectionSummary = {
  want: number
  ifAvailable: number
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

function SelectionSummary({ summary, className = '' }: { summary: SelectionSummary; className?: string }) {
  return (
    <p
      className={`selection-summary ${className}`}
      aria-label={`${summary.want} Szeretném, ${summary.ifAvailable} Ha marad`}
    >
      <span aria-hidden="true">❤️</span>
      <span>{summary.want}</span>
      <span aria-hidden="true">💛</span>
      <span>{summary.ifAvailable}</span>
    </p>
  )
}

function ProgrammeBrowser({ displayName }: ProgrammeBrowserProps) {
  const programsByDay = groupProgramsByDay()
  const [selections, setSelections] = useState(getStoredSelections)
  const [statusMessage, setStatusMessage] = useState('')
  const overallSummary = getSelectionSummary(
    selections,
    programs.map((program) => program.id),
  )

  function updateSelection(eventId: string, priority: SelectionPriority, title: string) {
    const currentPriority = selections[eventId]
    const nextSelections = { ...selections }
    const isRemovingSelection = currentPriority === priority

    if (isRemovingSelection) {
      delete nextSelections[eventId]
    } else {
      nextSelections[eventId] = priority
    }

    if (!saveSelections(nextSelections)) {
      setStatusMessage('A választást most nem tudtuk elmenteni ezen az eszközön.')
      return
    }

    setSelections(nextSelections)
    setStatusMessage(
      isRemovingSelection
        ? `${title}: választás törölve.`
        : `${title}: ${priority === 'WANT' ? 'Szeretném' : 'Ha marad'} elmentve.`,
    )
  }

  return (
    <main className="programme-browser" aria-labelledby="app-title">
      <header className="programme-header">
        <p className="festival-name">Ördögkatlan</p>
        <h1 id="app-title">Sorszámvadász</h1>
        <p className="eyebrow">Szia, {displayName}!</p>
        <SelectionSummary summary={overallSummary} className="selection-summary-overall" />
      </header>

      <section aria-labelledby="programme-title">
        <h2 id="programme-title">Programok</h2>
        <p className="selection-status" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {[...programsByDay].map(([day, dayPrograms]) => (
          <section className="programme-day" key={day} aria-labelledby={`day-${day}`}>
            <div className="programme-day-heading">
              <h3 id={`day-${day}`}>{day}</h3>
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
                        onClick={() => updateSelection(program.id, 'WANT', program.title)}
                      >
                        Szeretném
                      </button>
                      <button
                        type="button"
                        className={selections[program.id] === 'IF_AVAILABLE' ? 'is-selected' : ''}
                        aria-pressed={selections[program.id] === 'IF_AVAILABLE'}
                        onClick={() => updateSelection(program.id, 'IF_AVAILABLE', program.title)}
                      >
                        Ha marad
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  )
}

export default ProgrammeBrowser
