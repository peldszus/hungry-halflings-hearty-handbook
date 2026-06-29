import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Ingredient {
  ingredient: string
  quantity?: number
  unit?: string
  isMain: boolean
  addToShoppingList: boolean
}

export interface Recipe {
  id: string
  name: string
  ingredients: Ingredient[]
  labels?: string[]
  servings: number
  lastEditedAt: string
  archived: boolean
  favourite: boolean
  url?: string
}

const STORAGE_KEY = 'recipes'

function save(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

export const useRecipesStore = defineStore('recipes', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const recipes = ref<Recipe[]>(stored ? JSON.parse(stored) : [])

  const recipeCount = computed(() => recipes.value.length)

  function editedAtMillis(recipe: Recipe): number {
    const time = recipe.lastEditedAt ? new Date(recipe.lastEditedAt).getTime() : 0
    return Number.isNaN(time) ? 0 : time
  }

  const recentRecipes = computed(() =>
    [...recipes.value].sort((a, b) => editedAtMillis(b) - editedAtMillis(a))
  )

  const knownIngredientNames = computed(() => {
    const names = new Set<string>()
    for (const recipe of recipes.value) {
      for (const ing of recipe.ingredients) {
        const name = ing.ingredient.trim()
        if (name) names.add(name)
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  })

  const knownLabels = computed(() => {
    const labels = new Set<string>()
    for (const recipe of recipes.value) {
      for (const label of recipe.labels ?? []) {
        const name = label.trim()
        if (name) labels.add(name)
      }
    }
    return [...labels].sort((a, b) => a.localeCompare(b))
  })

  const knownUnits = computed(() => {
    const units = new Set<string>()
    for (const recipe of recipes.value) {
      for (const ing of recipe.ingredients) {
        const unit = ing.unit?.trim()
        if (unit) units.add(unit)
      }
    }
    return [...units].sort((a, b) => a.localeCompare(b))
  })

  const unitUsageCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const recipe of recipes.value) {
      for (const ing of recipe.ingredients) {
        const unit = ing.unit?.trim()
        if (unit) counts.set(unit, (counts.get(unit) ?? 0) + 1)
      }
    }
    return counts
  })

  function addRecipe(
    recipe: Omit<Recipe, 'id' | 'lastEditedAt' | 'archived' | 'favourite'>
  ): Recipe {
    const created: Recipe = {
      ...recipe,
      id: crypto.randomUUID(),
      lastEditedAt: new Date().toISOString(),
      archived: false,
      favourite: false,
    }
    recipes.value.push(created)
    save(recipes.value)
    return created
  }

  function updateRecipe(
    id: string,
    updates: Omit<Recipe, 'id' | 'lastEditedAt' | 'archived' | 'favourite'>
  ) {
    const recipe = recipes.value.find((r) => r.id === id)
    if (!recipe) return
    Object.assign(recipe, updates, { lastEditedAt: new Date().toISOString() })
    save(recipes.value)
  }

  function removeRecipe(id: string) {
    recipes.value = recipes.value.filter((r) => r.id !== id)
    save(recipes.value)
  }

  function getById(id: string): Recipe | undefined {
    return recipes.value.find((r) => r.id === id)
  }

  function archiveRecipe(id: string) {
    const recipe = recipes.value.find((r) => r.id === id)
    if (!recipe) return
    recipe.archived = true
    save(recipes.value)
  }

  function unarchiveRecipe(id: string) {
    const recipe = recipes.value.find((r) => r.id === id)
    if (!recipe) return
    recipe.archived = false
    save(recipes.value)
  }

  function toggleFavourite(id: string) {
    const recipe = recipes.value.find((r) => r.id === id)
    if (!recipe) return
    recipe.favourite = !recipe.favourite
    save(recipes.value)
  }

  return {
    recipes,
    recipeCount,
    recentRecipes,
    knownIngredientNames,
    knownLabels,
    knownUnits,
    unitUsageCounts,
    addRecipe,
    updateRecipe,
    removeRecipe,
    getById,
    archiveRecipe,
    unarchiveRecipe,
    toggleFavourite,
  }
})
