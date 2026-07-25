<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { mdiMagnify, mdiStar, mdiPlus, mdiArchiveOutline } from '@mdi/js'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { highlightInfixMatches } from '@/utils/highlight'
import { formatLastUsedLabel } from '@/utils/relativeTime'

const router = useRouter()
const store = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const searchText = ref('')

// Filter chips. Archived recipes were previously mixed into the list with only a chip to tell
// them apart, so they are hidden unless explicitly asked for.
//
// Selection is held as a flat list of tokens driven by a v-chip-group. VChip's own model-value
// controls whether the chip is *rendered* (it is the closable-chip mechanism), so it cannot be
// used to express selected state — an unselected chip would vanish.
const LABEL_PREFIX = 'label:'

const activeFilters = ref<string[]>([])

const favouritesOnly = computed(() => activeFilters.value.includes('favourite'))
const showArchived = computed(() => activeFilters.value.includes('archived'))
const selectedLabels = computed(() =>
  activeFilters.value
    .filter((token) => token.startsWith(LABEL_PREFIX))
    .map((token) => token.slice(LABEL_PREFIX.length))
)

const hasFilters = computed(() => activeFilters.value.length > 0)

function clearFilters() {
  activeFilters.value = []
}

const displayedRecipes = computed(() => {
  const q = searchText.value.trim().toLowerCase()

  return store.recentRecipes.filter((r) => {
    if (!showArchived.value && r.archived) return false
    if (favouritesOnly.value && !r.favourite) return false
    if (selectedLabels.value.length && !selectedLabels.value.every((l) => r.labels?.includes(l))) {
      return false
    }
    if (!q) return true
    return (
      r.name.toLowerCase().includes(q) || (r.labels ?? []).some((l) => l.toLowerCase().includes(q))
    )
  })
})

const listTitle = computed(() => {
  if (searchText.value.trim() || hasFilters.value) return 'Results'
  return 'Recently Edited'
})

const emptyMessage = computed(() => {
  if (store.recipeCount === 0) return 'No recipes yet.'
  if (searchText.value.trim() || hasFilters.value) return 'No recipes match your filters.'
  return 'No recipes yet.'
})

function lastUsedLabel(recipeId: string) {
  return formatLastUsedLabel(
    mealPlanStore.getLastUsedDate(recipeId),
    mealPlanStore.getNextPlannedDate(recipeId)
  )
}
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-4">Recipes</h1>

    <!-- M3 search bar: filled, fully rounded, no floating label. -->
    <v-text-field
      v-model="searchText"
      placeholder="Search recipes"
      aria-label="Search recipes"
      :prepend-inner-icon="mdiMagnify"
      variant="solo-filled"
      rounded="pill"
      flat
      density="comfortable"
      clearable
      hide-details
      class="mb-3"
    />

    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-chip-group v-model="activeFilters" multiple filter column class="flex-grow-1 pa-0">
        <v-chip :prepend-icon="mdiStar" value="favourite" data-testid="filter-favourites">
          Favourites
        </v-chip>
        <v-chip :prepend-icon="mdiArchiveOutline" value="archived" data-testid="filter-archived">
          Archived
        </v-chip>
        <v-chip
          v-for="label in store.knownLabels"
          :key="label"
          :value="`${LABEL_PREFIX}${label}`"
          color="primary"
        >
          {{ label }}
        </v-chip>
      </v-chip-group>
      <v-btn v-if="hasFilters" variant="text" size="small" @click="clearFilters">Clear</v-btn>
    </div>

    <v-card>
      <v-card-title>{{ listTitle }} ({{ displayedRecipes.length }})</v-card-title>
      <v-card-text v-if="displayedRecipes.length === 0" class="text-medium-emphasis font-italic">
        {{ emptyMessage }}
      </v-card-text>
      <v-list v-else>
        <v-list-item
          v-for="recipe in displayedRecipes"
          :key="recipe.id"
          @click="router.push({ name: 'recipe-detail', params: { id: recipe.id } })"
        >
          <template #title>
            <span
              v-for="(seg, i) in highlightInfixMatches(recipe.name, searchText)"
              :key="i"
              :class="{ 'search-match': seg.matched }"
              >{{ seg.text }}</span
            >
            <v-icon
              v-if="recipe.favourite"
              :icon="mdiStar"
              color="yellow-darken-2"
              size="small"
              class="ml-2"
            />
            <v-chip v-if="recipe.archived" size="x-small" class="ml-2">Archived</v-chip>
          </template>
          <template #subtitle>
            <span class="last-used text-disabled">{{ lastUsedLabel(recipe.id) }}</span>
          </template>
          <div v-if="(recipe.labels ?? []).length" class="d-flex flex-wrap ga-1 mt-1">
            <v-chip v-for="label in recipe.labels" :key="label" size="x-small" color="primary">
              {{ label }}
            </v-chip>
          </div>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Extended while the collection is empty, so the primary action explains itself on first
         run; collapses to an icon FAB once there are recipes to look at. -->
    <v-btn
      :icon="store.recipeCount > 0 ? mdiPlus : undefined"
      :prepend-icon="store.recipeCount > 0 ? undefined : mdiPlus"
      color="primary"
      class="fab"
      size="large"
      elevation="4"
      aria-label="Add recipe"
      data-testid="add-recipe"
      @click="router.push({ name: 'recipe-new' })"
    >
      <template v-if="store.recipeCount === 0">New recipe</template>
    </v-btn>
  </v-container>
</template>

<style scoped>
.fab {
  position: fixed;
  /* --v-layout-bottom is published by Vuetify's layout on v-main and is the height of whatever
     bottom chrome is currently mounted, so the FAB clears the navigation bar on a phone and
     sits flush at the viewport edge once the layout switches to a rail or drawer. */
  bottom: calc(var(--v-layout-bottom, 0px) + 16px + env(safe-area-inset-bottom, 0px));
  right: 16px;
}
</style>
