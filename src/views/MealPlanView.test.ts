import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, enableAutoUnmount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { VAutocomplete } from 'vuetify/components'
import { mdiStar, mdiChevronLeft, mdiChevronRight } from '@mdi/js'
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

    // Every day starts empty, so tapping the first day's chip opens the edit dialog directly.
    await wrapper.findAll('[data-testid="meal-btn"] button')[0].trigger('click')
    await flushPromises()

    // The autocomplete lives inside the teleported dialog, outside the wrapper's own DOM tree.
    const input = new DOMWrapper(document.querySelector('input')!)
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

    // Every day starts empty, so tapping the first day's chip opens the edit dialog directly.
    await wrapper.findAll('[data-testid="meal-btn"] button')[0].trigger('click')
    await flushPromises()

    // The autocomplete lives inside the teleported dialog, outside the wrapper's own DOM tree.
    const input = new DOMWrapper(document.querySelector('input')!)
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

  it('closes the edit dialog when navigating to a different week', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    await wrapper.findAll('[data-testid="meal-btn"] button')[0].trigger('click')
    expect(wrapper.vm.editDialog).toBe(true)

    clickIconButton(wrapper, mdiChevronRight)
    await flushPromises()

    expect(wrapper.vm.editDialog).toBe(false)

    wrapper.unmount()
  })
})

// Swipe handling listens on `window` so a gesture anywhere on screen navigates weeks, not just
// over the calendar rows — so these dispatch there by default. Passing a specific element (e.g.
// a node inside a teleported overlay) lets a test target where the "touch" started.
async function swipe(
  start: { x: number; y: number },
  end: { x: number; y: number },
  target: EventTarget = window
) {
  const startEvent = new Event('touchstart', { bubbles: true })
  Object.assign(startEvent, { touches: [{ clientX: start.x, clientY: start.y }] })
  target.dispatchEvent(startEvent)

  const endEvent = new Event('touchend', { bubbles: true })
  Object.assign(endEvent, { changedTouches: [{ clientX: end.x, clientY: end.y }] })
  target.dispatchEvent(endEvent)

  await flushPromises()
}

describe('MealPlanView swipe navigation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('navigates to the next week on a left swipe past the threshold', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    await swipe({ x: 300, y: 200 }, { x: 200, y: 205 })

    expect(wrapper.text()).toContain('Jun 22, 2026')
    expect(wrapper.text()).toContain('Jun 28, 2026')

    wrapper.unmount()
  })

  it('navigates to the previous week on a right swipe past the threshold', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    await swipe({ x: 200, y: 200 }, { x: 300, y: 205 })

    expect(wrapper.text()).toContain('Jun 8, 2026')
    expect(wrapper.text()).toContain('Jun 14, 2026')

    wrapper.unmount()
  })

  it('navigates when the swipe starts below the week list, on the empty background', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    // No element lives at these coordinates; dispatching straight on `window` is exactly what a
    // touch on empty background below the calendar rows looks like.
    await swipe({ x: 300, y: 900 }, { x: 200, y: 905 })

    expect(wrapper.text()).toContain('Jun 22, 2026')
    expect(wrapper.text()).toContain('Jun 28, 2026')

    wrapper.unmount()
  })

  it('does not navigate on a short or vertical movement', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })

    await swipe({ x: 200, y: 200 }, { x: 220, y: 200 })
    expect(wrapper.text()).toContain('Jun 15, 2026')

    await swipe({ x: 200, y: 100 }, { x: 205, y: 400 })
    expect(wrapper.text()).toContain('Jun 15, 2026')

    wrapper.unmount()
  })

  it('closes the edit dialog when navigating to a different week via swipe', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    await wrapper.findAll('[data-testid="meal-btn"] button')[0].trigger('click')
    expect(wrapper.vm.editDialog).toBe(true)

    await swipe({ x: 300, y: 200 }, { x: 200, y: 205 })

    expect(wrapper.vm.editDialog).toBe(false)

    wrapper.unmount()
  })

  it('ignores a swipe that starts inside an open note dialog', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
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

    const overlay = document.querySelector('.v-overlay-container')
    expect(overlay).not.toBeNull()

    await swipe({ x: 300, y: 200 }, { x: 200, y: 205 }, overlay!)

    expect(wrapper.text()).toContain('Jun 15, 2026')
    expect(wrapper.text()).toContain('Jun 21, 2026')
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

    // The first day of the displayed week is Monday, 2026-06-15; it starts empty, so tapping its
    // chip opens the edit dialog directly.
    const monday = '2026-06-15'
    await wrapper.findAll('[data-testid="meal-btn"] button')[0].trigger('click')
    await wrapper.vm.$nextTick()

    wrapper.findComponent(VAutocomplete).vm.$emit('update:model-value', recipe.id)
    await flushPromises()
    expect(mealPlan.getForDate(monday)?.recipeId).toBe(recipe.id)
    expect(wrapper.vm.editDialog).toBe(false)

    // Monday is now filled, so reopen the dialog via its kebab menu to clear the assignment.
    await wrapper.find('[data-testid="meal-kebab"]').trigger('click')
    await flushPromises()
    // The menu's list item is teleported outside the wrapper's own DOM tree.
    document.querySelector<HTMLElement>('[data-testid="edit-meal-item"]')?.click()
    await flushPromises()

    wrapper.findComponent(VAutocomplete).vm.$emit('update:model-value', null)
    await flushPromises()
    expect(mealPlan.getForDate(monday)).toBeUndefined()

    wrapper.unmount()
  })
})

