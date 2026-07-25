<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { mdiHome, mdiBookOpenVariant, mdiCalendarMonth, mdiCart } from '@mdi/js'
import DataTransferMenu from './DataTransferMenu.vue'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()

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
</script>

<template>
  <v-app-bar :elevation="0" color="surface" scroll-behavior="elevate">
    <v-app-bar-title>Hungry Halflings Hearty Handbook</v-app-bar-title>
    <template #append>
      <ThemeToggle />
      <DataTransferMenu />
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

  <v-bottom-navigation v-else :model-value="activeNav" grow color="primary">
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
