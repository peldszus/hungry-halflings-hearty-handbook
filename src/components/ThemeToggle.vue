<script setup lang="ts">
import { computed } from 'vue'
import { mdiBrightnessAuto, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
import { useAppTheme, type ThemePreference } from '@/composables/useAppTheme'

const { preference, setPreference } = useAppTheme()

const options: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: mdiBrightnessAuto },
  { value: 'light', label: 'Light', icon: mdiWeatherSunny },
  { value: 'dark', label: 'Dark', icon: mdiWeatherNight },
]

const activeIcon = computed(
  () => options.find((option) => option.value === preference.value)?.icon ?? mdiBrightnessAuto
)
</script>

<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props" :icon="activeIcon" aria-label="Change theme" />
    </template>
    <v-list :selected="[preference]" density="compact">
      <v-list-item
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :prepend-icon="option.icon"
        :title="option.label"
        :data-testid="`theme-${option.value}`"
        @click="setPreference(option.value)"
      />
    </v-list>
  </v-menu>
</template>
