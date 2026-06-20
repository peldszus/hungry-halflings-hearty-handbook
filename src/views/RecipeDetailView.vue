<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecipesStore } from '@/stores/recipes'

const route = useRoute()
const router = useRouter()
const recipesStore = useRecipesStore()

const recipe = computed(() => recipesStore.getById(route.params.id as string))

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
</script>

<template>
  <v-container>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4 px-0" @click="router.back()">
      Back
    </v-btn>

    <template v-if="recipe">
      <div class="d-flex align-center gap-2 mb-2">
        <h1 class="text-h5 text-primary">{{ recipe.name }}</h1>
        <v-chip v-if="recipe.archived" size="small" variant="tonal">Archived</v-chip>
      </div>
      <div class="d-flex gap-2 mb-4">
        <v-btn
          icon="mdi-pencil"
          variant="tonal"
          @click="router.push({ name: 'recipe-edit', params: { id: recipe.id } })"
        />
        <v-btn
          :icon="recipe.archived ? 'mdi-archive-arrow-up' : 'mdi-archive-arrow-down'"
          variant="tonal"
          @click="toggleArchive"
        />
        <v-btn icon="mdi-delete" variant="tonal" color="error" @click="deleteRecipe" />
      </div>
      <p class="text-body-2 text-medium-emphasis mb-2">
        {{ recipe.servings }} servings · Last edited
        {{ new Date(recipe.lastEditedAt).toLocaleDateString() }}
      </p>
      <p v-if="recipe.url" class="mb-6">
        <a :href="recipe.url" target="_blank" rel="noopener noreferrer">{{ recipe.url }}</a>
      </p>

      <h2 class="text-subtitle-1 font-weight-bold mb-2">Ingredients</h2>
      <v-list v-if="recipe.ingredients.length" lines="one">
        <v-list-item
          v-for="ingredient in recipe.ingredients"
          :key="ingredient"
          :title="ingredient"
          prepend-icon="mdi-circle-small"
        />
      </v-list>
      <p v-else class="text-body-2 text-medium-emphasis font-italic">No ingredients listed.</p>
    </template>

    <p v-else class="text-body-2 text-medium-emphasis font-italic">Recipe not found.</p>
  </v-container>
</template>
