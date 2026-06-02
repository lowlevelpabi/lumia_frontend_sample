<script setup lang="ts">
import { useToastStore } from "../stores/toast";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-vue-next";

const toastStore = useToastStore();

const handlePause = (toastId: string) => {
  toastStore.pauseToast(toastId);
};

const handleClose = (toastId: string) => {
  toastStore.removeToast(toastId);
};

const handleToggleExpand = (toastId: string) => {
  toastStore.toggleExpand(toastId);
};
</script>

<template>
  <div class="toast-container" aria-live="assertive">
    <TransitionGroup name="toast-slide">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-card"
        :class="[toast.type, { expanded: toast.isExpanded }]"
      >
        <!-- Top Half: Content & Actions -->
        <div class="toast-body">
          <div class="toast-content-wrapper">
            <!-- Icon -->
            <div class="toast-icon-sec">
              <CheckCircle v-if="toast.type === 'success'" class="icon-success" :size="18" />
              <XCircle v-else-if="toast.type === 'error'" class="icon-error" :size="18" />
              <AlertTriangle v-else-if="toast.type === 'warning'" class="icon-warning" :size="18" />
              <Info v-else class="icon-info" :size="18" />
            </div>

            <!-- Title & Details -->
            <div class="toast-text-sec">
              <span class="toast-title">{{ toast.title }}</span>
              <Transition name="expand">
                <div v-if="toast.isExpanded && toast.description" class="toast-desc">
                  {{ toast.description }}
                </div>
              </Transition>
            </div>
          </div>

          <!-- Top-Right Actions -->
          <div class="toast-actions">
            <!-- Chevron Down / Up for details, only if description exists -->
            <button
              v-if="toast.description"
              class="action-btn chevron-btn"
              @click="handleToggleExpand(toast.id)"
              :aria-label="toast.isExpanded ? 'Collapse details' : 'Expand details'"
            >
              <ChevronUp v-if="toast.isExpanded" :size="14" />
              <ChevronDown v-else :size="14" />
            </button>

            <!-- Dismiss Close X button -->
            <button
              class="action-btn close-btn"
              @click="handleClose(toast.id)"
              aria-label="Dismiss notification"
            >
              <X :size="14" />
            </button>
          </div>
        </div>

        <!-- Bottom Half: Timer / Pause Banner -->
        <div
          class="toast-timer-banner"
          :class="{ paused: toast.paused }"
          @click="handlePause(toast.id)"
        >
          <span v-if="!toast.paused" class="timer-text">
            This message will close in
            <strong class="time-num">{{ toast.remaining }}</strong> seconds.
            <span class="btn-stop">Click to stop.</span>
          </span>
          <span v-else class="timer-text paused-text"> Auto-dismiss paused. </span>
        </div>

        <!-- Progress Bar at the very bottom -->
        <div class="toast-progress-container">
          <div 
            :key="toast.refreshKey"
            class="toast-progress-bar"
            :style="{ 
              animationName: 'shrink',
              animationDuration: `${toast.duration}s`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              animationPlayState: toast.paused ? 'paused' : 'running'
            }"
          ></div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
  max-width: 360px;
  width: calc(100vw - 48px);
  pointer-events: none;
}

.toast-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow:
    var(--shadow-md),
    0 8px 24px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
}

.dark .toast-card {
  box-shadow:
    var(--shadow-md),
    0 8px 24px rgba(0, 0, 0, 0.4);
}

/* Header/Body styling */
.toast-body {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.toast-content-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
}

.toast-icon-sec {
  display: flex;
  align-items: center;
  margin-top: 1px;
}

/* Icon Colors */
.icon-success {
  color: var(--accent-primary);
}
.icon-error {
  color: #ef4444;
}
.icon-warning {
  color: #f59e0b;
}
.icon-info {
  color: #3b82f6;
}

.toast-text-sec {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text-primary);
  line-height: 1.35;
}

.toast-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.toast-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* Bottom Timer Banner */
.toast-timer-banner {
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  padding: 6px 12px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.toast-timer-banner:hover:not(.paused) {
  background-color: var(--border-color);
  color: var(--text-primary);
}

.timer-text {
  display: block;
}

.time-num {
  font-weight: 600;
  color: var(--text-primary);
}

.btn-stop {
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: underline;
  margin-left: 2px;
}

.paused-text {
  font-weight: 500;
  color: var(--text-tertiary);
  font-style: italic;
}

/* Bottom Progress Bar */
.toast-progress-container {
  height: 4px;
  background-color: rgba(0, 0, 0, 0.05);
  width: 100%;
}

.dark .toast-progress-container {
  background-color: rgba(255, 255, 255, 0.05);
}

.toast-progress-bar {
  height: 100%;
  width: 100%;
  transform-origin: left;
}

/* Progress bar color depending on notification type */
.success .toast-progress-bar {
  background-color: var(--accent-primary);
}
.error .toast-progress-bar {
  background-color: #ef4444;
}
.warning .toast-progress-bar {
  background-color: #f59e0b;
}
.info .toast-progress-bar {
  background-color: #3b82f6;
}

/* Vue Animations: slide-in/out and expand */
.toast-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.82, 0, 0.8, 0.7);
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(40px) scale(0.95);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

/* Smooth list re-ordering if a toast in the middle is removed */
.toast-slide-move {
  transition: transform 0.3s ease;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 200px;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

</style>

<style>
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
