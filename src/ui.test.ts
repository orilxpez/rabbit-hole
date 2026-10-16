import { describe, expect, it } from 'vitest'
import { displayFit } from './ui'

describe('displayFit', () => {
  it('sizes short titles for two lines and long ones for three', () => {
    expect(displayFit('Pick a way in')).toBe(7) // "PICK A" / "WAY IN"
    expect(displayFit('Library of Alexandria')).toBe(11) // "LIBRARY OF" / "ALEXANDRIA"
    expect(displayFit('Rudolf II, Holy Roman Emperor')).toBe(10)
  })

  it('never makes a word wider than the line', () => {
    expect(displayFit('Callimachus')).toBe(11)
    expect(displayFit('Antidisestablishmentarianism is long')).toBe(28)
  })
})
