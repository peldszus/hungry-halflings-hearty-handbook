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

function isValidIngredient(value: unknown): value is Ingredient {
  if (!isRecord(value)) return false
  if (typeof value.ingredient !== 'string') return false
  if (typeof value.isMain !== 'boolean') return false
  if (typeof value.addToShoppingList !== 'boolean') return false
  if (value.quantity !== undefined && typeof value.quantity !== 'number') return false
  if (value.unit !== undefined && typeof value.unit !== 'string') return false
  return true
}

function isValidRecipe(value: unknown): value is Recipe {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string') return false
  if (typeof value.name !== 'string') return false
  if (typeof value.servings !== 'number') return false
  if (typeof value.lastEditedAt !== 'string') return false
  if (typeof value.archived !== 'boolean') return false
  if (typeof value.favourite !== 'boolean') return false
  if (!Array.isArray(value.ingredients) || !value.ingredients.every(isValidIngredient)) {
    return false
  }
  if (
    value.labels !== undefined &&
    (!Array.isArray(value.labels) || !value.labels.every((l) => typeof l === 'string'))
  ) {
    return false
  }
  if (value.url !== undefined && typeof value.url !== 'string') return false
  return true
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
  if (!Array.isArray(parsed.recipes) || !parsed.recipes.every(isValidRecipe)) {
    return { error: 'The backup contains invalid recipe data.' }
  }
  if (!Array.isArray(parsed.mealPlan) || !parsed.mealPlan.every(isValidMealPlanEntry)) {
    return { error: 'The backup contains invalid meal plan data.' }
  }

  return {
    data: {
      app: parsed.app,
      version: parsed.version,
      exportedAt: parsed.exportedAt,
      recipes: parsed.recipes,
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
