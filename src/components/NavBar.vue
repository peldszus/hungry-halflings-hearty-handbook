<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { mdiHome, mdiBookOpenVariant, mdiCalendarMonth, mdiCart } from '@mdi/js'
import DataTransferMenu from './DataTransferMenu.vue'

const route = useRoute()
const currentPath = computed(() => route.path)
</script>

<template>
  <v-app-bar :elevation="2" color="primary">
    <v-app-bar-title>Hungry Halflings Hearty Handbook</v-app-bar-title>
    <template #append>
      <DataTransferMenu />
    </template>
  </v-app-bar>

  <v-bottom-navigation :model-value="currentPath" grow color="primary">
    <v-btn value="/" to="/">
      <v-icon :icon="mdiHome" />
      <span>Home</span>
    </v-btn>
    <v-btn value="/recipes" to="/recipes">
      <v-icon :icon="mdiBookOpenVariant" />
      <span>Recipes</span>
    </v-btn>
    <v-btn value="/meal-plan" to="/meal-plan">
      <v-icon :icon="mdiCalendarMonth" />
      <span>Meal Plan</span>
    </v-btn>
    <v-btn value="/shopping-list" to="/shopping-list">
      <v-icon :icon="mdiCart" />
      <span>Shop</span>
    </v-btn>
  </v-bottom-navigation>
</template>
