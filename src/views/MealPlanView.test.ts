import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { VAutocomplete } from 'vuetify/components'
import { mdiPencil, mdiStar, mdiChevronLeft, mdiChevronRight, mdiCheck } from '@mdi/js'
import MealPlanView from './MealPlanView.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

// The note dialog tests below open a teleported v-dialog; auto-unmounting
// after each test (rather than an ad-hoc wrapper.unmount()) lets Vuetify
// finish its own teardown so it doesn't error on a later, unrelated test.
enableAutoUnmount(afterEach)

function iconSelector(path: string) {
  return `svg path[d="${path}"]`
}

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

    wrapper
      .find(iconSelector(mdiPencil))
      .element.closest('button')
      ?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input')
    await input.trigger('mousedown')
    await input.trigger('focus')
    await new Promise((resolve) => setTimeout(resolve, 50))

    const items = Array.from(document.querySelectorAll('.v-list-item'))
    const favouriteItem = items.find((item) => item.textContent?.includes('Favourite Curry'))
    const plainItem = items.find((item) => item.textContent?.includes('Plain Rice'))
    expect(favouriteItem?.querySelector(iconSelector(mdiStar))).not.toBeNull()
    expect(plainItem?.querySelector(iconSelector(mdiStar))).toBeNull()

    wrapper.unmount()
  })
})

describe('MealPlanView recipe labels', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows label chips for recipes in the picker dropdown', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useRecipesStore()
    store.addRecipe({ name: 'Tagged Curry', ingredients: [], labels: ['spicy'], servings: 2 })

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, {
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    })

    wrapper
      .find(iconSelector(mdiPencil))
      .element.closest('button')
      ?.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input')
    await input.trigger('mousedown')
    await input.trigger('focus')
    await new Promise((resolve) => setTimeout(resolve, 50))

    const items = Array.from(document.querySelectorAll('.v-list-item'))
    const curryItem = items.find((item) => item.textContent?.includes('Tagged Curry'))
    expect(curryItem?.querySelector('.v-chip')?.textContent).toContain('spicy')
    // The chip must live in the content area, not the clamped (overflow-hidden) subtitle.
    expect(curryItem?.querySelector('.v-list-item-subtitle .v-chip')).toBeNull()

    wrapper.unmount()
  })
})

function clickIconButton(wrapper: ReturnType<typeof mount>, iconPath: string) {
  wrapper.find(iconSelector(iconPath)).element.closest('button')?.dispatchEvent(new Event('click'))
}

describe('MealPlanView week navigation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the current week (Monday to Sunday) by default', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    const rows = wrapper.findAll('.meal-plan-row')

    expect(rows).toHaveLength(7)
    expect(rows[0].find('.day-label').text()).toContain('Mon')
    expect(rows[6].find('.day-label').text()).toContain('Sun')
    expect(wrapper.text()).toContain('Jun 15, 2026')
    expect(wrapper.text()).toContain('Jun 21, 2026')

    wrapper.unmount()
  })

  it('navigates to the next week when the forward arrow is clicked', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    clickIconButton(wrapper, mdiChevronRight)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Jun 22, 2026')
    expect(wrapper.text()).toContain('Jun 28, 2026')

    wrapper.unmount()
  })

  it('navigates to the previous week when the back arrow is clicked', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    clickIconButton(wrapper, mdiChevronLeft)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Jun 8, 2026')
    expect(wrapper.text()).toContain('Jun 14, 2026')

    wrapper.unmount()
  })

  it('exits edit mode when navigating to a different week', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    clickIconButton(wrapper, mdiPencil)
    await wrapper.vm.$nextTick()
    expect(wrapper.find(iconSelector(mdiCheck)).exists()).toBe(true)

    clickIconButton(wrapper, mdiChevronRight)
    await wrapper.vm.$nextTick()

    expect(wrapper.find(iconSelector(mdiPencil)).exists()).toBe(true)
    expect(wrapper.find(iconSelector(mdiCheck)).exists()).toBe(false)

    wrapper.unmount()
  })
})

