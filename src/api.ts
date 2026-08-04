import { currentEnvironment } from './config'
import type { Environment } from './config'
import type { Selections } from './storage'

export type DayState = 'OPEN' | 'CLOSED' | 'QUEUEING' | 'FINISHED'
export type Chance = 'VERY_GOOD' | 'GOOD' | 'LOW' | 'VERY_LOW' | 'HOPELESS'

export type AdminEnvironmentOverview = {
  environment: Environment
  days: Record<string, DayState>
  counts: { users: number; selections: number; volunteers: number }
  metrics: AdminMetricsInfo
}

export type AdminMetricsInfo = {
  environment: Environment
  metricsUpdatedAt: string | null
  metricsVersion: string | null
}

export type AdminOverview = {
  environments: AdminEnvironmentOverview[]
  sheets: string[]
}

export type LiveInitializationCounts = {
  users: number
  selections: number
  volunteers: number
  dayStates: number
  dayMetrics: number
  programmeMetrics: number
}

export type DayStateUpdate = {
  environment: Environment
  date: string
  state: DayState
  updatedAt: string
}

export type LiveInitializationResult = {
  deleted: LiveInitializationCounts
  resetDayStates: number
}

export type DayStatus = {
  date: string
  state: DayState
  chance: Chance | null
  wantCount: number
  ifAvailableCount: number
  volunteerCount: number
  capacity: number
  metricsUpdatedAt: string | null
}

export type VolunteerOverview = {
  date: string
  state: DayState
  volunteerCount: number
  capacity: number
  chance: Chance | null
  metricsUpdatedAt: string | null
  metricsVersion: string | null
  programmes: Array<{
    programmeId: string
    wantCount: number
    ifAvailableCount: number
  }>
  serverTime: string
}

export type ProgrammeRequestors = {
  programmeId: string
  want: Array<{ displayName: string }>
  ifAvailable: Array<{ displayName: string }>
  serverTime: string
}

type ApiErrorCode =
  | 'CONFIGURATION'
  | 'NETWORK_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'DISPLAY_NAME_TAKEN'
  | 'USER_NOT_FOUND'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'DAY_NOT_OPEN'
  | string

export class ApiError extends Error {
  constructor(public readonly code: ApiErrorCode, message: string) {
    super(message)
  }
}

type RegisterResponse = {
  user: { id: string; displayName: string }
  selections: Selections
  serverTime: string
}

type ParticipantResponse = {
  user: { id: string; displayName: string }
  selections: Selections
  dayStates: Record<string, DayState>
  volunteerDays: string[]
  serverTime: string
}

type VolunteerStatusResponse = {
  date: string
  active: boolean
  updatedAt: string
}

type SyncResponse = {
  selections: Selections
  syncedAt: string
}

type DayStatusResponse = {
  days: DayStatus[]
  serverTime: string
}

function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_SORSZAMVADASZ_API_URL?.trim()

  if (!apiUrl) {
    if (import.meta.env.DEV) {
      console.error('VITE_SORSZAMVADASZ_API_URL is not configured.')
    }

    throw new ApiError('CONFIGURATION', 'A közös rendszer címe nincs beállítva.')
  }

  return apiUrl
}

async function request<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  let response: Response
  const apiUrl = getApiUrl()

  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload }),
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'A közös rendszer most nem érhető el.')
  }

  let body: unknown

  try {
    body = JSON.parse(await response.text())
  } catch {
    throw new ApiError('MALFORMED_RESPONSE', 'A közös rendszer hibás választ adott.')
  }

  if (!body || typeof body !== 'object' || !('ok' in body)) {
    throw new ApiError('MALFORMED_RESPONSE', 'A közös rendszer hibás választ adott.')
  }

  if (body.ok === true && 'data' in body) {
    return body.data as T
  }

  if (body.ok === false && 'error' in body && body.error && typeof body.error === 'object') {
    const { code, message } = body.error as { code?: unknown; message?: unknown }

    if (typeof code === 'string' && typeof message === 'string') {
      throw new ApiError(code, message)
    }
  }

  throw new ApiError('MALFORMED_RESPONSE', 'A közös rendszer hibás választ adott.')
}

export function register(displayName: string, selections: Selections, registrationId: string, environment: Environment = currentEnvironment) {
  return request<RegisterResponse>('register', { environment, displayName, selections, registrationId })
}

export function getParticipant(userId: string, environment: Environment = currentEnvironment) {
  return request<ParticipantResponse>('getParticipant', { environment, userId })
}

export function syncSelections(userId: string, selections: Selections, environment: Environment = currentEnvironment) {
  return request<SyncResponse>('syncSelections', { environment, userId, selections })
}

export function getDayStatus(environment: Environment = currentEnvironment) {
  return request<DayStatusResponse>('getDayStatus', { environment })
}

export function getVolunteerOverview(environment: Environment, date: string) {
  return request<VolunteerOverview>('getVolunteerOverview', { environment, date })
}

export function getProgrammeRequestors(environment: Environment, programmeId: string, accessCode: string) {
  return request<ProgrammeRequestors>('getProgrammeRequestors', { environment, programmeId, accessCode })
}

export function setVolunteerStatus(environment: Environment, userId: string, date: string, active: boolean) {
  return request<VolunteerStatusResponse>('setVolunteerStatus', { environment, userId, date, active })
}

export function getAdminOverview(accessCode: string) {
  return request<AdminOverview>('getAdminOverview', { accessCode })
}

export function setDayState(accessCode: string, environment: Environment, date: string, state: DayState) {
  return request<DayStateUpdate>('setDayState', { accessCode, environment, date, state })
}

export function publishMetricsAdmin(accessCode: string) {
  return request<{ environments: AdminMetricsInfo[] }>('publishMetricsAdmin', { accessCode })
}

export function previewLiveInitialization(accessCode: string) {
  return request<LiveInitializationCounts>('previewLiveInitialization', { accessCode })
}

export function initializeLive(accessCode: string, confirmation: 'LIVE') {
  return request<LiveInitializationResult>('initializeLive', { accessCode, confirmation })
}
