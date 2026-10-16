import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

// A 12×12 pixel rabbit facing right. '#' is ink, '.' is empty (the eye is a gap).
const FRAMES = {
  sit: [
    '.....#..#...',
    '.....##.##..',
    '.....##.##..',
    '......####..',
    '.....######.',
    '.....##.###.',
    '..#########.',
    '.##########.',
    '###########.',
    '##########..',
    '.########...',
    '..##..###...',
  ],
  blink: [
    '.....#..#...',
    '.....##.##..',
    '.....##.##..',
    '......####..',
    '.....######.',
    '.....######.',
    '..#########.',
    '.##########.',
    '###########.',
    '##########..',
    '.########...',
    '..##..###...',
  ],
  twitch: [
    '........##..',
    '.....#..#...',
    '.....##.##..',
    '......####..',
    '.....######.',
    '.....##.###.',
    '..#########.',
    '.##########.',
    '###########.',
    '##########..',
    '.########...',
    '..##..###...',
  ],
  hop: [
    '............',
    '...##.......',
    '....##.##...',
    '.....#####..',
    '.....######.',
    '.....##.###.',
    '..#########.',
    '###########.',
    '.#########..',
    '##......##..',
    '#...........',
    '............',
  ],
} satisfies Record<string, string[]>

type Frame = keyof typeof FRAMES

const HOP_MS = 420
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function Sprite({ frame }: { frame: Frame }) {
  const rects = useMemo(
    () => FRAMES[frame].flatMap((row, y) => [...row].flatMap((c, x) => (c === '#' ? [`M${x} ${y}h1v1h-1z`] : []))).join(''),
    [frame],
  )
  return (
    <svg className="rabbit" viewBox="0 0 12 12" aria-hidden="true">
      <path d={rects} />
    </svg>
  )
}

/**
 * The rabbit that lives in the top bar. It sits on the article you are reading
 * (`at`, 0 = next to the hole), hops along the trail when you go deeper or back,
 * and blinks or twitches its ears now and then.
 */
export function TrailRabbit({ at }: { at: number }) {
  const [frame, setFrame] = useState<Frame>('sit')
  const [hopping, setHopping] = useState(false)
  const last = useRef(at)

  // Idle life: a blink or an ear twitch every few seconds.
  useEffect(() => {
    if (reduceMotion()) return
    let timer: ReturnType<typeof setTimeout>
    const idle = () => {
      timer = setTimeout(() => {
        const next: Frame = Math.random() < 0.6 ? 'blink' : 'twitch'
        setFrame((f) => (f === 'hop' ? f : next))
        timer = setTimeout(() => { setFrame((f) => (f === 'hop' ? f : 'sit')); idle() }, next === 'blink' ? 140 : 280)
      }, 2500 + Math.random() * 4000)
    }
    idle()
    return () => clearTimeout(timer)
  }, [])

  // A move along the trail is a hop: stretched frame plus an arc (see .hopping in CSS).
  useEffect(() => {
    if (last.current === at) return
    last.current = at
    if (reduceMotion()) return
    setHopping(true)
    setFrame('hop')
    const timer = setTimeout(() => { setHopping(false); setFrame('sit') }, HOP_MS)
    return () => clearTimeout(timer)
  }, [at])

  return (
    <span className={`rabbit-pos${hopping ? ' hopping' : ''}`} style={{ '--x': at } as CSSProperties}>
      <Sprite frame={frame} />
    </span>
  )
}
