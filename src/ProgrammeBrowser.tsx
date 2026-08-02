import { useState } from 'react'
import programs from './programs'
import { getStoredSelections, saveSelections } from './selections'
import type { SelectionPriority } from './selections'

type ProgrammeBrowserProps = {
  displayName: string
}

function groupProgramsByDay() {
  return programs.reduce<Map<string, typeof programs>>((groups, program) => {
    const dayPrograms = groups.get(program.day) ?? []
    dayPrograms.push(program)
    groups.set(program.day, dayPrograms)

    return groups
  }, new Map())
}

function ProgrammeBrowser({ displayName }: ProgrammeBrowserProps) {
  const programsByDay = groupProgramsByDay()
  const [selections, setSelections] = useState(getStoredSelections)
  const [statusMessage, setStatusMessage] = useState('')

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
      </header>

      <section aria-labelledby="programme-title">
        <h2 id="programme-title">Programok</h2>
        <p className="selection-status" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {[...programsByDay].map(([day, dayPrograms]) => (
          <section className="programme-day" key={day} aria-labelledby={`day-${day}`}>
            <h3 id={`day-${day}`}>{day}</h3>
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
