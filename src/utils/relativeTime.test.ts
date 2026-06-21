import { describe, it, expect } from 'vitest'
import {
  formatRelativeTime,
  formatLastUsedLabel,
  formatRelativeToReference,
  formatAssignmentUsageLines,
} from './relativeTime'

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

describe('formatLastUsedLabel', () => {
  it('returns "Never used" when there is neither a last-used nor a planned date', () => {
    expect(formatLastUsedLabel(undefined, undefined, now)).toBe('Never used')
  })

  it('returns only a "Last used" label when there is no planned date', () => {
    expect(formatLastUsedLabel('2026-06-21', undefined, now)).toBe('Last used today')
    expect(formatLastUsedLabel('2026-06-17', undefined, now)).toBe('Last used 4 days ago')
  })

  it('returns only a "Next planned for" label when there is no last-used date', () => {
    expect(formatLastUsedLabel(undefined, '2026-06-22', now)).toBe('Next planned for tomorrow')
    expect(formatLastUsedLabel(undefined, '2026-06-25', now)).toBe('Next planned for in 4 days')
  })

  it('returns both labels when a recipe has been used before and is planned again', () => {
    expect(formatLastUsedLabel('2026-06-17', '2026-06-22', now)).toBe(
      'Last used 4 days ago · Next planned for tomorrow'
    )
  })
})

describe('formatRelativeToReference', () => {
  const reference = '2026-06-21'

  it('returns singular day phrasing before the reference', () => {
    expect(formatRelativeToReference('2026-06-20', reference)).toBe('1 day before')
  })

  it('returns singular day phrasing after the reference', () => {
    expect(formatRelativeToReference('2026-06-22', reference)).toBe('1 day after')
  })

  it('returns plural day phrasing for less than a week', () => {
    expect(formatRelativeToReference('2026-06-17', reference)).toBe('4 days before')
    expect(formatRelativeToReference('2026-06-25', reference)).toBe('4 days after')
  })

  it('returns week phrasing for less than a month', () => {
    expect(formatRelativeToReference('2026-06-07', reference)).toBe('2 weeks before')
    expect(formatRelativeToReference('2026-07-05', reference)).toBe('2 weeks after')
  })

  it('returns singular week phrasing for exactly one week', () => {
    expect(formatRelativeToReference('2026-06-14', reference)).toBe('1 week before')
    expect(formatRelativeToReference('2026-06-28', reference)).toBe('1 week after')
  })

  it('returns month phrasing for less than a year', () => {
    expect(formatRelativeToReference('2026-03-21', reference)).toBe('3 months before')
    expect(formatRelativeToReference('2026-09-21', reference)).toBe('3 months after')
  })

  it('returns year phrasing for a year or more', () => {
    expect(formatRelativeToReference('2024-06-21', reference)).toBe('2 years before')
    expect(formatRelativeToReference('2028-06-21', reference)).toBe('2 years after')
  })
})

describe('formatAssignmentUsageLines', () => {
  const reference = '2026-06-21'

  it('returns "Never used" when there is no last-used or next-planned date', () => {
    expect(formatAssignmentUsageLines(undefined, undefined, reference)).toEqual(['Never used'])
  })

  it('returns only a "Last used" line when there is no next-planned date', () => {
    expect(formatAssignmentUsageLines('2026-06-17', undefined, reference)).toEqual([
      'Last used 4 days before',
    ])
  })

  it('returns only a "Next planned" line when there is no last-used date', () => {
    expect(formatAssignmentUsageLines(undefined, '2026-06-25', reference)).toEqual([
      'Next planned 4 days after',
    ])
  })

  it('returns both lines when both a last-used and a next-planned date exist', () => {
    expect(formatAssignmentUsageLines('2026-06-17', '2026-06-25', reference)).toEqual([
      'Last used 4 days before',
      'Next planned 4 days after',
    ])
  })
})
