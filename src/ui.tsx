import type { CSSProperties } from 'react'
import hareGrid from './data/hare.txt?raw'

/**
 * The loud element of every screen: uppercase grotesk, justified so the words of a
 * line spread across the full width, like a poster.
 */
export function Display({ text, className = '', fit }: { text: string; className?: string; fit?: number }) {
  return <h1 className={`display ${className}`} style={{ '--fit': fit ?? displayFit(text) } as CSSProperties}>{text}</h1>
}

/**
 * Characters per line the title is sized for: about two lines (three for long titles),
 * never fewer than the longest word, so several words share a line and no word breaks.
 */
export function displayFit(text: string): number {
  const longest = Math.max(...text.split(/\s+/).map((w) => w.length))
  const lines = text.length > 24 ? 3 : 2
  return Math.max(4, longest, Math.ceil(text.length / lines))
}

// Dürer's Young Hare (1502, public domain, Wikimedia Commons) sampled into a 72-column
// halftone grid: each digit is a dot size from 0 (none) to 4 (largest).
const ROWS = hareGrid.trimEnd().split('\n')
const COLS = Math.max(...ROWS.map((r) => r.length))
const RADIUS = [0, 0.2, 0.3, 0.4, 0.5]

export function Hare({ className = '' }: { className?: string }) {
  return (
    <svg className={`hare ${className}`} viewBox={`0 0 ${COLS} ${ROWS.length}`} role="img" aria-label="Young Hare, Albrecht Dürer, 1502">
      {ROWS.map((row, y) => (
        // One group per row: the dots fall into place top to bottom on first paint.
        <g key={y} style={{ '--row': y } as CSSProperties}>
          {[...row].map((level, x) => level !== '0' && (
            <circle key={x} cx={x + 0.5} cy={y + 0.5} r={RADIUS[Number(level)]} />
          ))}
        </g>
      ))}
    </svg>
  )
}

/** Small frame thumbnail in the classic Wikipedia style; transparent images sit on white. */
export function Thumb({ src, className = '' }: { src: string | null | undefined; className?: string }) {
  return <span className={`thumb ${className}`}>{src ? <img src={src} alt="" loading="lazy" /> : null}</span>
}
