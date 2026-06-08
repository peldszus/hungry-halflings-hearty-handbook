<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentPath = computed(() => route.path)
</script>

<template>
  <v-app-bar :elevation="2" color="primary">
    <v-app-bar-title>Hungry Halflings</v-app-bar-title>
  </v-app-bar>

  <v-bottom-navigation :model-value="currentPath" grow color="primary">
    <v-btn value="/" to="/">
      <v-icon>mdi-home</v-icon>
      <span>Home</span>
    </v-btn>
    <v-btn value="/recipes" to="/recipes">
      <v-icon>mdi-book-open-variant</v-icon>
      <span>Recipes</span>
    </v-btn>
    <v-btn value="/meal-plan" to="/meal-plan">
      <v-icon>mdi-calendar-month</v-icon>
      <span>Meal Plan</span>
    </v-btn>
    <v-btn value="/shopping-list" to="/shopping-list">
      <v-icon>mdi-cart</v-icon>
      <span>Shop</span>
    </v-btn>
  </v-bottom-navigation>
</template>
