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
      label: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
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
    <h1 class="text-h4 text-primary mb-4">Meal Plan</h1>

    <div class="d-flex align-center justify-space-between mb-4">
      <v-btn icon="mdi-chevron-left" variant="tonal" @click="weekOffset--" />
      <span class="text-body-2">{{ weekDays[0].iso }} — {{ weekDays[6].iso }}</span>
      <v-btn icon="mdi-chevron-right" variant="tonal" @click="weekOffset++" />
    </div>

    <v-row>
      <v-col v-for="day in weekDays" :key="day.iso" cols="12" sm="6" md="4">
        <v-card variant="outlined">
          <v-card-title class="text-body-1">{{ day.label }}</v-card-title>
          <v-card-text>
            <v-select
              :model-value="getSelectedRecipeId(day.iso)"
              :items="recipeSelectItems"
              item-title="title"
              item-value="value"
              density="compact"
              hide-details
              @update:model-value="(v: string) => onRecipeChange(day.iso, v)"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
