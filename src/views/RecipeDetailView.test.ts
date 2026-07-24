import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import {
  mdiStar,
  mdiStarOutline,
  mdiDelete,
  mdiArchiveArrowDown,
  mdiArchiveArrowUp,
  mdiCart,
  mdiContentCopy,
} from '@mdi/js'
import RecipeDetailView from './RecipeDetailView.vue'
import RecipeEditView from './RecipeEditView.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

// Unmount mounted components after each test so teleported dialog DOM doesn't leak across tests.
enableAutoUnmount(afterEach)

// The duplicate-flow test below swaps between RecipeDetailView and RecipeEditView as the
// route changes, so it needs an actual <router-view /> host rather than mounting one view.
const RouterHost = { template: '<router-view />' }

function iconSelector(path: string) {
  return `svg path[d="${path}"]`
}

function makeRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/recipes/:id', name: 'recipe-detail', component: RecipeDetailView },
      { path: '/recipes/:id/edit', name: 'recipe-edit', component: { template: '<div />' } },
      { path: '/recipes/new', name: 'recipe-new', component: { template: '<div />' } },
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
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
    const id = store.recipes[0].id
    const originalEditedAt = store.recipes[0].lastEditedAt

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    function starButton() {
      return wrapper
        .find(`${iconSelector(mdiStar)}, ${iconSelector(mdiStarOutline)}`)
        .element.closest('button')
    }

    expect(wrapper.find(iconSelector(mdiStarOutline)).exists()).toBe(true)

    await starButton()?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.favourite).toBe(true)
    expect(wrapper.find(iconSelector(mdiStar)).exists()).toBe(true)
    expect(store.getById(id)?.lastEditedAt).toBe(originalEditedAt)

    await starButton()?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.favourite).toBe(false)
    expect(store.getById(id)?.lastEditedAt).toBe(originalEditedAt)
  })
})

function iconButton(wrapper: ReturnType<typeof mount>, iconPath: string) {
  return wrapper.find(iconSelector(iconPath)).element.closest('button')
}

describe('RecipeDetailView labels', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows label chips when the recipe has labels', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Curry',
      ingredients: [],
      labels: ['vegetarian', 'spicy'],
      servings: 2,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })
    const chipText = wrapper.findAll('.v-chip').map((c) => c.text())
    expect(chipText).toContain('vegetarian')
    expect(chipText).toContain('spicy')
  })

  it('shows no label chips when the recipe has no labels', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Plain', ingredients: [], servings: 2 })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })
    expect(wrapper.findAll('.v-chip')).toHaveLength(0)
  })
})

describe('RecipeDetailView actions', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows a confirmation dialog and only deletes the recipe once confirmed', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })
    iconButton(wrapper, mdiDelete)?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)).toBeDefined()
    expect(router.currentRoute.value.name).toBe('recipe-detail')
    expect(document.body.textContent).toContain('Delete recipe?')

    const confirmBtn = document.querySelector<HTMLElement>('[data-testid="confirm-delete"]')
    confirmBtn?.click()

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipes'))
    expect(store.getById(id)).toBeUndefined()
  })

  it('keeps the recipe when the delete confirmation is cancelled', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })
    iconButton(wrapper, mdiDelete)?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).toContain('Delete recipe?')
    const cancelButton = Array.from(document.querySelectorAll<HTMLElement>('button')).find((b) =>
      b.textContent?.includes('Cancel')
    )
    cancelButton?.click()
    await flushPromises()

    expect(store.getById(id)).toBeDefined()
    expect(router.currentRoute.value.name).toBe('recipe-detail')
  })

  it('archives and unarchives the recipe', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.find(iconSelector(mdiArchiveArrowDown)).exists()).toBe(true)
    iconButton(wrapper, mdiArchiveArrowDown)?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.archived).toBe(true)
    expect(wrapper.text()).toContain('Archived')
    expect(wrapper.find(iconSelector(mdiArchiveArrowUp)).exists()).toBe(true)

    iconButton(wrapper, mdiArchiveArrowUp)?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(store.getById(id)?.archived).toBe(false)
    expect(wrapper.find(iconSelector(mdiArchiveArrowDown)).exists()).toBe(true)
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
    store.addRecipe({
      name: 'Salad',
      ingredients: [
        { ingredient: 'lettuce', isMain: false, addToShoppingList: true },
        { ingredient: 'tomato', isMain: false, addToShoppingList: true },
      ],
      servings: 1,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('lettuce')
    expect(wrapper.text()).toContain('tomato')
  })

  it('shows a Main chip for main ingredients', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Stew',
      ingredients: [
        { ingredient: 'pork', isMain: true, addToShoppingList: true },
        { ingredient: 'pepper', isMain: false, addToShoppingList: true },
      ],
      servings: 1,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    const listItems = wrapper.findAll('.v-list-item')
    const pork = listItems.find((item) => item.text().includes('pork'))
    const pepper = listItems.find((item) => item.text().includes('pepper'))
    expect(pork?.text()).toContain('Main')
    expect(pepper?.text()).not.toContain('Main')
  })

  it('shows quantity and unit inline', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Bread',
      ingredients: [
        { ingredient: 'flour', quantity: 200, unit: 'g', isMain: false, addToShoppingList: true },
      ],
      servings: 1,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('200')
    expect(wrapper.text()).toContain('g')
    expect(wrapper.text()).toContain('flour')
  })

  it('shows a shopping list chip only for ingredients flagged for it', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Stew',
      ingredients: [
        { ingredient: 'salt', isMain: false, addToShoppingList: false },
        { ingredient: 'pork', isMain: false, addToShoppingList: true },
      ],
      servings: 1,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })

    const items = wrapper.findAll('.v-list-item')
    const salt = items.find((item) => item.text().includes('salt'))
    const pork = items.find((item) => item.text().includes('pork'))
    expect(salt?.find(iconSelector(mdiCart)).exists()).toBe(false)
    expect(pork?.find(iconSelector(mdiCart)).exists()).toBe(true)
  })

  it('renders the recipe URL as a link when provided', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
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
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
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

  it('navigates to the new recipe form with the source id when duplicating', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-detail', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeDetailView, { global: { plugins: [router, pinia] } })
    iconButton(wrapper, mdiContentCopy)?.dispatchEvent(new Event('click'))

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipe-new'))
    expect(router.currentRoute.value.query.duplicateFrom).toBe(id)
    expect(store.getById(id)).toBeDefined()
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

  it('going back after saving a duplicate returns to the recipe list, not the original recipe', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
    const originalId = store.recipes[0].id

    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/recipes/:id', name: 'recipe-detail', component: RecipeDetailView },
        { path: '/recipes/new', name: 'recipe-new', component: RecipeEditView },
        { path: '/recipes', name: 'recipes', component: { template: '<div />' } },
      ],
    })

    await router.push({ name: 'recipes' })
    await router.push({ name: 'recipe-detail', params: { id: originalId } })

    const wrapper = mount(RouterHost, { global: { plugins: [router, pinia] } })
    await flushPromises()

    iconButton(wrapper, mdiContentCopy)?.dispatchEvent(new Event('click'))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipe-new'))
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipe-detail'))

    expect(router.currentRoute.value.params.id).not.toBe(originalId)

    const backButton = wrapper.findAll('button').find((b) => b.text().includes('Back'))
    await backButton?.trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipes'))
  })
})
