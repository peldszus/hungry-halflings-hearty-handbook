import type { Recipe, Ingredient } from '@/stores/recipes'
import type { MealPlanEntry } from '@/stores/mealPlan'

export const APP_ID = 'hungry-halflings-hearty-handbook'
export const BACKUP_VERSION = 1

export interface BackupData {
  app: string
  version: number
  exportedAt: string
  recipes: Recipe[]
  mealPlan: MealPlanEntry[]
}

export interface DatabaseStats {
  recipeCount: number
  plannedMealCount: number
  lastMealDate: string | undefined
}

export function buildBackup(
  recipes: Recipe[],
  mealPlan: MealPlanEntry[],
  exportedAt: string = new Date().toISOString()
): BackupData {
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt,
    recipes,
    mealPlan,
  }
}

export function backupFilename(exportedAt: string): string {
  // Replace characters that are awkward in filenames (colons from the ISO time).
  const stamp = exportedAt.replace(/:/g, '-')
  return `${APP_ID}-${stamp}.json`
}

export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = backupFilename(backup.exportedAt)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// The recipe model gained fields over time (structured ingredients, lastEditedAt,
// archived/url, favourite) without a localStorage migration, so data saved by
// earlier versions can be missing them. The running app tolerates that, so the
// importer must too: reject only fundamentally broken records and fill defaults
// for the optional/added-later fields, healing the data on import.

// Returns the normalized ingredient, or null if it is too broken to keep.
function normalizeIngredient(value: unknown): Ingredient | null {
  if (!isRecord(value)) return null
  if (typeof value.ingredient !== 'string') return null
  const ingredient: Ingredient = {
    ingredient: value.ingredient,
    isMain: typeof value.isMain === 'boolean' ? value.isMain : false,
    addToShoppingList:
      typeof value.addToShoppingList === 'boolean' ? value.addToShoppingList : true,
  }
  if (typeof value.quantity === 'number') ingredient.quantity = value.quantity
  if (typeof value.unit === 'string') ingredient.unit = value.unit
  return ingredient
}

// Returns the normalized recipe, or null if it is too broken to keep.
function normalizeRecipe(value: unknown): Recipe | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string') return null
  if (typeof value.name !== 'string') return null
  if (!Array.isArray(value.ingredients)) return null

  const ingredients: Ingredient[] = []
  for (const raw of value.ingredients) {
    const ingredient = normalizeIngredient(raw)
    if (!ingredient) return null
    ingredients.push(ingredient)
  }

  const recipe: Recipe = {
    id: value.id,
    name: value.name,
    ingredients,
    servings: typeof value.servings === 'number' ? value.servings : 1,
    lastEditedAt:
      typeof value.lastEditedAt === 'string' ? value.lastEditedAt : new Date(0).toISOString(),
    archived: typeof value.archived === 'boolean' ? value.archived : false,
    favourite: typeof value.favourite === 'boolean' ? value.favourite : false,
  }
  if (Array.isArray(value.labels)) {
    recipe.labels = value.labels.filter((l): l is string => typeof l === 'string')
  }
  if (typeof value.url === 'string') recipe.url = value.url
  return recipe
}

function isValidMealPlanEntry(value: unknown): value is MealPlanEntry {
  if (!isRecord(value)) return false
  return typeof value.date === 'string' && typeof value.recipeId === 'string'
}

export type ParseResult = { data: BackupData } | { error: string }

export function parseBackup(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'The file is not valid JSON.' }
  }

  if (!isRecord(parsed)) {
    return { error: 'The file does not contain a backup object.' }
  }
  if (parsed.app !== APP_ID) {
    return { error: 'This file is not a Hungry Halflings backup.' }
  }
  if (parsed.version !== BACKUP_VERSION) {
    return { error: `Unsupported backup version (expected ${BACKUP_VERSION}).` }
  }
  if (typeof parsed.exportedAt !== 'string') {
    return { error: 'The backup is missing its export date.' }
  }
  if (!Array.isArray(parsed.recipes)) {
    return { error: 'The backup contains invalid recipe data.' }
  }
  const recipes: Recipe[] = []
  for (const raw of parsed.recipes) {
    const recipe = normalizeRecipe(raw)
    if (!recipe) return { error: 'The backup contains invalid recipe data.' }
    recipes.push(recipe)
  }
  if (!Array.isArray(parsed.mealPlan) || !parsed.mealPlan.every(isValidMealPlanEntry)) {
    return { error: 'The backup contains invalid meal plan data.' }
  }

  return {
    data: {
      app: parsed.app,
      version: parsed.version,
      exportedAt: parsed.exportedAt,
      recipes,
      mealPlan: parsed.mealPlan,
    },
  }
}

export function summarize(recipes: Recipe[], mealPlan: MealPlanEntry[]): DatabaseStats {
  const dates = mealPlan.map((e) => e.date)
  return {
    recipeCount: recipes.length,
    plannedMealCount: mealPlan.length,
    lastMealDate: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : undefined,
  }
}
