<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  progress?: number
  message?: string
}>()

const roundedProgress = computed(() => {
  if (props.progress === undefined) return 0
  return Math.round(Math.min(100, Math.max(0, props.progress)))
})

// Split percentage into digits for independent animation
const progressDigits = computed(() => {
  return roundedProgress.value.toString().split('')
})
</script>

<template>
  <div class="minimal-loader">
    <div class="spinner-container">
      <!-- Orbiting spinner -->
      <div class="spinner-orbit">
        <div class="orbit-glow"></div>
        <Loader2 :size="140" class="main-spinner" stroke-width="1.2" />
      </div>

      <!-- Percentage INSIDE the spinner -->
      <div class="icon-center">
        <div class="digit-count-wrapper">
          <transition-group name="digit-slide" tag="div" class="digits-inner">
            <span v-for="(digit, index) in progressDigits" :key="`digit-${progressDigits.length - index}-${digit}`"
              class="digit">
              {{ digit }}
            </span>
          </transition-group>
          <span class="pct-sign">%</span>
        </div>
      </div>
    </div>

    <div class="loader-content">
      <h3 class="status-title">Processing Document</h3>

      <!-- Status Message with slide-up transition -->
      <div class="status-msg-wrapper">
        <transition name="status-slide" mode="out-in">
          <p class="status-msg" v-if="message" :key="message">{{ message }}</p>
          <p class="status-msg-placeholder" v-else>&nbsp;</p>
        </transition>
      </div>
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
  padding: 2rem 0;
}

/* Spinner Container */
.spinner-container {
  position: relative;
  width: 160px;
  height: 160px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-orbit {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orbit-glow {
  position: absolute;
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 166, 81, 0.15) 0%, transparent 70%);
  filter: blur(25px);
  animation: pulse-glow 3s ease-in-out infinite;
}

.main-spinner {
  color: #00a651;
  animation: spin 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  filter: drop-shadow(0 0 12px rgba(0, 166, 81, 0.25));
}

.icon-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

/* Digit Odometer Styling */
.digit-count-wrapper {
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: #00a651;
}

.digits-inner {
  display: flex;
  height: 2.8rem;
  overflow: hidden;
  position: relative;
}

.digit {
  font-size: 2.8rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  display: block;
  min-width: 0.6em;
  text-align: center;
}

.pct-sign {
  font-size: 1.25rem;
  font-weight: 800;
  margin-left: 1px;
  opacity: 0.9;
}

/* Content */
.loader-content {
  text-align: center;
}

.status-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
}

.status-msg-wrapper {
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.status-msg {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
  font-weight: 550;
}

.status-msg-placeholder {
  opacity: 0;
}

/* Animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.15); opacity: 0.8; }
}

/* Status Message Transition (Slower) */
.status-slide-enter-active,
.status-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.status-slide-enter-from { opacity: 0; transform: translateY(12px); }
.status-slide-leave-to { opacity: 0; transform: translateY(-12px); }

/* Digit Slide Transition (Faster Odometer Effect) */
.digit-slide-enter-active,
.digit-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy effect */
}

.digit-slide-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.digit-slide-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.digit-slide-leave-active {
  position: absolute;
}
</style>
