<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import comp_nav from './components/comp_nav.vue'

const route = useRoute()
const isAuthPage = computed(() => ['login', 'register'].includes(route.name as string))
</script>

<template>
  <div class="app-container">
    <comp_nav v-if="!isAuthPage" />
    <main class="main-content" :class="{ 'no-nav': isAuthPage }">
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
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Auth pages need no top margin since navbar is hidden */
.main-content.no-nav {
  margin-top: 0;
}
</style>