describe('MealPlanView recipe assignment', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('assigns a recipe to a day when one is picked, and unassigns when cleared', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    clickIconButton(wrapper, mdiPencil)
    await wrapper.vm.$nextTick()

    // The first day of the displayed week is Monday, 2026-06-15.
    const monday = '2026-06-15'
    const firstPicker = wrapper.findAllComponents(VAutocomplete)[0]

    firstPicker.vm.$emit('update:model-value', recipe.id)
    await wrapper.vm.$nextTick()
    expect(mealPlan.getForDate(monday)?.recipeId).toBe(recipe.id)

    firstPicker.vm.$emit('update:model-value', null)
    await wrapper.vm.$nextTick()
    expect(mealPlan.getForDate(monday)).toBeUndefined()

    wrapper.unmount()
  })
})

describe('MealPlanView day and meal notes', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows placeholder text for empty notes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    const firstRow = wrapper.findAll('.meal-plan-row')[0]
    const noteTexts = firstRow.findAll('.note-text')

    expect(noteTexts[0].text()).toBe('Day note')
    expect(noteTexts[1].text()).toBe('Meal note')
    expect(noteTexts[0].classes()).toContain('note-empty')
  })

  it('opens a dialog with the existing note text and saves an edit', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const mealPlan = useMealPlanStore()
    // The first day of the displayed week is Monday, 2026-06-15.
    const monday = '2026-06-15'
    mealPlan.setDayNote(monday, "Mother's birthday")

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, {
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    })

    const firstRow = wrapper.findAll('.meal-plan-row')[0]
    await firstRow.find('[data-testid="day-note-field"]').trigger('click')
    await flushPromises()

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="note-dialog-text"] textarea'
    )
    expect(textarea?.value).toBe("Mother's birthday")

    textarea!.value = "Mother's birthday - cake at 6pm"
    textarea!.dispatchEvent(new Event('input'))
    await flushPromises()

    document.querySelector<HTMLElement>('[data-testid="save-note"]')?.click()
    await flushPromises()

    expect(mealPlan.getForDate(monday)?.dayNote).toBe("Mother's birthday - cake at 6pm")
  })

  it('does not save the note when the dialog is cancelled', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const mealPlan = useMealPlanStore()
    const monday = '2026-06-15'

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, {
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    })

    const firstRow = wrapper.findAll('.meal-plan-row')[0]
    await firstRow.find('[data-testid="meal-note-field"]').trigger('click')
    await flushPromises()

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '[data-testid="note-dialog-text"] textarea'
    )
    textarea!.value = 'No onions'
    textarea!.dispatchEvent(new Event('input'))
    await flushPromises()

    document.querySelector<HTMLElement>('[data-testid="cancel-note"]')?.click()
    await flushPromises()

    expect(mealPlan.getForDate(monday)?.mealNote).toBeUndefined()
  })
})

describe('MealPlanView recipe filtering', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('matches recipes in the picker by label as well as by title', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    recipes.addRecipe({ name: 'Tagged Curry', ingredients: [], labels: ['spicy'], servings: 2 })
    recipes.addRecipe({ name: 'Plain Rice', ingredients: [], labels: [], servings: 2 })

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, {
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    })

    clickIconButton(wrapper, mdiPencil)
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input')
    await input.trigger('mousedown')
    await input.trigger('focus')
    // "spicy" only appears as a label on Tagged Curry, never in either title,
    // so the label branch of recipeFilter is what keeps it in the list.
    await input.setValue('spicy')
    await new Promise((resolve) => setTimeout(resolve, 50))

    const items = Array.from(document.querySelectorAll('.v-list-item'))
    const labels = items.map((item) => item.textContent ?? '')
    expect(labels.some((t) => t.includes('Tagged Curry'))).toBe(true)
    expect(labels.some((t) => t.includes('Plain Rice'))).toBe(false)

    wrapper.unmount()
  })
})
