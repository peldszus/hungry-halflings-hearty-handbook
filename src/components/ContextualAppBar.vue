<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js'
import { useRouter } from 'vue-router'

defineProps<{
  title?: string
}>()

const router = useRouter()
</script>

<template>
  <v-app-bar :elevation="0" color="surface" scroll-behavior="elevate">
    <v-btn :icon="mdiArrowLeft" aria-label="Go back" @click="router.back()" />
    <v-app-bar-title v-if="title">{{ title }}</v-app-bar-title>
    <slot name="append" />
  </v-app-bar>
</template>
