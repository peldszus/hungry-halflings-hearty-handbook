<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecipesStore } from '@/stores/recipes'

const route = useRoute()
const router = useRouter()
const recipesStore = useRecipesStore()

const recipe = computed(() => recipesStore.getById(route.params.id as string))
</script>

<template>
  <v-container>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4 px-0" @click="router.back()">
      Back
    </v-btn>

    <template v-if="recipe">
      <h1 class="text-h5 text-primary mb-1">{{ recipe.name }}</h1>
      <p class="text-body-2 text-medium-emphasis mb-6">{{ recipe.servings }} servings</p>

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
