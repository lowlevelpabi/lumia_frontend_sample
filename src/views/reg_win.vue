<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { UserPlus, User, Mail, Lock, BookOpen } from 'lucide-vue-next'
import { api } from '../services/api'

const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await api.register({
      username: username.value,
      email: email.value,
      password: password.value,
      role: 'User'
    })
    // Auto login or redirect to login
    router.push({ name: 'login' })
  } catch (err) {
    error.value = (err as Error).message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo">
          <BookOpen :size="32" color="#10b981" />
          <span>Lumia Retrieval</span>
        </div>
        <h1>Create Account</h1>
        <p>Join the research community</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div v-if="error" class="error-msg">{{ error }}</div>

        <div class="input-group">
          <label>
            <User :size="14" /> Username
          </label>
          <input v-model="username" id="username" type="text" autocomplete="username" required placeholder="johndoe" />
        </div>

        <div class="input-group">
          <label>
            <Mail :size="14" /> Email Address
          </label>
          <input v-model="email" id="email" type="email" autocomplete="email" required placeholder="john@example.com" />
        </div>

        <div class="input-group">
          <label>
            <Lock :size="14" /> Password
          </label>
          <input v-model="password" id="password" type="password" autocomplete="new-password" required
            placeholder="••••••••" />
        </div>

        <div class="input-group">
          <label>
            <Lock :size="14" /> Confirm Password
          </label>
          <input v-model="confirmPassword" id="confirmPassword" type="password" autocomplete="new-password" required
            placeholder="••••••••" />
        </div>

        <button type="submit" class="auth-btn" :disabled="loading">
          <UserPlus v-if="!loading" :size="18" />
          <span v-else class="loader"></span>
          {{ loading ? 'Creating Account...' : 'Register' }}
        </button>
      </form>

      <div class="auth-footer">
        Already have an account?
        <RouterLink :to="{ name: 'login' }">Sign in</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Resusing styles from LoginView for consistency */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb;
  padding: 2rem;
}

.auth-card {
  background: white;
  width: 100%;
  max-width: 450px;
  padding: 3rem;
  border-radius: 12px;
  border: 1px solid #eee;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-weight: 800;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
  background: white !important;
  box-sizing: border-box;
}

.input-group input:not(:placeholder-shown) {
  color: #111827;
  -webkit-text-fill-color: #111827;
}

.input-group input:focus {
  outline: none;
  border-color: #10b981;
}



/* Kill Chrome autofill green/yellow */
.input-group input:-webkit-autofill,
.input-group input:-webkit-autofill:hover,
.input-group input:-webkit-autofill:focus,
.input-group input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 9999px white inset !important;
  -webkit-text-fill-color: #111827 !important;
  caret-color: #111827;
}

.auth-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.9rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.error-msg {
  background: #fef2f2;
  color: #b91c1c;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.auth-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.9rem;
}

.auth-footer a {
  color: #10b981;
  text-decoration: none;
  font-weight: 600;
}

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid white;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* ── Tablet (≤768px) ─────────────────────────────────────────── */
@media (max-width: 768px) {
  .auth-page {
    padding: 1.5rem;
  }

  .auth-card {
    padding: 2.25rem;
    max-width: 100%;
  }
}

/* ── Phone (≤480px) — Primary Android target 360–412px ───────── */
@media (max-width: 480px) {
  .auth-page {
    padding: 1rem;
    align-items: flex-start;
    padding-top: 2rem;
  }

  .auth-card {
    padding: 1.75rem 1.25rem;
    border-radius: 8px;
  }

  .logo {
    font-size: 1.25rem;
  }

  .auth-form {
    gap: 1rem;
  }
}
</style>
