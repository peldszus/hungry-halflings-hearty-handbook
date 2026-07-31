<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiCheck,
  mdiPencil,
  mdiStar,
  mdiNoteTextOutline,
  mdiPlus,
} from '@mdi/js'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { highlightInfixMatches } from '@/utils/highlight'
import { computeSwapShifts, computeMoveShifts } from '@/utils/dragShift'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatAssignmentUsageLines } from '@/utils/relativeTime'

const router = useRouter()
const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

// Material lifts the FAB out of the way while a snackbar is showing.
const { visible: snackbarVisible } = useSnackbar()

const weekOffset = ref(0)
const editMode = ref(false)
const searchText = ref('')

watch(weekOffset, () => {
  editMode.value = false
})

const todayIso = new Date().toISOString().slice(0, 10)

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
    const recipe = entry?.recipeId ? (recipesStore.getById(entry.recipeId) ?? null) : null
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
      dayNote: entry?.dayNote ?? '',
      mealNote: entry?.mealNote ?? '',
    }
  })
})

const recipeSelectItems = computed(() =>
  recipesStore.recipes
    .filter((r) => !r.archived)
    .map((r) => ({
      title: r.name,
      value: r.id,
      favourite: r.favourite,
      labels: r.labels ?? [],
    }))
)

function recipeFilter(
  _value: string,
  query: string,
  item?: { raw: { title: string; labels: string[] } }
) {
  const raw = item?.raw
  if (!raw) return false
  const q = query.toLowerCase()
  return raw.title.toLowerCase().includes(q) || raw.labels.some((l) => l.toLowerCase().includes(q))
}

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

type WeekDay = (typeof weekDays)['value'][number]

// Dragging is only offered for days with something to move; an empty or day-note-only day has
// nothing meaningful to drag, but remains a valid drop target for both swap and move below.
function isDragSource(day: WeekDay): boolean {
  return Boolean(day.recipe) || Boolean(day.mealNote)
}

const draggingIndex = ref<number | null>(null)
const dragOverRowIndex = ref<number | null>(null)
const dragOverZoneIndex = ref<number | null>(null)

// Insert zones are numbered 0..7, zone k sitting immediately before row k (zone 7 after row 6).
// Removing the dragged day and reinserting it at the zone shifts the zone index down by one once
// the zone is past the source, which is what turns a zone index into a destination day index.
function resolveMoveTargetIndex(sourceIndex: number, zoneIndex: number): number {
  return zoneIndex <= sourceIndex ? zoneIndex : zoneIndex - 1
}

function onDragStart(index: number, event: DragEvent) {
  if (!isDragSource(weekDays.value[index])) {
    event.preventDefault()
    return
  }
  draggingIndex.value = index
  event.dataTransfer?.setData('text/plain', weekDays.value[index].iso)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggingIndex.value = null
  dragOverRowIndex.value = null
  dragOverZoneIndex.value = null
}

function onRowDragOver(index: number, event: DragEvent) {
  if (draggingIndex.value === null || index === draggingIndex.value) return
  event.preventDefault()
  dragOverRowIndex.value = index
  dragOverZoneIndex.value = null
}

function onRowDragLeave(index: number) {
  if (dragOverRowIndex.value === index) dragOverRowIndex.value = null
}

const mealBtnRefs = ref<(HTMLElement | null)[]>([])

function setMealBtnRef(index: number, el: unknown) {
  const node = el && typeof el === 'object' && '$el' in el ? (el as { $el: HTMLElement }).$el : el
  mealBtnRefs.value[index] = (node as HTMLElement | null) ?? null
}

