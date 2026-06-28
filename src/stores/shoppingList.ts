import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMealPlanStore } from './mealPlan'
import { useRecipesStore } from './recipes'
import type { Ingredient } from './recipes'

export interface ShoppingListItem {
  ingredient: string
  quantity?: number
  unit?: string
}

export const useShoppingListStore = defineStore('shoppingList', () => {
  const startDate = ref('')
  const endDate = ref('')

  const items = computed<ShoppingListItem[]>(() => {
    if (!startDate.value || !endDate.value) return []
    const mealPlan = useMealPlanStore()
    const recipes = useRecipesStore()
    const entries = mealPlan.getForRange(startDate.value, endDate.value)

    const allIngredients: Ingredient[] = entries.flatMap((e) => {
      const recipe = recipes.getById(e.recipeId)
      return recipe?.ingredients.filter((i) => i.addToShoppingList) ?? []
    })

    const groups = new Map<string, ShoppingListItem>()
    for (const ing of allIngredients) {
      const name = ing.ingredient.trim()
      const unit = ing.unit?.trim() || undefined
      const key = `${name.toLowerCase()}::${(unit ?? '').toLowerCase()}`
      const existing = groups.get(key)
      if (existing) {
        if (ing.quantity != null) {
          existing.quantity = (existing.quantity ?? 0) + ing.quantity
        }
      } else {
        groups.set(key, { ingredient: name, quantity: ing.quantity, unit })
      }
    }

    return [...groups.values()].sort(
      (a, b) =>
        a.ingredient.localeCompare(b.ingredient) || (a.unit ?? '').localeCompare(b.unit ?? '')
    )
  })

  function setRange(start: string, end: string) {
    startDate.value = start
    endDate.value = end
  }

  return { startDate, endDate, items, setRange }
})
