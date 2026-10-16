import { useEffect, useState } from 'react'
import { getPageInfo, type PageInfo } from '../api/wikipedia'
import { articlePath, navigate } from '../router'
import { SEEDS, pickOnboarding, type Seed } from '../seeds'
import { update } from '../state'

const GRID_SIZE = 10
const MIN_PICKS = 3

export function Onboarding() {
  const [info, setInfo] = useState<Map<string, PageInfo> | null>(null)
  const [selected, setSelected] = useState<Seed[]>([])

  useEffect(() => {
    getPageInfo(SEEDS.map((s) => s.title)).then(setInfo).catch(() => setInfo(new Map()))
  }, [])

  if (!info) return <main className="reader"><p className="muted">Cargando…</p></main>

  // Offline or API down: show the seeds without images rather than nothing.
  const picks = pickOnboarding(SEEDS, (t) => !info.size || !!info.get(t)?.thumbnail, GRID_SIZE)
  const toggle = (s: Seed) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  function start() {
    update((st) => ({ ...st, interests: Object.fromEntries(selected.map((s) => [s.tag, 1])) }))
    navigate(articlePath(selected[0].title), { from: 'seed' })
  }

  const missing = MIN_PICKS - selected.length
  return (
    <main className="reader">
      <h1>¿Qué te llama?</h1>
      <p className="muted">Marca al menos {MIN_PICKS}. Empezarás a leer por el primero que elijas.</p>
      <ul className="seed-grid">
        {picks.map((s) => {
          const i = info.get(s.title)
          return (
            <li key={s.title}>
              <button type="button" aria-pressed={selected.includes(s)} onClick={() => toggle(s)}>
                {i?.thumbnail && <img src={i.thumbnail} alt="" />}
                <strong>{s.title}</strong>
                {i?.description && <span className="muted">{i.description}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <button className="read-more primary" disabled={missing > 0} onClick={start}>
        {missing > 0 ? `Elige ${missing} más` : 'Empezar a leer'}
      </button>
    </main>
  )
}
