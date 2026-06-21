import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import RecipesView from './RecipesView.vue'
import { useRecipesStore } from '@/stores/recipes'

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
