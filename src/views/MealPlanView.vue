<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const weekOffset = ref(0)

const weekDays = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() + diff + weekOffset.value * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    return {
      iso: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })
})

const recipeSelectItems = computed(() => [
  { title: '— No meal —', value: '' },
  ...recipesStore.recipes.map((r) => ({ title: r.name, value: r.id })),
])

function getSelectedRecipeId(date: string): string {
  return mealPlanStore.getForDate(date)?.recipeId ?? ''
}

function onRecipeChange(date: string, value: string) {
  if (value) {
    mealPlanStore.assign(date, value)
  } else {
    mealPlanStore.unassign(date)
  }
}
</script>

<template>
  <v-container>
    <h1 class="text-h6 text-primary mb-2">Meal Plan</h1>

    <div class="d-flex align-center justify-space-between mb-2">
      <v-btn icon="mdi-chevron-left" variant="tonal" size="small" @click="weekOffset--" />
      <span class="text-body-2">{{ weekDays[0].date }} – {{ weekDays[6].date }}</span>
      <v-btn icon="mdi-chevron-right" variant="tonal" size="small" @click="weekOffset++" />
    </div>

    <div class="meal-plan-list">
      <div v-for="day in weekDays" :key="day.iso" class="meal-plan-row d-flex align-center">
        <div class="day-label flex-shrink-0 mr-3">
          <span class="font-weight-bold text-body-2">{{ day.weekday }}</span>
          <span class="text-caption text-medium-emphasis ml-1">{{ day.date }}</span>
        </div>
        <v-select
          :model-value="getSelectedRecipeId(day.iso)"
          :items="recipeSelectItems"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          class="flex-grow-1"
          @update:model-value="(v: string) => onRecipeChange(day.iso, v)"
        />
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.meal-plan-row + .meal-plan-row {
  margin-top: 8px;
}
.day-label {
  min-width: 84px;
}
</style>
