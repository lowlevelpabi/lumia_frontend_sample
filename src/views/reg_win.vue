<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { UserPlus, User, Mail, Lock, ShieldCheck, BookOpen } from 'lucide-vue-next'
import { api } from '../services/api'

const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')
const role = ref('User')
const loading = ref(false)
const error = ref('')

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  try {
    await api.register({
      username: username.value,
      email: email.value,
      password: password.value,
      role: role.value
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
          <input v-model="username" type="text" required placeholder="johndoe" />
        </div>

        <div class="input-group">
          <label>
            <Mail :size="14" /> Email Address
          </label>
          <input v-model="email" type="email" required placeholder="john@example.com" />
        </div>

        <div class="input-group">
          <label>
            <Lock :size="14" /> Password
          </label>
          <input v-model="password" type="password" required placeholder="••••••••" />
        </div>

        <div class="input-group">
          <label>
            <ShieldCheck :size="14" /> Account Type
          </label>
          <select v-model="role" class="role-select">
            <option value="User">Student</option>
            <option value="Faculty">Faculty / Admin</option>
          </select>
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

.input-group input,
.role-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.role-select {
  background-color: white;
  cursor: pointer;
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
</style>
