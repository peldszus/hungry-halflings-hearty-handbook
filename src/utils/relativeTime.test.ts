import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from './relativeTime'

const now = new Date(2026, 5, 21) // 2026-06-21

describe('formatRelativeTime', () => {
  it('returns "today" for the same day', () => {
    expect(formatRelativeTime('2026-06-21', now)).toBe('today')
  })

  it('returns "yesterday" for one day in the past', () => {
    expect(formatRelativeTime('2026-06-20', now)).toBe('yesterday')
  })

  it('returns "tomorrow" for one day in the future', () => {
    expect(formatRelativeTime('2026-06-22', now)).toBe('tomorrow')
  })

  it('returns days ago for less than a week in the past', () => {
    expect(formatRelativeTime('2026-06-17', now)).toBe('4 days ago')
  })

  it('returns weeks ago for less than a month in the past', () => {
    expect(formatRelativeTime('2026-06-07', now)).toBe('2 weeks ago')
  })

  it('returns months ago for less than a year in the past', () => {
    expect(formatRelativeTime('2026-03-21', now)).toBe('3 months ago')
  })

  it('returns years ago for a year or more in the past', () => {
    expect(formatRelativeTime('2024-06-21', now)).toBe('2 years ago')
  })

  it('returns in N days for future dates', () => {
    expect(formatRelativeTime('2026-06-25', now)).toBe('in 4 days')
  })

  it('returns in N weeks for future dates less than a month away', () => {
    expect(formatRelativeTime('2026-07-05', now)).toBe('in 2 weeks')
  })

  it('returns in N months for future dates less than a year away', () => {
    expect(formatRelativeTime('2026-09-21', now)).toBe('in 3 months')
  })

  it('returns in N years for future dates a year or more away', () => {
    expect(formatRelativeTime('2028-06-21', now)).toBe('in 2 years')
  })
})
