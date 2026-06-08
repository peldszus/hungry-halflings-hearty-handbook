import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './HomeView.vue'

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the meal planner heading', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', component: HomeView }],
    })
    const wrapper = mount(HomeView, {
      global: { plugins: [router, pinia] },
    })
    expect(wrapper.text()).toContain('Meal Planner')
  })
})