function rowPitch(): number {
  const first = mealBtnRefs.value[0]
  const second = mealBtnRefs.value[1]
  if (!first || !second) return 0
  return second.getBoundingClientRect().top - first.getBoundingClientRect().top
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// jsdom (used by the test suite) implements neither Element.animate nor window.matchMedia, so
// this is a silent no-op under test and only animates in real browsers.
function animateShift(shifts: Map<number, number>) {
  if (prefersReducedMotion()) return
  const pitch = rowPitch()
  if (!pitch) return
  shifts.forEach((rowsTravelled, index) => {
    if (rowsTravelled === 0) return
    const el = mealBtnRefs.value[index]
    if (!el || typeof el.animate !== 'function') return
    el.animate(
      [{ transform: `translateY(${rowsTravelled * pitch}px)` }, { transform: 'translateY(0)' }],
      { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    )
  })
}

async function onRowDrop(index: number, event: DragEvent) {
  event.preventDefault()
  if (draggingIndex.value === null || index === draggingIndex.value) return
  const shifts = computeSwapShifts(draggingIndex.value, index)
  mealPlanStore.swapEntries(weekDays.value[draggingIndex.value].iso, weekDays.value[index].iso)
  await nextTick()
  animateShift(shifts)
}

function onZoneDragOver(zoneIndex: number, event: DragEvent) {
  if (draggingIndex.value === null) return
  if (resolveMoveTargetIndex(draggingIndex.value, zoneIndex) === draggingIndex.value) return
  event.preventDefault()
  dragOverZoneIndex.value = zoneIndex
  dragOverRowIndex.value = null
}

function onZoneDragLeave(zoneIndex: number) {
  if (dragOverZoneIndex.value === zoneIndex) dragOverZoneIndex.value = null
}

async function onZoneDrop(zoneIndex: number, event: DragEvent) {
  event.preventDefault()
  if (draggingIndex.value === null) return
  const targetIndex = resolveMoveTargetIndex(draggingIndex.value, zoneIndex)
  if (targetIndex === draggingIndex.value) return
  const shifts = computeMoveShifts(draggingIndex.value, targetIndex)
  mealPlanStore.moveEntry(weekDays.value[draggingIndex.value].iso, weekDays.value[targetIndex].iso)
  await nextTick()
  animateShift(shifts)
}

type NoteType = 'day' | 'meal'

const noteDialog = ref(false)
const noteDialogDate = ref('')
const noteDialogType = ref<NoteType>('day')
const noteDialogText = ref('')

const noteDialogTitle = computed(() => (noteDialogType.value === 'day' ? 'Day note' : 'Meal note'))

function openNote(date: string, type: NoteType) {
  const entry = mealPlanStore.getForDate(date)
  noteDialogDate.value = date
  noteDialogType.value = type
  noteDialogText.value = (type === 'day' ? entry?.dayNote : entry?.mealNote) ?? ''
  noteDialog.value = true
}

function saveNote() {
  if (noteDialogType.value === 'day') {
    mealPlanStore.setDayNote(noteDialogDate.value, noteDialogText.value)
  } else {
    mealPlanStore.setMealNote(noteDialogDate.value, noteDialogText.value)
  }
  noteDialog.value = false
}
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-2">Meal Plan</h1>

    <div class="d-flex align-center mb-3 ga-2">
      <v-btn
        :icon="mdiChevronLeft"
        variant="tonal"
        size="small"
        aria-label="Previous week"
        @click="weekOffset--"
      />
      <span class="text-body-2 flex-grow-1 text-center">
        {{ weekDays[0].dateWithYear }} – {{ weekDays[6].dateWithYear }}
      </span>
      <v-btn
        :icon="mdiChevronRight"
        variant="tonal"
        size="small"
        aria-label="Next week"
        @click="weekOffset++"
      />
    </div>

    <div class="meal-plan-list">
      <div
        v-if="!editMode"
        class="insert-zone"
        data-testid="insert-zone"
        :class="{ 'insert-zone--active': dragOverZoneIndex === 0 }"
        @dragover="onZoneDragOver(0, $event)"
        @dragleave="onZoneDragLeave(0)"
        @drop="onZoneDrop(0, $event)"
      />
      <template v-for="(day, index) in weekDays" :key="day.iso">
        <div
          class="meal-plan-row"
          data-testid="meal-plan-row"
          :class="{ 'meal-plan-row--today': day.iso === todayIso }"
        >
          <div class="row-grid">
            <div class="day-label">
              <span class="font-weight-bold text-body-2">{{ day.weekday }}</span>
              <span class="text-caption text-medium-emphasis ml-1">{{ day.date }}</span>
            </div>

            <template v-if="!editMode">
              <!-- An empty day now offers to fill itself rather than rendering as a
                   disabled-looking blank button. -->
              <v-btn
                :ref="(el) => setMealBtnRef(index, el)"
                variant="tonal"
                density="compact"
                class="meal-btn"
                data-testid="meal-btn"
                :class="{
                  'meal-btn--empty': !day.recipe,
                  'meal-btn--dragging': draggingIndex === index,
                  'meal-btn--drop-target': dragOverRowIndex === index,
                }"
                :color="day.recipe ? undefined : 'primary'"
                :prepend-icon="day.recipe ? undefined : mdiPlus"
                :draggable="isDragSource(day)"
                @click="
                  day.recipe
                    ? router.push({ name: 'recipe-detail', params: { id: day.recipe.id } })
                    : (editMode = true)
                "
                @dragstart="onDragStart(index, $event)"
                @dragover="onRowDragOver(index, $event)"
                @dragleave="onRowDragLeave(index)"
                @drop="onRowDrop(index, $event)"
                @dragend="onDragEnd"
              >
                <span class="meal-btn__label">{{ day.recipe?.name ?? 'Add meal' }}</span>
              </v-btn>
            </template>

            <v-autocomplete
              v-else
              :model-value="day.selectedRecipeId"
              :items="recipeSelectItems"
              item-title="title"
              item-value="value"
              :custom-filter="recipeFilter"
              placeholder="— No meal —"
              density="compact"
              hide-details
              clearable
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
                      :icon="mdiStar"
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
                  <div v-if="item.labels.length" class="d-flex flex-wrap ga-1 mt-1">
                    <v-chip
                      v-for="label in item.labels"
                      :key="label"
                      size="x-small"
                      color="primary"
                    >
                      {{ label }}
                    </v-chip>
                  </div>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>

          <div class="row-grid notes-row">
            <button
              type="button"
              class="note-field"
              data-testid="day-note-field"
              :aria-label="`Day note for ${day.weekday} ${day.date}`"
              @click="openNote(day.iso, 'day')"
            >
              <v-icon
                :icon="mdiNoteTextOutline"
                size="x-small"
                class="note-icon"
                :class="{ 'note-icon-empty': !day.dayNote }"
              />
              <span class="note-text">{{ day.dayNote }}</span>
            </button>
            <button
              type="button"
              class="note-field"
              data-testid="meal-note-field"
              :aria-label="`Meal note for ${day.weekday} ${day.date}`"
              @click="openNote(day.iso, 'meal')"
            >
              <v-icon
                :icon="mdiNoteTextOutline"
                size="x-small"
                class="note-icon"
                :class="{ 'note-icon-empty': !day.mealNote }"
              />
              <span class="note-text">{{ day.mealNote }}</span>
            </button>
          </div>
        </div>
        <div
          v-if="!editMode"
          class="insert-zone"
          data-testid="insert-zone"
          :class="{ 'insert-zone--active': dragOverZoneIndex === index + 1 }"
          @dragover="onZoneDragOver(index + 1, $event)"
          @dragleave="onZoneDragLeave(index + 1)"
          @drop="onZoneDrop(index + 1, $event)"
        />
      </template>
    </div>

    <v-dialog v-model="noteDialog">
      <v-card>
        <v-card-title>{{ noteDialogTitle }}</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="noteDialogText"
            data-testid="note-dialog-text"
            rows="3"
            auto-grow
            density="compact"
            hide-details
            autofocus
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" data-testid="cancel-note" @click="noteDialog = false">
            Cancel
          </v-btn>
          <v-btn variant="text" color="primary" data-testid="save-note" @click="saveNote">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Editing the week is this screen's primary action, so it sits where Recipes puts its own:
         a bottom-right FAB. Confirming an edit uses the same position rather than sending the
         user back up to a toolbar. -->
    <v-btn
      :icon="editMode ? mdiCheck : mdiPencil"
      color="primary"
      class="fab"
      :class="{ 'fab--raised': snackbarVisible }"
      size="large"
      elevation="4"
      :aria-label="editMode ? 'Done editing meal plan' : 'Edit meal plan'"
      :aria-pressed="editMode"
      data-testid="toggle-edit-mode"
      @click="editMode = !editMode"
    />
  </v-container>
</template>

<style scoped>
.meal-plan-row + .meal-plan-row {
  margin-top: 6px;
}
.meal-plan-row {
  min-height: 40px;
}
/* Today is the row users look for first, so it gets a tonal container behind it. */
.meal-plan-row--today {
  background: rgba(var(--v-theme-primary-container), 0.6);
  border-radius: 12px;
  margin-inline: -8px;
  padding-inline: 8px;
  padding-block: 4px;
}
.row-grid {
  display: grid;
  /* minmax(0, 1fr) rather than 1fr: a 1fr track's automatic minimum is its content size, so the
     column would refuse to shrink and a long recipe name pushed past the row. */
  grid-template-columns: 84px minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
}
.day-label {
  min-width: 0;
}
.meal-btn {
  justify-content: flex-start;
  /* Overrides VBtn's size-derived min-width so the button can shrink with its column. */
  min-width: 0;
}
/* .v-btn__content is a flex container that centres its children, so text-overflow can never
   apply to it — a long name would overflow both edges and get clipped mid-word. Let it shrink
   and align left; the truncation happens on the label span inside it. */
.meal-btn :deep(.v-btn__content) {
  min-width: 0;
  justify-content: flex-start;
}
.meal-btn__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meal-btn--empty {
  opacity: 0.75;
}
.meal-btn[draggable='true'] {
  cursor: grab;
}
.meal-btn--dragging {
  opacity: 0.5;
}
.meal-btn--drop-target {
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
/* A near-invisible strip between rows that grows into a solid insertion line while a drag hovers
   over it, so users can tell "drop between" apart from "drop on" without extra UI chrome. */
.insert-zone {
  height: 4px;
  margin-block: 1px;
  border-radius: 2px;
  transition:
    height 0.1s ease,
    background-color 0.1s ease;
}
.insert-zone--active {
  height: 10px;
  background: rgb(var(--v-theme-primary));
}
.notes-row {
  margin-top: 2px;
}
.note-field {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.note-icon {
  flex-shrink: 0;
  opacity: 0.55;
}
.note-icon-empty {
  opacity: 0.3;
}
.note-text {
  font-size: 0.6875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
</style>
