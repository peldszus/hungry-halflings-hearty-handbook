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

function getSelectedRecipeId(date: string): string {
  return mealPlanStore.getForDate(date)?.recipeId ?? ''
}

function onRecipeChange(date: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value) {
    mealPlanStore.assign(date, value)
  } else {
    mealPlanStore.unassign(date)
  }
}
</script>

<template>
  <div class="meal-plan">
    <h1>Meal Plan</h1>

    <div class="week-nav">
      <button @click="weekOffset--">Previous Week</button>
      <span class="week-label">{{ weekDays[0].iso }} &mdash; {{ weekDays[6].iso }}</span>
      <button @click="weekOffset++">Next Week</button>
    </div>

    <div class="week-grid">
      <div v-for="day in weekDays" :key="day.iso" class="day-cell">
        <div class="day-label">{{ day.label }}</div>
        <select :value="getSelectedRecipeId(day.iso)" @change="onRecipeChange(day.iso, $event)">
          <option value="">— No meal —</option>
          <option v-for="recipe in recipesStore.recipes" :key="recipe.id" :value="recipe.id">
            {{ recipe.name }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meal-plan {
  padding: 1rem 0;
}

h1 {
  font-size: 2rem;
  color: #4a9c6f;
  margin-bottom: 1.5rem;
}

.week-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.week-label {
  flex: 1;
  text-align: center;
  color: #555;
  font-weight: 500;
}

.week-nav button {
  background: #4a9c6f;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.week-nav button:hover {
  background: #3d8460;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.day-cell {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.day-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
}

select {
  width: 100%;
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

select:focus {
  outline: none;
  border-color: #4a9c6f;
}
</style>
