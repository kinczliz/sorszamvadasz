export type SelectionPriority = 'WANT' | 'IF_AVAILABLE'
export type Selections = Record<string, SelectionPriority>

const storageKeys = {
  userId: 'sorszamvadasz.userId',
  displayName: 'sorszamvadasz.displayName',
  selections: 'sorszamvadasz.selections',
  pendingSync: 'sorszamvadasz.pendingSync',
  registrationId: 'sorszamvadasz.registrationId',
}
function key(name: keyof typeof storageKeys) {
  const environment = new URLSearchParams(window.location.search).get('environment') === 'DEMO' ? 'DEMO' : 'LIVE'
  const namespaced = `${storageKeys[name]}.${environment}`
  if (environment === 'LIVE' && !window.localStorage.getItem(namespaced) && window.localStorage.getItem(storageKeys[name])) {
    window.localStorage.setItem(namespaced, window.localStorage.getItem(storageKeys[name])!)
  }
  return namespaced
}

export function getPendingRegistrationId(): string | null {
  return getStoredString(key('registrationId'))
}

export function savePendingRegistrationId(registrationId: string): boolean {
  return saveStoredString(key('registrationId'), registrationId)
}

export function clearPendingRegistrationId(): boolean {
  try {
    window.localStorage.removeItem(key('registrationId'))
    return true
  } catch {
    return false
  }
}

function isSelectionPriority(value: unknown): value is SelectionPriority {
  return value === 'WANT' || value === 'IF_AVAILABLE'
}

function getStoredString(key: string): string | null {
  try {
    return window.localStorage.getItem(key)?.trim() || null
  } catch {
    return null
  }
}

function saveStoredString(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function getStoredUserId(): string | null {
  return getStoredString(key('userId'))
}

export function saveUserId(userId: string): boolean {
  return saveStoredString(key('userId'), userId)
}

export function clearUserId(): boolean {
  try {
    window.localStorage.removeItem(key('userId'))
    return true
  } catch {
    return false
  }
}

export function getStoredDisplayName(): string | null {
  return getStoredString(key('displayName'))
}

export function saveDisplayName(displayName: string): boolean {
  return saveStoredString(key('displayName'), displayName)
}

export function getStoredSelections(): Selections {
  try {
    const storedSelections = window.localStorage.getItem(key('selections'))
    const parsedSelections: unknown = storedSelections && JSON.parse(storedSelections)

    if (!parsedSelections || typeof parsedSelections !== 'object' || Array.isArray(parsedSelections)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsedSelections).filter(([, priority]) => isSelectionPriority(priority)),
    )
  } catch {
    return {}
  }
}

export function saveSelections(selections: Selections): boolean {
  try {
    window.localStorage.setItem(key('selections'), JSON.stringify(selections))
    return true
  } catch {
    return false
  }
}

export function getPendingSync(): boolean {
  return getStoredString(key('pendingSync')) === 'true'
}

export function savePendingSync(isPending: boolean): boolean {
  try {
    if (isPending) {
      window.localStorage.setItem(key('pendingSync'), 'true')
    } else {
      window.localStorage.removeItem(key('pendingSync'))
    }

    return true
  } catch {
    return false
  }
}
