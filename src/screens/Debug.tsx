import { useState } from 'react'
import { computeMetrics } from '../metrics'
import { useAppState } from '../state'
import { storageUsage } from '../storage/store'

const kb = (chars: number) => `${Math.round(chars / 1024)} KB`
const show = (v: number | null, suffix = '') => (v === null ? 'sin datos' : `${v}${suffix}`)

/** Hidden view (/debug). "Copiar métricas" exports aggregates only, no titles. */
export function Debug() {
  const state = useAppState()
  const [copied, setCopied] = useState(false)
  const m = computeMetrics(state)
  const storage = storageUsage()

  async function copy() {
    const payload = { generatedAt: new Date().toISOString(), ...m, storage }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
  }

  const rows: [string, string][] = [
    ['Artículos en los que llegó a las sugerencias', show(m.reachedSuggestionsPct, ' %')],
    ['Artículos por sesión', show(m.articlesPerSession)],
    ['Sesiones', String(m.sessions)],
    ['Hilos', String(m.threads)],
    ['Artículos leídos', String(m.articles)],
    ['Abrió el artículo completo', show(m.openedFullPct, ' %')],
    ['Tiempo activo medio', show(m.avgActiveSeconds, ' s')],
    ['Profundidad media de lectura', show(m.avgScrollDepthPct, ' %')],
    ['Llegadas por semilla / enlace / sugerencia', `${m.chosenFrom.seed} / ${m.chosenFrom.link} / ${m.chosenFrom.suggestion}`],
    ['Elección de sugerencias curadas (E1)', `${show(m.suggestionChoice.curated.rate, ' %')} de ${m.suggestionChoice.curated.shown}`],
    ['Elección de sugerencias del motor (E3)', `${show(m.suggestionChoice.engine.rate, ' %')} de ${m.suggestionChoice.engine.shown}`],
    ['Esquema', `v${m.schemaVersion}`],
    ['Estado guardado', kb(storage.stateChars)],
    ['Caché', `${storage.cacheEntries} entradas, ${kb(storage.cacheChars)}`],
  ]

  return (
    <main className="reader">
      <h1>Depuración</h1>
      <table className="debug">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
      <button className="read-more primary" onClick={copy}>{copied ? 'Copiado' : 'Copiar métricas'}</button>
      <p className="muted">Se copian solo totales y porcentajes, sin títulos de artículos.</p>
    </main>
  )
}
