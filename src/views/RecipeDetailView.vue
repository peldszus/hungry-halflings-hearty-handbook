<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  mdiArrowLeft,
  mdiPencil,
  mdiContentCopy,
  mdiStar,
  mdiStarOutline,
  mdiArchiveArrowUp,
  mdiArchiveArrowDown,
  mdiDelete,
  mdiCircleSmall,
  mdiCart,
} from '@mdi/js'
import { useRecipesStore, type Ingredient } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { formatRelativeTime } from '@/utils/relativeTime'

const route = useRoute()
const router = useRouter()
const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const recipe = computed(() => recipesStore.getById(route.params.id as string))

const lastUsedLabel = computed(() => {
  if (!recipe.value) return ''
  const date = mealPlanStore.getLastUsedDate(recipe.value.id)
  return date ? `Last used ${formatRelativeTime(date)}` : 'Never used'
})

const nextPlannedLabel = computed(() => {
  if (!recipe.value) return ''
  const date = mealPlanStore.getNextPlannedDate(recipe.value.id)
  return date ? `Next planned for ${formatRelativeTime(date)}` : 'Nothing planned'
})

const totalPlannedCount = computed(() => {
  if (!recipe.value) return 0
  return mealPlanStore.entries.filter((e) => e.recipeId === recipe.value!.id).length
})

function duplicateRecipe() {
  if (!recipe.value) return
  // Replace (not push) so the original recipe's detail page isn't left behind in the
  // history stack — otherwise "Back" from the saved duplicate would land on it instead
  // of wherever the user was before opening this recipe.
  router.replace({ name: 'recipe-new', query: { duplicateFrom: recipe.value.id } })
}

function deleteRecipe() {
  if (!recipe.value) return
  recipesStore.removeRecipe(recipe.value.id)
  router.push({ name: 'recipes' })
}

function toggleArchive() {
  if (!recipe.value) return
  if (recipe.value.archived) {
    recipesStore.unarchiveRecipe(recipe.value.id)
  } else {
    recipesStore.archiveRecipe(recipe.value.id)
  }
}

function toggleFavourite() {
  if (!recipe.value) return
  recipesStore.toggleFavourite(recipe.value.id)
}

function ingredientLabel(ingredient: Ingredient) {
  const parts: string[] = []
  if (ingredient.quantity != null) parts.push(String(ingredient.quantity))
  if (ingredient.unit) parts.push(ingredient.unit)
  parts.push(ingredient.ingredient)
  return parts.join(' ')
}
</script>

<template>
  <v-container>
    <v-btn variant="text" :prepend-icon="mdiArrowLeft" class="mb-4 px-0" @click="router.back()">
      Back
    </v-btn>

    <template v-if="recipe">
      <div class="d-flex align-center ga-2 mb-2">
        <h1 class="text-h5 text-primary">{{ recipe.name }}</h1>
        <v-chip v-if="recipe.archived" size="small" variant="tonal">Archived</v-chip>
      </div>
      <div class="d-flex ga-2 mb-4">
        <v-btn
          :icon="mdiPencil"
          variant="tonal"
          @click="router.push({ name: 'recipe-edit', params: { id: recipe.id } })"
        />
        <v-btn :icon="mdiContentCopy" variant="tonal" @click="duplicateRecipe" />
        <v-btn
          :icon="recipe.favourite ? mdiStar : mdiStarOutline"
          variant="tonal"
          :color="recipe.favourite ? 'yellow-darken-2' : undefined"
          @click="toggleFavourite"
        />
        <v-btn
          :icon="recipe.archived ? mdiArchiveArrowUp : mdiArchiveArrowDown"
          variant="tonal"
          :color="recipe.archived ? 'primary' : undefined"
          @click="toggleArchive"
        />
        <v-btn :icon="mdiDelete" variant="tonal" color="error" @click="deleteRecipe" />
      </div>
      <p class="text-body-2 text-medium-emphasis mb-2">
        {{ recipe.servings }} servings · Last edited
        {{ new Date(recipe.lastEditedAt).toLocaleDateString() }}
      </p>
      <p class="text-body-2 text-medium-emphasis mb-0">{{ lastUsedLabel }}</p>
      <p class="text-body-2 text-medium-emphasis mb-0">{{ nextPlannedLabel }}</p>
      <p class="text-body-2 text-medium-emphasis mb-2">
        Planned {{ totalPlannedCount }} {{ totalPlannedCount === 1 ? 'time' : 'times' }} in total
      </p>
      <p v-if="recipe.url" class="mb-6">
        <a :href="recipe.url" target="_blank" rel="noopener noreferrer">{{ recipe.url }}</a>
      </p>

      <div v-if="(recipe.labels ?? []).length" class="d-flex flex-wrap ga-2 mb-6">
        <v-chip
          v-for="label in recipe.labels"
          :key="label"
          size="small"
          color="primary"
          variant="tonal"
        >
          {{ label }}
        </v-chip>
      </div>

      <h2 class="text-subtitle-1 font-weight-bold mb-2">Ingredients</h2>
      <v-list v-if="recipe.ingredients.length" lines="two">
        <v-list-item
          v-for="(ingredient, index) in recipe.ingredients"
          :key="index"
          :prepend-icon="mdiCircleSmall"
        >
          <v-list-item-title>
            {{ ingredientLabel(ingredient) }}
            <v-chip
              v-if="ingredient.isMain"
              size="x-small"
              color="primary"
              variant="tonal"
              class="ml-2"
            >
              Main
            </v-chip>
            <v-chip
              v-if="ingredient.addToShoppingList"
              size="x-small"
              color="secondary"
              variant="tonal"
              :prepend-icon="mdiCart"
              class="ml-2 px-2"
            />
          </v-list-item-title>
        </v-list-item>
      </v-list>
      <p v-else class="text-body-2 text-medium-emphasis font-italic">No ingredients listed.</p>
    </template>

    <p v-else class="text-body-2 text-medium-emphasis font-italic">Recipe not found.</p>
  </v-container>
</template>
