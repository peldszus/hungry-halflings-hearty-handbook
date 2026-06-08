<script setup lang="ts">
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()
</script>

<template>
  <div class="home">
    <h1>Meal Planner</h1>
    <p class="subtitle">Plan your meals, manage recipes, and build your shopping lists.</p>

    <div class="stats">
      <div class="stat-card">
        <span class="stat-number">{{ recipesStore.recipeCount }}</span>
        <span class="stat-label">Recipes</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ mealPlanStore.entries.length }}</span>
        <span class="stat-label">Planned Meals</span>
      </div>
    </div>

    <div class="quick-links">
      <RouterLink to="/recipes" class="link-card">
        <h2>Recipes</h2>
        <p>Browse and manage your recipe collection.</p>
      </RouterLink>
      <RouterLink to="/meal-plan" class="link-card">
        <h2>Meal Plan</h2>
        <p>Assign recipes to days in your weekly plan.</p>
      </RouterLink>
      <RouterLink to="/shopping-list" class="link-card">
        <h2>Shopping List</h2>
        <p>Generate a shopping list from your meal plan.</p>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 1rem 0;
}

h1 {
  font-size: 2rem;
  color: #4a9c6f;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #4a9c6f;
}

.stat-label {
  color: #666;
  font-size: 0.875rem;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.link-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.link-card:hover {
  border-color: #4a9c6f;
  box-shadow: 0 2px 8px rgba(74, 156, 111, 0.15);
}

.link-card h2 {
  color: #4a9c6f;
  margin-bottom: 0.5rem;
}

.link-card p {
  color: #666;
  font-size: 0.875rem;
}
</style>
