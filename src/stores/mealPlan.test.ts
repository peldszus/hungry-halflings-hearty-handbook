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

  describe('getLastUsedDate', () => {
    it('returns undefined when the recipe has never been assigned', () => {
      const store = useMealPlanStore()
      expect(store.getLastUsedDate('recipe-1', '2026-06-14')).toBeUndefined()
    })

    it('returns the most recent date on or before today', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-01', 'recipe-1')
      store.assign('2026-06-10', 'recipe-1')
      store.assign('2026-06-20', 'recipe-1')

      expect(store.getLastUsedDate('recipe-1', '2026-06-14')).toBe('2026-06-10')
    })

    it('ignores assignments for other recipes', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-10', 'recipe-2')

      expect(store.getLastUsedDate('recipe-1', '2026-06-14')).toBeUndefined()
    })

    it('excludes the given date even if it is the most recent assignment', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-10', 'recipe-1')
      store.assign('2026-06-14', 'recipe-1')

      expect(store.getLastUsedDate('recipe-1', '2026-06-14', '2026-06-14')).toBe('2026-06-10')
    })
  })

  describe('getNextPlannedDate', () => {
    it('returns undefined when the recipe has no future assignment', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-10', 'recipe-1')

      expect(store.getNextPlannedDate('recipe-1', '2026-06-14')).toBeUndefined()
    })

    it('returns the earliest date after today', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-20', 'recipe-1')
      store.assign('2026-06-16', 'recipe-1')
      store.assign('2026-06-10', 'recipe-1')

      expect(store.getNextPlannedDate('recipe-1', '2026-06-14')).toBe('2026-06-16')
    })
  })

  describe('replaceAll', () => {
    it('replaces all entries and persists them', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.replaceAll([{ date: '2026-07-01', recipeId: 'recipe-9' }])
      expect(store.entries).toHaveLength(1)
      expect(store.getForDate('2026-07-01')?.recipeId).toBe('recipe-9')
      const saved = JSON.parse(localStorage.getItem('mealPlan') ?? '[]')
      expect(saved).toEqual([{ date: '2026-07-01', recipeId: 'recipe-9' }])
    })
  })

  describe('setDayNote / setMealNote', () => {
    it('sets a day note on a date with no recipe assigned', () => {
      const store = useMealPlanStore()
      store.setDayNote('2026-06-14', "Mother's birthday")
      expect(store.getForDate('2026-06-14')).toEqual({
        date: '2026-06-14',
        dayNote: "Mother's birthday",
      })
    })

    it('sets a meal note alongside an assigned recipe', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.setMealNote('2026-06-14', 'No onions this time')
      expect(store.getForDate('2026-06-14')).toEqual({
        date: '2026-06-14',
        recipeId: 'recipe-1',
        mealNote: 'No onions this time',
      })
    })

    it('trims whitespace and clears the note when set to an empty string', () => {
      const store = useMealPlanStore()
      store.setDayNote('2026-06-14', '  Birthday  ')
      expect(store.getForDate('2026-06-14')?.dayNote).toBe('Birthday')

      store.setDayNote('2026-06-14', '   ')
      expect(store.getForDate('2026-06-14')?.dayNote).toBeUndefined()
    })

    it('removes the entry once it has no recipe and no notes left', () => {
      const store = useMealPlanStore()
      store.setDayNote('2026-06-14', 'Birthday')
      store.setDayNote('2026-06-14', '')
      expect(store.getForDate('2026-06-14')).toBeUndefined()
      expect(store.entries).toHaveLength(0)
    })

    it('persists notes to localStorage', () => {
      const store = useMealPlanStore()
      store.setDayNote('2026-06-14', 'Birthday')
      store.setMealNote('2026-06-14', 'Extra spicy')
      const saved = JSON.parse(localStorage.getItem('mealPlan') ?? '[]')
      expect(saved).toEqual([{ date: '2026-06-14', dayNote: 'Birthday', mealNote: 'Extra spicy' }])
    })
  })

  describe('assign / unassign with notes', () => {
    it('preserves existing notes when a recipe is assigned', () => {
      const store = useMealPlanStore()
      store.setDayNote('2026-06-14', 'Birthday')
      store.assign('2026-06-14', 'recipe-1')
      expect(store.getForDate('2026-06-14')).toEqual({
        date: '2026-06-14',
        recipeId: 'recipe-1',
        dayNote: 'Birthday',
      })
    })

    it('keeps the entry with its notes when unassigning a recipe', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.setDayNote('2026-06-14', 'Birthday')
      store.unassign('2026-06-14')
      expect(store.getForDate('2026-06-14')).toEqual({
        date: '2026-06-14',
        dayNote: 'Birthday',
      })
    })

    it('removes the entry when unassigning a recipe with no notes', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.unassign('2026-06-14')
      expect(store.getForDate('2026-06-14')).toBeUndefined()
    })
  })

  describe('countUpcomingMeals', () => {
    const today = '2026-06-14'

    it('counts today and later meals', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.assign('2026-06-16', 'recipe-2')
      expect(store.countUpcomingMeals(today)).toBe(2)
    })

    it('ignores meals in the past', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-13', 'recipe-1')
      store.assign(today, 'recipe-2')
      expect(store.countUpcomingMeals(today)).toBe(1)
    })

    it('ignores days that only carry notes', () => {
      const store = useMealPlanStore()
      store.setDayNote('2026-06-15', 'Eating out')
      store.setMealNote('2026-06-16', 'Extra spicy')
      expect(store.countUpcomingMeals(today)).toBe(0)
    })

    it('is zero for an empty plan', () => {
      const store = useMealPlanStore()
      expect(store.countUpcomingMeals(today)).toBe(0)
    })
  })

  describe('getPlanningCoverage', () => {
    const today = '2026-06-14'

    it('reports no coverage when today has no meal', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-15', 'recipe-1')
      expect(store.getPlanningCoverage(today)).toEqual({
        days: 0,
        firstUnplannedDate: today,
      })
    })

    it('counts an unbroken run starting today', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.assign('2026-06-15', 'recipe-2')
      store.assign('2026-06-16', 'recipe-3')
      expect(store.getPlanningCoverage(today)).toEqual({
        days: 3,
        firstUnplannedDate: '2026-06-17',
      })
    })

    it('counts today alone', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      expect(store.getPlanningCoverage(today)).toEqual({
        days: 1,
        firstUnplannedDate: '2026-06-15',
      })
    })

    it('stops at the first gap and ignores meals planned beyond it', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.assign('2026-06-15', 'recipe-2')
      // 2026-06-16 is the gap.
      store.assign('2026-06-17', 'recipe-3')
      store.assign('2026-06-18', 'recipe-4')
      expect(store.getPlanningCoverage(today)).toEqual({
        days: 2,
        firstUnplannedDate: '2026-06-16',
      })
    })

    it('does not treat a note-only day as planned', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.setDayNote('2026-06-15', 'Eating out')
      store.assign('2026-06-16', 'recipe-2')
      expect(store.getPlanningCoverage(today)).toEqual({
        days: 1,
        firstUnplannedDate: '2026-06-15',
      })
    })

    it('walks across a month boundary', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-30', 'recipe-1')
      store.assign('2026-07-01', 'recipe-2')
      expect(store.getPlanningCoverage('2026-06-30')).toEqual({
        days: 2,
        firstUnplannedDate: '2026-07-02',
      })
    })

    it('reports an empty plan as uncovered', () => {
      const store = useMealPlanStore()
      expect(store.getPlanningCoverage(today)).toEqual({
        days: 0,
        firstUnplannedDate: today,
      })
    })
  })
})
