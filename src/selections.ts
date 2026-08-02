export type SelectionPriority = 'WANT' | 'IF_AVAILABLE'

export type Selections = Record<string, SelectionPriority>

const selectionsStorageKey = 'sorszamvadasz.selections'

function isSelectionPriority(value: unknown): value is SelectionPriority {
  return value === 'WANT' || value === 'IF_AVAILABLE'
}

export function getStoredSelections(): Selections {
  try {
    const storedSelections = window.localStorage.getItem(selectionsStorageKey)

    if (!storedSelections) {
      return {}
    }

    const parsedSelections: unknown = JSON.parse(storedSelections)

    if (!parsedSelections || typeof parsedSelections !== 'object') {
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
    window.localStorage.setItem(selectionsStorageKey, JSON.stringify(selections))
    return true
  } catch {
    return false
  }
}
