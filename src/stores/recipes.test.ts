import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecipesStore } from './recipes'

describe('recipes store', () => {
  beforeEach(() => {
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
})
