export type SelectionPriority = 'WANT' | 'IF_AVAILABLE'
export type Selections = Record<string, SelectionPriority>

const storageKeys = {
  userId: 'sorszamvadasz.userId',
  displayName: 'sorszamvadasz.displayName',
  selections: 'sorszamvadasz.selections',
  pendingSync: 'sorszamvadasz.pendingSync',
  registrationId: 'sorszamvadasz.registrationId',
}

export function getPendingRegistrationId(): string | null {
  return getStoredString(storageKeys.registrationId)
}

export function savePendingRegistrationId(registrationId: string): boolean {
  return saveStoredString(storageKeys.registrationId, registrationId)
}

export function clearPendingRegistrationId(): boolean {
  try {
    window.localStorage.removeItem(storageKeys.registrationId)
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
  return getStoredString(storageKeys.userId)
}

export function saveUserId(userId: string): boolean {
  return saveStoredString(storageKeys.userId, userId)
}

export function clearUserId(): boolean {
  try {
    window.localStorage.removeItem(storageKeys.userId)
    return true
  } catch {
    return false
  }
}

export function getStoredDisplayName(): string | null {
  return getStoredString(storageKeys.displayName)
}

export function saveDisplayName(displayName: string): boolean {
  return saveStoredString(storageKeys.displayName, displayName)
}

export function getStoredSelections(): Selections {
  try {
    const storedSelections = window.localStorage.getItem(storageKeys.selections)
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
    window.localStorage.setItem(storageKeys.selections, JSON.stringify(selections))
    return true
  } catch {
    return false
  }
}

export function getPendingSync(): boolean {
  return getStoredString(storageKeys.pendingSync) === 'true'
}

export function savePendingSync(isPending: boolean): boolean {
  try {
    if (isPending) {
      window.localStorage.setItem(storageKeys.pendingSync, 'true')
    } else {
      window.localStorage.removeItem(storageKeys.pendingSync)
    }

    return true
  } catch {
    return false
  }
}
