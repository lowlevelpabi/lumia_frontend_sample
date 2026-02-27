<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { Search, BookOpen, User, Settings, LogOut, Bell, Menu, X } from 'lucide-vue-next'
import { api } from '../services/api'

const router = useRouter()
const route = useRoute()
const searchQuery = ref('')
const isLoggedIn = ref(false)
const showMobileMenu = ref(false)

const checkAuth = () => {
    isLoggedIn.value = !!localStorage.getItem('token')
}

onMounted(checkAuth)

// Watch for route changes to refresh auth and close mobile menu
watch(() => route.path, () => {
    checkAuth()
    showMobileMenu.value = false
})

const handleSearch = () => {
    if (searchQuery.value.trim()) {
        router.push({ name: 'results', query: { q: searchQuery.value } })
        searchQuery.value = ''
        showMobileMenu.value = false
    }
}

const logout = () => {
    api.logout()
    isLoggedIn.value = false
    router.push({ name: 'home' })
}
</script>

<template>
    <nav class="global-navbar">
        <div class="nav-container">
            <!-- Left: Logo -->
            <RouterLink :to="{ name: 'home' }" class="nav-logo">
                <div class="logo-icon">
                    <BookOpen :size="20" color="#fff" />
                </div>
                <span class="logo-text">LUMIA</span>
            </RouterLink>

            <!-- Center: Search Bar (Hidden on small mobile, shown on tablet/desktop) -->
            <div class="nav-search-wrap">
                <div class="nav-search">
                    <Search :size="16" class="search-icon" />
                    <input v-model="searchQuery" type="text" placeholder="Search publications, authors, topics..."
                        @keyup.enter="handleSearch" />
                </div>
            </div>

            <!-- Right: Links & Actions -->
            <div class="nav-actions" :class="{ 'mobile-open': showMobileMenu }">
                <RouterLink :to="{ name: 'results', query: { q: '' } }" class="nav-item">Explore</RouterLink>

                <template v-if="isLoggedIn">
                    <RouterLink :to="{ name: 'management' }" class="nav-item">
                        <Settings :size="16" /> Management
                    </RouterLink>
                    <div class="nav-divider"></div>
                    <button @click="logout" class="nav-item logout-btn">
                        <LogOut :size="16" /> Logout
                    </button>
                </template>

                <template v-else>
                    <RouterLink :to="{ name: 'login' }" class="login-link">Log in</RouterLink>
                    <RouterLink :to="{ name: 'register' }" class="register-btn">Sign up for free</RouterLink>
                </template>
            </div>

            <!-- Mobile Toggle -->
            <button class="mobile-toggle" @click="showMobileMenu = !showMobileMenu">
                <Menu v-if="!showMobileMenu" :size="24" />
                <X v-else :size="24" />
            </button>
        </div>
    </nav>
</template>

<style scoped>
.global-navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    z-index: 1000;
    display: flex;
    align-items: center;
}

.nav-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
}

.nav-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    flex-shrink: 0;
}

.logo-icon {
    width: 32px;
    height: 32px;
    background: #00a651;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-text {
    font-size: 1.25rem;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.01em;
}

.nav-search-wrap {
    flex: 1;
    max-width: 600px;
}

.nav-search {
    position: relative;
    display: flex;
    align-items: center;
    background: #f3f4f6;
    border-radius: 20px;
    padding: 0 1rem;
    height: 38px;
    transition: all 0.2s;
}

.nav-search:focus-within {
    background: #fff;
    box-shadow: 0 0 0 2px rgba(0, 166, 81, 0.2);
    border: 1px solid #00a651;
}

.search-icon {
    color: #6b7280;
    margin-right: 0.75rem;
}

.nav-search input {
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
    font-size: 0.9rem;
    color: #111827;
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.nav-item {
    text-decoration: none;
    color: #4b5563;
    font-size: 0.95rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s;
}

.nav-item:hover {
    color: #00a651;
}

.logout-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
}

.nav-divider {
    width: 1px;
    height: 24px;
    background: #e5e7eb;
}

.login-link {
    text-decoration: none;
    color: #111827;
    font-weight: 600;
    font-size: 0.95rem;
}

.register-btn {
    text-decoration: none;
    background: #00a651;
    color: #fff;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background 0.2s;
}

.register-btn:hover {
    background: #008c44;
}

.mobile-toggle {
    display: none;
    background: none;
    border: none;
    color: #111827;
    cursor: pointer;
}

@media (max-width: 1024px) {
    .nav-search-wrap {
        display: none;
    }
}

@media (max-width: 768px) {
    .mobile-toggle {
        display: block;
    }

    .nav-actions {
        position: fixed;
        top: 64px;
        left: 0;
        right: 0;
        background: #fff;
        flex-direction: column;
        padding: 2rem;
        gap: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        transform: translateY(-150%);
        transition: transform 0.3s ease-in-out;
    }

    .nav-actions.mobile-open {
        transform: translateY(0);
    }

    .nav-divider {
        display: none;
    }
}
</style>
