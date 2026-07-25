<script setup lang="ts">
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-2">Meal Planner</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Plan your meals, manage recipes, and build your shopping lists.
    </p>

    <v-row class="mb-6">
      <v-col cols="6">
        <v-card variant="outlined" class="text-center">
          <v-card-text>
            <div class="text-h3 text-primary font-weight-bold">{{ recipesStore.recipeCount }}</div>
            <div class="text-caption text-medium-emphasis">Recipes</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6">
        <v-card variant="outlined" class="text-center">
          <v-card-text>
            <div class="text-h3 text-primary font-weight-bold">
              {{ mealPlanStore.entries.length }}
            </div>
            <div class="text-caption text-medium-emphasis">Planned Meals</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="primary" to="/recipes">
          <v-card-title>Recipes</v-card-title>
          <v-card-text>Browse and manage your recipe collection.</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="primary" to="/meal-plan">
          <v-card-title>Meal Plan</v-card-title>
          <v-card-text>Assign recipes to days in your weekly plan.</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="primary" to="/shopping-list">
          <v-card-title>Shopping List</v-card-title>
          <v-card-text>Generate a shopping list from your meal plan.</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
