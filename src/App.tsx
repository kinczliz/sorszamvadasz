import { useState } from 'react'
import type { FormEvent } from 'react'
import ProgrammeBrowser from './ProgrammeBrowser'

const displayNameStorageKey = 'sorszamvadasz.displayName'

function getStoredDisplayName(): string | null {
  try {
    const displayName = window.localStorage.getItem(displayNameStorageKey)?.trim()

    return displayName || null
  } catch {
    return null
  }
}

function App() {
  const [displayName, setDisplayName] = useState(getStoredDisplayName)
  const [draftName, setDraftName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextDisplayName = draftName.trim()

    if (!nextDisplayName) {
      setErrorMessage('Kérjük, add meg a nevedet.')
      return
    }

    try {
      window.localStorage.setItem(displayNameStorageKey, nextDisplayName)
      setDisplayName(nextDisplayName)
    } catch {
      setErrorMessage('A nevedet most nem tudtuk elmenteni ezen az eszközön.')
    }
  }

  if (displayName) {
    return <ProgrammeBrowser displayName={displayName} />
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
              setDraftName(event.target.value)
              setErrorMessage('')
            }}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={80}
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
          <button type="submit">Tovább</button>
        </form>
      </section>
    </main>
  )
}

export default App
