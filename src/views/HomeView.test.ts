import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './HomeView.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

/** The view reads "today" from the clock, so tests seed dates relative to it the same way. */
function isoDaysFromToday(offset: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function mountHome() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/', component: HomeView }],
  })
  return mount(HomeView, { global: { plugins: [router] } })
}

describe('HomeView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('navigation card counts', () => {
    it('shows the recipe count and the planning streak on the cards that navigate there', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      recipes.addRecipe({ name: 'Pie', ingredients: [], servings: 4 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)
      mealPlan.assign(isoDaysFromToday(1), recipe.id)

      const text = mountHome().text()
      expect(text).toContain('2 recipes')
      expect(text).toContain('2 days planned ahead')
    })

    it('uses the singular form for a single item', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)

      const text = mountHome().text()
      expect(text).toContain('1 recipe')
      expect(text).toContain('1 day planned ahead')
    })

    it('reads as empty rather than zero when there is nothing yet', () => {
      const text = mountHome().text()
      expect(text).toContain('No recipes yet')
      expect(text).toContain("Today isn't planned")
    })

    it('counts a day with only a meal note towards the streak', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)
      mealPlan.setMealNote(isoDaysFromToday(1), 'Leftovers')
      mealPlan.assign(isoDaysFromToday(2), recipe.id)

      expect(mountHome().text()).toContain('3 days planned ahead')
    })

    it('stops the streak at the first gap, ignoring meals beyond it', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)
      // Tomorrow is the gap.
      mealPlan.assign(isoDaysFromToday(2), recipe.id)
      mealPlan.assign(isoDaysFromToday(3), recipe.id)

      expect(mountHome().text()).toContain('1 day planned ahead')
    })

    it('reports an unplanned today even when later days are planned', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(1), recipe.id)

      expect(mountHome().text()).toContain("Today isn't planned")
    })
  })

  describe('next meal card', () => {
    it('shows the next meal and links to its recipe', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(1), recipe.id)

      const card = mountHome().get('[data-testid="next-meal"]')
      expect(card.text()).toContain('Stew')
      expect(card.text()).toContain('tomorrow')
      expect(card.attributes('href')).toContain(`/recipes/${recipe.id}`)
    })

    it('falls back to a prompt to plan when nothing is planned', () => {
      const wrapper = mountHome()
      expect(wrapper.find('[data-testid="next-meal"]').exists()).toBe(false)

      const card = wrapper.get('[data-testid="no-next-meal"]')
      expect(card.text()).toContain('Plan your week')
      expect(card.attributes('href')).toContain('/meal-plan')
    })
  })
})
