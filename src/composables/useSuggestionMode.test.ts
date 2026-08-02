import { describe, it, expect, beforeEach } from 'vitest'
import { useSuggestionMode } from './useSuggestionMode'

describe('useSuggestionMode', () => {
  beforeEach(() => {
    // The state is a module-level singleton, so it persists across tests unless reset.
    useSuggestionMode().exit()
  })

  it('is inactive by default', () => {
    expect(useSuggestionMode().active.value).toBe(false)
  })

  it('shares state between callers', () => {
    const a = useSuggestionMode()
    const b = useSuggestionMode()
    a.enter()
    expect(b.active.value).toBe(true)
    b.exit()
    expect(a.active.value).toBe(false)
  })
})
