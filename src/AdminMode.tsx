import { useState } from 'react'
import { ApiError, adminRequest } from './api'
const key = 'sorszamvadasz.adminAccessCode'
export default function AdminMode() {
  const [code, setCode] = useState(() => sessionStorage.getItem(key) ?? '')
  const [opened, setOpened] = useState(Boolean(sessionStorage.getItem(key)))
  const [error, setError] = useState('')
  async function open(event: React.FormEvent) { event.preventDefault(); try { await adminRequest('getAdminOverview', { accessCode: code }); sessionStorage.setItem(key, code); setOpened(true); setError('') } catch (exception) { setError(exception instanceof ApiError && exception.code === 'ACCESS_DENIED' ? 'Hibás admin kód.' : 'Most nem érjük el az admin felületet.') } }
  if (!opened) return <main className="landing"><h1>Admin kód</h1><p>Az admin felület megnyitásához add meg az admin kódot.</p><form onSubmit={open}><input type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" />{error && <p className="error">{error}</p>}<div className="landing-actions"><a href="/">Mégse</a><button>Megnyitás</button></div></form></main>
  return <main className="landing"><h1>ADMIN</h1><h2>Napi működés</h2><p>Napok</p><p>Metrikák</p><h2>Karbantartás</h2><p>Táblák</p></main>
}
