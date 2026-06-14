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
