<script setup lang="ts">
import { computed } from 'vue'
import {
  mdiBookOpenVariant,
  mdiCalendarMonth,
  mdiCart,
  mdiChevronRight,
  mdiPotSteam,
} from '@mdi/js'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { formatRelativeTime } from '@/utils/relativeTime'

const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

function pluralise(count: number, noun: string, none: string): string {
  if (count === 0) return none
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

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

/**
 * How far the plan reaches before its first hole — the cue for when to sit down and plan again.
 * Counts today plus each consecutive planned day after it, so 1 means "only today". Zero is
 * phrased about today rather than as "nothing planned", which would be wrong when the gap is
 * today but next week is full.
 */
const plannedAhead = computed(() => {
  const days = mealPlanStore.countPlannedDaysAhead()
  if (days === 0) return "Today isn't planned"
  return `${days} day${days === 1 ? '' : 's'} planned ahead`
})

const destinations = computed(() => [
  {
    to: '/recipes',
    icon: mdiBookOpenVariant,
    title: 'Recipes',
    subtitle: pluralise(recipesStore.recipeCount, 'recipe', 'No recipes yet'),
    text: 'Browse and manage your recipe collection.',
  },
  {
    to: '/meal-plan',
    icon: mdiCalendarMonth,
    title: 'Meal Plan',
    subtitle: plannedAhead.value,
    text: 'Assign recipes to days in your weekly plan.',
  },
  {
    // Derived on demand from a date range the user picks, so there is nothing to count here.
    to: '/shopping-list',
    icon: mdiCart,
    title: 'Shopping List',
    subtitle: '',
    text: 'Generate a shopping list from your meal plan.',
  },
])
</script>

<template>
  <v-container>
    <!-- Rendered even with nothing planned, where it becomes the prompt to go and plan rather
         than disappearing and leaving the screen with no cue at all. -->
    <v-card
      class="mb-6"
      color="tertiary-container"
      :to="nextMeal ? `/recipes/${nextMeal.id}` : '/meal-plan'"
      :data-testid="nextMeal ? 'next-meal' : 'no-next-meal'"
    >
      <v-card-item>
        <template #prepend>
          <v-icon :icon="mdiPotSteam" />
        </template>
        <v-card-subtitle class="text-caption">
          {{ nextMeal ? `Next meal · ${nextMeal.when}` : 'Nothing planned' }}
        </v-card-subtitle>
        <v-card-title class="text-body-1">{{ nextMeal?.name ?? 'Plan your week' }}</v-card-title>
        <template #append>
          <v-icon :icon="mdiChevronRight" size="small" />
        </template>
      </v-card-item>
    </v-card>

    <v-row>
      <v-col v-for="destination in destinations" :key="destination.to" cols="12" sm="4">
        <v-card variant="tonal" color="primary" class="destination-card h-100" :to="destination.to">
          <v-card-item>
            <template #prepend>
              <v-icon :icon="destination.icon" />
            </template>
            <v-card-title>{{ destination.title }}</v-card-title>
            <v-card-subtitle v-if="destination.subtitle" class="text-caption">
              {{ destination.subtitle }}
            </v-card-subtitle>
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

<style scoped>
/* Card titles and subtitles truncate with an ellipsis by default, which clipped "Shopping List"
   and the counts once the three cards sit side by side. These labels are short — wrap instead. */
.destination-card :deep(.v-card-title),
.destination-card :deep(.v-card-subtitle) {
  white-space: normal;
}
</style>
