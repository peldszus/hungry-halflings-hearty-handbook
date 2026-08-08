<script setup lang="ts">
import NavBar from '@/components/NavBar.vue'
import { useAppTheme } from '@/composables/useAppTheme'
import { useSnackbar } from '@/composables/useSnackbar'

// Keeps <meta name="theme-color"> in step with the active theme.
useAppTheme()

// Single host for transient messages raised anywhere in the app.
const { visible, current, dismiss } = useSnackbar()
</script>

<template>
  <v-app>
    <NavBar />
    <v-main>
      <RouterView v-slot="{ Component, route }">
        <!-- `mode="out-in"` keeps only one view mounted at a time. Vue's default runs the leave
             and enter simultaneously, so for the transition's ~200ms two full view subtrees (each
             with its own FAB) coexist in v-main: the doubled content height forces a large reflow
             that on mobile Chrome makes the fixed bottom navigation reposition mid-frame ("drops
             then springs back") and the old and new FABs visibly overlap at the same spot. -->
        <Transition name="screen" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </v-main>

    <v-snackbar v-model="visible" :timeout="current?.timeout ?? 6000" data-testid="snackbar">
      {{ current?.text }}
      <template #actions>
        <v-btn v-if="current?.action" variant="text" @click="current.action.handler()">
          {{ current.action.label }}
        </v-btn>
        <v-btn v-else variant="text" @click="dismiss()">Dismiss</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style>
.screen-enter-active,
.screen-leave-active {
  transition:
    opacity 150ms ease,
    transform 200ms cubic-bezier(0.2, 0, 0, 1);
}
.screen-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.screen-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

@media (prefers-reduced-motion: reduce) {
  .screen-enter-active,
  .screen-leave-active {
    transition: none;
  }
  .screen-enter-from,
  .screen-leave-to {
    transform: none;
  }
}
</style>
