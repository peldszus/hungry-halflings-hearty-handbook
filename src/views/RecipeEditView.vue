<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { mdiArrowLeft, mdiDelete, mdiPlus } from '@mdi/js'
import { useRecipesStore, type Ingredient } from '@/stores/recipes'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()

const isEditMode = computed(() => route.name === 'recipe-edit')
const recipeId = computed(() => route.params.id as string)
const existingRecipe = computed(() =>
  isEditMode.value ? store.getById(recipeId.value) : undefined
)
const notFound = computed(() => isEditMode.value && !existingRecipe.value)

const duplicateSource = computed(() =>
  !isEditMode.value && route.query.duplicateFrom
    ? store.getById(route.query.duplicateFrom as string)
    : undefined
)

const name = ref(
  existingRecipe.value?.name ??
    (duplicateSource.value ? `Copy of ${duplicateSource.value.name}` : '')
)
const servings = ref(String(existingRecipe.value?.servings ?? duplicateSource.value?.servings ?? 2))
const url = ref(existingRecipe.value?.url ?? duplicateSource.value?.url ?? '')
const labels = ref<string[]>(
  existingRecipe.value?.labels
    ? [...existingRecipe.value.labels]
    : duplicateSource.value?.labels
      ? [...duplicateSource.value.labels]
      : []
)

const defaultUnitSuggestions = ['g', 'kg', 'ml', 'l']
const unitSuggestions = computed(() => {
  const counts = new Map(store.unitUsageCounts)
  for (const unit of defaultUnitSuggestions) {
    if (!counts.has(unit)) counts.set(unit, 0)
  }
  return [...counts.keys()].sort((a, b) => {
    const countDiff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    return countDiff !== 0 ? countDiff : a.localeCompare(b)
  })
})
const ingredientSuggestions = computed(() => store.knownIngredientNames)
const labelSuggestions = computed(() => store.knownLabels)

function emptyRow(): Ingredient {
  return {
    ingredient: '',
    quantity: undefined,
    unit: undefined,
    isMain: false,
    addToShoppingList: true,
  }
}

const ingredientRows = ref<Ingredient[]>(
  existingRecipe.value?.ingredients.length
    ? existingRecipe.value.ingredients.map((i) => ({ ...i }))
    : duplicateSource.value?.ingredients.length
      ? duplicateSource.value.ingredients.map((i) => ({ ...i }))
      : [emptyRow()]
)

function currentSnapshot() {
  return JSON.stringify({
    name: name.value,
    servings: servings.value,
    url: url.value,
    labels: labels.value,
    ingredientRows: ingredientRows.value,
  })
}

const initialSnapshot = currentSnapshot()
const isDirty = computed(() => currentSnapshot() !== initialSnapshot)

const allowLeave = ref(false)
const showLeaveDialog = ref(false)
const pendingRoute = ref<string | null>(null)

onBeforeRouteLeave((to) => {
  if (allowLeave.value || !isDirty.value) return true
  pendingRoute.value = to.fullPath
  showLeaveDialog.value = true
  return false
})

function confirmLeave() {
  showLeaveDialog.value = false
  allowLeave.value = true
  if (pendingRoute.value) router.push(pendingRoute.value)
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (!isDirty.value) return
  e.preventDefault()
  e.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))

const addIngredientBtnRef = ref<{ $el: HTMLElement } | null>(null)

async function addIngredientRow() {
  ingredientRows.value.push(emptyRow())
  await nextTick()
  await nextTick()
  const btn = addIngredientBtnRef.value?.$el as HTMLElement | undefined
  if (!btn) return
  btn.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
}

/**
 * The Main / Shop toggles are rendered as a chip group, which models selection as a list of
 * values, so the two booleans are projected in and out of that shape.
 */
function rowFlags(row: { isMain: boolean; addToShoppingList: boolean }) {
  const flags: string[] = []
  if (row.isMain) flags.push('main')
  if (row.addToShoppingList) flags.push('shop')
  return flags
}

function setRowFlags(row: { isMain: boolean; addToShoppingList: boolean }, flags: string[]) {
  row.isMain = flags.includes('main')
  row.addToShoppingList = flags.includes('shop')
}

function removeIngredientRow(index: number) {
  ingredientRows.value.splice(index, 1)
  if (ingredientRows.value.length === 0) ingredientRows.value.push(emptyRow())
}

function save() {
  if (!name.value.trim()) return
  const ingredients: Ingredient[] = ingredientRows.value
    .filter((row) => row.ingredient.trim())
    .map((row) => ({
      ingredient: row.ingredient.trim(),
      quantity:
        row.quantity != null && !Number.isNaN(Number(row.quantity))
          ? Number(row.quantity)
          : undefined,
      unit: row.unit?.trim() || undefined,
      isMain: row.isMain,
      addToShoppingList: row.addToShoppingList,
    }))

  const seen = new Set<string>()
  const cleanedLabels: string[] = []
  for (const label of labels.value) {
    const trimmed = label.trim()
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed)
      cleanedLabels.push(trimmed)
    }
  }

  const payload = {
    name: name.value.trim(),
    ingredients,
    labels: cleanedLabels,
    servings: parseInt(servings.value, 10) || 1,
    url: url.value.trim() || undefined,
  }

  allowLeave.value = true

  if (isEditMode.value && existingRecipe.value) {
    store.updateRecipe(existingRecipe.value.id, payload)
    if (window.history.state?.back) {
      router.back()
    } else {
      router.replace({ name: 'recipe-detail', params: { id: existingRecipe.value.id } })
    }
  } else {
    const created = store.addRecipe(payload)
    router.replace({ name: 'recipe-detail', params: { id: created.id } })
  }
}
</script>

