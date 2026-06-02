<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import comp_nav from './components/comp_nav.vue'
import FloatingUpload from './components/FloatingUpload.vue'
import ToastNotification from './components/ToastNotification.vue'

const route = useRoute()
const isAuthPage = computed(() => ['login', 'register'].includes(route.name as string))
const isHomePage = computed(() => route.name === 'home')
</script>

<template>
  <div class="app-container">
    <comp_nav v-if="!isAuthPage" />
    <main class="main-content" :class="{ 'no-nav': isAuthPage, 'home-mode': isHomePage }">
      <RouterView />
    </main>
    <FloatingUpload />
    <ToastNotification />
  </div>
</template>

<style scoped>
body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
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

.main-content.home-mode {
  margin-top: 0;
}
</style>
