// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { missingRelationTranslations, relationText, translate } from './i18n'

describe('i18n', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'otherPaths', { n: 2 })).toBe('Other paths (2)')
    expect(translate('es', 'continueWith', { title: 'Dome' })).toBe('Continuar con Dome')
  })

  it('translates every relation label', () => {
    expect(missingRelationTranslations()).toEqual([])
    expect(relationText('es', 'Architect')).toBe('Arquitecto')
    expect(relationText('en', 'Architect')).toBe('Architect')
  })
})