describe('MealPlanView meal kebab menu', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('only shows the kebab on days that have a recipe assigned', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    // Monday 2026-06-15 is filled, Tuesday 2026-06-16 stays empty.
    mealPlan.assign('2026-06-15', recipe.id)

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    const rows = wrapper.findAll('[data-testid="meal-btn"]')

    expect(rows[0].find('[data-testid="meal-kebab"]').exists()).toBe(true)
    expect(rows[1].find('[data-testid="meal-kebab"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('navigates to the recipe detail view when a filled day is tapped', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    mealPlan.assign('2026-06-15', recipe.id)

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    await wrapper.findAll('[data-testid="meal-btn"] button')[0].trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('recipe-detail'))
    expect(router.currentRoute.value.params.id).toBe(recipe.id)
    expect(wrapper.vm.editDialog).toBe(false)

    wrapper.unmount()
  })

  it('opens the edit dialog pre-filled with the current recipe via the kebab menu', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    mealPlan.assign('2026-06-15', recipe.id)

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, {
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    })

    await wrapper.find('[data-testid="meal-kebab"]').trigger('click')
    await flushPromises()
    // The menu's list item is teleported outside the wrapper's own DOM tree.
    document.querySelector<HTMLElement>('[data-testid="edit-meal-item"]')?.click()
    await flushPromises()

    expect(wrapper.vm.editDialog).toBe(true)
    expect(wrapper.vm.editDialogDate).toBe('2026-06-15')
    expect(wrapper.findComponent(VAutocomplete).props('modelValue')).toBe(recipe.id)

    wrapper.unmount()
  })

  it('closes the edit dialog without changing the assignment when Close is clicked', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    mealPlan.assign('2026-06-15', recipe.id)

    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, {
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    })

    await wrapper.find('[data-testid="meal-kebab"]').trigger('click')
    await flushPromises()
    // The menu's list item is teleported outside the wrapper's own DOM tree.
    document.querySelector<HTMLElement>('[data-testid="edit-meal-item"]')?.click()
    await flushPromises()

    document.querySelector<HTMLElement>('[data-testid="close-edit-dialog"]')?.click()
    await flushPromises()

    expect(wrapper.vm.editDialog).toBe(false)
    expect(mealPlan.getForDate('2026-06-15')?.recipeId).toBe(recipe.id)

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

  it('shows no placeholder text and a dimmed icon for empty notes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()

    const wrapper = mount(MealPlanView, { global: { plugins: [router, pinia] } })
    const firstRow = wrapper.findAll('.meal-plan-row')[0]
    const noteTexts = firstRow.findAll('.note-text')
    const noteIcons = firstRow.findAll('.note-icon')

    expect(noteTexts[0].text()).toBe('')
    expect(noteTexts[1].text()).toBe('')
    expect(noteIcons[0].classes()).toContain('note-icon-empty')
    expect(noteIcons[1].classes()).toContain('note-icon-empty')
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

describe('MealPlanView drag and drop reorder', () => {
  // The displayed week for 2026-06-17 (a Wednesday) runs Mon 06-15 .. Sun 06-21.
  const monday = '2026-06-15'
  const tuesday = '2026-06-16'
  const wednesday = '2026-06-17'
  const thursday = '2026-06-18'
  const friday = '2026-06-19'
  const saturday = '2026-06-20'
  const sunday = '2026-06-21'
  const weekDates = [monday, tuesday, wednesday, thursday, friday, saturday, sunday]

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // jsdom has no DragEvent constructor, so Vue Test Utils falls back to a plain Event and simply
  // assigns any extra options (like dataTransfer) onto it directly - a stub object is enough.
  function dataTransferStub() {
    return { setData: vi.fn(), effectAllowed: '', dropEffect: '' }
  }

  async function mountView(pinia: ReturnType<typeof createPinia>) {
    const router = makeRouter()
    router.push({ name: 'meal-plan' })
    await router.isReady()
    // Attached to the document so the geometry stub below (which queries `document`) can find
    // the rendered meal buttons; every other test in this block only queries the wrapper itself.
    return mount(MealPlanView, { global: { plugins: [router, pinia] }, attachTo: document.body })
  }

  it('ignores a dragstart fired on an unplanned day even if forced', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const stew = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    const soup = recipes.addRecipe({ name: 'Soup', ingredients: [], servings: 2 })
    mealPlan.assign(monday, stew.id)
    mealPlan.assign(tuesday, soup.id)

    const wrapper = await mountView(pinia)
    const buttons = wrapper.findAll('[data-testid="meal-btn"]')

    // Wednesday has no recipe or meal note, so forcing a dragstart on it (bypassing the
    // draggable="false" the browser would normally enforce) must not arm a drag.
    await buttons[2].trigger('dragstart', { dataTransfer: dataTransferStub() })
    expect(buttons[2].classes()).not.toContain('meal-btn--dragging')

    await buttons[1].trigger('drop', { dataTransfer: dataTransferStub() })
    expect(mealPlan.getForDate(monday)?.recipeId).toBe(stew.id)
    expect(mealPlan.getForDate(tuesday)?.recipeId).toBe(soup.id)

    wrapper.unmount()
  })

  it('marks an unplanned day as not draggable but keeps it a valid drop target', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    mealPlan.assign(monday, recipe.id)

    const wrapper = await mountView(pinia)
    const buttons = wrapper.findAll('[data-testid="meal-btn"]')

    expect(buttons[0].attributes('draggable')).toBe('true')
    expect(buttons[1].attributes('draggable')).toBe('false')

    await buttons[0].trigger('dragstart', { dataTransfer: dataTransferStub() })
    await buttons[1].trigger('drop', { dataTransfer: dataTransferStub() })

    expect(mealPlan.getForDate(monday)).toBeUndefined()
    expect(mealPlan.getForDate(tuesday)?.recipeId).toBe(recipe.id)

    wrapper.unmount()
  })

  it("swaps two days' content when dropped directly on another day's button", async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const stew = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    const soup = recipes.addRecipe({ name: 'Soup', ingredients: [], servings: 2 })
    mealPlan.assign(monday, stew.id)
    mealPlan.assign(tuesday, soup.id)
    mealPlan.setDayNote(monday, "Mother's birthday")

    const wrapper = await mountView(pinia)
    const buttons = wrapper.findAll('[data-testid="meal-btn"]')

    await buttons[0].trigger('dragstart', { dataTransfer: dataTransferStub() })
    await buttons[1].trigger('drop', { dataTransfer: dataTransferStub() })

    expect(mealPlan.getForDate(monday)?.recipeId).toBe(soup.id)
    expect(mealPlan.getForDate(monday)?.dayNote).toBe("Mother's birthday")
    expect(mealPlan.getForDate(tuesday)?.recipeId).toBe(stew.id)

    wrapper.unmount()
  })

  it('cascades forward when dropped on an insert zone after the source', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const meals = weekDates.map((date, i) => {
      const recipe = recipes.addRecipe({ name: `Meal ${i}`, ingredients: [], servings: 2 })
      mealPlan.assign(date, recipe.id)
      return recipe
    })

    const wrapper = await mountView(pinia)
    const buttons = wrapper.findAll('[data-testid="meal-btn"]')
    const zones = wrapper.findAll('[data-testid="insert-zone"]')

    // Source is Tuesday (index 1). Zone 5 sits between Friday and Saturday; since 5 > 1, it
    // resolves to target index 4 (Friday).
    await buttons[1].trigger('dragstart', { dataTransfer: dataTransferStub() })
    await zones[5].trigger('drop', { dataTransfer: dataTransferStub() })

    expect(weekDates.map((d) => mealPlan.getForDate(d)?.recipeId)).toEqual([
      meals[0].id, // Mon unchanged
      meals[2].id, // Tue <- was Wed's
      meals[3].id, // Wed <- was Thu's
      meals[4].id, // Thu <- was Fri's
      meals[1].id, // Fri <- the moved item
      meals[5].id, // Sat unchanged
      meals[6].id, // Sun unchanged
    ])

    wrapper.unmount()
  })

  it('cascades backward when dropped on an insert zone before the source', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const meals = weekDates.map((date, i) => {
      const recipe = recipes.addRecipe({ name: `Meal ${i}`, ingredients: [], servings: 2 })
      mealPlan.assign(date, recipe.id)
      return recipe
    })

    const wrapper = await mountView(pinia)
    const buttons = wrapper.findAll('[data-testid="meal-btn"]')
    const zones = wrapper.findAll('[data-testid="insert-zone"]')

    // Source is Friday (index 4). Zone 1 sits between Monday and Tuesday; since 1 <= 4, it
    // resolves to target index 1 (Tuesday).
    await buttons[4].trigger('dragstart', { dataTransfer: dataTransferStub() })
    await zones[1].trigger('drop', { dataTransfer: dataTransferStub() })

    expect(weekDates.map((d) => mealPlan.getForDate(d)?.recipeId)).toEqual([
      meals[0].id, // Mon unchanged
      meals[4].id, // Tue <- the moved item
      meals[1].id, // Wed <- was Tue's
      meals[2].id, // Thu <- was Wed's
      meals[3].id, // Fri <- was Thu's
      meals[5].id, // Sat unchanged
      meals[6].id, // Sun unchanged
    ])

    wrapper.unmount()
  })

  it('is a no-op when dropped on either insert zone flanking the source', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const meals = weekDates.map((date, i) => {
      const recipe = recipes.addRecipe({ name: `Meal ${i}`, ingredients: [], servings: 2 })
      mealPlan.assign(date, recipe.id)
      return recipe
    })

    const wrapper = await mountView(pinia)
    const buttons = wrapper.findAll('[data-testid="meal-btn"]')
    const zones = wrapper.findAll('[data-testid="insert-zone"]')

    // Source is Tuesday (index 1); zones 1 and 2 both flank it and resolve back to index 1.
    await buttons[1].trigger('dragstart', { dataTransfer: dataTransferStub() })
    await zones[1].trigger('drop', { dataTransfer: dataTransferStub() })
    await zones[2].trigger('drop', { dataTransfer: dataTransferStub() })

    expect(weekDates.map((d) => mealPlan.getForDate(d)?.recipeId)).toEqual(meals.map((m) => m.id))

    wrapper.unmount()
  })

  it('shows drag and drop-target feedback classes and clears them on dragend', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const recipe = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    mealPlan.assign(monday, recipe.id)

    const wrapper = await mountView(pinia)
    const buttons = wrapper.findAll('[data-testid="meal-btn"]')
    const zones = wrapper.findAll('[data-testid="insert-zone"]')

    await buttons[0].trigger('dragstart', { dataTransfer: dataTransferStub() })
    expect(buttons[0].classes()).toContain('meal-btn--dragging')

    await buttons[1].trigger('dragover', { dataTransfer: dataTransferStub() })
    expect(buttons[1].classes()).toContain('meal-btn--drop-target')

    await zones[5].trigger('dragover', { dataTransfer: dataTransferStub() })
    expect(zones[5].classes()).toContain('insert-zone--active')
    // Hovering a zone clears any stale row highlight from a previous hover target.
    expect(buttons[1].classes()).not.toContain('meal-btn--drop-target')

    await zones[5].trigger('dragleave')
    expect(zones[5].classes()).not.toContain('insert-zone--active')

    await buttons[1].trigger('dragover', { dataTransfer: dataTransferStub() })
    expect(buttons[1].classes()).toContain('meal-btn--drop-target')
    await buttons[1].trigger('dragleave')
    expect(buttons[1].classes()).not.toContain('meal-btn--drop-target')

    await buttons[0].trigger('dragend', { dataTransfer: dataTransferStub() })
    expect(buttons[0].classes()).not.toContain('meal-btn--dragging')
    expect(zones[5].classes()).not.toContain('insert-zone--active')

    wrapper.unmount()
  })

  // jsdom implements neither Element.animate nor window.matchMedia (confirmed while designing
  // this feature), so both are stubbed here purely to observe whether the component *tries* to
  // animate - the row-index math itself is covered directly in dragShift.test.ts.
  function stubAnimateAndGeometry() {
    const animateSpy = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animateSpy,
    })
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const buttons = Array.from(document.querySelectorAll('[data-testid="meal-btn"]'))
      const index = buttons.indexOf(this)
      return { top: index * 50 } as DOMRect
    }
    return {
      animateSpy,
      restore: () => {
        delete (HTMLElement.prototype as { animate?: unknown }).animate
        HTMLElement.prototype.getBoundingClientRect = originalRect
      },
    }
  }

  it('animates affected rows with the Web Animations API after a swap', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const stew = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    const soup = recipes.addRecipe({ name: 'Soup', ingredients: [], servings: 2 })
    mealPlan.assign(monday, stew.id)
    mealPlan.assign(tuesday, soup.id)

    const { animateSpy, restore } = stubAnimateAndGeometry()
    try {
      const wrapper = await mountView(pinia)
      const buttons = wrapper.findAll('[data-testid="meal-btn"]')

      await buttons[0].trigger('dragstart', { dataTransfer: dataTransferStub() })
      await buttons[1].trigger('drop', { dataTransfer: dataTransferStub() })
      await flushPromises()

      expect(animateSpy).toHaveBeenCalledTimes(2)
      wrapper.unmount()
    } finally {
      restore()
    }
  })

  it('skips the animation when the user prefers reduced motion', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const recipes = useRecipesStore()
    const mealPlan = useMealPlanStore()
    const stew = recipes.addRecipe({ name: 'Stew', ingredients: [], servings: 2 })
    const soup = recipes.addRecipe({ name: 'Soup', ingredients: [], servings: 2 })
    mealPlan.assign(monday, stew.id)
    mealPlan.assign(tuesday, soup.id)

    const { animateSpy, restore } = stubAnimateAndGeometry()
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia

    try {
      const wrapper = await mountView(pinia)
      const buttons = wrapper.findAll('[data-testid="meal-btn"]')

      await buttons[0].trigger('dragstart', { dataTransfer: dataTransferStub() })
      await buttons[1].trigger('drop', { dataTransfer: dataTransferStub() })
      await flushPromises()

      expect(animateSpy).not.toHaveBeenCalled()
      wrapper.unmount()
    } finally {
      restore()
      window.matchMedia = originalMatchMedia
    }
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

    // Every day starts empty, so tapping the first day's chip opens the edit dialog directly.
    await wrapper.findAll('[data-testid="meal-btn"] button')[0].trigger('click')
    await flushPromises()

    // The autocomplete lives inside the teleported dialog, outside the wrapper's own DOM tree.
    const input = new DOMWrapper(document.querySelector('input')!)
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
