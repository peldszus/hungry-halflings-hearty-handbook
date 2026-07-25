import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { VApp } from 'vuetify/components'
import NavBar from './NavBar.vue'
import router from '@/router'

const Stub = { template: '<div />' }

// v-app-bar, v-navigation-drawer and v-bottom-navigation all register with Vuetify's layout,
// so they have to be mounted inside a v-app. VApp is imported explicitly because
// vite-plugin-vuetify's auto-import only rewrites .vue files, not inline templates.
const LayoutHost = {
  components: { VApp, NavBar },
  template: '<v-app><NavBar /></v-app>',
}

function makeRouter() {
  // Mirrors the real route meta, which is what drives the navigation highlight.
  return createRouter({
    history: createWebHashHistory(),
    routes: router.getRoutes().map((route) => ({
      path: route.path,
      name: route.name,
      meta: route.meta,
      component: Stub,
    })),
  })
}

async function mountAt(location: string) {
  const testRouter = makeRouter()
  await testRouter.push(location)
  await testRouter.isReady()

  const wrapper = mount(LayoutHost, { global: { plugins: [testRouter, createPinia()] } })
  await testRouter.isReady()
  return wrapper
}

function activeLabel(wrapper: Awaited<ReturnType<typeof mountAt>>) {
  // At the jsdom viewport width the layout renders the rail drawer rather than the bottom bar.
  const active = wrapper.find('.v-list-item--active, .v-btn--active')
  return active.exists() ? active.text() : null
}

describe('NavBar', () => {
  it('renders every destination', async () => {
    const wrapper = await mountAt('/')
    const text = wrapper.text()

    for (const label of ['Home', 'Recipes', 'Meal Plan', 'Shopping']) {
      expect(text).toContain(label)
    }
  })

  it.each([
    ['/', 'Home'],
    ['/recipes', 'Recipes'],
    ['/meal-plan', 'Meal Plan'],
    ['/shopping-list', 'Shopping'],
  ])('marks the destination for %s as active', async (path, expected) => {
    const wrapper = await mountAt(path)
    expect(activeLabel(wrapper)).toBe(expected)
  })

  // The previous implementation matched on route.path, which left no destination active on a
  // recipe detail, edit or new route.
  it.each([['/recipes/abc'], ['/recipes/abc/edit'], ['/recipes/new']])(
    'keeps Recipes active on %s',
    async (path) => {
      const wrapper = await mountAt(path)
      expect(activeLabel(wrapper)).toBe('Recipes')
    }
  )
})
