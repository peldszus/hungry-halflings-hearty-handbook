<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { mdiMagnify, mdiStar, mdiPlus } from '@mdi/js'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { highlightInfixMatches } from '@/utils/highlight'
import { formatLastUsedLabel } from '@/utils/relativeTime'

const router = useRouter()
const store = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const searchText = ref('')

const displayedRecipes = computed(() => {
  if (!searchText.value.trim()) {
    return store.recentRecipes
  }
  const q = searchText.value.toLowerCase()
  return store.recentRecipes.filter(
    (r) =>
      r.name.toLowerCase().includes(q) || (r.labels ?? []).some((l) => l.toLowerCase().includes(q))
  )
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

    <v-text-field
      v-model="searchText"
      label="Search recipes"
      placeholder="Search by name"
      :prepend-inner-icon="mdiMagnify"
      density="compact"
      clearable
      hide-details
      class="mb-4"
    />

    <v-card>
      <v-card-title>
        {{ searchText.trim() ? 'Results' : 'Recently Edited' }} ({{ displayedRecipes.length }})
      </v-card-title>
      <v-card-text v-if="displayedRecipes.length === 0" class="text-medium-emphasis font-italic">
        {{
          searchText.trim() ? 'No recipes match your search.' : 'No recipes yet. Tap + to add one.'
        }}
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

    <v-btn
      :icon="mdiPlus"
      color="primary"
      class="fab"
      size="large"
      elevation="4"
      @click="router.push({ name: 'recipe-new' })"
    />
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
