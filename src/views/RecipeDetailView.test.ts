import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import RecipeDetailView from './RecipeDetailView.vue'
import { useRecipesStore } from '@/stores/recipes'

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
