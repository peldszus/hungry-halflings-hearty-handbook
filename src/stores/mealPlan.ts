import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MealPlanEntry {
  date: string
  recipeId: string
}

export const useMealPlanStore = defineStore('mealPlan', () => {
  const entries = ref<MealPlanEntry[]>([])

  function assign(date: string, recipeId: string) {
    const index = entries.value.findIndex((e) => e.date === date)
    if (index >= 0) {
      entries.value[index].recipeId = recipeId
    } else {
      entries.value.push({ date, recipeId })
    }
  }

  function unassign(date: string) {
    entries.value = entries.value.filter((e) => e.date !== date)
  }

  function getForDate(date: string): MealPlanEntry | undefined {
    return entries.value.find((e) => e.date === date)
  }

  function getForRange(startDate: string, endDate: string): MealPlanEntry[] {
    return entries.value.filter((e) => e.date >= startDate && e.date <= endDate)
  }

  return { entries, assign, unassign, getForDate, getForRange }
})
