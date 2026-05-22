<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-vue-next'
import { api } from '../services/api'
import { useFormValidation } from '../composables/useformValidation'
import FormError from '../components/formError.vue'

const route = useRoute()
const username = ref('')
const password = ref('')
const loading = ref(false)
const showPassword = ref(false)

const { error, validate, rules } = useFormValidation()

const handleLogin = async () => {
  const ok = validate([
    rules.allRequired([
      { value: username.value, label: 'Username' },
      { value: password.value, label: 'Password' },
    ]),
    rules.required(username.value, 'Username'),
    rules.required(password.value, 'Password'),
  ])
  if (!ok) return

  loading.value = true
  try {
    const formData = new FormData()
    formData.append('username', username.value)
    formData.append('password', password.value)
    await api.login(formData)
    const redirect = route.query.redirect as string | undefined
    window.location.href = redirect || '/'
  } catch {
    error.value = 'Invalid username or password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">

      <RouterLink :to="{ name: 'home' }" class="auth-logo">
        <div class="logo-icon">
          <img src="/lumia_logo.ico" style="width: 22px; height: 22px; object-fit: contain" />
        </div>
        <span class="logo-text">UMIA</span>
      </RouterLink>

      <div class="auth-header">
        <h1>Welcome back</h1>
        <p>Sign in to access research &amp; management tools.</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">

        <FormError :message="error" />

        <div class="field">
          <label for="username">Username</label>
          <input v-model="username" id="username" type="text" autocomplete="username" placeholder="lusty" />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrap">
            <input v-model="password" id="password" :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password" placeholder="••••••••" />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
              <Eye v-if="!showPassword" :size="14" />
              <EyeOff v-else :size="14" />
            </button>
          </div>
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <LogIn v-else :size="15" />
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>

      </form>

      <p class="switch-link">
        Don&rsquo;t have an account?
        <RouterLink :to="{ name: 'register' }">Register here</RouterLink>
      </p>

      <div class="auth-footer">
        <RouterLink :to="{ name: 'home' }" class="home-link">
          <ArrowLeft :size="14" /> Back to Home
        </RouterLink>
      </div>

    </div>
  </div>
</template>

<style scoped>
.auth-page {
  --ink: var(--text-primary);
  --ink-2: var(--text-secondary);
  --ink-3: var(--text-tertiary);
  --rule: var(--border-color);
  --surface: var(--bg-primary);
  --paper: var(--bg-secondary);
  --green: var(--accent-primary);
  --green-dk: var(--accent-primary);

  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
  padding: 2rem;
}

.auth-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 2.5rem 2.25rem;
  width: 100%;
  max-width: 400px;
}

.auth-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  margin-bottom: 2rem;
  position: relative;
  /* We use inline-flex so it centers via text-align: center on card */
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--logo-bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  z-index: 2;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
  border: 1px solid var(--logo-border);
  /* Stay above text during slide */
  animation: logo-entrance 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    logo-breathe 3s ease-in-out infinite 1.6s;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-text {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: var(--ink);
  opacity: 0;
  z-index: 1;
  animation: text-reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.8s;
}

@keyframes logo-entrance {
  0% {
    opacity: 0;
    /* 200px (center) - 36px (padding) - 18px (half-width of 36px) = 146px */
    transform: translateX(146px) scale(0.9);
  }

  35% {
    opacity: 1;
    transform: translateX(146px) scale(1.1);
  }

  45% {
    opacity: 1;
    transform: translateX(146px) scale(1);
  }

  75% {
    transform: translateX(0);
    /* Return to its natural left-aligned position */
  }

  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes text-reveal {
  0% {
    opacity: 0;
    transform: translateX(-40px);
    /* Hidden behind the logo */
    filter: blur(4px);
  }

  30% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
    transform: translateX(0);
    filter: blur(0);
  }
}

@keyframes logo-breathe {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.85;
    transform: scale(0.96);
  }
}

.auth-header {
  margin-bottom: 1.75rem;
  padding-bottom: 1.75rem;
  border-bottom: 1px solid var(--rule);
}

.auth-header h1 {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.45rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.3rem;
  letter-spacing: -0.01em;
}

.auth-header p {
  font-size: 0.84rem;
  color: var(--ink-3);
  margin: 0;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-bottom: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
}

.field input,
.input-wrap input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: 1.5px solid var(--rule);
  border-radius: 3px;
  background: var(--paper);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.9rem;
  color: var(--ink);
  transition: border-color 0.14s;
  box-sizing: border-box;
}

.field input:focus,
.input-wrap input:focus {
  outline: none;
  border-color: var(--green);
}

.field input::placeholder,
.input-wrap input::placeholder {
  color: var(--ink-3);
  opacity: 0.5;
}

.field input:-webkit-autofill,
.input-wrap input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 9999px var(--paper) inset !important;
  -webkit-text-fill-color: var(--ink) !important;
}

.input-wrap {
  position: relative;
}

.input-wrap input {
  padding-right: 2.4rem;
}

.eye-btn {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.13s;
}

.eye-btn:hover {
  color: var(--ink);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.75rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s;
  margin-top: 0.15rem;
  width: 100%;
}

.submit-btn:hover:not(:disabled) {
  background: var(--green-dk);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.switch-link {
  font-size: 0.82rem;
  color: var(--ink-3);
  margin: 0;
  text-align: center;
}

.switch-link a {
  color: var(--green-dk);
  font-weight: 600;
  text-decoration: none;
}

.switch-link a:hover {
  color: var(--green);
}

.auth-footer {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--rule);
  display: flex;
  justify-content: center;
}

.home-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-3);
  text-decoration: none;
  transition: color 0.15s;
}

.home-link:hover {
  color: var(--green-dk);
}

@media (max-width: 480px) {
  .auth-page {
    padding: 1.25rem;
    align-items: flex-start;
    padding-top: 3rem;
  }

  .auth-card {
    padding: 2rem 1.5rem;
  }
}
</style>
