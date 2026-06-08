<script setup lang="ts">
import { ref } from 'vue'
import { useRecipesStore } from '@/stores/recipes'

const store = useRecipesStore()

const newName = ref('')
const newIngredients = ref('')
const newServings = ref(2)

function addRecipe() {
  if (!newName.value.trim()) return
  store.addRecipe({
    name: newName.value.trim(),
    ingredients: newIngredients.value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean),
    servings: newServings.value,
  })
  newName.value = ''
  newIngredients.value = ''
  newServings.value = 2
}
</script>

<template>
  <div class="recipes">
    <h1>Recipes</h1>

    <section class="add-recipe">
      <h2>Add Recipe</h2>
      <form @submit.prevent="addRecipe">
        <div class="form-group">
          <label for="name">Name</label>
          <input id="name" v-model="newName" type="text" placeholder="Recipe name" required />
        </div>
        <div class="form-group">
          <label for="ingredients">Ingredients</label>
          <input
            id="ingredients"
            v-model="newIngredients"
            type="text"
            placeholder="Comma-separated ingredients"
          />
        </div>
        <div class="form-group">
          <label for="servings">Servings</label>
          <input id="servings" v-model.number="newServings" type="number" min="1" />
        </div>
        <button type="submit">Add Recipe</button>
      </form>
    </section>

    <section class="recipe-list">
      <h2>Your Recipes ({{ store.recipeCount }})</h2>
      <p v-if="store.recipeCount === 0" class="empty">
        No recipes yet. Add your first recipe above.
      </p>
      <ul v-else>
        <li v-for="recipe in store.recipes" :key="recipe.id" class="recipe-item">
          <div class="recipe-info">
            <strong>{{ recipe.name }}</strong>
            <span class="servings">{{ recipe.servings }} servings</span>
            <span v-if="recipe.ingredients.length" class="ingredients">
              {{ recipe.ingredients.join(', ') }}
            </span>
          </div>
          <button class="remove-btn" @click="store.removeRecipe(recipe.id)">Remove</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.recipes {
  padding: 1rem 0;
}

h1 {
  font-size: 2rem;
  color: #4a9c6f;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
}

section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #4a9c6f;
}

button[type='submit'] {
  background: #4a9c6f;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

button[type='submit']:hover {
  background: #3d8460;
}

.empty {
  color: #999;
  font-style: italic;
}

ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recipe-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  gap: 1rem;
}

.recipe-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.servings {
  font-size: 0.875rem;
  color: #666;
}

.ingredients {
  font-size: 0.875rem;
  color: #888;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.remove-btn:hover {
  background: #c82333;
}
</style>
