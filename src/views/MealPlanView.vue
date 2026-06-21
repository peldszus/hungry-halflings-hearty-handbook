<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { highlightInfixMatches } from '@/utils/highlight'
import { formatAssignmentUsageLines } from '@/utils/relativeTime'

const router = useRouter()
const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const weekOffset = ref(0)
const editMode = ref(false)
const searchText = ref('')

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
      dateWithYear: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      recipe,
      selectedRecipeId: entry?.recipeId ?? null,
    }
  })
})

const recipeSelectItems = computed(() =>
  recipesStore.recipes
    .filter((r) => !r.archived)
    .map((r) => ({ title: r.name, value: r.id, favourite: r.favourite }))
)

function usageLines(recipeId: string, referenceDate: string) {
  return formatAssignmentUsageLines(
    mealPlanStore.getLastUsedDate(recipeId, referenceDate, referenceDate),
    mealPlanStore.getNextPlannedDate(recipeId, referenceDate),
    referenceDate
  )
}

function onRecipeChange(date: string, value: string | null) {
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

    <div class="d-flex align-center mb-3 gap-2">
      <v-btn icon="mdi-chevron-left" variant="tonal" size="small" @click="weekOffset--" />
      <span class="text-body-2 flex-grow-1 text-center">
        {{ weekDays[0].dateWithYear }} – {{ weekDays[6].dateWithYear }}
      </span>
      <v-btn icon="mdi-chevron-right" variant="tonal" size="small" @click="weekOffset++" />
      <v-btn
        :icon="editMode ? 'mdi-check' : 'mdi-pencil'"
        class="ml-2"
        :color="editMode ? 'primary' : undefined"
        variant="tonal"
        size="small"
        @click="editMode = !editMode"
      />
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
            density="compact"
            class="flex-grow-1 meal-btn"
            @click="router.push({ name: 'recipe-detail', params: { id: day.recipe.id } })"
          >
            {{ day.recipe.name }}
          </v-btn>
          <span v-else class="text-body-2 text-medium-emphasis flex-grow-1">—</span>
        </template>

        <v-autocomplete
          v-else
          :model-value="day.selectedRecipeId"
          :items="recipeSelectItems"
          item-title="title"
          item-value="value"
          placeholder="— No meal —"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="flex-grow-1"
          @update:model-value="(v: string | null) => onRecipeChange(day.iso, v)"
          @update:search="(v: string) => (searchText = v)"
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps" :title="undefined">
              <template #title>
                <span
                  v-for="(seg, i) in highlightInfixMatches(item.title, searchText)"
                  :key="i"
                  :class="{ 'search-match': seg.matched }"
                  >{{ seg.text }}</span
                >
                <v-icon
                  v-if="item.favourite"
                  icon="mdi-star"
                  color="yellow-darken-2"
                  size="small"
                  class="ml-2"
                />
              </template>
              <template #subtitle>
                <div
                  v-for="(line, i) in usageLines(item.value, day.iso)"
                  :key="i"
                  class="last-used text-disabled"
                >
                  {{ line }}
                </div>
              </template>
            </v-list-item>
          </template>
        </v-autocomplete>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.meal-plan-row + .meal-plan-row {
  margin-top: 8px;
}
.meal-plan-row {
  min-height: 40px;
}
.day-label {
  min-width: 84px;
}
.meal-btn {
  justify-content: flex-start;
}
.search-match {
  font-weight: 600;
  background: rgba(var(--v-theme-primary), 0.15);
}
.last-used {
  font-size: 0.6875rem;
}
</style>
