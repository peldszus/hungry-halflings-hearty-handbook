<script setup lang="ts">
import { ref } from 'vue'
import { useRecipesStore } from '@/stores/recipes'

const store = useRecipesStore()

const newName = ref('')
const newIngredients = ref('')
const newServings = ref('2')

function addRecipe() {
  if (!newName.value.trim()) return
  store.addRecipe({
    name: newName.value.trim(),
    ingredients: newIngredients.value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean),
    servings: parseInt(newServings.value, 10) || 1,
  })
  newName.value = ''
  newIngredients.value = ''
  newServings.value = '2'
}
</script>

<template>
  <v-container>
    <h1 class="text-h4 text-primary mb-4">Recipes</h1>

    <v-card class="mb-4">
      <v-card-title>Add Recipe</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="addRecipe">
          <v-text-field v-model="newName" label="Name" placeholder="Recipe name" required />
          <v-text-field
            v-model="newIngredients"
            label="Ingredients"
            placeholder="Comma-separated ingredients"
          />
          <v-text-field v-model="newServings" label="Servings" type="number" min="1" />
          <v-btn type="submit" color="primary" block>Add Recipe</v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>Your Recipes ({{ store.recipeCount }})</v-card-title>
      <v-card-text v-if="store.recipeCount === 0" class="text-medium-emphasis font-italic">
        No recipes yet. Add your first recipe above.
      </v-card-text>
      <v-list v-else>
        <v-list-item
          v-for="recipe in store.recipes"
          :key="recipe.id"
          :title="recipe.name"
          :subtitle="`${recipe.servings} servings${recipe.ingredients.length ? ' · ' + recipe.ingredients.join(', ') : ''}`"
        >
          <template #append>
            <v-btn
              icon="mdi-delete"
              variant="text"
              color="error"
              @click="store.removeRecipe(recipe.id)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>
