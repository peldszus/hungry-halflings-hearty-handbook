import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { afterEach } from 'vitest'
import { mdiDelete } from '@mdi/js'
import RecipeEditView from './RecipeEditView.vue'
import { useRecipesStore, type Recipe } from '@/stores/recipes'

// Unmount mounted components after each test so component-scoped side effects
// (beforeunload listeners, teleported dialog DOM) don't leak across tests.
enableAutoUnmount(afterEach)

// The leave guard (onBeforeRouteLeave) only registers when the component is
// rendered inside a <router-view>, so these tests mount a host that does.
const RouterHost = { template: '<router-view />' }

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

  it('prefills the form from the source recipe when duplicating', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [
        { ingredient: 'pasta', quantity: 200, unit: 'g', isMain: true, addToShoppingList: true },
      ],
      labels: ['dinner'],
      servings: 3,
      url: 'https://example.com/pasta',
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-new', query: { duplicateFrom: id } })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })

    expect(wrapper.text()).toContain('Add Recipe')
    expect(fieldByTestId(wrapper, 'recipe-name').element.getAttribute('value')).toBe(
      'Copy of Pasta'
    )
    expect(fieldByTestId(wrapper, 'recipe-servings').element.getAttribute('value')).toBe('3')
    expect(fieldByTestId(wrapper, 'recipe-url').element.getAttribute('value')).toBe(
      'https://example.com/pasta'
    )
    const labelsField = wrapper.find('[data-testid="recipe-labels"]')
    expect(labelsField.text()).toContain('dinner')
    expect(
      wrapper.find('[data-testid="ingredient-name"] input').element.getAttribute('value')
    ).toBe('pasta')
  })

  it('saves a duplicated recipe as a new recipe without changing the original', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [{ ingredient: 'pasta', isMain: false, addToShoppingList: true }],
      servings: 2,
    })
    const originalId = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-new', query: { duplicateFrom: originalId } })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(store.recipes).toHaveLength(2)
    const duplicate = store.recipes.find((r) => r.id !== originalId)
    expect(duplicate?.name).toBe('Copy of Pasta')
    expect(duplicate?.id).not.toBe(originalId)
    expect(store.getById(originalId)?.name).toBe('Pasta')
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

  it('prefills existing notes in edit mode', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [],
      servings: 2,
      notes: '**Preparation:**\nCook for 10 minutes',
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-edit', params: { id } })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    const notesEditor = wrapper.find('[data-testid="notes-editor"] textarea')
    expect(notesEditor.exists()).toBe(true)
    expect((notesEditor.element as HTMLTextAreaElement).value).toBe(
      '**Preparation:**\nCook for 10 minutes'
    )
  })

  it('prefills notes when duplicating a recipe', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({
      name: 'Pasta',
      ingredients: [],
      servings: 2,
      notes: 'Original notes here',
    })
    const id = store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-new', query: { duplicateFrom: id } })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    const notesEditor = wrapper.find('[data-testid="notes-editor"] textarea')
    expect(notesEditor.exists()).toBe(true)
    expect((notesEditor.element as HTMLTextAreaElement).value).toBe('Original notes here')
  })

  it('saves notes entered in the notes field', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()

    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })
    await fieldByTestId(wrapper, 'recipe-name').setValue('Tagged Recipe')

    const notesEditor = wrapper.find('[data-testid="notes-editor"] textarea')
    await notesEditor.setValue('**Important:** Stir occasionally')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const newRecipe = store.recipes.find((r) => r.name === 'Tagged Recipe')
    expect(newRecipe?.notes).toBe('**Important:** Stir occasionally')
  })

  it('adds and removes ingredient rows', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'recipe-new' })
    await router.isReady()

    const wrapper = mount(RecipeEditView, { global: { plugins: [router, pinia] } })

    expect(wrapper.findAll('[data-testid="ingredient-row"]').length).toBe(1)

    const addButton = wrapper.findAll('button').find((b) => b.text().includes('Add ingredient'))
    await addButton?.trigger('click')

    expect(wrapper.findAll('[data-testid="ingredient-row"]').length).toBe(2)

    const deleteButtons = wrapper.findAll(`svg path[d="${mdiDelete}"]`)
    await deleteButtons[0].element.closest('button')?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('[data-testid="ingredient-row"]').length).toBe(1)
  })

  async function mountEditAt(id: string) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Pasta', ingredients: [], servings: 2 })
    const recipeId = id || store.recipes[0].id

    const router = makeRouter()
    router.push({ name: 'recipe-edit', params: { id: recipeId } })
    await router.isReady()

    const wrapper = mount(RouterHost, { global: { plugins: [router, pinia] } })
    await flushPromises()
    return { wrapper, router, store }
  }

  it('navigates away without prompting when the form is unchanged', async () => {
    const { router } = await mountEditAt('')

    await router.push({ name: 'recipes' })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('recipes')
    expect(document.body.textContent).not.toContain('Unsaved changes')
  })

  it('blocks navigation and shows a dialog when there are unsaved changes', async () => {
    const { wrapper, router } = await mountEditAt('')
    await fieldByTestId(wrapper, 'recipe-name').setValue('Pasta Bolognese')

    await router.push({ name: 'recipes' })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('recipe-edit')
    expect(document.body.textContent).toContain('Unsaved changes')
  })

  it('navigates away after confirming Leave in the dialog', async () => {
    const { wrapper, router } = await mountEditAt('')
    await fieldByTestId(wrapper, 'recipe-name').setValue('Pasta Bolognese')

    await router.push({ name: 'recipes' })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recipe-edit')

    const confirmBtn = document.querySelector<HTMLElement>('[data-testid="confirm-leave"]')
    confirmBtn?.click()
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipes'))

    expect(router.currentRoute.value.name).toBe('recipes')
  })

  it('does not prompt when leaving after a successful save', async () => {
    const { wrapper, store } = await mountEditAt('')
    await fieldByTestId(wrapper, 'recipe-name').setValue('Pasta Bolognese')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // The edit persisted and navigation away never showed the unsaved-changes dialog.
    expect(store.recipes[0].name).toBe('Pasta Bolognese')
    expect(document.body.textContent).not.toContain('Unsaved changes')
  })

  it('warns on beforeunload only when the form is dirty', async () => {
    const { wrapper } = await mountEditAt('')

    const pristineEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(pristineEvent)
    expect(pristineEvent.defaultPrevented).toBe(false)

    await fieldByTestId(wrapper, 'recipe-name').setValue('Pasta Bolognese')

    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
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

    const quantityInput = wrapper.find('[data-testid="ingredient-row"] input[type="number"]')
    await quantityInput.setValue('200')

    // Main / Shop are filter chips; Shop defaults on, so only Main needs toggling.
    await wrapper.find('[data-testid="ingredient-main"]').trigger('click')

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
