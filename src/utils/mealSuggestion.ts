import type { Recipe } from '@/stores/recipes'
import type { MealPlanEntry } from '@/stores/mealPlan'

/**
 * Pure meal suggestion engine, kept free of Pinia so the sampling and constraint logic can be
 * tested with plain data. The view snapshots store state, calls suggestMeals, and applies the
 * returned assignments itself.
 */

export interface SuggestionFilters {
  /** Only recipes assigned in the plan within the month before referenceDate. */
  recentlyUsed: boolean
  /** Only recipes marked as favourite. */
  favourites: boolean
  /** Only the top 25% of recipes ranked by past assignment count. */
  mostOften: boolean
  /** Empty = off; otherwise only recipes carrying at least one of these labels. */
  labels: string[]
  /** No shared main ingredient with the previous day's recipe. */
  distinctMainIngredient: boolean
}

export interface SuggestMealsInput {
  recipes: Recipe[]
  /** The whole meal plan — adjacency and usage statistics reach beyond the visible week. */
  entries: MealPlanEntry[]
  /** The checked days to fill, in any order. */
  selectedDates: string[]
  /** All days of the visible week, for the no-repeat-within-week rule. */
  weekDates: string[]
  /** ISO date treated as "today" for the recency window and frequency counting. */
  referenceDate: string
  filters: SuggestionFilters
  /** Returns [0, 1); injectable for deterministic tests. */
  rng?: () => number
}

export interface SuggestMealsResult {
  /** One suggestion per matched day, in ascending date order. */
  assignments: { date: string; recipeId: string }[]
  /** Selected days for which no recipe satisfied the constraints. */
  unmatchedDates: string[]
}

function shiftIsoDate(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function oneMonthBefore(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() - 1)
  return date.toISOString().slice(0, 10)
}

export function mainIngredientNames(recipe: Recipe): Set<string> {
  return new Set(
    recipe.ingredients
      .filter((i) => i.isMain)
      .map((i) => i.ingredient.trim().toLowerCase())
      .filter((name) => name.length > 0)
  )
}

/** Recipes without main ingredients never conflict. */
function sharesMainIngredient(a: Recipe | undefined, b: Recipe | undefined): boolean {
  if (!a || !b) return false
  const namesA = mainIngredientNames(a)
  for (const name of mainIngredientNames(b)) {
    if (namesA.has(name)) return true
  }
  return false
}

/** Top 25% (ceil, ties at the threshold included) of recipes with at least one past assignment. */
function mostOftenIds(pastCounts: Map<string, number>): Set<string> {
  const counts = [...pastCounts.values()].sort((a, b) => b - a)
  if (!counts.length) return new Set()
  const threshold = counts[Math.ceil(counts.length * 0.25) - 1]
  return new Set([...pastCounts].filter(([, count]) => count >= threshold).map(([id]) => id))
}

export function suggestMeals(input: SuggestMealsInput): SuggestMealsResult {
  const { recipes, entries, weekDates, referenceDate, filters } = input
  const rng = input.rng ?? Math.random
  const selectedDates = [...input.selectedDates].sort()
  const selectedSet = new Set(selectedDates)

  // Whatever currently sits on a selected day is about to be replaced, so it must not block
  // re-rolls, count as usage, or constrain its neighbours.
  const fixedEntries = entries.filter((e) => !selectedSet.has(e.date))
  const fixedByDate = new Map(fixedEntries.map((e) => [e.date, e]))
  const recipeById = new Map(recipes.map((r) => [r.id, r]))

  const pastCounts = new Map<string, number>()
  for (const entry of fixedEntries) {
    if (!entry.recipeId || entry.date > referenceDate) continue
    pastCounts.set(entry.recipeId, (pastCounts.get(entry.recipeId) ?? 0) + 1)
  }

  const recentSince = oneMonthBefore(referenceDate)
  const recentIds = new Set(
    fixedEntries
      .filter((e) => e.recipeId && e.date >= recentSince && e.date <= referenceDate)
      .map((e) => e.recipeId)
  )
  const topIds = filters.mostOften ? mostOftenIds(pastCounts) : null
  const weekAssignedIds = new Set(
    weekDates.map((date) => fixedByDate.get(date)?.recipeId).filter(Boolean)
  )

  const pool = recipes.filter(
    (r) =>
      !r.archived &&
      !weekAssignedIds.has(r.id) &&
      (!filters.favourites || r.favourite) &&
      (!filters.recentlyUsed || recentIds.has(r.id)) &&
      (!topIds || topIds.has(r.id)) &&
      (!filters.labels.length || filters.labels.some((label) => r.labels?.includes(label)))
  )

  const picks = new Map<string, string>()
  const usedIds = new Set<string>()
  const unmatchedDates: string[] = []

  // A neighbouring day's recipe: an in-pass pick if that day is being filled, else whatever the
  // existing plan holds (possibly outside the visible week).
  function recipeOn(date: string): Recipe | undefined {
    const id = selectedSet.has(date) ? picks.get(date) : fixedByDate.get(date)?.recipeId
    return id ? recipeById.get(id) : undefined
  }

  // Greedy sweep in date order, sampling without replacement. The backward check covers pairs of
  // selected days; the forward check only ever sees pre-existing plans, because a later selected
  // day has no pick yet and is guarded by its own backward check once it is processed.
  for (const date of selectedDates) {
    const candidates = pool.filter(
      (r) =>
        !usedIds.has(r.id) &&
        (!filters.distinctMainIngredient ||
          (!sharesMainIngredient(r, recipeOn(shiftIsoDate(date, -1))) &&
            !sharesMainIngredient(r, recipeOn(shiftIsoDate(date, 1)))))
    )
    if (!candidates.length) {
      unmatchedDates.push(date)
      continue
    }
    const pick = candidates[Math.floor(rng() * candidates.length)]
    picks.set(date, pick.id)
    usedIds.add(pick.id)
  }

  return {
    assignments: selectedDates
      .filter((date) => picks.has(date))
      .map((date) => ({ date, recipeId: picks.get(date)! })),
    unmatchedDates,
  }
}
