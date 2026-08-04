import { useEffect, useState } from 'react'
import {
  ApiError,
  getAdminOverview,
  initializeLive,
  previewLiveInitialization,
  publishMetricsAdmin,
  setDayState,
} from './api'
import type { AdminOverview, DayState, LiveInitializationCounts, LiveInitializationResult } from './api'
import type { Environment } from './config'
import { festivalDayLabels } from './config'

const storageKey = 'sorszamvadasz.adminAccessCode'
const dayStates: DayState[] = ['OPEN', 'CLOSED', 'QUEUEING', 'FINISHED']
type Panel = 'days' | 'metrics' | 'tables' | null

export default function AdminMode() {
  const [code, setCode] = useState(() => sessionStorage.getItem(storageKey) ?? '')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [error, setError] = useState('')
  const [checkingCode, setCheckingCode] = useState(Boolean(sessionStorage.getItem(storageKey)))

  useEffect(() => {
    if (checkingCode && code) void loadOverview(code, true)
  }, [])

  function denyAccess() {
    sessionStorage.removeItem(storageKey)
    setOverview(null)
    setPanel(null)
    setCode('')
    setError('Hibás admin kód.')
  }

  function handleActionError(exception: unknown): boolean {
    if (exception instanceof ApiError && exception.code === 'ACCESS_DENIED') {
      denyAccess()
      return true
    }
    return false
  }

  async function loadOverview(accessCode = code, validatingStoredCode = false) {
    try {
      const response = await getAdminOverview(accessCode)
      setOverview(response)
      setError('')
      return response
    } catch (exception) {
      if (!handleActionError(exception)) {
        setError('Most nem érjük el az admin felületet.')
        if (validatingStoredCode) setOverview(null)
      }
      return null
    } finally {
      setCheckingCode(false)
    }
  }

  async function open(event: React.FormEvent) {
    event.preventDefault()
    setCheckingCode(true)
    const response = await loadOverview(code)
    if (response) sessionStorage.setItem(storageKey, code)
  }

  if (!overview) {
    return (
      <main className="landing">
        <h1>Admin kód</h1>
        <p>Az admin felület megnyitásához add meg az admin kódot.</p>
        <form onSubmit={open}>
          <label htmlFor="admin-code">Admin kód</label>
          <input id="admin-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" required />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="landing-actions"><a href="/">Mégse</a><button type="submit" disabled={checkingCode}>{checkingCode ? 'Betöltés…' : 'Megnyitás'}</button></div>
        </form>
      </main>
    )
  }

  return (
    <main className="landing admin-mode">
      <h1>ADMIN</h1>
      {panel === null && <AdminSections onOpen={setPanel} />}
      {panel === 'days' && <DaysPanel code={code} overview={overview} onBack={() => setPanel(null)} onDenied={handleActionError} onReload={loadOverview} />}
      {panel === 'metrics' && <MetricsPanel code={code} overview={overview} onBack={() => setPanel(null)} onDenied={handleActionError} onReload={loadOverview} />}
      {panel === 'tables' && <TablesPanel code={code} onBack={() => setPanel(null)} onDenied={handleActionError} onReload={loadOverview} />}
    </main>
  )
}

function AdminSections({ onOpen }: { onOpen: (panel: Exclude<Panel, null>) => void }) {
  return <><h2>Napi működés</h2><div className="admin-section-list"><button type="button" onClick={() => onOpen('days')}>Napok</button><button type="button" onClick={() => onOpen('metrics')}>Metrikák</button></div><h2>Karbantartás</h2><div className="admin-section-list"><button type="button" onClick={() => onOpen('tables')}>Táblák</button></div></>
}

type PanelProps = { code: string; onBack: () => void; onDenied: (error: unknown) => boolean; onReload: () => Promise<AdminOverview | null> }

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="admin-panel-header"><button type="button" className="admin-back" onClick={onBack}>← Vissza</button><h2 id={`${title === 'Napok' ? 'days' : title === 'Metrikák' ? 'metrics' : 'tables'}-title`}>{title}</h2></header>
}

