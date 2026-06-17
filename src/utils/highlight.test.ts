import { describe, it, expect } from 'vitest'
import { highlightInfixMatches } from './highlight'

describe('highlightInfixMatches', () => {
  it('returns the whole text unmatched when query is empty', () => {
    expect(highlightInfixMatches('Lasagna', '')).toEqual([{ text: 'Lasagna', matched: false }])
  })

  it('returns the whole text unmatched when there is no match', () => {
    expect(highlightInfixMatches('Lasagna', 'xyz')).toEqual([{ text: 'Lasagna', matched: false }])
  })

  it('matches a prefix', () => {
    expect(highlightInfixMatches('Lasagna', 'Las')).toEqual([
      { text: 'Las', matched: true },
      { text: 'agna', matched: false },
    ])
  })

  it('matches an infix (middle) substring', () => {
    expect(highlightInfixMatches('Lasagna', 'asagn')).toEqual([
      { text: 'L', matched: false },
      { text: 'asagn', matched: true },
      { text: 'a', matched: false },
    ])
  })

  it('matches a suffix', () => {
    expect(highlightInfixMatches('Lasagna', 'gna')).toEqual([
      { text: 'Lasa', matched: false },
      { text: 'gna', matched: true },
    ])
  })

  it('matches the entire text', () => {
    expect(highlightInfixMatches('Lasagna', 'Lasagna')).toEqual([
      { text: 'Lasagna', matched: true },
    ])
  })

  it('matches case-insensitively while preserving original casing', () => {
    expect(highlightInfixMatches('Lasagna', 'SAGN')).toEqual([
      { text: 'La', matched: false },
      { text: 'sagn', matched: true },
      { text: 'a', matched: false },
    ])
  })
})
