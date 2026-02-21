<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { LogIn, User, Lock, AlertCircle, BookOpen } from 'lucide-vue-next'
import { api } from '../services/api'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
    if (!username.value || !password.value) return
    loading.value = true
    error.value = ''

    const formData = new FormData()
    formData.append('username', username.value)
    formData.append('password', password.value)

    try {
        await api.login(formData)
        router.push({ name: 'home' })
    } catch {
        error.value = 'Invalid username or password'
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
                <h1>Welcome Back</h1>
                <p>Sign in to access research & management tools</p>
            </div>

            <form @submit.prevent="handleLogin" class="auth-form">
                <div v-if="error" class="error-msg">
                    <AlertCircle :size="16" />
                    {{ error }}
                </div>

                <div class="input-group">
                    <label for="username">
                        <User :size="14" /> Username
                    </label>
                    <input v-model="username" id="username" type="text" required placeholder="johndoe" />
                </div>

                <div class="input-group">
                    <label for="password">
                        <Lock :size="14" /> Password
                    </label>
                    <input v-model="password" id="password" type="password" required placeholder="••••••••" />
                </div>

                <button type="submit" class="auth-btn" :disabled="loading">
                    <LogIn v-if="!loading" :size="18" />
                    <span v-else class="loader"></span>
                    {{ loading ? 'Signing in...' : 'Sign In' }}
                </button>
            </form>

            <div class="auth-footer">
                Don't have an account?
                <RouterLink :to="{ name: 'register' }">Register here</RouterLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
    max-width: 400px;
    padding: 3rem;
    border-radius: 12px;
    border: 1px solid #eee;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03);
}

.auth-header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-weight: 800;
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #111;
}

.auth-header h1 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}

.auth-header p {
    color: #666;
    font-size: 0.9rem;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.error-msg {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef2f2;
    color: #b91c1c;
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
}

.input-group label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #444;
}

.input-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.input-group input:focus {
    outline: none;
    border-color: #10b981;
}

.auth-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.9rem;
    border-radius: 6px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.auth-btn:hover {
    background: #059669;
}

.auth-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.auth-footer {
    margin-top: 2rem;
    text-align: center;
    font-size: 0.9rem;
    color: #666;
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
