import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import RecipeDetailView from './RecipeDetailView.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

function makeRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/recipes/:id', name: 'recipe-detail', component: RecipeDetailView },
      { path: '/recipes/:id/edit', name: 'recipe-edit', component: { template: '<div />' } },
      { path: '/recipes', name: 'recipes', component: { template: '<div />' } },
    ],
  })
}

describe('RecipeDetailView favourite button', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('toggles the favourite star icon on click without changing lastEditedAt', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    const id = store.recipes[0].id
    const originalEditedAt = store.recipes[0].lastEditedAt

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    function starButton() {
      return wrapper.find('i.mdi-star, i.mdi-star-outline').element.closest('button')
    }

    expect(wrapper.find('i.mdi-star-outline').exists()).toBe(true)

    await starButton()?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.favourite).toBe(true)
    expect(wrapper.find('i.mdi-star').exists()).toBe(true)
    expect(store.getById(id)?.lastEditedAt).toBe(originalEditedAt)

    await starButton()?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.favourite).toBe(false)
    expect(store.getById(id)?.lastEditedAt).toBe(originalEditedAt)
  })
})

function iconButton(wrapper: ReturnType<typeof mount>, iconClass: string) {
  return wrapper.find(`i.${iconClass}`).element.closest('button')
}

describe('RecipeDetailView actions', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('deletes the recipe and navigates back to the recipe list', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })
    iconButton(wrapper, 'mdi-delete')?.dispatchEvent(new Event('click'))
    await flushPromises()

    expect(store.getById(id)).toBeUndefined()
    expect(router.currentRoute.value.name).toBe('recipes')
  })

  it('archives and unarchives the recipe', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.find('i.mdi-archive-arrow-down').exists()).toBe(true)
    iconButton(wrapper, 'mdi-archive-arrow-down')?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.archived).toBe(true)
    expect(wrapper.text()).toContain('Archived')
    expect(wrapper.find('i.mdi-archive-arrow-up').exists()).toBe(true)

    iconButton(wrapper, 'mdi-archive-arrow-up')?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.archived).toBe(false)
    expect(wrapper.find('i.mdi-archive-arrow-down').exists()).toBe(true)
  })

  it('renders an empty-ingredients message when there are none', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Toast', ingredients: [], servings: 1 })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('No ingredients listed.')
  })

  it('renders the ingredients list when present', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Salad', ingredients: ['lettuce', 'tomato'], servings: 1 })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('lettuce')
    expect(wrapper.text()).toContain('tomato')
  })

  it('renders the recipe URL as a link when provided', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: ['pasta'],
      servings: 2,
      url: 'https://example.com/pasta',
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://example.com/pasta')
    expect(link.attributes('target')).toBe('_blank')
  })

  it('shows the last used, next planned and total planned count', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
    const id = store.recipes[0].id

    const mealPlanStore = useMealPlanStore()
    const today = new Date()
    const past = new Date(today)
    past.setDate(past.getDate() - 4)
    const future = new Date(today)
    future.setDate(future.getDate() + 2)
    mealPlanStore.assign(past.toISOString().slice(0, 10), id)
    mealPlanStore.assign(future.toISOString().slice(0, 10), id)

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('Last used 4 days ago')
    expect(wrapper.text()).toContain('Next planned for in 2 days')
    expect(wrapper.text()).toContain('Planned 2 times in total')
  })

  it('shows a not-found message for a missing recipe', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id: 'does-not-exist' } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('Recipe not found.')
  })
})