function DaysPanel({ code, overview, onBack, onDenied, onReload }: PanelProps & { overview: AdminOverview }) {
  const [drafts, setDrafts] = useState<Record<string, DayState>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function save(environment: Environment, date: string, confirmed: DayState) {
    const rowKey = `${environment}:${date}`
    const nextState = drafts[rowKey] ?? confirmed
    setSaving(rowKey); setError('')
    try {
      const result = await setDayState(code, environment, date, nextState)
      setDrafts((current) => ({ ...current, [rowKey]: result.state }))
      await onReload()
    } catch (exception) {
      if (!onDenied(exception)) setError('A nap állapotát nem sikerült menteni. Próbáld újra.')
    } finally { setSaving(null) }
  }

  return <section aria-labelledby="days-title"><PanelHeader title="Napok" onBack={onBack} />{error && <p className="error" role="alert">{error}</p>}<div className="admin-days">{overview.environments.flatMap(({ environment, days }) => Object.entries(days).sort().map(([date, state]) => { const rowKey = `${environment}:${date}`; return <div className="admin-day-row" key={rowKey}><div><strong>{environment}</strong><span>{festivalDayLabels[date] ?? date}</span></div><div><span>Jelenlegi: <strong>{state}</strong></span><label htmlFor={`state-${rowKey}`}>Következő állapot</label><select id={`state-${rowKey}`} value={drafts[rowKey] ?? state} onChange={(event) => setDrafts((current) => ({ ...current, [rowKey]: event.target.value as DayState }))} disabled={saving === rowKey}>{dayStates.map((option) => <option key={option}>{option}</option>)}</select></div><button type="button" onClick={() => void save(environment, date, state)} disabled={saving === rowKey}>{saving === rowKey ? 'Mentés…' : 'Mentés'}</button></div> }))}</div></section>
}

function MetricsPanel({ code, overview, onBack, onDenied, onReload }: PanelProps & { overview: AdminOverview }) {
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  async function publish() { setPublishing(true); setError(''); try { await publishMetricsAdmin(code); await onReload() } catch (exception) { if (!onDenied(exception)) setError('A metrikákat nem sikerült közzétenni. Próbáld újra.') } finally { setPublishing(false) } }
  return <section aria-labelledby="metrics-title"><PanelHeader title="Metrikák" onBack={onBack} /><div className="admin-metrics">{overview.environments.map(({ environment, metrics }) => <div key={environment}><strong>{environment}</strong><span>Frissítve: {metrics.metricsUpdatedAt ?? 'Még nincs közzétéve'}</span><span>Verzió: {metrics.metricsVersion ?? '—'}</span></div>)}</div>{error && <p className="error" role="alert">{error}</p>}<button type="button" onClick={() => void publish()} disabled={publishing}>{publishing ? 'Közzététel…' : 'Metrikák közzététele'}</button></section>
}

function TablesPanel({ code, onBack, onDenied, onReload }: PanelProps) {
  const [preview, setPreview] = useState<LiveInitializationCounts | null>(null)
  const [result, setResult] = useState<LiveInitializationResult | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')
  async function loadPreview() { setLoading(true); try { setPreview(await previewLiveInitialization(code)); setError('') } catch (exception) { if (!onDenied(exception)) setError('A LIVE adatok nem tölthetők be. Próbáld újra.') } finally { setLoading(false) } }
  useEffect(() => { void loadPreview() }, [])
  async function execute() { if (confirmation !== 'LIVE') return; setExecuting(true); setError(''); try { setResult(await initializeLive(code, 'LIVE')); setConfirmation(''); setConfirming(false); await onReload(); await loadPreview() } catch (exception) { if (!onDenied(exception)) setError('A LIVE inicializálása nem sikerült. Próbáld újra.') } finally { setExecuting(false) } }
  const labels: Array<[keyof LiveInitializationCounts, string]> = [['users', 'Users'], ['selections', 'Selections'], ['volunteers', 'Volunteers'], ['dayStates', 'DayStates'], ['dayMetrics', 'DayMetrics'], ['programmeMetrics', 'ProgrammeMetrics']]
  return <section aria-labelledby="tables-title"><PanelHeader title="Táblák" onBack={onBack} />{loading && <p>Betöltés…</p>}{preview && <div className="admin-counts">{labels.map(([field, label]) => <p key={field}><span>{label}</span><strong>{preview[field]}</strong></p>)}</div>}{error && <p className="error" role="alert">{error}</p>}{!confirming && <button type="button" onClick={() => setConfirming(true)} disabled={loading}>LIVE inicializálása</button>}{confirming && <div className="admin-confirm"><p>A folytatáshoz írd be pontosan: <strong>LIVE</strong></p><label htmlFor="live-confirmation">Megerősítés</label><input id="live-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /><button type="button" onClick={() => void execute()} disabled={confirmation !== 'LIVE' || executing}>{executing ? 'Inicializálás…' : 'LIVE inicializálása'}</button><button type="button" className="admin-cancel" onClick={() => { setConfirming(false); setConfirmation('') }} disabled={executing}>Mégse</button></div>}{result && <div className="admin-result" role="status"><p><strong>Az inicializálás elkészült.</strong></p>{labels.map(([field, label]) => <p key={field}>{label}: {result.deleted[field]} törölve</p>)}<p>DayStates: {result.resetDayStates} visszaállítva</p><p>A metrikák még nincsenek közzétéve.</p></div>}</section>
}
