<script setup lang="ts">
import { computed, ref } from 'vue'
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
  mdiDotsVertical,
  mdiOpenInNew,
  mdiSilverwareForkKnife,
  mdiCalendarClock,
  mdiCalendarCheck,
  mdiClockEditOutline,
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

const showDeleteDialog = ref(false)

function confirmDeleteRecipe() {
  showDeleteDialog.value = true
}

function deleteRecipe() {
  showDeleteDialog.value = false
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

/**
 * Metadata shown under the title. Presented as an icon + value row rather than the previous
 * stack of grey sentences, which was not a Material metadata treatment.
 */
const metadata = computed(() => {
  if (!recipe.value) return []
  const planned = totalPlannedCount.value
  return [
    {
      icon: mdiSilverwareForkKnife,
      text: `${recipe.value.servings} ${recipe.value.servings === 1 ? 'serving' : 'servings'}`,
    },
    { icon: mdiCalendarCheck, text: lastUsedLabel.value },
    { icon: mdiCalendarClock, text: nextPlannedLabel.value },
    {
      icon: mdiClockEditOutline,
      text: `Planned ${planned} ${planned === 1 ? 'time' : 'times'} in total`,
    },
  ]
})

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
        <h1 class="text-h6">{{ recipe.name }}</h1>
        <v-chip v-if="recipe.archived">Archived</v-chip>
      </div>
      <!--
        Editing is the primary action here, so it gets a filled button with a visible label.
        Favouriting is a state rather than an action, so it stays an icon toggle. The
        infrequent and destructive actions move into an overflow menu with text labels, which
        also stops delete sitting adjacent to archive at identical visual weight.
      -->
      <div class="d-flex align-center ga-2 mb-4">
        <v-btn
          color="primary"
          :prepend-icon="mdiPencil"
          data-testid="edit-recipe"
          @click="router.push({ name: 'recipe-edit', params: { id: recipe.id } })"
        >
          Edit
        </v-btn>

        <v-btn
          :icon="recipe.favourite ? mdiStar : mdiStarOutline"
          variant="text"
          :color="recipe.favourite ? 'yellow-darken-2' : undefined"
          :aria-label="recipe.favourite ? 'Remove from favourites' : 'Add to favourites'"
          :aria-pressed="recipe.favourite"
          data-testid="toggle-favourite"
          @click="toggleFavourite"
        >
          <v-icon :icon="recipe.favourite ? mdiStar : mdiStarOutline" />
          <v-tooltip activator="parent" location="bottom">
            {{ recipe.favourite ? 'Remove from favourites' : 'Add to favourites' }}
          </v-tooltip>
        </v-btn>

        <v-spacer />

        <v-menu>
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              :icon="mdiDotsVertical"
              variant="text"
              aria-label="More recipe actions"
              data-testid="recipe-actions"
            />
          </template>
          <v-list>
            <v-list-item
              :prepend-icon="mdiContentCopy"
              title="Duplicate"
              data-testid="duplicate-recipe"
              @click="duplicateRecipe"
            />
            <v-list-item
              :prepend-icon="recipe.archived ? mdiArchiveArrowUp : mdiArchiveArrowDown"
              :title="recipe.archived ? 'Unarchive' : 'Archive'"
              data-testid="toggle-archive"
              @click="toggleArchive"
            />
            <v-divider class="my-1" />
            <v-list-item
              :prepend-icon="mdiDelete"
              title="Delete"
              base-color="error"
              data-testid="delete-recipe"
              @click="confirmDeleteRecipe"
            />
          </v-list>
        </v-menu>
      </div>

      <div class="d-flex flex-column ga-1 mb-4">
        <div
          v-for="item in metadata"
          :key="item.text"
          class="d-flex align-center ga-2 text-body-2 text-medium-emphasis"
        >
          <v-icon :icon="item.icon" size="small" />
          <span>{{ item.text }}</span>
        </div>
      </div>

      <v-btn
        v-if="recipe.url"
        :href="recipe.url"
        target="_blank"
        rel="noopener noreferrer"
        variant="tonal"
        size="small"
        :append-icon="mdiOpenInNew"
        class="mb-6"
      >
        Open recipe source
      </v-btn>

      <div v-if="(recipe.labels ?? []).length" class="d-flex flex-wrap ga-2 mb-6">
        <v-chip v-for="label in recipe.labels" :key="label" color="primary">
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
          <!-- The chips previously sat inside v-list-item-title, which truncates with an
               ellipsis, so a long ingredient name clipped them off the right edge. They now
               wrap onto their own line. -->
          <v-list-item-title>{{ ingredientLabel(ingredient) }}</v-list-item-title>
          <div
            v-if="ingredient.isMain || ingredient.addToShoppingList"
            class="d-flex flex-wrap ga-1 mt-1"
          >
            <v-chip v-if="ingredient.isMain" size="x-small" color="primary">Main</v-chip>
            <v-chip
              v-if="ingredient.addToShoppingList"
              size="x-small"
              color="secondary"
              :prepend-icon="mdiCart"
            >
              Shopping
            </v-chip>
          </div>
        </v-list-item>
      </v-list>
      <p v-else class="text-body-2 text-medium-emphasis font-italic">No ingredients listed.</p>
    </template>

    <p v-else class="text-body-2 text-medium-emphasis font-italic">Recipe not found.</p>

    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete recipe?</v-card-title>
        <v-card-text>This can't be undone.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="text" data-testid="confirm-delete" @click="deleteRecipe">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
