import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import RecipeEditView from './RecipeEditView.vue'
import { useRecipesStore } from '@/stores/recipes'

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
    store.addRecipe({ name: 'Pasta', ingredients: ['pasta'], servings: 2 })
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
})
