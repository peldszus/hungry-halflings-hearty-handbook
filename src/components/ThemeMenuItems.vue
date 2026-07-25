<script setup lang="ts">
import { mdiBrightnessAuto, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
import { useAppTheme, type ThemePreference } from '@/composables/useAppTheme'

/**
 * The theme options as bare list items, so they can live inside the app's single overflow menu
 * instead of costing a second permanent app-bar button.
 */
const { preference, setPreference } = useAppTheme()

const options: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: mdiBrightnessAuto },
  { value: 'light', label: 'Light', icon: mdiWeatherSunny },
  { value: 'dark', label: 'Dark', icon: mdiWeatherNight },
]
</script>

<template>
  <!-- `active` rather than the parent list's `selected`, so this stays self-contained and does
       not require the host list to know about theme values. -->
  <v-list-item
    v-for="option in options"
    :key="option.value"
    :active="preference === option.value"
    :prepend-icon="option.icon"
    :title="option.label"
    :data-testid="`theme-${option.value}`"
    @click="setPreference(option.value)"
  />
</template>