<template>
  <v-container>
    <v-btn variant="text" :prepend-icon="mdiArrowLeft" class="mb-4 px-0" @click="router.back()">
      Back
    </v-btn>

    <template v-if="!notFound">
      <h1 class="text-h6 mb-4">
        {{ isEditMode ? 'Edit Recipe' : 'Add Recipe' }}
      </h1>

      <v-form @submit.prevent="save">
        <v-text-field
          v-model="name"
          label="Name"
          placeholder="Recipe name"
          required
          data-testid="recipe-name"
        />

        <v-combobox
          v-model="labels"
          :items="labelSuggestions"
          label="Labels"
          placeholder="Add a label"
          multiple
          chips
          closable-chips
          menu-icon=""
          hide-details="auto"
          class="mb-4"
          data-testid="recipe-labels"
        >
          <template #chip="{ props: chipProps }">
            <v-chip v-bind="chipProps" color="primary" />
          </template>
        </v-combobox>

        <h2 class="text-subtitle-1 font-weight-bold mb-2">Ingredients</h2>
        <template v-for="(row, index) in ingredientRows" :key="index">
          <!-- Each ingredient is its own tonal surface rather than divider-separated rows: on a
               phone the previous layout crammed a 3/3/6 grid, two compact checkboxes and a
               delete button onto one line, all below the 48dp touch target minimum. -->
          <v-card variant="tonal" class="mb-3 pa-3" data-testid="ingredient-row">
            <v-row density="compact">
              <v-col cols="3">
                <v-text-field
                  v-model.number="row.quantity"
                  label="Qty"
                  type="number"
                  min="0"
                  step="any"
                  density="compact"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="3">
                <v-combobox
                  v-model="row.unit"
                  :items="unitSuggestions"
                  label="Unit"
                  menu-icon=""
                  density="compact"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="6">
                <v-combobox
                  v-model="row.ingredient"
                  :items="ingredientSuggestions"
                  label="Ingredient"
                  placeholder="e.g. Onion"
                  menu-icon=""
                  density="compact"
                  hide-details="auto"
                  data-testid="ingredient-name"
                />
              </v-col>
            </v-row>
            <div class="d-flex align-center ga-2">
              <!-- Filter chips rather than compact checkboxes: larger targets, and the M3
                   pattern for a small set of independent toggles. -->
              <v-chip-group
                :model-value="rowFlags(row)"
                multiple
                filter
                class="pa-0"
                @update:model-value="(flags) => setRowFlags(row, flags as string[])"
              >
                <v-chip value="main" data-testid="ingredient-main">Main</v-chip>
                <v-chip value="shop" data-testid="ingredient-shop">Shop</v-chip>
              </v-chip-group>
              <v-spacer />
              <v-btn
                :icon="mdiDelete"
                size="small"
                variant="text"
                color="error"
                :aria-label="`Remove ingredient ${index + 1}`"
                data-testid="remove-ingredient"
                @click="removeIngredientRow(index)"
              />
            </div>
          </v-card>
        </template>

        <v-btn
          ref="addIngredientBtnRef"
          variant="tonal"
          :prepend-icon="mdiPlus"
          class="mb-4 add-ingredient-btn"
          @click="addIngredientRow"
        >
          Add ingredient
        </v-btn>

        <v-text-field
          v-model="servings"
          label="Servings"
          type="number"
          min="1"
          data-testid="recipe-servings"
        />
        <v-text-field
          v-model="url"
          label="Recipe URL (optional)"
          placeholder="https://..."
          type="url"
          data-testid="recipe-url"
        />
        <v-btn type="submit" color="primary" block>Save</v-btn>
      </v-form>
    </template>

    <p v-else class="text-body-2 text-medium-emphasis font-italic">Recipe not found.</p>

    <v-dialog v-model="showLeaveDialog" max-width="400">
      <v-card>
        <v-card-title>Unsaved changes</v-card-title>
        <v-card-text>You have unsaved changes. Leave without saving?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLeaveDialog = false">Stay</v-btn>
          <v-btn color="error" variant="text" data-testid="confirm-leave" @click="confirmLeave">
            Leave
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
/* Keeps the button clear of the bottom navigation when a new row scrolls it into view.
   --v-layout-bottom is published by Vuetify's layout and tracks whatever bottom chrome is
   mounted, so this stays correct when the layout switches to a rail or drawer. */
.add-ingredient-btn {
  scroll-margin-bottom: calc(var(--v-layout-bottom, 0px) + 16px);
}
</style>
