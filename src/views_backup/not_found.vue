<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Home, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

const goHome = () => {
  router.push({ name: 'home' })
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="not-found">
    <div class="content">
      <h1 class="code">404</h1>
      <h2 class="title">Page Not Found</h2>
      <p class="desc">
        The research paper or archive you're looking for doesn't exist or has been moved.
      </p>
      
      <div class="actions">
        <button @click="goHome" class="btn primary">
          <Home :size="18" />
          <span>Back to Home</span>
        </button>
        <button @click="goBack" class="btn secondary">
          <ArrowLeft :size="18" />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: white;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.content {
  text-align: center;
  max-width: 450px;
}

.code {
  font-size: 8rem;
  font-weight: 900;
  margin: 0;
  line-height: 1;
  background: linear-gradient(135deg, #00a651, #007a3d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: 0.15;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: -1rem 0 1rem;
}

.desc {
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 2.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn.primary {
  background: #00a651;
  color: white;
}

.btn.primary:hover {
  background: #008f45;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.2);
}

.btn.secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn.secondary:hover {
  background: #e2e8f0;
  color: #1e293b;
}

@media (max-width: 640px) {
  .code {
    font-size: 6rem;
  }
  .title {
    font-size: 1.75rem;
  }
  .actions {
    flex-direction: column;
  }
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
