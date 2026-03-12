<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { Search, BookOpen, Settings, LogOut, Menu, X, ArrowRight } from 'lucide-vue-next'
import { api } from '../services/api'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const searchQuery = ref('')
const isLoggedIn = ref(false)
const showMobileMenu = ref(false)

const { isStaff } = useAuth()

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
    router.push({ name: 'explore', query: { q: searchQuery.value } })
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
        <span class="logo-text">LUMIA MAGIC</span>
      </RouterLink>

      <!-- Center: Search Bar (Hidden on home and management pages to avoid redundancy) -->
      <transition name="fade">
        <div v-if="!['home', 'management'].includes(route.name as string)" class="nav-search-wrap">
          <div class="nav-search">
            <Search :size="16" class="search-icon" />
            <input v-model="searchQuery" type="text" placeholder="Search publications, authors, topics..."
              @keyup.enter="handleSearch" />
          </div>
        </div>
      </transition>

      <!-- Right: Links & Actions -->
      <div class="nav-actions" :class="{ 'mobile-open': showMobileMenu }">
        <RouterLink :to="{ name: 'explore' }" class="nav-item">Explore</RouterLink>

        <template v-if="isLoggedIn">
          <RouterLink v-if="isStaff" :to="{ name: 'management' }" class="nav-item">
            <Settings :size="16" /> Management
          </RouterLink>
          <div class="nav-divider"></div>
          <button @click="logout" class="nav-item logout-btn">
            <LogOut :size="16" /> Logout
          </button>
        </template>

        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="get-started-btn">
            Get started
            <ArrowRight :size="15" />
          </RouterLink>
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
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

/* ── Logo ──────────────────────────────────────────────────────── */
.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-icon {
  width: 30px;
  height: 30px;
  background: #00a651;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 800;
  color: #111827;
  letter-spacing: 0.06em;
}

/* ── Search ────────────────────────────────────────────────────── */
.nav-search-wrap {
  flex: 1;
  max-width: 520px;
}

.nav-search {
  position: relative;
  display: flex;
  align-items: center;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 0 0.875rem;
  height: 36px;
  border: 1.5px solid transparent;
  transition: all 0.15s;
}

.nav-search:focus-within {
  background: #fff;
  border-color: #00a651;
  box-shadow: 0 0 0 3px rgba(0, 166, 81, 0.1);
}

.search-icon {
  color: #9ca3af;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.nav-search input {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  font-size: 0.875rem;
  color: #111827;
}

.nav-search input::placeholder {
  color: #9ca3af;
}

/* ── Right actions ─────────────────────────────────────────────── */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* Base nav link */
.nav-item {
  text-decoration: none;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}

.nav-item:hover {
  color: #111827;
  background: #f3f4f6;
}

.nav-item.router-link-active {
  color: #00a651;
  background: #f0fdf4;
}

/* Logout button reset */
.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

/* Divider between staff links and logout */
.nav-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 0.25rem;
}

/* Get started CTA */
.get-started-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  text-decoration: none;
  background: #00a651;
  color: #fff;
  padding: 0.45rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  margin-left: 0.5rem;
  transition: background 0.15s, box-shadow 0.15s;
  line-height: 1;
}

.get-started-btn:hover {
  background: #008c44;
  box-shadow: 0 2px 8px rgba(0, 166, 81, 0.25);
}

.get-started-btn svg {
  flex-shrink: 0;
}

/* Mobile toggle */
.mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: #111827;
  cursor: pointer;
  padding: 0.25rem;
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

  /* Mobile dropdown menu — hidden by default using visibility + opacity
     so it is fully removed from interaction and cannot bleed into the
     page below (the management topbar sits right at top: 64px + 52px).
     z-index 999 keeps it below the management sidebar drawer (1100). */
  .nav-actions {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: #fff;
    flex-direction: column;
    align-items: flex-start;
    padding: 1.25rem 1.5rem;
    gap: 0.25rem;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    /* Use visibility + opacity instead of transform so the element
       is fully non-interactive and invisible when closed */
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-8px);
    transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
    z-index: 999;
  }

  .nav-actions.mobile-open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
  }

  .nav-item {
    width: 100%;
    padding: 0.6rem 0.75rem;
  }

  .get-started-btn {
    width: 100%;
    justify-content: center;
    margin-left: 0;
    margin-top: 0.5rem;
  }

  .nav-divider {
    width: 100%;
    height: 1px;
    margin: 0.25rem 0;
  }

  .nav-divider {
    display: none;
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
