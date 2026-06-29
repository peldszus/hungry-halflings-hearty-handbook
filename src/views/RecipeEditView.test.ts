import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import RecipeEditView from './RecipeEditView.vue'
import { useRecipesStore, type Recipe } from '@/stores/recipes'

function makeRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/recipes/new', name: 'recipe-new', component: RecipeEditView },
      { path: '/recipes/:id/edit', name: 'recipe-edit', component: RecipeEditView },
      { path: '/recipes/:id', name: 'recipe-detail', component: { template: '<div />' } },
      { path: '/recipes', name: 'recipes', component: { template: '<div />' } },
    ],
  })
}

function fieldByTestId(wrapper: ReturnType<typeof mount>, testId: string) {
  return wrapper.find(`[data-testid="${testId}"] input`)
}

describe('RecipeEditView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows the create heading and empty form in create mode', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    expect(wrapper.text()).toContain('Add Recipe')
  })

  it('shows the edit heading and prefilled form in edit mode', async () => {
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
    router.push({ name: 'recipe-edit', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    expect(wrapper.text()).toContain('Edit Recipe')
  })

  it('shows not found for an unknown recipe id in edit mode', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'recipe-edit', params: { id: 'missing' } })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    expect(wrapper.text()).toContain('Recipe not found.')
  })

  it('navigates to the new recipe detail page after saving in create mode', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.recipes.push({
      id: 'legacy-1',
      name: 'Legacy',
      ingredients: [],
      servings: 1,
    } as unknown as Recipe)

    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    await fieldByTestId(wrapper, 'recipe-name').setValue('New Recipe')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipe-detail'))

    const newRecipe = store.recipes.find((r) => r.name === 'New Recipe')
    expect(router.currentRoute.value.name).toBe('recipe-detail')
    expect(router.currentRoute.value.params.id).toBe(newRecipe?.id)
  })

  it('saves the optional url field when provided', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()

    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    await fieldByTestId(wrapper, 'recipe-name').setValue('Linked Recipe')
    await fieldByTestId(wrapper, 'recipe-url').setValue('https://example.com/recipe')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const newRecipe = store.recipes.find((r) => r.name === 'Linked Recipe')
    expect(newRecipe?.url).toBe('https://example.com/recipe')
  })

  it('leaves url undefined when left blank', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()

    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    await fieldByTestId(wrapper, 'recipe-name').setValue('No Link Recipe')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const newRecipe = store.recipes.find((r) => r.name === 'No Link Recipe')
    expect(newRecipe?.url).toBeUndefined()
  })

  it('saves labels entered in the labels field', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()

    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    await fieldByTestId(wrapper, 'recipe-name').setValue('Tagged Recipe')

    const labelsCombobox = wrapper.findComponent('[data-testid="recipe-labels"]')
    await labelsCombobox.setValue(['vegetarian', 'quick'])

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const newRecipe = store.recipes.find((r) => r.name === 'Tagged Recipe')
    expect(newRecipe?.labels).toEqual(['vegetarian', 'quick'])
  })

  it('prefills existing labels in edit mode', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [],
      labels: ['dinner', 'italian'],
      servings: 2,
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-edit', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    const labelsField = wrapper.find('[data-testid="recipe-labels"]')
    expect(labelsField.text()).toContain('dinner')
    expect(labelsField.text()).toContain('italian')
  })

  it('adds and removes ingredient rows', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })

    expect(wrapper.findAll('.ingredient-row').length).toBe(1)

    const addButton = wrapper.findAll('button').find((b) => b.text().includes('Add ingredient'))
    await addButton?.trigger('click')

    expect(wrapper.findAll('.ingredient-row').length).toBe(2)

    const deleteButtons = wrapper.findAll('i.mdi-delete')
    await deleteButtons[0].element.closest('button')?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.ingredient-row').length).toBe(1)
  })

  it('saves ingredient name, quantity, unit and flags', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()

    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    await fieldByTestId(wrapper, 'recipe-name').setValue('Bread')

    const ingredientInput = wrapper.find('[data-testid="ingredient-name"] input')
    await ingredientInput.setValue('flour')

    const quantityInput = wrapper.find('.ingredient-row input[type="number"]')
    await quantityInput.setValue('200')

    const checkboxes = wrapper.findAll('.ingredient-row input[type="checkbox"]')
    await checkboxes[0].setValue(true)

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const newRecipe = store.recipes.find((r) => r.name === 'Bread')
    expect(newRecipe?.ingredients).toHaveLength(1)
    expect(newRecipe?.ingredients[0].ingredient).toBe('flour')
    expect(newRecipe?.ingredients[0].quantity).toBe(200)
    expect(newRecipe?.ingredients[0].isMain).toBe(true)
    expect(newRecipe?.ingredients[0].addToShoppingList).toBe(true)
  })
})
