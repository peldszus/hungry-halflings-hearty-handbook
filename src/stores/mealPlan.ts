import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MealPlanEntry {
  date: string
  recipeId?: string
  dayNote?: string
  mealNote?: string
}

const STORAGE_KEY = 'mealPlan'

function save(entries: MealPlanEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const useMealPlanStore = defineStore('mealPlan', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const entries = ref<MealPlanEntry[]>(stored ? JSON.parse(stored) : [])

  function upsertEntry(date: string): MealPlanEntry {
    let entry = entries.value.find((e) => e.date === date)
    if (!entry) {
      entry = { date }
      entries.value.push(entry)
    }
    return entry
  }

  function pruneIfEmpty(date: string) {
    const index = entries.value.findIndex((e) => e.date === date)
    if (index < 0) return
    const entry = entries.value[index]
    if (!entry.recipeId && !entry.dayNote && !entry.mealNote) {
      entries.value.splice(index, 1)
    }
  }

  function assign(date: string, recipeId: string) {
    upsertEntry(date).recipeId = recipeId
    save(entries.value)
  }

  function unassign(date: string) {
    const entry = entries.value.find((e) => e.date === date)
    if (!entry) return
    delete entry.recipeId
    pruneIfEmpty(date)
    save(entries.value)
  }

  function setDayNote(date: string, note: string) {
    const trimmed = note.trim()
    const entry = upsertEntry(date)
    if (trimmed) entry.dayNote = trimmed
    else delete entry.dayNote
    pruneIfEmpty(date)
    save(entries.value)
  }

  function setMealNote(date: string, note: string) {
    const trimmed = note.trim()
    const entry = upsertEntry(date)
    if (trimmed) entry.mealNote = trimmed
    else delete entry.mealNote
    pruneIfEmpty(date)
    save(entries.value)
  }

  function getForDate(date: string): MealPlanEntry | undefined {
    return entries.value.find((e) => e.date === date)
  }

  function getForRange(startDate: string, endDate: string): MealPlanEntry[] {
    return entries.value.filter((e) => e.date >= startDate && e.date <= endDate)
  }

  function getLastUsedDate(
    recipeId: string,
    today: string = new Date().toISOString().slice(0, 10),
    excludeDate?: string
  ): string | undefined {
    const dates = entries.value
      .filter((e) => e.recipeId === recipeId && e.date <= today && e.date !== excludeDate)
      .map((e) => e.date)
    return dates.length ? dates.sort().at(-1) : undefined
  }

  function getNextPlannedDate(
    recipeId: string,
    today: string = new Date().toISOString().slice(0, 10)
  ): string | undefined {
    const dates = entries.value
      .filter((e) => e.recipeId === recipeId && e.date > today)
      .map((e) => e.date)
    return dates.length ? dates.sort()[0] : undefined
  }

  /**
   * Meals still ahead of the user — entries that actually name a recipe, from today onwards.
   * Note-only entries are not meals, so they don't count.
   */
  function countUpcomingMeals(today: string = new Date().toISOString().slice(0, 10)): number {
    return entries.value.filter((e) => e.recipeId && e.date >= today).length
  }

  function nextIsoDate(iso: string): string {
    return new Date(new Date(`${iso}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
  }

  /**
   * How far the plan reaches without a hole in it: `days` is the unbroken run of days with a
   * recipe assigned, starting at today (so 0 when today itself has no meal, 1 when only today
   * does), and `firstUnplannedDate` is the day the run stops at — the day to plan from next.
   * Days carrying only a note are not planned days.
   */
  function getPlanningCoverage(today: string = new Date().toISOString().slice(0, 10)): {
    days: number
    firstUnplannedDate: string
  } {
    const planned = new Set(entries.value.filter((e) => e.recipeId).map((e) => e.date))
    let days = 0
    let date = today
    // A year of lookahead is far past any useful planning horizon, and bounds the walk.
    while (planned.has(date) && days < 366) {
      days++
      date = nextIsoDate(date)
    }
    return { days, firstUnplannedDate: date }
  }

  function replaceAll(next: MealPlanEntry[]) {
    entries.value = next
    save(entries.value)
  }

  return {
    entries,
    assign,
    unassign,
    setDayNote,
    setMealNote,
    replaceAll,
    getForDate,
    getForRange,
    getLastUsedDate,
    getNextPlannedDate,
    countUpcomingMeals,
    getPlanningCoverage,
  }
})
