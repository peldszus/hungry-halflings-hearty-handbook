<script setup lang="ts">
defineProps<{
  icon: string
  headline: string
  supporting?: string
}>()
</script>

<template>
  <div class="d-flex flex-column align-center text-center pa-8 ga-2" data-testid="empty-state">
    <v-icon :icon="icon" size="48" class="text-medium-emphasis mb-2" />
    <p class="text-body-1 font-weight-medium mb-0">{{ headline }}</p>
    <p v-if="supporting" class="text-body-2 text-medium-emphasis mb-0">{{ supporting }}</p>
    <!-- Primary action, e.g. "New recipe". -->
    <div v-if="$slots.action" class="mt-2">
      <slot name="action" />
    </div>
  </div>
</template>
