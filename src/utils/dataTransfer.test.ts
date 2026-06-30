import { describe, it, expect } from 'vitest'
import {
  APP_ID,
  BACKUP_VERSION,
  buildBackup,
  backupFilename,
  parseBackup,
  summarize,
} from './dataTransfer'
import type { Recipe } from '@/stores/recipes'
import type { MealPlanEntry } from '@/stores/mealPlan'

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    name: 'Pasta',
    ingredients: [{ ingredient: 'pasta', isMain: true, addToShoppingList: true }],
    servings: 2,
    lastEditedAt: '2026-06-01T00:00:00.000Z',
    archived: false,
    favourite: false,
    ...overrides,
  }
}

const entries: MealPlanEntry[] = [
  { date: '2026-06-14', recipeId: 'r1' },
  { date: '2026-06-20', recipeId: 'r1' },
]

describe('buildBackup', () => {
  it('wraps the data with app id, version and export time', () => {
    const backup = buildBackup([recipe()], entries, '2026-06-29T14:30:00.000Z')
    expect(backup.app).toBe(APP_ID)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.exportedAt).toBe('2026-06-29T14:30:00.000Z')
    expect(backup.recipes).toHaveLength(1)
    expect(backup.mealPlan).toHaveLength(2)
  })

  it('defaults exportedAt to the current time', () => {
    const before = Date.now()
    const backup = buildBackup([], [])
    const stamp = new Date(backup.exportedAt).getTime()
    expect(stamp).toBeGreaterThanOrEqual(before)
  })
})

describe('backupFilename', () => {
  it('includes the app id and a filesystem-safe timestamp', () => {
    expect(backupFilename('2026-06-29T14:30:00.000Z')).toBe(
      'hungry-halflings-hearty-handbook-2026-06-29T14-30-00.000Z.json'
    )
  })
})

describe('parseBackup', () => {
  it('round-trips a built backup', () => {
    const json = JSON.stringify(buildBackup([recipe()], entries, '2026-06-29T14:30:00.000Z'))
    const result = parseBackup(json)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.recipes).toHaveLength(1)
      expect(result.data.mealPlan).toHaveLength(2)
      expect(result.data.exportedAt).toBe('2026-06-29T14:30:00.000Z')
    }
  })

  it('rejects malformed JSON', () => {
    const result = parseBackup('{ not json')
    expect(result).toEqual({ error: expect.stringContaining('JSON') })
  })

  it('rejects a non-object payload', () => {
    expect(parseBackup('42')).toHaveProperty('error')
  })

  it('rejects a foreign app id', () => {
    const json = JSON.stringify({ ...buildBackup([], []), app: 'something-else' })
    const result = parseBackup(json)
    expect(result).toEqual({ error: expect.stringContaining('Hungry Halflings') })
  })

  it('rejects an unsupported version', () => {
    const json = JSON.stringify({ ...buildBackup([], []), version: 99 })
    const result = parseBackup(json)
    expect(result).toEqual({ error: expect.stringContaining('version') })
  })

  it('rejects a missing export date', () => {
    const backup = buildBackup([], []) as unknown as Record<string, unknown>
    delete backup.exportedAt
    expect(parseBackup(JSON.stringify(backup))).toHaveProperty('error')
  })

  it('rejects a recipe that is not an object', () => {
    const json = JSON.stringify(buildBackup(['nope' as unknown as Recipe], []))
    expect(parseBackup(json)).toHaveProperty('error')
  })

  it('rejects a recipe missing its id', () => {
    const broken = recipe() as unknown as Record<string, unknown>
    delete broken.id
    const json = JSON.stringify(buildBackup([broken as unknown as Recipe], []))
    expect(parseBackup(json)).toHaveProperty('error')
  })

  it('rejects an ingredient whose name is not a string', () => {
    const json = JSON.stringify(
      buildBackup(
        [recipe({ ingredients: [{ isMain: true } as unknown as Recipe['ingredients'][0]] })],
        []
      )
    )
    expect(parseBackup(json)).toHaveProperty('error')
  })

  it('rejects an invalid meal plan entry', () => {
    const json = JSON.stringify(
      buildBackup([], [{ date: '2026-06-14' } as unknown as MealPlanEntry])
    )
    expect(parseBackup(json)).toHaveProperty('error')
  })

  it('accepts optional recipe fields', () => {
    const json = JSON.stringify(
      buildBackup([recipe({ labels: ['dinner'], url: 'http://example.com' })], [])
    )
    expect(parseBackup(json)).toHaveProperty('data')
  })

  it('defaults a missing servings to 1', () => {
    const broken = recipe() as unknown as Record<string, unknown>
    delete broken.servings
    const result = parseBackup(JSON.stringify(buildBackup([broken as unknown as Recipe], [])))
    expect('data' in result).toBe(true)
    if ('data' in result) expect(result.data.recipes[0].servings).toBe(1)
  })

  it('coerces a wrong-typed boolean field to its default', () => {
    const result = parseBackup(
      JSON.stringify(buildBackup([recipe({ archived: 'yes' as unknown as boolean })], []))
    )
    expect('data' in result).toBe(true)
    if ('data' in result) expect(result.data.recipes[0].archived).toBe(false)
  })

  it('imports a legacy recipe missing added-later fields, filling defaults', () => {
    const legacy = {
      id: 'legacy-1',
      name: 'Old Stew',
      servings: 3,
      ingredients: [{ ingredient: 'beef' }, { ingredient: 'carrot', addToShoppingList: false }],
      // no lastEditedAt, archived, favourite, url or labels
    }
    const result = parseBackup(JSON.stringify(buildBackup([legacy as unknown as Recipe], [])))
    expect('data' in result).toBe(true)
    if ('data' in result) {
      const imported = result.data.recipes[0]
      expect(imported.archived).toBe(false)
      expect(imported.favourite).toBe(false)
      expect(typeof imported.lastEditedAt).toBe('string')
      expect(imported.url).toBeUndefined()
      expect(imported.ingredients[0]).toEqual({
        ingredient: 'beef',
        isMain: false,
        addToShoppingList: true,
      })
      expect(imported.ingredients[1].addToShoppingList).toBe(false)
    }
  })
})

describe('summarize', () => {
  it('counts recipes and planned meals and finds the last meal date', () => {
    const stats = summarize([recipe(), recipe({ id: 'r2' })], entries)
    expect(stats.recipeCount).toBe(2)
    expect(stats.plannedMealCount).toBe(2)
    expect(stats.lastMealDate).toBe('2026-06-20')
  })

  it('reports an undefined last meal date for an empty plan', () => {
    const stats = summarize([], [])
    expect(stats.recipeCount).toBe(0)
    expect(stats.plannedMealCount).toBe(0)
    expect(stats.lastMealDate).toBeUndefined()
  })
})
