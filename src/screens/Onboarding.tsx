import { useEffect, useState } from 'react'
import { getPageInfo, type PageInfo } from '../api/wikipedia'
import { useT } from '../i18n'
import { articlePath, navigate } from '../router'
import { SEEDS, pickOnboarding, type Seed } from '../seeds'
import { update } from '../state'

const GRID_SIZE = 10
const MIN_PICKS = 3

export function Onboarding() {
  const t = useT()
  const [info, setInfo] = useState<Map<string, PageInfo> | null>(null)
  const [selected, setSelected] = useState<Seed[]>([])

  useEffect(() => {
    getPageInfo(SEEDS.map((s) => s.title)).then(setInfo).catch(() => setInfo(new Map()))
  }, [])

  // Offline or API down: show the seeds without images rather than nothing.
  const picks = info ? pickOnboarding(SEEDS, (title) => !info.size || !!info.get(title)?.thumbnail, GRID_SIZE) : []
  const toggle = (s: Seed) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  function start() {
    update((st) => ({ ...st, interests: Object.fromEntries(selected.map((s) => [s.tag, 1])) }))
    navigate(articlePath(selected[0].title), { from: 'seed' })
  }

  const missing = MIN_PICKS - selected.length
  return (
    <main className="page">
      <h1 className="display">{t('onboardTitle')}</h1>
      <p className="lede">{t('onboardHint')}</p>
      {!info && <p className="sr-only">{t('loading')}</p>}
      <ul className="seed-grid">
        {(info ? picks : SEEDS.slice(0, GRID_SIZE)).map((s) => {
          const i = info?.get(s.title)
          const order = selected.indexOf(s)
          return (
            <li key={s.title}>
              <button type="button" className="tile" aria-pressed={order >= 0} onClick={() => toggle(s)}>
                <span className="tile-head">
                  <strong>{s.title}</strong>
                  {/* The first pick is where reading starts, so the order matters and is shown. */}
                  {order >= 0 && <span className="tile-order">{order + 1}</span>}
                </span>
                <span className="tile-media">{i?.thumbnail && <img src={i.thumbnail} alt="" />}</span>
                {i?.description && <span className="tile-desc">{i.description}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="dock">
        <button className="button primary" disabled={missing > 0} onClick={start}>
          {missing > 0 ? t('pickMore', { n: missing }) : t('startReading')}
        </button>
      </div>
    </main>
  )
}
