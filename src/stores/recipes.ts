import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Recipe {
  id: string
  name: string
  ingredients: string[]
  servings: number
}

export const useRecipesStore = defineStore('recipes', () => {
  const recipes = ref<Recipe[]>([])

  const recipeCount = computed(() => recipes.value.length)

  function addRecipe(recipe: Omit<Recipe, 'id'>) {
    recipes.value.push({ ...recipe, id: crypto.randomUUID() })
  }

  function removeRecipe(id: string) {
    recipes.value = recipes.value.filter((r) => r.id !== id)
  }

  function getById(id: string): Recipe | undefined {
    return recipes.value.find((r) => r.id === id)
  }

  return { recipes, recipeCount, addRecipe, removeRecipe, getById }
})
