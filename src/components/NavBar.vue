<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { mdiHome, mdiBookOpenVariant, mdiCalendarMonth, mdiCart, mdiArrowLeft } from '@mdi/js'
import AppMenu from './AppMenu.vue'
import { useSuggestionMode } from '@/composables/useSuggestionMode'

const route = useRoute()
const router = useRouter()

// While the meal plan's suggestion mode is active, its contextual toolbar takes over the
// bottom slot (M3 contextual-bar pattern), so the navigation bar steps aside.
const { active: suggestionModeActive } = useSuggestionMode()

// Material 3 picks the navigation pattern by window size class: a navigation bar at compact
// widths, a rail at medium, and an expanded drawer at large.
const { smAndDown, lgAndUp } = useDisplay()

const destinations = [
  { value: 'home', label: 'Home', icon: mdiHome, to: '/' },
  { value: 'recipes', label: 'Recipes', icon: mdiBookOpenVariant, to: '/recipes' },
  { value: 'meal-plan', label: 'Meal Plan', icon: mdiCalendarMonth, to: '/meal-plan' },
  { value: 'shopping-list', label: 'Shopping', icon: mdiCart, to: '/shopping-list' },
] as const

// Driven by route meta rather than the path, so /recipes/:id still highlights Recipes.
const activeNav = computed(() => route.meta.nav ?? 'home')

// Whether to show back button (for non-home routes)
const showBackButton = computed(() => route.meta.showBackButton)

// The app bar title - shows route title or app name for home
const appBarTitle = computed(() => {
  if (route.name === 'home') {
    return 'Hungry Halflings Hearty Handbook'
  }
  return route.meta.title
})

// Whether to show the settings/menu icon (only on home screen)
const showSettings = computed(() => route.name === 'home')

function goBack(event: MouseEvent) {
  router.back()
  ;(event.target as HTMLElement)?.blur()
}
</script>

<template>
  <v-app-bar :elevation="0" color="surface" scroll-behavior="elevate">
    <v-btn
      v-if="showBackButton"
      :icon="mdiArrowLeft"
      variant="text"
      aria-label="Go back"
      @click="goBack"
    />
    <v-app-bar-title v-if="appBarTitle" class="app-title">{{ appBarTitle }}</v-app-bar-title>
    <template v-if="showSettings" #append>
      <AppMenu icon-type="settings" />
    </template>
  </v-app-bar>

  <v-navigation-drawer v-if="!smAndDown" :rail="!lgAndUp" permanent color="surface">
    <v-list :selected="[activeNav]" nav color="primary">
      <v-list-item
        v-for="destination in destinations"
        :key="destination.value"
        :value="destination.value"
        :to="destination.to"
        :prepend-icon="destination.icon"
        :title="destination.label"
      />
    </v-list>
  </v-navigation-drawer>

  <!-- `name` is the bar's layout-item id, which VBottomNavigation defaults to the shared value
       'bottom-navigation'. It must stay distinct from the meal plan's suggestion toolbar: with
       colliding ids, swapping the two bars corrupts Vuetify's layout registry and collapses
       --v-layout-bottom to 0 until a reload. -->
  <v-bottom-navigation
    v-else-if="!suggestionModeActive"
    name="main-bottom-nav"
    :model-value="activeNav"
    grow
    color="primary"
  >
    <v-btn
      v-for="destination in destinations"
      :key="destination.value"
      :value="destination.value"
      :to="destination.to"
    >
      <v-icon :icon="destination.icon" />
      <span>{{ destination.label }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
/*
 * The app name is long — at Vuetify's default 1.25rem it needs 308px, which does not fit beside
 * the menu button until roughly 400px wide. Scale it down on narrow viewports so the full name
 * is always readable rather than being cut to "Hungry Halflings Hearty Hand…".
 */
.app-title {
  font-size: clamp(1rem, 4.4vw, 1.25rem);
}
</style>
