<script setup lang="ts">
import NavBar from '@/components/NavBar.vue'
import { useAppTheme } from '@/composables/useAppTheme'

// Keeps <meta name="theme-color"> in step with the active theme.
useAppTheme()
</script>

<template>
  <v-app>
    <NavBar />
    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
