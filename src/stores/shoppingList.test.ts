import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useShoppingListStore } from './shoppingList'
import { useMealPlanStore } from './mealPlan'
import { useRecipesStore } from './recipes'

describe('shoppingList store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('is empty until a range is set', () => {
    const store = useShoppingListStore()
    expect(store.items).toEqual([])
  })

  it('aggregates and dedupes ingredients from recipes within the range', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const curry = recipes.addRecipe({
      name: 'Curry',
      ingredients: ['rice', 'onion'],
      servings: 2,
    })
    const soup = recipes.addRecipe({
      name: 'Soup',
      ingredients: ['onion', 'carrot'],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', curry.id)
    mealPlan.assign('2026-06-15', soup.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual(['carrot', 'onion', 'rice'])
  })

  it('excludes meals outside the date range', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const curry = recipes.addRecipe({ name: 'Curry', ingredients: ['rice'], servings: 2 })
    const soup = recipes.addRecipe({ name: 'Soup', ingredients: ['carrot'], servings: 2 })
    mealPlan.assign('2026-06-14', curry.id)
    mealPlan.assign('2026-06-20', soup.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual(['rice'])
  })

  it('ignores meal-plan entries whose recipe no longer exists', () => {
    const mealPlan = useMealPlanStore()
    mealPlan.assign('2026-06-14', 'missing-recipe-id')

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-14')

    expect(store.items).toEqual([])
  })

  it('handles recipes with no ingredients', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const empty = recipes.addRecipe({ name: 'Toast', ingredients: [], servings: 1 })
    mealPlan.assign('2026-06-14', empty.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-14')

    expect(store.items).toEqual([])
  })

  it('sorts the resulting ingredient list alphabetically', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({
      name: 'Mix',
      ingredients: ['zucchini', 'apple', 'mango'],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', recipe.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-14')

    expect(store.items).toEqual(['apple', 'mango', 'zucchini'])
  })
})
