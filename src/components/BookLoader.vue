<script setup lang="ts">
import { computed } from 'vue'
import { BookOpen } from 'lucide-vue-next'

const props = defineProps<{
  progress?: number
  message?: string
}>()

const progressPercent = computed(() => {
  if (props.progress === undefined) return 0
  return Math.min(100, Math.max(0, props.progress))
})

// SVG Circle properties
const radius = 45
const circumference = 2 * Math.PI * radius
const strokeDashoffset = computed(() => {
  return circumference - (progressPercent.value / 100) * circumference
})
</script>

<template>
  <div class="minimal-loader">
    <div class="progress-container">
      <svg class="progress-svg" viewBox="0 0 100 100">
        <!-- Track -->
        <circle class="progress-track" cx="50" cy="50" :r="radius" />
        <!-- Fill -->
        <circle class="progress-fill" cx="50" cy="50" :r="radius" :style="{
          strokeDasharray: circumference,
          strokeDashoffset: strokeDashoffset
        }" />
      </svg>
      <div class="icon-center">
        <BookOpen :size="32" color="#00a651" stroke-width="2" />
      </div>
    </div>

    <div class="loader-content">
      <h3 class="status-title">Processing Document</h3>
      <p class="status-msg" v-if="message">{{ message }}</p>
      <div class="percent-label">{{ Math.round(progressPercent) }}%</div>
    </div>
  </div>
</template>

<style scoped>
.minimal-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0 auto;
}

.progress-container {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 1.5rem;
}

.progress-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-track {
  fill: none;
  stroke: #c9c9c9;
  stroke-width: 6;
}

.progress-fill {
  fill: none;
  stroke: #00a651;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease-out;
}

.icon-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-content {
  text-align: center;
}

.status-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.status-msg {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 0.75rem;
  min-height: 1.2rem;
}

.percent-label {
  font-size: 1.25rem;
  font-weight: 800;
  color: #00a651;
  font-variant-numeric: tabular-nums;
}
</style>
