import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MealPlanEntry {
  date: string
  recipeId: string
}

const STORAGE_KEY = 'mealPlan'

function save(entries: MealPlanEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const useMealPlanStore = defineStore('mealPlan', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const entries = ref<MealPlanEntry[]>(stored ? JSON.parse(stored) : [])

  function assign(date: string, recipeId: string) {
    const index = entries.value.findIndex((e) => e.date === date)
    if (index >= 0) {
      entries.value[index].recipeId = recipeId
    } else {
      entries.value.push({ date, recipeId })
    }
    save(entries.value)
  }

  function unassign(date: string) {
    entries.value = entries.value.filter((e) => e.date !== date)
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
    today: string = new Date().toISOString().slice(0, 10)
  ): string | undefined {
    const dates = entries.value
      .filter((e) => e.recipeId === recipeId && e.date <= today)
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

  return {
    entries,
    assign,
    unassign,
    getForDate,
    getForRange,
    getLastUsedDate,
    getNextPlannedDate,
  }
})
