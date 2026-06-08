import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMealPlanStore } from './mealPlan'
import { useRecipesStore } from './recipes'

export const useShoppingListStore = defineStore('shoppingList', () => {
  const startDate = ref('')
  const endDate = ref('')

  const items = computed(() => {
    if (!startDate.value || !endDate.value) return []
    const mealPlan = useMealPlanStore()
    const recipes = useRecipesStore()
    const entries = mealPlan.getForRange(startDate.value, endDate.value)
    const allIngredients = entries.flatMap((e) => {
      const recipe = recipes.getById(e.recipeId)
      return recipe?.ingredients ?? []
    })
    return [...new Set(allIngredients)].sort()
  })

  function setRange(start: string, end: string) {
    startDate.value = start
    endDate.value = end
  }

  return { startDate, endDate, items, setRange }
})
