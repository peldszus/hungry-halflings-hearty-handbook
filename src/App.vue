<script setup lang="ts">
import NavBar from '@/components/NavBar.vue'
</script>

<template>
  <NavBar />
  <main>
    <RouterView />
  </main>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: #1a1a2e;
  background: #f8f9fa;
}

main {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
