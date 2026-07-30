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
   * A day is planned once it says what is being eaten — either a recipe or a meal note
   * ("leftovers", "eating out"). A day note describes the day itself, not the meal, so it
   * leaves the day unplanned.
   */
  function isPlanned(entry: MealPlanEntry): boolean {
    return Boolean(entry.recipeId || entry.mealNote)
  }

  function nextIsoDate(iso: string): string {
    return new Date(new Date(`${iso}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
  }

  /**
   * How far the plan reaches before its first hole: the unbroken run of planned days starting at
   * today, so 0 means today itself is unplanned and 1 means only today is. Days planned beyond a
   * gap don't count — the gap is where planning has to resume.
   */
  function countPlannedDaysAhead(today: string = new Date().toISOString().slice(0, 10)): number {
    const planned = new Set(entries.value.filter(isPlanned).map((e) => e.date))
    let days = 0
    let date = today
    // A year of lookahead is far past any useful planning horizon, and bounds the walk.
    while (planned.has(date) && days < 366) {
      days++
      date = nextIsoDate(date)
    }
    return days
  }

  function replaceAll(next: MealPlanEntry[]) {
    entries.value = next
    save(entries.value)
  }

  interface MealContent {
    recipeId?: string
    mealNote?: string
  }

  function readContent(date: string): MealContent {
    const entry = entries.value.find((e) => e.date === date)
    return { recipeId: entry?.recipeId, mealNote: entry?.mealNote }
  }

  function applyContent(date: string, content: MealContent) {
    const entry = upsertEntry(date)
    if (content.recipeId) entry.recipeId = content.recipeId
    else delete entry.recipeId
    if (content.mealNote) entry.mealNote = content.mealNote
    else delete entry.mealNote
    pruneIfEmpty(date)
  }

  /**
   * Swaps recipe + meal note between two dates. Each date's dayNote describes the calendar day
   * itself, not the meal, so it stays put regardless of which meal content passes through.
   */
  function swapEntries(dateA: string, dateB: string) {
    if (dateA === dateB) return
    const contentA = readContent(dateA)
    const contentB = readContent(dateB)
    applyContent(dateA, contentB)
    applyContent(dateB, contentA)
    save(entries.value)
  }

  function datesBetweenInclusive(dateA: string, dateB: string): string[] {
    const [start, end] = dateA <= dateB ? [dateA, dateB] : [dateB, dateA]
    const dates: string[] = []
    let d = start
    while (d <= end) {
      dates.push(d)
      d = nextIsoDate(d)
    }
    return dates
  }

  /**
   * Moves recipe + meal note from one date to another, shifting the content of every date in
   * between by one day to make room. dayNote is never part of the shifted payload, so it stays
   * pinned to its date throughout.
   */
  function moveEntry(fromDate: string, toDate: string) {
    if (fromDate === toDate) return
    const dates = datesBetweenInclusive(fromDate, toDate)
    const snapshot = new Map(dates.map((d) => [d, readContent(d)]))
    const movedContent = snapshot.get(fromDate)!

    if (fromDate < toDate) {
      for (let i = 0; i < dates.length - 1; i++) {
        applyContent(dates[i], snapshot.get(dates[i + 1])!)
      }
      applyContent(dates[dates.length - 1], movedContent)
    } else {
      for (let i = dates.length - 1; i > 0; i--) {
        applyContent(dates[i], snapshot.get(dates[i - 1])!)
      }
      applyContent(dates[0], movedContent)
    }
    save(entries.value)
  }

  return {
    entries,
    assign,
    unassign,
    setDayNote,
    setMealNote,
    replaceAll,
    swapEntries,
    moveEntry,
    isPlanned,
    getForDate,
    getForRange,
    getLastUsedDate,
    getNextPlannedDate,
    countPlannedDaysAhead,
  }
})
