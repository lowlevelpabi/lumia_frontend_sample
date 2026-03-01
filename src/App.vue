<script setup lang="ts">
import { RouterView } from 'vue-router'
import comp_nav from './components/comp_nav.vue'
</script>

<template>
  <div class="app-container">
    <comp_nav />
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #f9f9f9;
  color: #333;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  margin-top: 64px;
  /* Height of the navbar */
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
