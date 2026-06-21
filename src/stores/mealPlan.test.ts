import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMealPlanStore } from './mealPlan'

describe('mealPlan store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useMealPlanStore()
    expect(store.entries).toHaveLength(0)
  })

  it('assigns a recipe to a date', () => {
    const store = useMealPlanStore()
    store.assign('2026-06-14', 'recipe-1')
    expect(store.getForDate('2026-06-14')?.recipeId).toBe('recipe-1')
  })

  it('replaces an existing assignment for the same date', () => {
    const store = useMealPlanStore()
    store.assign('2026-06-14', 'recipe-1')
    store.assign('2026-06-14', 'recipe-2')
    expect(store.entries).toHaveLength(1)
    expect(store.getForDate('2026-06-14')?.recipeId).toBe('recipe-2')
  })

  it('unassigns a recipe from a date', () => {
    const store = useMealPlanStore()
    store.assign('2026-06-14', 'recipe-1')
    store.unassign('2026-06-14')
    expect(store.entries).toHaveLength(0)
  })

  it('persists entries to localStorage', () => {
    const store = useMealPlanStore()
    store.assign('2026-06-14', 'recipe-1')
    const saved = JSON.parse(localStorage.getItem('mealPlan') ?? '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toEqual({ date: '2026-06-14', recipeId: 'recipe-1' })
  })

  it('rehydrates entries from localStorage on init', () => {
    const store = useMealPlanStore()
    store.assign('2026-06-14', 'recipe-1')

    setActivePinia(createPinia())
    const store2 = useMealPlanStore()
    expect(store2.entries).toHaveLength(1)
    expect(store2.getForDate('2026-06-14')?.recipeId).toBe('recipe-1')
  })

  describe('getForRange', () => {
    it('returns entries within a single-day range (start === end)', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.assign('2026-06-15', 'recipe-2')

      expect(store.getForRange('2026-06-14', '2026-06-14')).toEqual([
        { date: '2026-06-14', recipeId: 'recipe-1' },
      ])
    })

    it('includes entries on both boundary dates', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.assign('2026-06-16', 'recipe-2')
      store.assign('2026-06-20', 'recipe-3')

      const result = store.getForRange('2026-06-14', '2026-06-16')
      expect(result.map((e) => e.date)).toEqual(['2026-06-14', '2026-06-16'])
    })

    it('excludes entries outside the range', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-10', 'recipe-1')
      store.assign('2026-06-25', 'recipe-2')

      expect(store.getForRange('2026-06-14', '2026-06-16')).toEqual([])
    })

    it('spans a month boundary correctly', () => {
      const store = useMealPlanStore()
      store.assign('2026-05-30', 'recipe-1')
      store.assign('2026-06-01', 'recipe-2')
      store.assign('2026-06-10', 'recipe-3')

      const result = store.getForRange('2026-05-30', '2026-06-01')
      expect(result.map((e) => e.date)).toEqual(['2026-05-30', '2026-06-01'])
    })
  })
})
