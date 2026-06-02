import { ref } from "vue";
import { defineStore } from "pinia";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
  duration: number;
  remaining: number;
  paused: boolean;
  isExpanded: boolean;
  refreshKey: number;
}

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<Toast[]>([]);
  const intervals: Record<string, number> = {};

  function addToast(toastOpts: {
    title: string;
    description?: string;
    type?: "success" | "error" | "warning" | "info";
    duration?: number;
  }) {
    const duration = toastOpts.duration ?? 7;
    const type = toastOpts.type ?? "info";

    // Deduplicate identical active toasts
    const duplicate = toasts.value.find(
      (t) => t.title === toastOpts.title && t.description === toastOpts.description,
    );
    if (duplicate) {
      duplicate.duration = duration;
      duplicate.remaining = duration;
      duplicate.paused = false;
      duplicate.refreshKey++;
      return duplicate.id;
    }

    const id = Math.random().toString(36).substring(2, 9);

    const newToast: Toast = {
      id,
      title: toastOpts.title,
      description: toastOpts.description,
      type,
      duration,
      remaining: duration,
      paused: false,
      isExpanded: false,
      refreshKey: 0,
    };

    toasts.value.push(newToast);

    // Set up the countdown timer
    const intervalId = window.setInterval(() => {
      const toast = toasts.value.find((t) => t.id === id);
      if (!toast) {
        clearInterval(intervalId);
        return;
      }

      if (!toast.paused) {
        toast.remaining -= 1;
        if (toast.remaining <= 0) {
          removeToast(id);
        }
      }
    }, 1000);

    intervals[id] = intervalId;
    return id;
  }

  function removeToast(id: string) {
    if (intervals[id]) {
      clearInterval(intervals[id]);
      delete intervals[id];
    }
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function pauseToast(id: string) {
    const toast = toasts.value.find((t) => t.id === id);
    if (toast) {
      toast.paused = true;
      if (intervals[id]) {
        clearInterval(intervals[id]);
        delete intervals[id];
      }
    }
  }

  function toggleExpand(id: string) {
    const toast = toasts.value.find((t) => t.id === id);
    if (toast) {
      toast.isExpanded = !toast.isExpanded;
    }
  }

  return { toasts, addToast, removeToast, pauseToast, toggleExpand };
});
