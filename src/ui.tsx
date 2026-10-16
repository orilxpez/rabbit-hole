import type { CSSProperties } from 'react'

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

/** Small frame thumbnail in the classic Wikipedia style; transparent images sit on white. */
export function Thumb({ src, className = '' }: { src: string | null | undefined; className?: string }) {
  return <span className={`thumb ${className}`}>{src ? <img src={src} alt="" loading="lazy" /> : null}</span>
}
