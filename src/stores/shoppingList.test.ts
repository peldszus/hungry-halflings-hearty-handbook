import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useShoppingListStore } from './shoppingList'
import { useMealPlanStore } from './mealPlan'
import { useRecipesStore, type Ingredient } from './recipes'

function ing(name: string, overrides: Partial<Ingredient> = {}): Ingredient {
  return { ingredient: name, isMain: false, addToShoppingList: true, ...overrides }
}

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
      ingredients: [ing('rice'), ing('onion')],
      servings: 2,
    })
    const soup = recipes.addRecipe({
      name: 'Soup',
      ingredients: [ing('onion'), ing('carrot')],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', curry.id)
    mealPlan.assign('2026-06-15', soup.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual([
      { ingredient: 'carrot', quantity: undefined, unit: undefined },
      { ingredient: 'onion', quantity: undefined, unit: undefined },
      { ingredient: 'rice', quantity: undefined, unit: undefined },
    ])
  })

  it('excludes meals outside the date range', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const curry = recipes.addRecipe({ name: 'Curry', ingredients: [ing('rice')], servings: 2 })
    const soup = recipes.addRecipe({ name: 'Soup', ingredients: [ing('carrot')], servings: 2 })
    mealPlan.assign('2026-06-14', curry.id)
    mealPlan.assign('2026-06-20', soup.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual([{ ingredient: 'rice', quantity: undefined, unit: undefined }])
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
      ingredients: [ing('zucchini'), ing('apple'), ing('mango')],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', recipe.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-14')

    expect(store.items.map((i) => i.ingredient)).toEqual(['apple', 'mango', 'zucchini'])
  })

  it('sums quantities for the same ingredient and unit across recipes', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const a = recipes.addRecipe({
      name: 'Bread',
      ingredients: [ing('flour', { quantity: 200, unit: 'g' })],
      servings: 2,
    })
    const b = recipes.addRecipe({
      name: 'Cake',
      ingredients: [ing('flour', { quantity: 300, unit: 'g' })],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', a.id)
    mealPlan.assign('2026-06-15', b.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual([{ ingredient: 'flour', quantity: 500, unit: 'g' }])
  })

  it('creates separate lines for the same ingredient with different units', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const a = recipes.addRecipe({
      name: 'A',
      ingredients: [ing('milk', { quantity: 1, unit: 'l' })],
      servings: 2,
    })
    const b = recipes.addRecipe({
      name: 'B',
      ingredients: [ing('milk', { quantity: 200, unit: 'ml' })],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', a.id)
    mealPlan.assign('2026-06-15', b.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual([
      { ingredient: 'milk', quantity: 1, unit: 'l' },
      { ingredient: 'milk', quantity: 200, unit: 'ml' },
    ])
  })

  it('excludes ingredients with addToShoppingList false', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({
      name: 'Stew',
      ingredients: [ing('pepper', { addToShoppingList: false }), ing('pork')],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', recipe.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-14')

    expect(store.items).toEqual([{ ingredient: 'pork', quantity: undefined, unit: undefined }])
  })

  it('dedupes ingredients without a quantity into a single line', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const a = recipes.addRecipe({ name: 'A', ingredients: [ing('salt')], servings: 2 })
    const b = recipes.addRecipe({ name: 'B', ingredients: [ing('salt')], servings: 2 })
    mealPlan.assign('2026-06-14', a.id)
    mealPlan.assign('2026-06-15', b.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual([{ ingredient: 'salt', quantity: undefined, unit: undefined }])
  })

  it('groups ingredient names case-insensitively and trims whitespace', () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const a = recipes.addRecipe({
      name: 'A',
      ingredients: [ing('Onion', { quantity: 1, unit: 'pc' })],
      servings: 2,
    })
    const b = recipes.addRecipe({
      name: 'B',
      ingredients: [ing(' onion ', { quantity: 2, unit: ' pc ' })],
      servings: 2,
    })
    mealPlan.assign('2026-06-14', a.id)
    mealPlan.assign('2026-06-15', b.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-14', '2026-06-15')

    expect(store.items).toEqual([{ ingredient: 'Onion', quantity: 3, unit: 'pc' }])
  })
})
