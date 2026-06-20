import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecipesStore, type Recipe } from './recipes'

describe('recipes store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useRecipesStore()
    expect(store.recipes).toHaveLength(0)
  })

  it('adds a recipe', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta', 'sauce'], servings: 2 })
    expect(store.recipeCount).toBe(1)
    expect(store.recipes[0].name).toBe('Pasta')
  })

  it('returns the created recipe from addRecipe', () => {
    const store = useRecipesStore()
    const created = store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    expect(created.id).toBe(store.recipes[0].id)
    expect(created.name).toBe('Pasta')
  })

  it('sets lastEditedAt when adding a recipe', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: [], servings: 2 })
    expect(store.recipes[0].lastEditedAt).toBeTruthy()
    expect(new Date(store.recipes[0].lastEditedAt).getTime()).not.toBeNaN()
  })

  it('updates a recipe and refreshes lastEditedAt', async () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    const id = store.recipes[0].id
    const originalEditedAt = store.recipes[0].lastEditedAt

    await new Promise((resolve) => setTimeout(resolve, 5))
    store.updateRecipe(id, { name: 'Pasta Bake', ingredients: ['pasta', 'cheese'], servings: 4 })

    const updated = store.getById(id)
    expect(updated?.name).toBe('Pasta Bake')
    expect(updated?.ingredients).toEqual(['pasta', 'cheese'])
    expect(updated?.servings).toBe(4)
    expect(updated?.lastEditedAt).not.toBe(originalEditedAt)
  })

  it('orders recentRecipes by lastEditedAt descending', async () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'First', ingredients: [], servings: 1 })
    await new Promise((resolve) => setTimeout(resolve, 5))
    store.addRecipe({ name: 'Second', ingredients: [], servings: 1 })

    expect(store.recentRecipes.map((r) => r.name)).toEqual(['Second', 'First'])

    const firstId = store.recipes.find((r) => r.name === 'First')!.id
    await new Promise((resolve) => setTimeout(resolve, 5))
    store.updateRecipe(firstId, { name: 'First', ingredients: [], servings: 1 })

    expect(store.recentRecipes.map((r) => r.name)).toEqual(['First', 'Second'])
  })

  it('sorts recipes with missing lastEditedAt to the bottom', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'HasDate', ingredients: [], servings: 1 })
    store.recipes.push({
      id: 'legacy-1',
      name: 'Legacy',
      ingredients: [],
      servings: 1,
    } as unknown as Recipe)

    expect(store.recentRecipes.map((r) => r.name)).toEqual(['HasDate', 'Legacy'])
  })

  it('removes a recipe', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    const id = store.recipes[0].id
    store.removeRecipe(id)
    expect(store.recipeCount).toBe(0)
  })

  it('defaults archived to false when adding a recipe', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: [], servings: 2 })
    expect(store.recipes[0].archived).toBe(false)
  })

  it('archives and unarchives a recipe without changing lastEditedAt', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: [], servings: 2 })
    const id = store.recipes[0].id
    const originalEditedAt = store.recipes[0].lastEditedAt

    store.archiveRecipe(id)
    expect(store.getById(id)?.archived).toBe(true)
    expect(store.getById(id)?.lastEditedAt).toBe(originalEditedAt)

    store.unarchiveRecipe(id)
    expect(store.getById(id)?.archived).toBe(false)
    expect(store.getById(id)?.lastEditedAt).toBe(originalEditedAt)
  })

  it('round-trips the optional url field', () => {
    const store = useRecipesStore()
    const created = store.addRecipe({
      name: 'Pasta',
      ingredients: [],
      servings: 2,
      url: 'https://example.com/pasta',
    })
    expect(store.getById(created.id)?.url).toBe('https://example.com/pasta')

    store.updateRecipe(created.id, { name: 'Pasta', ingredients: [], servings: 2, url: undefined })
    expect(store.getById(created.id)?.url).toBeUndefined()
  })

  it('persists recipes to localStorage', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Soup', ingredients: ['water'], servings: 1 })
    const saved = JSON.parse(localStorage.getItem('recipes') ?? '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Soup')
  })

  it('rehydrates recipes from localStorage on init', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Salad', ingredients: ['lettuce'], servings: 2 })

    setActivePinia(createPinia())
    const store2 = useRecipesStore()
    expect(store2.recipeCount).toBe(1)
    expect(store2.recipes[0].name).toBe('Salad')
  })
})
