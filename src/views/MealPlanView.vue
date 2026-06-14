<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'

const router = useRouter()
const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const weekOffset = ref(0)
const editMode = ref(false)

watch(weekOffset, () => {
  editMode.value = false
})

const weekDays = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() + diff + weekOffset.value * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const entry = mealPlanStore.getForDate(date.toISOString().slice(0, 10))
    const recipe = entry ? (recipesStore.getById(entry.recipeId) ?? null) : null
    return {
      iso: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      recipe,
      selectedRecipeId: entry?.recipeId ?? '',
    }
  })
})

const recipeSelectItems = computed(() => [
  { title: '— No meal —', value: '' },
  ...recipesStore.recipes.map((r) => ({ title: r.name, value: r.id })),
])

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

    <div class="d-flex justify-end mb-3">
      <v-btn
        v-if="!editMode"
        size="small"
        variant="tonal"
        prepend-icon="mdi-pencil"
        @click="editMode = true"
      >
        Edit Week
      </v-btn>
      <v-btn
        v-else
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-check"
        @click="editMode = false"
      >
        Done
      </v-btn>
    </div>

    <div class="meal-plan-list">
      <div v-for="day in weekDays" :key="day.iso" class="meal-plan-row d-flex align-center">
        <div class="day-label flex-shrink-0 mr-3">
          <span class="font-weight-bold text-body-2">{{ day.weekday }}</span>
          <span class="text-caption text-medium-emphasis ml-1">{{ day.date }}</span>
        </div>

        <template v-if="!editMode">
          <v-btn
            v-if="day.recipe"
            variant="tonal"
            size="small"
            class="flex-grow-1 meal-btn"
            @click="router.push({ name: 'recipe-detail', params: { id: day.recipe.id } })"
          >
            {{ day.recipe.name }}
          </v-btn>
          <span v-else class="text-body-2 text-medium-emphasis flex-grow-1">—</span>
        </template>

        <v-select
          v-else
          :model-value="day.selectedRecipeId"
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
.meal-btn {
  justify-content: flex-start;
}
</style>
