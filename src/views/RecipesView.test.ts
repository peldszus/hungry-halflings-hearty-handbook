import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { mdiStar } from '@mdi/js'
import RecipesView from './RecipesView.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

const starSelector = `svg path[d="${mdiStar}"]`

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
    expect(favouriteItem?.find(starSelector).exists()).toBe(true)
    expect(plainItem?.find(starSelector).exists()).toBe(false)

    await wrapper.find('input').setValue('Favourite')
    await wrapper.vm.$nextTick()

    const filteredItems = wrapper.findAll('.v-list-item')
    expect(filteredItems).toHaveLength(1)
    expect(filteredItems[0].find(starSelector).exists()).toBe(true)
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

  it('filters recipes by label and shows label chips', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Tomato Soup', ingredients: [], labels: ['vegan'], servings: 1 })
    store.addRecipe({ name: 'Beef Stew', ingredients: [], labels: ['hearty'], servings: 1 })

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })

    const allItems = wrapper.findAll('.v-list-item')
    const soup = allItems.find((item) => item.text().includes('Tomato Soup'))
    expect(soup?.find('.v-chip').text()).toBe('vegan')
    // The chip must live in the content area, not the clamped (overflow-hidden) subtitle.
    expect(soup?.find('.v-list-item-subtitle .v-chip').exists()).toBe(false)

    await wrapper.find('input').setValue('hearty')
    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.v-list-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('Beef Stew')
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
    expect(wrapper.text()).toContain('No recipes match your filters.')
  })

  it('shows an empty-library message when there are no recipes at all', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('No recipes yet.')
  })

  it('shows the last-used relative time as the subtitle', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    const mealPlanStore = useMealPlanStore()
    store.addRecipe({
      name: 'Salad',
      ingredients: [
        { ingredient: 'lettuce', isMain: false, addToShoppingList: true },
        { ingredient: 'tomato', isMain: false, addToShoppingList: true },
      ],
      servings: 3,
    })
    store.addRecipe({ name: 'Toast', ingredients: [], servings: 1 })
    mealPlanStore.assign('2020-01-01', store.recipes[0].id)

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })

    const items = wrapper.findAll('.v-list-item')
    const salad = items.find((item) => item.text().includes('Salad'))
    const toast = items.find((item) => item.text().includes('Toast'))
    expect(salad?.text()).toContain('Last used')
    expect(salad?.text()).toContain('ago')
    expect(toast?.text()).toContain('Never used')
  })

  it('shows both the last-used and the next-planned date when both exist', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    const mealPlanStore = useMealPlanStore()
    store.addRecipe({ name: 'Salad', ingredients: [], servings: 3 })
    mealPlanStore.assign('2020-01-01', store.recipes[0].id)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    mealPlanStore.assign(futureDate.toISOString().slice(0, 10), store.recipes[0].id)

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })

    const salad = wrapper.findAll('.v-list-item').find((item) => item.text().includes('Salad'))
    expect(salad?.text()).toContain('Last used')
    expect(salad?.text()).toContain('Next planned for')
  })
})

describe('RecipesView filters', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function seed() {
    const store = useRecipesStore()
    store.addRecipe({ name: 'Starred Soup', ingredients: [], labels: ['quick'], servings: 1 })
    store.addRecipe({ name: 'Plain Stew', ingredients: [], labels: ['slow'], servings: 1 })
    store.addRecipe({ name: 'Old Roast', ingredients: [], servings: 1 })
    store.toggleFavourite(store.recipes[0].id)
    store.archiveRecipe(store.recipes[2].id)
    return store
  }

  async function mountView() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = seed()

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    const wrapper = mount(RecipesView, { global: { plugins: [router, pinia] } })
    return { wrapper, store }
  }

  function names(wrapper: ReturnType<typeof mount>) {
    return wrapper.findAll('.v-list-item').map((item) => item.text())
  }

  it('hides archived recipes by default', async () => {
    const { wrapper } = await mountView()
    expect(names(wrapper).join(' ')).not.toContain('Old Roast')
  })

  it('narrows to archived recipes only once the archived filter is on', async () => {
    const { wrapper } = await mountView()
    await wrapper.find('[data-testid="filter-archived"]').trigger('click')

    const shown = names(wrapper)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toContain('Old Roast')
  })

  it('narrows to favourites only', async () => {
    const { wrapper } = await mountView()
    await wrapper.find('[data-testid="filter-favourites"]').trigger('click')

    const shown = names(wrapper)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toContain('Starred Soup')
  })

  it('clears every active filter', async () => {
    const { wrapper } = await mountView()
    await wrapper.find('[data-testid="filter-favourites"]').trigger('click')
    expect(names(wrapper)).toHaveLength(1)

    const clear = wrapper.findAll('button').find((b) => b.text() === 'Clear')
    await clear?.trigger('click')

    expect(names(wrapper)).toHaveLength(2)
  })
})

describe('RecipesView add-recipe FAB', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  async function mountWith(recipeCount: number) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    for (let i = 0; i < recipeCount; i++) {
      store.addRecipe({ name: `Recipe ${i}`, ingredients: [], servings: 1 })
    }

    const router = makeRouter()
    router.push({ name: 'recipes' })
    await router.isReady()

    return mount(RecipesView, { global: { plugins: [router, pinia] } })
  }

  it('is extended with a label while there are no recipes', async () => {
    const wrapper = await mountWith(0)
    const fab = wrapper.find('[data-testid="add-recipe"]')

    expect(fab.text()).toContain('New recipe')
    expect(fab.find('svg').exists()).toBe(true)
  })

  // VBtn renders the `icon` prop as content only when it has no default slot, and a slot that
  // renders nothing still counts — which previously left this an empty circle.
  it('still renders its icon once collapsed to an icon FAB', async () => {
    const wrapper = await mountWith(1)
    const fab = wrapper.find('[data-testid="add-recipe"]')

    expect(fab.text()).toBe('')
    expect(fab.find('svg').exists()).toBe(true)
    expect(fab.attributes('aria-label')).toBe('Add recipe')
  })
})
