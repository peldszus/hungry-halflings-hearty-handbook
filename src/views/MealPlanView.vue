<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiPencil,
  mdiStar,
  mdiNoteTextOutline,
  mdiPlus,
} from '@mdi/js'
import { useRecipesStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlan'
import { highlightInfixMatches } from '@/utils/highlight'
import { computeSwapShifts, computeMoveShifts } from '@/utils/dragShift'
import { formatAssignmentUsageLines } from '@/utils/relativeTime'

const router = useRouter()
const recipesStore = useRecipesStore()
const mealPlanStore = useMealPlanStore()

const weekOffset = ref(0)
const searchText = ref('')
const editDialog = ref(false)
const editDialogDate = ref('')

const mealListEl = ref<HTMLElement | null>(null)

watch(weekOffset, async (newOffset, oldOffset) => {
  if (editDialog.value) closeEditDialog()
  await nextTick()
  animateWeekTransition(newOffset > oldOffset ? 1 : -1)
})

// Slides the new week in from the direction of travel so a swipe or chevron click reads as
// "moved to the next/previous week" rather than an unexplained content swap.
function animateWeekTransition(direction: 1 | -1) {
  if (prefersReducedMotion()) return
  const el = mealListEl.value
  if (!el || typeof el.animate !== 'function') return
  el.animate(
    [
      { transform: `translateX(${direction * 20}px)`, opacity: 0.4 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
  )
}

const SWIPE_THRESHOLD_PX = 50

let touchStartX = 0
let touchStartY = 0
let trackingSwipe = false

// Overlays (the note dialog, the recipe autocomplete's dropdown) are teleported outside this
// view's own DOM, so a swipe starting inside one — e.g. dragging to select text in the note
// textarea — must not change the week hidden behind it.
function isWithinOverlay(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.v-overlay-container') !== null
}

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  trackingSwipe = !!touch && !isWithinOverlay(event.target)
  if (!trackingSwipe || !touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
}

function onTouchEnd(event: TouchEvent) {
  if (!trackingSwipe) return
  trackingSwipe = false
  const touch = event.changedTouches[0]
  if (!touch) return
  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return
  if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
  weekOffset.value += deltaX < 0 ? 1 : -1
}

// Listening on window (rather than just the week list) lets a swipe anywhere on the screen —
// including the empty area below a short week — navigate weeks, which matters most on mobile
// where that's the area closest to the thumb.
onMounted(() => {
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchend', onTouchEnd)
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

const editDialogDay = computed(() => weekDays.value.find((d) => d.iso === editDialogDate.value))
const editDialogSelection = ref<string | null>(null)

function openEditDialog(date: string) {
  editDialogDate.value = date
  editDialogSelection.value = mealPlanStore.getForDate(date)?.recipeId ?? null
  editDialog.value = true
}

// Clearing the field (the autocomplete's built-in "x") only resets what's being searched for, so
// the user can pick something else without it immediately unassigning the day — it doesn't commit
// on its own. Picking an actual recipe still commits and closes immediately, the fast path for the
// common case; a field left empty is only applied when the dialog is closed, in closeEditDialog.
function onEditDialogRecipeChange(value: string | null) {
  editDialogSelection.value = value
  if (!value) return
  onRecipeChange(editDialogDate.value, value)
  editDialog.value = false
}

function removeEditDialogMeal() {
  onRecipeChange(editDialogDate.value, null)
  editDialogSelection.value = null
  editDialog.value = false
}

// Closing applies whatever's currently in the field if it differs from what's stored — in
// practice that only ever means a cleared-then-closed field, since picking a recipe already
// commits and closes on its own above.
function closeEditDialog() {
  if (editDialogSelection.value !== (editDialogDay.value?.selectedRecipeId ?? null)) {
    onRecipeChange(editDialogDate.value, editDialogSelection.value)
  }
  editDialog.value = false
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
  // A native drag never fires a blur on the button it started from, so it can keep browser focus
  // through the whole gesture and into whatever content later gets swapped into that row. This is
  // independent of the animated-swap hover issue below, so it's safe to clear immediately.
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && activeElement.closest('.meal-btn')) {
    activeElement.blur()
  }
}

// The row-shift animation below moves a row's pixels under the pointer mid-transition even though
// the pointer itself never moves, so the browser's :hover hit-test can end up matching that row
// while it passes underneath — a real, correct match at that instant. The mismatch appears once
// the transform settles back to rest: without a further mouse move, browsers don't re-run hit
// testing on their own, so the row keeps showing its Vuetify state-layer overlay
// (`.v-btn:hover > .v-btn__overlay`, driven purely by the CSS :hover pseudo-class, not JS state)
// even though the pointer is no longer over it. Since rows are keyed by date rather than content,
// that stuck overlay then sits over whichever meal got swapped into the slot, looking like the
// dragged meal stayed highlighted.
//
// Forcing a reflow between toggling pointer-events off and back on does *not* reliably invalidate
// a stale :hover match (confirmed against real Chromium — the overlay stayed put). Per spec,
// though, an element with pointer-events: none can never match :hover at all, so disabling it
// outright removes the stuck overlay regardless of the browser's hit-test cache. It's held off
// until the next genuine mouse movement — the same event that would have naturally corrected the
// stale match anyway — rather than reverted immediately, with a short timeout as a fallback for
// touch-only input that never fires one.
let clearHoverSuppression: (() => void) | null = null

function resetStaleHover() {
  const list = mealListEl.value
  if (!list) return
  clearHoverSuppression?.()

  list.style.pointerEvents = 'none'
  const restore = () => {
    list.style.pointerEvents = ''
    window.removeEventListener('mousemove', restore)
    clearTimeout(timeoutId)
    clearHoverSuppression = null
  }
  const timeoutId = window.setTimeout(restore, 1000)
  window.addEventListener('mousemove', restore, { once: true })
  clearHoverSuppression = restore
}

onUnmounted(() => {
  clearHoverSuppression?.()
})

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
  const animations: Animation[] = []
  shifts.forEach((rowsTravelled, index) => {
    if (rowsTravelled === 0) return
    const el = mealBtnRefs.value[index]
    if (!el || typeof el.animate !== 'function') return
    animations.push(
      el.animate(
        [{ transform: `translateY(${rowsTravelled * pitch}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      )
    )
  })
  // The row(s) that animate pass under the pointer mid-transition even though the pointer itself
  // never moves, which is what leaves a stale :hover match once they settle back to rest — resetting
  // only makes sense once the transform is actually done, not right away.
  Promise.all(animations.map((a) => a.finished))
    .then(resetStaleHover)
    .catch(() => {})
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

defineExpose({ editDialog, editDialogDate })
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

    <div ref="mealListEl" class="meal-plan-list">
      <div
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

            <!-- The wrapper (not the inner button) carries the draggable/drag-event contract and
                 the chip's own tonal background, so it stays the single element both
                 drag-and-drop and the row-shift animation key off of, and reads as one merged
                 chip rather than two adjacent controls; the name button and the edit button are
                 independent siblings inside it, since a button can't nest another button. -->
            <div
              :ref="(el) => setMealBtnRef(index, el)"
              class="meal-btn bg-surface-container-high"
              data-testid="meal-btn"
              :class="{
                'meal-btn--dragging': draggingIndex === index,
                'meal-btn--drop-target': dragOverRowIndex === index,
              }"
              :draggable="isDragSource(day)"
              @dragstart="onDragStart(index, $event)"
              @dragover="onRowDragOver(index, $event)"
              @dragleave="onRowDragLeave(index)"
              @drop="onRowDrop(index, $event)"
              @dragend="onDragEnd"
            >
              <!-- An empty day now offers to fill itself rather than rendering as a
                   disabled-looking blank button; the plus indicator lives in the trailing icon
                   button below, so this stays a plain (if blank) tap target for it. -->
              <v-btn
                variant="text"
                density="compact"
                class="meal-name-btn"
                @click="
                  day.recipe
                    ? router.push({ name: 'recipe-detail', params: { id: day.recipe.id } })
                    : openEditDialog(day.iso)
                "
              >
                <span class="meal-name-btn__label">{{ day.recipe?.name }}</span>
              </v-btn>

              <v-btn
                icon
                variant="text"
                density="compact"
                class="meal-edit-btn"
                data-testid="meal-edit-btn"
                :color="day.recipe ? undefined : 'primary'"
                :aria-label="
                  day.recipe
                    ? `Edit meal for ${day.weekday} ${day.date}`
                    : `Add meal for ${day.weekday} ${day.date}`
                "
                @click="openEditDialog(day.iso)"
              >
                <!-- mdiPencil's diagonal silhouette reads taller than mdiPlus's cross at the same
                     nominal size, so it needs an explicitly smaller size to look equal-weight. -->
                <v-icon :icon="day.recipe ? mdiPencil : mdiPlus" :size="day.recipe ? 18 : 22" />
              </v-btn>
            </div>
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
          class="insert-zone"
          data-testid="insert-zone"
          :class="{ 'insert-zone--active': dragOverZoneIndex === index + 1 }"
          @dragover="onZoneDragOver(index + 1, $event)"
          @dragleave="onZoneDragLeave(index + 1)"
          @drop="onZoneDrop(index + 1, $event)"
        />
      </template>
    </div>

    <v-dialog v-model="noteDialog" location="top center">
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

    <v-dialog v-model="editDialog" location="top center">
      <v-card>
        <v-card-title v-if="editDialogDay">
          Edit meal — {{ editDialogDay.weekday }} {{ editDialogDay.date }}
        </v-card-title>
        <v-card-text>
          <v-autocomplete
            :model-value="editDialogSelection"
            :items="recipeSelectItems"
            item-title="title"
            item-value="value"
            :custom-filter="recipeFilter"
            placeholder="— No meal —"
            density="compact"
            hide-details
            clearable
            autofocus
            @update:model-value="onEditDialogRecipeChange"
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
                    v-for="(line, i) in usageLines(item.value, editDialogDate)"
                    :key="i"
                    class="last-used text-disabled"
                  >
                    {{ line }}
                  </div>
                </template>
                <div v-if="item.labels.length" class="d-flex flex-wrap ga-1 mt-1">
                  <v-chip v-for="label in item.labels" :key="label" size="x-small" color="primary">
                    {{ label }}
                  </v-chip>
                </div>
              </v-list-item>
            </template>
          </v-autocomplete>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="editDialogDay?.selectedRecipeId"
            variant="text"
            color="error"
            data-testid="remove-meal"
            @click="removeEditDialogMeal"
          >
            Remove meal
          </v-btn>
          <v-spacer />
          <v-btn variant="text" data-testid="close-edit-dialog" @click="closeEditDialog">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
/* The drag source / drop target: a plain flex row carrying the chip's own tonal background (the
   bg-surface-container-high utility class, same for an empty or a filled day) and housing the
   name button and the edit button as independent siblings (a button can't nest another button) —
   both switch to a transparent `text` variant so this background is the only one visible, reading
   as one merged chip rather than two adjacent controls. */
.meal-btn {
  display: flex;
  align-items: center;
  min-width: 0;
  border-radius: 9999px;
  padding-inline: 12px;
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
.meal-name-btn {
  justify-content: flex-start;
  /* Overrides VBtn's size-derived min-width so the button can shrink with its column. */
  min-width: 0;
  flex: 1 1 auto;
  padding-inline: 4px;
}
/* .v-btn__content is a flex container that centres its children, so text-overflow can never
   apply to it — a long name would overflow both edges and get clipped mid-word. Let it shrink
   and align left; the truncation happens on the label span inside it. */
.meal-name-btn :deep(.v-btn__content) {
  min-width: 0;
  justify-content: flex-start;
}
.meal-name-btn__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meal-edit-btn {
  flex-shrink: 0;
}
/* Touch devices simulate :hover on tap and only clear it on the next tap elsewhere (no real
   hovering pointer to move away with) — a distinct, older mobile-browser quirk from the
   drag-animation hover mismatch handled in script above, and not fixable by the same JS:
   touchscreens never fire a real `mousemove`, so that fix's suppression never lifts except via its
   1s timeout fallback, after which the never-actually-cleared simulated hover reappears. Scoping
   the state-layer rule to real hover-capable devices removes it at the source for touch instead. */
@media (hover: none) {
  .meal-name-btn:hover :deep(.v-btn__overlay),
  .meal-edit-btn:hover :deep(.v-btn__overlay) {
    opacity: 0 !important;
  }
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
