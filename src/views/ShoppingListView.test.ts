import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import ShoppingListView from './ShoppingListView.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { useShoppingListStore } from '@/stores/shoppingList'

function mountView(pinia: Pinia) {
  return mount(ShoppingListView, { global: { plugins: [pinia] } })
}

describe('ShoppingListView', () => {
  let pinia: Pinia

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders the date range selector', () => {
    const wrapper = mountView(pinia)
    expect(wrapper.text()).toContain('Select Date Range')
  })

  it('does not show the ingredients card until both dates are set', async () => {
    const store = useShoppingListStore()
    const wrapper = mountView(pinia)

    expect(wrapper.text()).not.toContain('Ingredients')

    store.startDate = '2026-06-15'
    await wrapper.vm.$nextTick()
    // Only the start date is set, so the card stays hidden.
    expect(wrapper.text()).not.toContain('Ingredients')

    store.endDate = '2026-06-21'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Ingredients')
  })

  it('shows the empty state when no ingredients fall in the range', async () => {
    const store = useShoppingListStore()
    store.setRange('2026-06-15', '2026-06-21')
    const wrapper = mountView(pinia)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No ingredients found for this period.')
  })

  it('lists aggregated ingredients with quantity and unit', async () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()

    const curry = recipes.addRecipe({
      name: 'Curry',
      servings: 2,
      ingredients: [
        { ingredient: 'Onion', quantity: 1, unit: 'pcs', isMain: true, addToShoppingList: true },
        { ingredient: 'Salt', isMain: false, addToShoppingList: true },
      ],
    })
    const soup = recipes.addRecipe({
      name: 'Soup',
      servings: 2,
      ingredients: [
        { ingredient: 'Onion', quantity: 2, unit: 'pcs', isMain: true, addToShoppingList: true },
      ],
    })

    mealPlan.assign('2026-06-16', curry.id)
    mealPlan.assign('2026-06-18', soup.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-15', '2026-06-21')
    const wrapper = mountView(pinia)
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    // Onion appears once with summed quantity across both recipes (1 + 2).
    expect(text).toContain('3 pcs Onion')
    // Salt has no quantity or unit, so only the name is shown.
    expect(text).toContain('Salt')
    expect(text).not.toContain('No ingredients found')

    const titles = wrapper.findAll('.v-list-item-title').map((n) => n.text())
    expect(titles).toEqual(['3 pcs Onion', 'Salt'])
  })

  it('excludes ingredients not flagged for the shopping list', async () => {
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()

    const recipe = recipes.addRecipe({
      name: 'Pasta',
      servings: 2,
      ingredients: [
        { ingredient: 'Pasta', quantity: 200, unit: 'g', isMain: true, addToShoppingList: true },
        { ingredient: 'Water', isMain: false, addToShoppingList: false },
      ],
    })
    mealPlan.assign('2026-06-16', recipe.id)

    const store = useShoppingListStore()
    store.setRange('2026-06-15', '2026-06-21')
    const wrapper = mountView(pinia)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('200 g Pasta')
    expect(wrapper.text()).not.toContain('Water')
  })
})
