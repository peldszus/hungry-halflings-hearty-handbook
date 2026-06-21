import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import MealPlanView from './MealPlanView.vue'
import { useRecipesStore } from '@/stores/recipes'

function makeRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', name: 'meal-plan', component: MealPlanView },
      { path: '/recipes/:id', name: 'recipe-detail', component: { template: '<div />' } },
    ],
  })
}

describe('MealPlanView favourite indicator', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows a star icon in the recipe picker only for favourited recipes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Favourite Curry', ingredients: [], servings: 2 })
    store.addRecipe({ name: 'Plain Rice', ingredients: [], servings: 2 })
    store.toggleFavourite(store.recipes[0].id)

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, {
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    })

    wrapper.find('i.mdi-pencil').element.closest('button')?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input')
    await input.trigger('mousedown')
    await input.trigger('focus')
    await new Promise((resolve) => setTimeout(resolve, 50))

    const items = Array.from(document.querySelectorAll('.v-list-item'))
    const favouriteItem = items.find((item) => item.textContent?.includes('Favourite Curry'))
    const plainItem = items.find((item) => item.textContent?.includes('Plain Rice'))
    expect(favouriteItem?.querySelector('i.mdi-star')).not.toBeNull()
    expect(plainItem?.querySelector('i.mdi-star')).toBeNull()

    wrapper.unmount()
  })
})
