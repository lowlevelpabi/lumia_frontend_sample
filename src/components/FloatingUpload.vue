<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { FileUp } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { isLoggedIn, isStaff, isStudent, refreshAuth } = useAuth()

// Watch for route changes to refresh auth state (e.g. immediately after login)
watch(() => route.path, () => {
  refreshAuth()
}, { immediate: true })

const showFab = computed(() => {
  // Only show if logged in as a Student and not on an auth page or the upload page itself
  const isAuthPage = ['login', 'register'].includes(route.name as string)
  const isManagement = route.name === 'management'
  const isUploadPage = route.name === 'upload'
  
  return isLoggedIn.value && isStudent.value && !isAuthPage && !isManagement && !isUploadPage
})

const handleUpload = () => {
  if (isStaff.value) {
    router.push({ name: 'management', query: { tab: 'upload' } })
  } else {
    router.push({ name: 'upload' })
  }
}
</script>

<template>
  <transition name="fab-fade">
    <button 
      v-if="showFab" 
      class="floating-upload-btn" 
      @click="handleUpload"
      title="Upload Research"
    >
      <div class="fab-content">
        <FileUp :size="20" stroke-width="2.5" />
        <span class="fab-label">Upload</span>
      </div>
    </button>
  </transition>
</template>

<style scoped>
.floating-upload-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background-color: var(--accent-primary);
  color: #ffffff;
  border: none;
  border-radius: 999px;
  height: 52px;
  min-width: 52px;
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999;
  box-shadow: 0 8px 24px -6px rgba(0, 166, 81, 0.4);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
}

.fab-content {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.fab-label {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.floating-upload-btn:hover {
  transform: translateY(-4px) scale(1.02);
  background-color: #008f45; /* Slightly darker green for hover */
  box-shadow: 0 12px 32px -8px rgba(0, 166, 81, 0.5);
}

.floating-upload-btn:active {
  transform: translateY(0) scale(0.96);
}

/* Desktop: Only show label on hover for a cleaner look, or always show it? 
   Let's keep it visible for clear action, but we could make it expand.
*/

@media (max-width: 768px) {
  .floating-upload-btn {
    bottom: 1.5rem;
    right: 1.5rem;
    height: 48px;
    min-width: 48px;
    padding: 0 1rem;
  }
  
  .fab-label {
    display: none; /* Icon only on mobile to save space */
  }
}

/* Transition */
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}
</style>
