<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { UserPlus, Eye, EyeOff, BookOpen } from 'lucide-vue-next'
import { api } from '../services/api'
import { useFormValidation } from '../composables/useformValidation'
import FormError from '../components/formError.vue'

const router = useRouter()
const username = ref('')
const fullName = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

const { error, validate, rules } = useFormValidation()

const handleRegister = async () => {
  const ok = validate([
    rules.allRequired([
      { value: fullName.value, label: 'Full Name' },
      { value: username.value, label: 'Username' },
      { value: password.value, label: 'Password' },
      { value: confirmPassword.value, label: 'Confirm Password' },
    ]),
    rules.required(fullName.value, 'Full Name'),
    rules.required(username.value, 'Username'),
    rules.minLength(username.value, 3, 'Username'),
    rules.required(password.value, 'Password'),
    rules.minLength(password.value, 8, 'Password'),
    rules.required(confirmPassword.value, 'Please confirm your password'),
    rules.match(password.value, confirmPassword.value, 'Passwords'),
  ])
  if (!ok) return

  loading.value = true
  try {
    await api.register({
      username: username.value,
      full_name: fullName.value,
      password: password.value,
      role: 'Student'
    })
    router.push({ name: 'login' })
  } catch (err) {
    error.value = (err as Error).message || 'Registration failed.'
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
          <BookOpen :size="18" color="#fff" stroke-width="2.5" />
        </div>
        <span class="logo-text">LUMIA</span>
      </RouterLink>

      <div class="auth-header">
        <h1>Create account</h1>
        <p>Join the research community.</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">

        <FormError :message="error" />

        <div class="field">
          <label for="fullName">Full Name</label>
          <input v-model="fullName" id="fullName" type="text" placeholder="Lusty" />
        </div>

        <div class="field">
          <label for="username">Username</label>
          <input v-model="username" id="username" type="text" autocomplete="username" placeholder="lusty" />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrap">
            <input v-model="password" id="password" :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password" placeholder="••••••••" />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
              <Eye v-if="!showPassword" :size="14" />
              <EyeOff v-else :size="14" />
            </button>
          </div>
        </div>

        <div class="field">
          <label for="confirmPassword">Confirm Password</label>
          <div class="input-wrap">
            <input v-model="confirmPassword" id="confirmPassword" :type="showConfirm ? 'text' : 'password'"
              autocomplete="new-password" placeholder="••••••••" />
            <button type="button" class="eye-btn" @click="showConfirm = !showConfirm" tabindex="-1">
              <Eye v-if="!showConfirm" :size="14" />
              <EyeOff v-else :size="14" />
            </button>
          </div>
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <UserPlus v-else :size="15" />
          {{ loading ? 'Creating account…' : 'Register' }}
        </button>

      </form>

      <p class="switch-link">
        Already have an account?
        <RouterLink :to="{ name: 'login' }">Sign in</RouterLink>
      </p>

    </div>
  </div>
</template>

<style scoped>

.auth-page {
  --ink: #181c18;
  --ink-2: #3d4239;
  --ink-3: #7a7f75;
  --rule: #dfe0db;
  --surface: #f5f5f2;
  --paper: #ffffff;
  --green: #00a651;
  --green-dk: #007d3d;

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
  max-width: 420px;
}

.auth-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  text-decoration: none;
  margin-bottom: 1.75rem;
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: var(--green);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--ink);
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
