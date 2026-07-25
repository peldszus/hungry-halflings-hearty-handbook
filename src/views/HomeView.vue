<script setup lang="ts">
import { computed } from 'vue'
import { mdiBookOpenVariant, mdiCalendarMonth, mdiCart, mdiChevronRight } from '@mdi/js'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { formatRelativeTime } from '@/utils/relativeTime'

const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const stats = computed(() => [
  { value: recipesStore.recipeCount, label: 'Recipes' },
  { value: mealPlanStore.entries.length, label: 'Planned Meals' },
])

/**
 * The next meal on the plan — the single most useful thing to surface when the app opens.
 */
const nextMeal = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = mealPlanStore.entries
    .filter((entry) => entry.recipeId && entry.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!upcoming?.recipeId) return null

  const recipe = recipesStore.getById(upcoming.recipeId)
  if (!recipe) return null

  return { name: recipe.name, id: recipe.id, when: formatRelativeTime(upcoming.date) }
})

const destinations = [
  {
    to: '/recipes',
    icon: mdiBookOpenVariant,
    title: 'Recipes',
    text: 'Browse and manage your recipe collection.',
  },
  {
    to: '/meal-plan',
    icon: mdiCalendarMonth,
    title: 'Meal Plan',
    text: 'Assign recipes to days in your weekly plan.',
  },
  {
    to: '/shopping-list',
    icon: mdiCart,
    title: 'Shopping List',
    text: 'Generate a shopping list from your meal plan.',
  },
]
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-2">Meal Planner</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Plan your meals, manage recipes, and build your shopping lists.
    </p>

    <!-- Tonal rather than outlined so the figures read as information, not as controls -
         the outlined treatment made them look tappable alongside the cards below. -->
    <v-row class="mb-6">
      <v-col v-for="stat in stats" :key="stat.label" cols="6">
        <v-card color="primary-container" class="text-center">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ stat.value }}</div>
            <div class="text-caption">{{ stat.label }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card
      v-if="nextMeal"
      class="mb-6"
      color="tertiary-container"
      :to="`/recipes/${nextMeal.id}`"
      data-testid="next-meal"
    >
      <v-card-item>
        <template #prepend>
          <v-icon :icon="mdiCalendarMonth" />
        </template>
        <v-card-subtitle class="text-caption">Next meal · {{ nextMeal.when }}</v-card-subtitle>
        <v-card-title class="text-body-1">{{ nextMeal.name }}</v-card-title>
      </v-card-item>
    </v-card>

    <v-row>
      <v-col v-for="destination in destinations" :key="destination.to" cols="12" sm="4">
        <v-card variant="tonal" color="primary" :to="destination.to">
          <v-card-item>
            <template #prepend>
              <v-icon :icon="destination.icon" />
            </template>
            <v-card-title>{{ destination.title }}</v-card-title>
            <template #append>
              <v-icon :icon="mdiChevronRight" size="small" />
            </template>
          </v-card-item>
          <v-card-text>{{ destination.text }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
