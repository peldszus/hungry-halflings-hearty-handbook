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

  it('renders the meal planner heading', () => {
    expect(mountHome().text()).toContain('Meal Planner')
  })

  describe('navigation card counts', () => {
    it('shows the recipe and upcoming-meal counts on the cards that navigate there', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      recipes.addRecipe({ name: 'Pie', ingredients: [], servings: 4 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)
      mealPlan.assign(isoDaysFromToday(1), recipe.id)

      const text = mountHome().text()
      expect(text).toContain('2 recipes')
      expect(text).toContain('2 upcoming meals')
    })

    it('uses the singular form for a single item', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)

      const text = mountHome().text()
      expect(text).toContain('1 recipe')
      expect(text).toContain('1 upcoming meal')
    })

    it('reads as empty rather than zero when there is nothing yet', () => {
      const text = mountHome().text()
      expect(text).toContain('No recipes yet')
      expect(text).toContain('No meals planned')
    })

    it('excludes past meals from the meal plan count', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(-3), recipe.id)
      mealPlan.assign(isoDaysFromToday(2), recipe.id)

      expect(mountHome().text()).toContain('1 upcoming meal')
    })
  })

  describe('planning coverage', () => {
    it('reports how many days ahead the plan reaches', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)
      mealPlan.assign(isoDaysFromToday(1), recipe.id)
      mealPlan.assign(isoDaysFromToday(2), recipe.id)

      const coverage = mountHome().get('[data-testid="planning-coverage"]').text()
      expect(coverage).toContain('Planned 3 days ahead')
      expect(coverage).toContain('next gap')
    })

    it('stops counting at the first unplanned day', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(0), recipe.id)
      mealPlan.assign(isoDaysFromToday(2), recipe.id)

      const coverage = mountHome().get('[data-testid="planning-coverage"]').text()
      expect(coverage).toBe('Planned through today · next gap tomorrow')
    })

    it('says nothing is planned for today when today has no meal', () => {
      const recipes = useRecipesStore()
      const mealPlan = useMealPlanStore()
      const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
      mealPlan.assign(isoDaysFromToday(1), recipe.id)

      expect(mountHome().get('[data-testid="planning-coverage"]').text()).toBe(
        'No meal planned for today'
      )
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
      // The coverage line is most useful precisely when the plan has run dry.
      expect(card.text()).toContain('No meal planned for today')
    })
  })
})
