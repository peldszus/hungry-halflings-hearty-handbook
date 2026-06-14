import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Recipe {
  id: string
  name: string
  ingredients: string[]
  servings: number
}

const STORAGE_KEY = 'recipes'

function save(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

export const useRecipesStore = defineStore('recipes', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const recipes = ref<Recipe[]>(stored ? JSON.parse(stored) : [])

  const recipeCount = computed(() => recipes.value.length)

  function addRecipe(recipe: Omit<Recipe, 'id'>) {
    recipes.value.push({ ...recipe, id: crypto.randomUUID() })
    save(recipes.value)
  }

  function removeRecipe(id: string) {
    recipes.value = recipes.value.filter((r) => r.id !== id)
    save(recipes.value)
  }

  function getById(id: string): Recipe | undefined {
    return recipes.value.find((r) => r.id === id)
  }

  return { recipes, recipeCount, addRecipe, removeRecipe, getById }
})
