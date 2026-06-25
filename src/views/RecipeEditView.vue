<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const name = ref(existingRecipe.value?.name ?? '')
const servings = ref(String(existingRecipe.value?.servings ?? 2))
const url = ref(existingRecipe.value?.url ?? '')

const unitSuggestions = ['g', 'kg', 'ml', 'l']

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
    : [emptyRow()]
)

const addIngredientBtnRef = ref<{ $el: HTMLElement } | null>(null)

async function addIngredientRow() {
  ingredientRows.value.push(emptyRow())
  await nextTick()
  await nextTick()
  const btn = addIngredientBtnRef.value?.$el as HTMLElement | undefined
  if (!btn) return
  const bottomNav = document.querySelector('.v-bottom-navigation')
  const bottomNavHeight = bottomNav?.getBoundingClientRect().height ?? 0
  btn.style.scrollMarginBottom = `${bottomNavHeight + 16}px`
  btn.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
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

  const payload = {
    name: name.value.trim(),
    ingredients,
    servings: parseInt(servings.value, 10) || 1,
    url: url.value.trim() || undefined,
  }

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
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4 px-0" @click="router.back()">
      Back
    </v-btn>

    <template v-if="!notFound">
      <h1 class="text-h5 text-primary mb-4">
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

        <h2 class="text-subtitle-1 font-weight-bold mb-2">Ingredients</h2>
        <v-card
          v-for="(row, index) in ingredientRows"
          :key="index"
          variant="outlined"
          class="mb-3 pa-3"
        >
          <v-row density="compact">
            <v-col cols="2">
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
            <v-col cols="4">
              <v-combobox
                v-model="row.unit"
                :items="unitSuggestions"
                label="Unit"
                clearable
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="row.ingredient"
                label="Ingredient"
                placeholder="e.g. Onion"
                density="compact"
                hide-details="auto"
              />
            </v-col>
          </v-row>
          <div class="d-flex align-center ga-4">
            <v-checkbox
              v-model="row.isMain"
              label="Main"
              hide-details
              density="compact"
              class="text-caption flex-grow-0"
            />
            <v-checkbox
              v-model="row.addToShoppingList"
              label="Shop"
              hide-details
              density="compact"
              class="text-caption flex-grow-0"
            />
            <v-spacer />
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              @click="removeIngredientRow(index)"
            />
          </div>
        </v-card>

        <v-btn
          ref="addIngredientBtnRef"
          variant="tonal"
          prepend-icon="mdi-plus"
          class="mb-4"
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
  </v-container>
</template>
