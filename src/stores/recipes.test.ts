import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecipesStore } from './recipes'

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

  it('removes a recipe', () => {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    const id = store.recipes[0].id
    store.removeRecipe(id)
    expect(store.recipeCount).toBe(0)
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
