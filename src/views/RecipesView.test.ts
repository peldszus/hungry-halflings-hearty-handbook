import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import RecipesView from './RecipesView.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

function makeRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/recipes', name: 'recipes', component: RecipesView },
      { path: '/recipes/new', name: 'recipe-new', component: { template: '<div />' } },
      { path: '/recipes/:id', name: 'recipe-detail', component: { template: '<div />' } },
    ],
  })
}

describe('RecipesView favourite indicator', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows a star icon only for favourited recipes, including in search results', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Favourite Soup', ingredients: [], servings: 1 })
    store.addRecipe({ name: 'Plain Stew', ingredients: [], servings: 1 })
    store.toggleFavourite(store.recipes[0].id)

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })

    const listItems = wrapper.findAll('.v-list-item')
    expect(listItems).toHaveLength(2)
    const favouriteItem = listItems.find((item) => item.text().includes('Favourite Soup'))
    const plainItem = listItems.find((item) => item.text().includes('Plain Stew'))
    expect(favouriteItem?.find('i.mdi-star').exists()).toBe(true)
    expect(plainItem?.find('i.mdi-star').exists()).toBe(false)

    await wrapper.find('input').setValue('Favourite')
    await wrapper.vm.$nextTick()

    const filteredItems = wrapper.findAll('.v-list-item')
    expect(filteredItems).toHaveLength(1)
    expect(filteredItems[0].find('i.mdi-star').exists()).toBe(true)
  })
})

describe('RecipesView search filtering', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('filters recipes case-insensitively by name', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Tomato Soup', ingredients: [], servings: 1 })
    store.addRecipe({ name: 'Beef Stew', ingredients: [], servings: 1 })

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })
    await wrapper.find('input').setValue('tomato')
    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.v-list-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('Tomato Soup')
  })

  it('shows a no-match message when the search has no results', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Tomato Soup', ingredients: [], servings: 1 })

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })
    await wrapper.find('input').setValue('nonexistent')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.v-list-item')).toHaveLength(0)
    expect(wrapper.text()).toContain('No recipes match your search.')
  })

  it('shows an empty-library message when there are no recipes at all', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('No recipes yet. Tap + to add one.')
  })

  it('shows the last-used relative time as the subtitle', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    const mealPlanStore = useMealPlanStore()
    store.addRecipe({ name: 'Salad', ingredients: ['lettuce', 'tomato'], servings: 3 })
    store.addRecipe({ name: 'Toast', ingredients: [], servings: 1 })
    mealPlanStore.assign('2020-01-01', store.recipes[0].id)

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })

    const items = wrapper.findAll('.v-list-item')
    const salad = items.find((item) => item.text().includes('Salad'))
    const toast = items.find((item) => item.text().includes('Toast'))
    expect(salad?.text()).toContain('Used')
    expect(salad?.text()).toContain('ago')
    expect(toast?.text()).toContain('Never used')
  })
})
