import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Recipe {
  id: string
  name: string
  ingredients: string[]
  servings: number
  lastEditedAt: string
}

const STORAGE_KEY = 'recipes'

function save(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

export const useRecipesStore = defineStore('recipes', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const recipes = ref<Recipe[]>(stored ? JSON.parse(stored) : [])

  const recipeCount = computed(() => recipes.value.length)

  const recentRecipes = computed(() =>
    [...recipes.value].sort(
      (a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()
    )
  )

  function addRecipe(recipe: Omit<Recipe, 'id' | 'lastEditedAt'>) {
    recipes.value.push({
      ...recipe,
      id: crypto.randomUUID(),
      lastEditedAt: new Date().toISOString(),
    })
    save(recipes.value)
  }

  function updateRecipe(id: string, updates: Omit<Recipe, 'id' | 'lastEditedAt'>) {
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

  return { recipes, recipeCount, recentRecipes, addRecipe, updateRecipe, removeRecipe, getById }
})
