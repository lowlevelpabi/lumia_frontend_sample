<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';

defineProps<{
  message: string
}>()
</script>

<template>
  <div v-if="message" class="form-error">
    <AlertCircle :size="14" />
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.form-error {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.6rem 0.8rem;
  border-radius: 3px;
  font-size: 0.8rem;
  font-family: 'Source Sans 3', sans-serif;
}
</style>