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

  describe('swapEntries', () => {
    it('swaps recipes between two dates', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.assign('2026-06-15', 'recipe-2')
      store.swapEntries('2026-06-14', '2026-06-15')
      expect(store.getForDate('2026-06-14')?.recipeId).toBe('recipe-2')
      expect(store.getForDate('2026-06-15')?.recipeId).toBe('recipe-1')
    })

    it('carries the meal note along with the recipe but leaves each day note in place', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.setMealNote('2026-06-14', 'No onions')
      store.setDayNote('2026-06-14', "Mother's birthday")
      store.assign('2026-06-15', 'recipe-2')
      store.setDayNote('2026-06-15', 'Book club')

      store.swapEntries('2026-06-14', '2026-06-15')

      expect(store.getForDate('2026-06-14')).toEqual({
        date: '2026-06-14',
        recipeId: 'recipe-2',
        dayNote: "Mother's birthday",
      })
      expect(store.getForDate('2026-06-15')).toEqual({
        date: '2026-06-15',
        recipeId: 'recipe-1',
        mealNote: 'No onions',
        dayNote: 'Book club',
      })
    })

    it('does nothing when swapping a date with itself', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.swapEntries('2026-06-14', '2026-06-14')
      expect(store.getForDate('2026-06-14')?.recipeId).toBe('recipe-1')
      expect(store.entries).toHaveLength(1)
    })

    it('moves a recipe onto a date with no entry at all, pruning the source', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.swapEntries('2026-06-14', '2026-06-15')
      expect(store.getForDate('2026-06-14')).toBeUndefined()
      expect(store.getForDate('2026-06-15')?.recipeId).toBe('recipe-1')
      expect(store.entries).toHaveLength(1)
    })

    it('swaps onto a date that only has a day note, which it keeps', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.setDayNote('2026-06-15', 'Anniversary')

      store.swapEntries('2026-06-14', '2026-06-15')

      expect(store.getForDate('2026-06-14')).toBeUndefined()
      expect(store.getForDate('2026-06-15')).toEqual({
        date: '2026-06-15',
        recipeId: 'recipe-1',
        dayNote: 'Anniversary',
      })
    })

    it('persists the swap to localStorage', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-14', 'recipe-1')
      store.assign('2026-06-15', 'recipe-2')
      store.swapEntries('2026-06-14', '2026-06-15')
      const saved = JSON.parse(localStorage.getItem('mealPlan') ?? '[]')
      expect(saved).toEqual(
        expect.arrayContaining([
          { date: '2026-06-14', recipeId: 'recipe-2' },
          { date: '2026-06-15', recipeId: 'recipe-1' },
        ])
      )
    })
  })

  describe('moveEntry', () => {
    const monday = '2026-06-15'
    const days = [
      '2026-06-15', // Mon
      '2026-06-16', // Tue
      '2026-06-17', // Wed
      '2026-06-18', // Thu
      '2026-06-19', // Fri
      '2026-06-20', // Sat
      '2026-06-21', // Sun
    ]

    it('cascades forward through a fully planned week', () => {
      const store = useMealPlanStore()
      const meals = ['Chili', 'Tacos', 'Pasta', 'Curry', 'Soup', 'Pizza', 'Roast']
      days.forEach((date, i) => store.assign(date, meals[i]))

      store.moveEntry(days[1], days[4]) // Tue -> land on Fri

      expect(days.map((d) => store.getForDate(d)?.recipeId)).toEqual([
        'Chili', // Mon unchanged
        'Pasta', // was Wed's
        'Curry', // was Thu's
        'Soup', // was Fri's
        'Tacos', // the moved item
        'Pizza', // Sat unchanged
        'Roast', // Sun unchanged
      ])
    })

    it('cascades backward through a fully planned week', () => {
      const store = useMealPlanStore()
      const meals = ['Chili', 'Tacos', 'Pasta', 'Curry', 'Soup', 'Pizza', 'Roast']
      days.forEach((date, i) => store.assign(date, meals[i]))

      store.moveEntry(days[4], days[1]) // Fri -> land on Tue

      expect(days.map((d) => store.getForDate(d)?.recipeId)).toEqual([
        'Chili', // Mon unchanged
        'Soup', // the moved item
        'Tacos', // was Tue's
        'Pasta', // was Wed's
        'Curry', // was Thu's
        'Pizza', // Sat unchanged
        'Roast', // Sun unchanged
      ])
    })

    it('shifts content through empty, meal-note-only and day-note-only days without moving day notes', () => {
      const store = useMealPlanStore()
      store.assign(days[0], 'recipe-chili') // Mon
      store.setDayNote(days[0], "Mother's birthday")
      store.assign(days[1], 'recipe-tacos') // Tue: the one being moved
      // Wed has no entry at all
      store.setMealNote(days[3], 'Leftovers') // Thu
      store.assign(days[4], 'recipe-soup') // Fri
      store.setDayNote(days[4], 'Book club')
      store.setDayNote(days[5], 'Anniversary') // Sat: day-note only
      store.assign(days[6], 'recipe-roast') // Sun

      store.moveEntry(days[1], days[4]) // Tue -> land on Fri

      expect(store.getForDate(days[0])).toEqual({
        date: days[0],
        recipeId: 'recipe-chili',
        dayNote: "Mother's birthday",
      })
      expect(store.getForDate(days[1])).toBeUndefined() // pruned: got Wed's nothing
      expect(store.getForDate(days[2])).toEqual({ date: days[2], mealNote: 'Leftovers' })
      expect(store.getForDate(days[3])).toEqual({ date: days[3], recipeId: 'recipe-soup' })
      expect(store.getForDate(days[4])).toEqual({
        date: days[4],
        recipeId: 'recipe-tacos',
        dayNote: 'Book club',
      })
      expect(store.getForDate(days[5])).toEqual({ date: days[5], dayNote: 'Anniversary' })
      expect(store.getForDate(days[6])?.recipeId).toBe('recipe-roast')
    })

    it('moves to the first day of the week (boundary)', () => {
      const store = useMealPlanStore()
      const meals = ['Chili', 'Tacos', 'Pasta', 'Curry', 'Soup', 'Pizza', 'Roast']
      days.forEach((date, i) => store.assign(date, meals[i]))

      store.moveEntry(days[4], days[0]) // Fri -> land on Mon

      expect(days.map((d) => store.getForDate(d)?.recipeId)).toEqual([
        'Soup', // the moved item
        'Chili', // was Mon's
        'Tacos', // was Tue's
        'Pasta', // was Wed's
        'Curry', // was Thu's
        'Pizza', // unchanged
        'Roast', // unchanged
      ])
    })

    it('moves to the last day of the week (boundary)', () => {
      const store = useMealPlanStore()
      const meals = ['Chili', 'Tacos', 'Pasta', 'Curry', 'Soup', 'Pizza', 'Roast']
      days.forEach((date, i) => store.assign(date, meals[i]))

      store.moveEntry(days[1], days[6]) // Tue -> land on Sun

      expect(days.map((d) => store.getForDate(d)?.recipeId)).toEqual([
        'Chili', // unchanged
        'Pasta', // was Wed's
        'Curry', // was Thu's
        'Soup', // was Fri's
        'Pizza', // was Sat's
        'Roast', // was Sun's
        'Tacos', // the moved item
      ])
    })

    it('does nothing when moving a date onto itself', () => {
      const store = useMealPlanStore()
      store.assign(monday, 'recipe-1')
      store.moveEntry(monday, monday)
      expect(store.getForDate(monday)?.recipeId).toBe('recipe-1')
      expect(store.entries).toHaveLength(1)
    })

    it('persists the move to localStorage', () => {
      const store = useMealPlanStore()
      store.assign(days[0], 'recipe-1')
      store.assign(days[1], 'recipe-2')
      store.moveEntry(days[0], days[1])
      const saved = JSON.parse(localStorage.getItem('mealPlan') ?? '[]')
      expect(saved).toEqual(
        expect.arrayContaining([
          { date: days[0], recipeId: 'recipe-2' },
          { date: days[1], recipeId: 'recipe-1' },
        ])
      )
    })

    it('produces the same result as swapEntries when moving between two adjacent dates', () => {
      const storeA = useMealPlanStore()
      storeA.assign(days[0], 'recipe-1')
      storeA.assign(days[1], 'recipe-2')
      storeA.moveEntry(days[0], days[1])

      setActivePinia(createPinia())
      const storeB = useMealPlanStore()
      storeB.assign(days[0], 'recipe-1')
      storeB.assign(days[1], 'recipe-2')
      storeB.swapEntries(days[0], days[1])

      expect(storeA.getForDate(days[0])).toEqual(storeB.getForDate(days[0]))
      expect(storeA.getForDate(days[1])).toEqual(storeB.getForDate(days[1]))
    })
  })

  describe('countPlannedDaysAhead', () => {
    const today = '2026-06-14'

    it('is zero when today itself is unplanned', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-15', 'recipe-1')
      expect(store.countPlannedDaysAhead(today)).toBe(0)
    })

    it('counts an unbroken run starting today', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.assign('2026-06-15', 'recipe-2')
      store.assign('2026-06-16', 'recipe-3')
      expect(store.countPlannedDaysAhead(today)).toBe(3)
    })

    it('counts today alone', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      expect(store.countPlannedDaysAhead(today)).toBe(1)
    })

    it('stops at the first gap and ignores meals planned beyond it', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.assign('2026-06-15', 'recipe-2')
      // 2026-06-16 is the gap.
      store.assign('2026-06-17', 'recipe-3')
      store.assign('2026-06-18', 'recipe-4')
      expect(store.countPlannedDaysAhead(today)).toBe(2)
    })

    it('treats a day with only a meal note as planned', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.setMealNote('2026-06-15', 'Leftovers')
      store.assign('2026-06-16', 'recipe-2')
      expect(store.countPlannedDaysAhead(today)).toBe(3)
    })

    it('does not treat a day with only a day note as planned', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.setDayNote('2026-06-15', "Mother's birthday")
      store.assign('2026-06-16', 'recipe-2')
      expect(store.countPlannedDaysAhead(today)).toBe(1)
    })

    it('counts a day carrying both a recipe and notes once', () => {
      const store = useMealPlanStore()
      store.assign(today, 'recipe-1')
      store.setMealNote(today, 'No onions')
      store.setDayNote(today, 'Birthday')
      expect(store.countPlannedDaysAhead(today)).toBe(1)
    })

    it('walks across a month boundary', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-30', 'recipe-1')
      store.assign('2026-07-01', 'recipe-2')
      expect(store.countPlannedDaysAhead('2026-06-30')).toBe(2)
    })

    it('ignores meals in the past', () => {
      const store = useMealPlanStore()
      store.assign('2026-06-12', 'recipe-1')
      store.assign('2026-06-13', 'recipe-2')
      expect(store.countPlannedDaysAhead(today)).toBe(0)
    })

    it('is zero for an empty plan', () => {
      const store = useMealPlanStore()
      expect(store.countPlannedDaysAhead(today)).toBe(0)
    })
  })
})
