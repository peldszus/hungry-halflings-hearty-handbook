import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DataTransferMenu from './DataTransferMenu.vue'
import { useRecipesStore, type Recipe } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { buildBackup } from '@/utils/dataTransfer'

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    name: 'Pasta',
    ingredients: [{ ingredient: 'pasta', isMain: true, addToShoppingList: true }],
    servings: 2,
    lastEditedAt: '2026-06-01T00:00:00.000Z',
    archived: false,
    favourite: false,
    ...overrides,
  }
}

function fileFromText(text: string): File {
  const file = new File([text], 'backup.json', { type: 'application/json' })
  // jsdom's File does not implement Blob.text(); shim it for the test.
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) })
  }
  return file
}

function mountMenu() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(DataTransferMenu, { global: { plugins: [pinia] } })
}

describe('DataTransferMenu', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('exports the current database as a downloaded file', () => {
    const createObjectURL = vi.fn(() => 'blob:url')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mountMenu()
    const recipesStore = useRecipesStore()
    recipesStore.addRecipe({ name: 'Pasta', ingredients: [], servings: 2 })

    wrapper.vm.exportData()

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('shows an error and no confirm button for an invalid file', async () => {
    const wrapper = mountMenu()
    wrapper.vm.openImportDialog()
    await wrapper.vm.onFileSelected(fileFromText('{ not json'))
    await flushPromises()

    expect(wrapper.vm.importError).toContain('JSON')
    expect(wrapper.vm.parsedBackup).toBeNull()
    expect(wrapper.vm.fileStats).toBeNull()

    await flushPromises()
    expect(document.querySelector('[data-testid="confirm-import"]')).toBeNull()
  })

  it('previews the file stats alongside the current database', async () => {
    const wrapper = mountMenu()
    const recipesStore = useRecipesStore()
    recipesStore.addRecipe({ name: 'Existing', ingredients: [], servings: 1 })

    const backup = buildBackup(
      [recipe(), recipe({ id: 'r2' })],
      [
        { date: '2026-06-14', recipeId: 'r1' },
        { date: '2026-06-20', recipeId: 'r2' },
      ],
      '2026-06-29T14:30:00.000Z'
    )
    wrapper.vm.openImportDialog()
    await wrapper.vm.onFileSelected(fileFromText(JSON.stringify(backup)))
    await flushPromises()

    expect(wrapper.vm.importError).toBe('')
    expect(wrapper.vm.fileStats).toMatchObject({
      recipeCount: 2,
      plannedMealCount: 2,
      lastMealDate: '2026-06-20',
    })

    await flushPromises()
    const preview = document.querySelector('[data-testid="import-preview"]')
    expect(preview).not.toBeNull()
    expect(document.querySelector('[data-testid="confirm-import"]')).not.toBeNull()
  })

  it('overwrites both stores when confirming the import', async () => {
    const wrapper = mountMenu()
    const recipesStore = useRecipesStore()
    const mealPlanStore = useMealPlanStore()
    recipesStore.addRecipe({ name: 'Old', ingredients: [], servings: 1 })
    mealPlanStore.assign('2026-01-01', recipesStore.recipes[0].id)

    const backup = buildBackup(
      [recipe({ id: 'imported' })],
      [{ date: '2026-07-01', recipeId: 'imported' }]
    )
    wrapper.vm.openImportDialog()
    await wrapper.vm.onFileSelected(fileFromText(JSON.stringify(backup)))
    await flushPromises()

    wrapper.vm.confirmImport()
    await flushPromises()

    expect(recipesStore.recipes).toHaveLength(1)
    expect(recipesStore.recipes[0].id).toBe('imported')
    expect(mealPlanStore.entries).toEqual([{ date: '2026-07-01', recipeId: 'imported' }])
    expect(wrapper.vm.importDialog).toBe(false)
  })

  it('leaves the database untouched when cancelling', async () => {
    const wrapper = mountMenu()
    const recipesStore = useRecipesStore()
    recipesStore.addRecipe({ name: 'Keep', ingredients: [], servings: 1 })

    const backup = buildBackup([recipe({ id: 'imported' })], [])
    wrapper.vm.openImportDialog()
    await wrapper.vm.onFileSelected(fileFromText(JSON.stringify(backup)))
    await flushPromises()

    wrapper.vm.closeImportDialog()
    await flushPromises()

    expect(recipesStore.recipes).toHaveLength(1)
    expect(recipesStore.recipes[0].name).toBe('Keep')
    expect(wrapper.vm.parsedBackup).toBeNull()
  })
})
