<script setup lang="ts">
import { computed } from 'vue'

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
      <!-- Premium SVG Orbiting Ring Spinner -->
      <div class="spinner-orbit">
        <div class="orbit-glow"></div>
        <svg class="ring-svg" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--green-color)" stop-opacity="1" />
              <stop offset="60%" stop-color="var(--green-color)" stop-opacity="0.7" />
              <stop offset="100%" stop-color="var(--green-color)" stop-opacity="0.05" />
            </linearGradient>
          </defs>
          <!-- Background track -->
          <circle class="ring-track" cx="80" cy="80" r="70" stroke-width="4" fill="none" />
          <!-- Animated gradient spinner circle -->
          <circle class="ring-indicator" cx="80" cy="80" r="70" stroke-width="4" fill="none" stroke="url(#spinnerGradient)" />
        </svg>
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
  --green-color: #00a651;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --track-stroke: rgba(0, 166, 81, 0.08);
}

:global(.dark) .minimal-loader {
  --green-color: #00c853;
  --text-main: #f8fafc;
  --text-sub: #94a3b8;
  --track-stroke: rgba(255, 255, 255, 0.06);
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

:global(.dark) .orbit-glow {
  background: radial-gradient(circle, rgba(0, 200, 83, 0.12) 0%, transparent 70%);
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track {
  stroke: var(--track-stroke);
}

.ring-indicator {
  stroke-dasharray: 440;
  stroke-dashoffset: 140;
  stroke-linecap: round;
  transform-origin: center;
  animation: spin-gradient 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  filter: drop-shadow(0 0 10px rgba(0, 166, 81, 0.3));
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
  color: var(--green-color);
  text-shadow: 0 0 12px rgba(0, 166, 81, 0.15);
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
  color: var(--text-main);
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
  color: var(--text-sub);
  margin: 0;
  font-weight: 550;
}

.status-msg-placeholder {
  opacity: 0;
}

/* Animations */
@keyframes spin-gradient {
  0% {
    transform: rotate(0deg);
    stroke-dashoffset: 350;
  }
  50% {
    stroke-dashoffset: 120;
  }
  100% {
    transform: rotate(360deg);
    stroke-dashoffset: 350;
  }
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
