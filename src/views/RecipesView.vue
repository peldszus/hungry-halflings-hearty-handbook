<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipesStore } from '@/stores/recipes'
import { highlightInfixMatches } from '@/utils/highlight'

const router = useRouter()
const store = useRecipesStore()

const searchText = ref('')

const displayedRecipes = computed(() => {
  if (!searchText.value.trim()) {
    return store.recentRecipes
  }
  return store.recentRecipes.filter((r) =>
    r.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

function recipeSubtitle(recipe: { servings: number; ingredients: string[] }) {
  return `${recipe.servings} servings${recipe.ingredients.length ? ' · ' + recipe.ingredients.join(', ') : ''}`
}
</script>

<template>
  <v-container>
    <h1 class="text-h4 text-primary mb-4">Recipes</h1>

    <v-text-field
      v-model="searchText"
      label="Search recipes"
      placeholder="Search by name"
      prepend-inner-icon="mdi-magnify"
      density="compact"
      variant="outlined"
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
          :subtitle="recipeSubtitle(recipe)"
          @click="router.push({ name: 'recipe-detail', params: { id: recipe.id } })"
        >
          <template #title>
            <span
              v-for="(seg, i) in highlightInfixMatches(recipe.name, searchText)"
              :key="i"
              :class="{ 'search-match': seg.matched }"
              >{{ seg.text }}</span
            >
            <v-chip v-if="recipe.archived" size="x-small" variant="tonal" class="ml-2"
              >Archived</v-chip
            >
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-btn
      icon="mdi-plus"
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
  bottom: 80px;
  right: 16px;
}
.search-match {
  font-weight: 600;
  background: rgba(var(--v-theme-primary), 0.15);
}
</style>
