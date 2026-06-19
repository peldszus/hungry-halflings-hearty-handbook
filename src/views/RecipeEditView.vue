<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecipesStore } from '@/stores/recipes'

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
const ingredients = ref(existingRecipe.value?.ingredients.join(', ') ?? '')
const servings = ref(String(existingRecipe.value?.servings ?? 2))

function save() {
  if (!name.value.trim()) return
  const payload = {
    name: name.value.trim(),
    ingredients: ingredients.value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean),
    servings: parseInt(servings.value, 10) || 1,
  }

  if (isEditMode.value && existingRecipe.value) {
    store.updateRecipe(existingRecipe.value.id, payload)
    router.push({ name: 'recipe-detail', params: { id: existingRecipe.value.id } })
  } else {
    store.addRecipe(payload)
    const created = store.recentRecipes[0]
    router.push({ name: 'recipe-detail', params: { id: created.id } })
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
        <v-text-field v-model="name" label="Name" placeholder="Recipe name" required />
        <v-text-field
          v-model="ingredients"
          label="Ingredients"
          placeholder="Comma-separated ingredients"
        />
        <v-text-field v-model="servings" label="Servings" type="number" min="1" />
        <v-btn type="submit" color="primary" block>Save</v-btn>
      </v-form>
    </template>

    <p v-else class="text-body-2 text-medium-emphasis font-italic">Recipe not found.</p>
  </v-container>
</template>
