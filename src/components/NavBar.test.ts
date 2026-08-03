import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { VApp, VMain } from 'vuetify/components'
import NavBar from './NavBar.vue'
import MealPlanView from '@/views/MealPlanView.vue'
import router from '@/router'
import { useSuggestionMode } from '@/composables/useSuggestionMode'

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

describe('NavBar in suggestion mode', () => {
  function setViewportWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
    window.dispatchEvent(new Event('resize'))
  }

  afterEach(() => {
    useSuggestionMode().exit()
    setViewportWidth(1024)
  })

  it('yields the bottom navigation while suggestion mode is active', async () => {
    // Force the compact-width branch, which is the only one that renders the bottom bar.
    setViewportWidth(500)
    const wrapper = await mountAt('/meal-plan')
    expect(wrapper.find('.v-bottom-navigation').exists()).toBe(true)

    useSuggestionMode().enter()
    await nextTick()
    expect(wrapper.find('.v-bottom-navigation').exists()).toBe(false)

    useSuggestionMode().exit()
    await nextTick()
    expect(wrapper.find('.v-bottom-navigation').exists()).toBe(true)
  })

  it('keeps the navigation drawer regardless of suggestion mode', async () => {
    const wrapper = await mountAt('/meal-plan')
    useSuggestionMode().enter()
    await nextTick()
    expect(wrapper.find('.v-navigation-drawer').exists()).toBe(true)
  })

  // Regression: both bars are VBottomNavigations, and that component defaults its layout-item
  // id (the `name` prop) to 'bottom-navigation'. With colliding ids, exiting suggestion mode
  // re-registers the nav first and then the unmounting toolbar's unregister wiped it from the
  // layout, collapsing --v-layout-bottom to 0px and dropping the FAB behind the nav until a
  // reload. This is the only test that mounts both bars inside one layout.
  it('keeps the layout aware of the bottom navigation after leaving suggestion mode', async () => {
    setViewportWidth(500)
    const testRouter = makeRouter()
    await testRouter.push('/meal-plan')
    await testRouter.isReady()

    const wrapper = mount(
      {
        components: { VApp, VMain, NavBar, MealPlanView },
        template: '<v-app><NavBar /><v-main><MealPlanView /></v-main></v-app>',
      },
      { global: { plugins: [testRouter, createPinia()] } }
    )
    await nextTick()

    useSuggestionMode().enter()
    await nextTick()
    useSuggestionMode().exit()
    await nextTick()

    expect(wrapper.find('.v-bottom-navigation').exists()).toBe(true)
    expect(wrapper.find('.v-main').attributes('style')).toContain('--v-layout-bottom: 56px')
  })
})
