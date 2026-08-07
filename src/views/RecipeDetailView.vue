<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
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
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useRecipesStore, type Ingredient } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { formatRelativeTime } from '@/utils/relativeTime'
import { useSnackbar } from '@/composables/useSnackbar'

// Configure marked for safe output
marked.setOptions({
  breaks: true,
  gfm: true,
})

function sanitizeMarkdown(text: string): string {
  const html = marked.parse(text)
  if (typeof html === 'string') {
    return DOMPurify.sanitize(html)
  }
  return ''
}

const route = useRoute()
const router = useRouter()
const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()
const { visible: snackbarVisible, showUndo } = useSnackbar()

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

/**
 * Deletes straight away rather than asking first. The undo snackbar makes this reversible, and
 * Material confirms a reversible action after the fact instead of blocking it beforehand.
 */
function deleteRecipe() {
  if (!recipe.value) return

  // Snapshot before removal so the undo action can restore it with its original id, which
  // keeps any meal-plan entries pointing at this recipe working.
  const removed = { ...recipe.value, ingredients: [...recipe.value.ingredients] }
  recipesStore.removeRecipe(removed.id)
  router.push({ name: 'recipes' })
  showUndo(`Deleted “${removed.name}”`, () => recipesStore.restoreRecipe(removed))
}

function toggleArchive() {
  if (!recipe.value) return
  const { id, name, archived } = recipe.value

  if (archived) {
    recipesStore.unarchiveRecipe(id)
    showUndo(`Unarchived “${name}”`, () => recipesStore.archiveRecipe(id))
  } else {
    recipesStore.archiveRecipe(id)
    showUndo(`Archived “${name}”`, () => recipesStore.unarchiveRecipe(id))
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

const notesHtml = computed(() => {
  if (!recipe.value?.notes) return ''
  return sanitizeMarkdown(recipe.value.notes)
})
</script>

<template>
  <template v-if="recipe">
    <v-container>
      <div class="d-flex align-center mb-2">
        <h1 class="text-h6 flex-grow-1">{{ recipe.name }}</h1>
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
              @click="deleteRecipe"
            />
          </v-list>
        </v-menu>
      </div>

      <v-chip v-if="recipe.archived" class="mb-4">Archived</v-chip>

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
      <v-list v-if="recipe.ingredients.length" lines="two" class="ingredient-list">
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

      <template v-if="notesHtml">
        <h2 class="text-subtitle-1 font-weight-bold mb-2 mt-6">Notes</h2>
        <div class="notes-container rounded-lg px-4 py-3 mb-16">
          <div class="notes-content">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="notesHtml" />
          </div>
        </div>
      </template>
    </v-container>

    <v-btn
      :icon="mdiPencil"
      color="primary"
      class="fab"
      :class="{ 'fab--raised': snackbarVisible }"
      size="large"
      elevation="4"
      data-testid="edit-recipe"
      @click="router.push({ name: 'recipe-edit', params: { id: recipe.id } })"
    />
  </template>

  <p v-else class="text-body-2 text-medium-emphasis font-italic pa-4">Recipe not found.</p>
</template>

<style scoped>
/* Notes container — tonal background with left accent bar for visual distinction */
.notes-container {
  background: rgb(var(--v-theme-surface-container-low));
  border-left: 4px solid rgb(var(--v-theme-primary));
}

/* Vuetify pads the item out to a fixed "two-line" min-height and then centers both the
   prepend icon and the content block within that full height. Rows without a chip line
   are shorter than that reserved height, so centering left their (also centered) title
   text out of line with a top-pinned bullet. Top-aligning both the icon and the content
   keeps the bullet flush with the first line no matter how tall the row ends up being. */
.ingredient-list :deep(.v-list-item__prepend),
.ingredient-list :deep(.v-list-item__content) {
  align-self: flex-start;
}

/* Vuetify's default gap after a prepended icon (32px) is sized for a full avatar; this
   bullet is much smaller, so tighten the gap to the text. */
.ingredient-list {
  --v-list-prepend-gap: 12px;
}

/* Let a long ingredient name wrap across lines instead of being clipped with an
   ellipsis — the bullet stays pinned to the first line either way. */
.ingredient-list :deep(.v-list-item-title) {
  white-space: normal;
}

/* Markdown content styling */
.notes-content :deep(h1),
.notes-content :deep(h2),
.notes-content :deep(h3) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.notes-content :deep(p) {
  margin-bottom: 0.75em;
}

.notes-content :deep(ul),
.notes-content :deep(ol) {
  margin-bottom: 0.75em;
  padding-left: 1.5em;
}

.notes-content :deep(li) {
  margin-bottom: 0.25em;
}

.notes-content :deep(code) {
  font-family: monospace;
  background: rgba(var(--v-theme-surface-container-highest));
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
}

.notes-content :deep(pre) {
  background: rgba(var(--v-theme-surface-container-highest));
  padding: 0.75em;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 0.75em;
}

.notes-content :deep(pre code) {
  background: none;
  padding: 0;
}

.notes-content :deep(a) {
  color: rgb(var(--v-theme-primary));
}
</style>
