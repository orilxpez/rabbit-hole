import { useEffect, useState, type CSSProperties } from 'react'
import { getPageInfo, type PageInfo } from '../api/wikipedia'
import { useT } from '../i18n'
import { articlePath, navigate } from '../router'
import { SEEDS, dayNumber, pickOnboarding, type Seed } from '../seeds'
import { update } from '../state'
import { Display, Thumb } from '../ui'

const CHOICES = 6

/** One tap configures the profile and starts the descent: no multi-select, no confirm step. */
export function Onboarding() {
  const t = useT()
  const [info, setInfo] = useState<Map<string, PageInfo> | null>(null)

  useEffect(() => {
    getPageInfo(SEEDS.map((s) => s.title)).then(setInfo).catch(() => setInfo(new Map()))
  }, [])

  // Offline or API down: show the seeds without images rather than nothing.
  const hasImage = (title: string) => !info?.size || !!info.get(title)?.thumbnail
  const picks = pickOnboarding(SEEDS, hasImage, CHOICES, dayNumber(new Date()))

  function start(seed: Seed, img: HTMLElement | null) {
    update((st) => ({ ...st, interests: { [seed.tag]: 1 } }))
    // The chosen image becomes the article's hero image during the transition.
    img?.style.setProperty('view-transition-name', 'hero')
    navigate(articlePath(seed.title), { from: 'seed' })
  }

  return (
    <main className="page">
      <Display text={t('pickTitle')} />
      <p className="lede">{t('pickHint')}</p>
      <ul className="seed-grid" aria-busy={!info}>
        {picks.map((s, i) => {
          const p = info?.get(s.title)
          return (
            <li key={s.title} style={{ '--i': i } as CSSProperties}>
              <button type="button" className="tile" onClick={(e) => start(s, e.currentTarget.querySelector('img'))}>
                <Thumb src={p?.thumbnail} className="tile-thumb" />
                <strong>{s.title}</strong>
                {p?.description && <span className="tile-desc">{p.description}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
