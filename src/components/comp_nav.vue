<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
  Search, BookOpen, ArrowRight, LogOut, Settings,
  ChevronDown, Home, Info, Compass, UserCircle, X, Menu
} from 'lucide-vue-next'
import { api } from '../services/api'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const searchQuery = ref('')
const isLoggedIn = ref(false)
const showMobileMenu = ref(false)
const showMobileSearch = ref(false)
const showProfileMenu = ref(false)

const { isStaff, username, fullName, userRole } = useAuth()

const checkAuth = () => {
  isLoggedIn.value = !!localStorage.getItem('token')
}

// Click outside logic for profile dropdown
const closeProfileMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.nav-profile-container')) {
    showProfileMenu.value = false
  }
}

onMounted(() => {
  checkAuth()
  window.addEventListener('click', closeProfileMenu)
})

onUnmounted(() => {
  window.removeEventListener('click', closeProfileMenu)
})

// Watch for route changes to refresh auth and close menus
watch(() => route.path, () => {
  checkAuth()
  showMobileMenu.value = false
  showProfileMenu.value = false
  showMobileSearch.value = false
})

const toggleMobileSearch = () => {
  showMobileSearch.value = !showMobileSearch.value
  if (showMobileSearch.value) showMobileMenu.value = false
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  if (showMobileMenu.value) showMobileSearch.value = false
}

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'explore', query: { q: searchQuery.value } })
    searchQuery.value = ''
    showMobileMenu.value = false
    showMobileSearch.value = false
  }
}

const logout = () => {
  if (!confirm('Are you sure you want to sign out?')) return
  api.logout()
  isLoggedIn.value = false
  showProfileMenu.value = false
  router.push({ name: 'home' })
}
</script>

<template>
  <nav class="global-navbar">
    <div class="nav-container">

      <!-- Left: Logo (Institutional Branding) -->
      <RouterLink :to="{ name: 'home' }" class="nav-logo">
        <img src="/lumia_logo.ico" style="width: 32px; height: 32px;" />
        <div class="logo-text">
          UMIA <span class="logo-text--sub">Archiving</span>
        </div>
      </RouterLink>

      <!-- Center: Search Bar (Desktop) -->
      <transition name="nav-search-fade">
        <div v-if="!['home', 'management', 'login', 'register', 'about', 'profile'].includes(route.name as string)"
          class="nav-search-wrap">
          <div class="nav-search">
            <Search :size="14" class="search-icon" />
            <input v-model="searchQuery" type="text" placeholder="Search the repository..." @keyup.enter="handleSearch"
              spellcheck="false" autocomplete="off" />
            <div class="search-hint">⏎</div>
          </div>
        </div>
      </transition>

      <!-- Right: Desktop Actions & Profile -->
      <div class="nav-actions-desktop">
        <RouterLink :to="{ name: 'home' }" class="nav-item">Home</RouterLink>
        <!-- <RouterLink :to="{ name: 'about' }" class="nav-item">About</RouterLink> -->
        <RouterLink :to="{ name: 'explore' }" class="nav-item">Explore</RouterLink>
        <RouterLink v-if="isLoggedIn && isStaff" :to="{ name: 'management' }" class="nav-item nav-item--active">
          Management
        </RouterLink>

        <template v-if="isLoggedIn">
          <div class="nav-divider"></div>
          <div class="nav-profile-container">
            <button class="nav-profile-trigger" @click.stop="showProfileMenu = !showProfileMenu">
              <div class="profile-avatar">
                <img src="/avatar.png" alt="User Avatar" />
              </div>
              <div class="profile-info">
                <span class="profile-name">{{ fullName || 'Academic User' }}</span>
                <span class="profile-role">{{ userRole }}</span>
              </div>
              <ChevronDown :size="14" class="dropdown-arrow" :class="{ 'rotated': showProfileMenu }" />
            </button>

            <!-- Desktop Dropdown -->
            <transition name="dropdown-slide">
              <div v-if="showProfileMenu" class="nav-dropdown">
                <div class="dropdown-header">Account</div>
                <RouterLink :to="{ name: 'profile' }" class="dropdown-item">
                  <UserCircle :size="16" /> My Profile
                </RouterLink>
                <div class="dropdown-divider"></div>
                <button @click="logout" class="dropdown-item logout-btn">
                  <LogOut :size="16" /> Sign Out
                </button>
              </div>
            </transition>
          </div>
        </template>

        <template v-else>
          <div class="nav-divider"></div>
          <RouterLink :to="{ name: 'login' }" class="get-started-btn">
            Get started
            <ArrowRight :size="14" />
          </RouterLink>
        </template>
      </div>

      <!-- Mobile UI Controls -->
      <div class="mobile-controls">
        <button
          v-if="!['home', 'management', 'login', 'register', 'about', 'profile', 'explore'].includes(route.name as string)"
          class="mobile-control-btn" @click="toggleMobileSearch">
          <Search :size="20" />
        </button>
        <button class="mobile-control-btn" @click="toggleMobileMenu">
          <Menu v-if="!showMobileMenu" :size="22" />
          <X v-else :size="22" />
        </button>
      </div>

      <!-- Mobile Drawer Overlay -->
      <transition name="fade">
        <div v-if="showMobileMenu" class="mobile-drawer-overlay" @click="showMobileMenu = false"></div>
      </transition>

      <!-- Mobile Side Drawer -->
      <transition name="drawer-slide">
        <aside v-if="showMobileMenu" class="mobile-drawer">
          <!-- Drawer Header (Identity) -->
          <div v-if="isLoggedIn" class="drawer-user-card">
            <div class="drawer-user-cover"></div>
            <div class="drawer-user-info">
              <div class="drawer-avatar">
                <img src="/avatar.png" alt="User Avatar" />
              </div>
              <div class="drawer-text">
                <span class="drawer-name">{{ username || 'Academic User' }}</span>
                <span class="drawer-role">{{ userRole }}</span>
              </div>
            </div>
          </div>

          <div v-else class="drawer-guest-card">
            <div class="logo-icon">
              <BookOpen :size="18" color="#fff" />
            </div>
            <p>Welcome to Lumia</p>
          </div>

          <!-- Drawer Navigation -->
          <div class="drawer-nav">
            <div class="drawer-section">Navigation</div>
            <RouterLink :to="{ name: 'home' }" class="drawer-item">
              <Home :size="18" /> Home
            </RouterLink>
            <RouterLink :to="{ name: 'about' }" class="drawer-item">
              <Info :size="18" /> About
            </RouterLink>
            <RouterLink :to="{ name: 'explore' }" class="drawer-item">
              <Compass :size="18" /> Explore
            </RouterLink>

            <template v-if="isLoggedIn">
              <div class="drawer-section">Account</div>
              <RouterLink :to="{ name: 'profile' }" class="drawer-item">
                <UserCircle :size="18" /> My Profile
              </RouterLink>
              <RouterLink v-if="isStaff" :to="{ name: 'management' }" class="drawer-item">
                <Settings :size="18" />
                Management
              </RouterLink>
              <button @click="logout" class="drawer-item logout-mobile">
                <LogOut :size="18" /> Sign Out
              </button>
            </template>

            <template v-else>
              <div class="drawer-section">Access</div>
              <RouterLink :to="{ name: 'login' }" class="drawer-item drawer-cta">
                Get Started
                <ArrowRight :size="16" />
              </RouterLink>
            </template>
          </div>
        </aside>
      </transition>

      <!-- Mobile Search Overlay -->
      <transition name="search-slide">
        <div v-if="showMobileSearch" class="mobile-search-overlay">
          <div class="mobile-search-container">
            <Search :size="18" class="m-search-icon" />
            <input v-model="searchQuery" type="text" placeholder="Search publications..." @keyup.enter="handleSearch"
              autofocus />
            <button @click="showMobileSearch = false" class="close-search">
              <X :size="20" />
            </button>
          </div>
        </div>
      </transition>

    </div>
  </nav>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Source+Sans+3:wght@400;500;600;700&display=swap');

.global-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #ffffff;
  border-bottom: 1.5px solid #dfe0db;
  z-index: 1000;
  display: flex;
  align-items: center;
  font-family: 'Source Sans 3', sans-serif;
}

/* Subtle top-border accent to match the institutional theme */
.global-navbar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #00a651;
}

.nav-container {
  width: 100%;
  max-width: 1440px;
  /* Expanded for widescreen */
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

/* ── Logo ──────────────────────────────────────────────────────── */
.nav-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  /* Tighter gap to help the icon act as the letter L */
  text-decoration: none;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.nav-logo:hover {
  transform: translateY(-1px);
}

.nav-logo img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  transition: filter 0.2s ease;
}

.nav-logo:hover img {
  filter: drop-shadow(0 0 6px rgba(0, 166, 81, 0.3));
}

.logo-text {
  font-family: 'Lora', serif;
  font-size: 1.35rem;
  /* Slightly larger Umia */
  font-weight: 700;
  /* Bolder weight */
  color: #181c18;
  letter-spacing: -0.01em;
  display: flex;
  flex-direction: column;
  line-height: 0.85;
  /* Tighter line height for the sub-text */
}

.logo-text--sub {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  /* More tracking for Discovery */
  color: #00a651;
  margin-top: 4px;
}

/* ── Search ────────────────────────────────────────────────────── */
.nav-search-wrap {
  flex: 1;
  max-width: 480px;
}

.nav-search {
  position: relative;
  display: flex;
  align-items: center;
  background: #f5f5f2;
  border-radius: 6px;
  padding: 0 12px;
  height: 38px;
  border: 1px solid #dfe0db;
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.nav-search:focus-within {
  background: #ffffff;
  border-color: #00a651;
  box-shadow: 0 4px 12px -4px rgba(0, 166, 81, 0.12);
}

.search-icon {
  color: #181c18;
  opacity: 0.3;
  margin-right: 10px;
  flex-shrink: 0;
}

.nav-search input {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  font-size: 0.9rem;
  color: #181c18;
}

.nav-search input::placeholder {
  color: #7a7f75;
}

.search-hint {
  font-size: 0.65rem;
  font-weight: 700;
  color: #dfe0db;
  border: 1px solid #dfe0db;
  padding: 2px 5px;
  border-radius: 3px;
  pointer-events: none;
}

/* ── Desktop Actions ───────────────────────────────────────────── */
.nav-actions-desktop {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

@media (max-width: 860px) {

  .nav-actions-desktop,
  .nav-search-wrap {
    display: none;
  }
}

.nav-item {
  text-decoration: none;
  color: #3d4239;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 4px;
  transition: all 0.15s;
  white-space: nowrap;
}

.nav-item:hover {
  color: #181c18;
  background: #f5f5f2;
}

.nav-item.router-link-active:not(.logout-btn) {
  color: #00a651;
}

.nav-item.nav-item--active {
  color: #000000;
}

/* ── Profile Trigger ───────────────────────────────────────────── */
.nav-profile-container {
  position: relative;
}

.nav-profile-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.nav-profile-trigger:hover {
  background: #f5f5f2;
}

.profile-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  border: 1.5px solid #dfe0db;
  background: #fff;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}

.profile-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #181c18;
}

.profile-role {
  font-size: 0.65rem;
  font-weight: 500;
  color: #7a7f75;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dropdown-arrow {
  color: #7a7f75;
  transition: transform 0.2s;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

/* ── Dropdown Menu (Desktop) ─────────────────────────────────── */
.nav-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 240px;
  background: #ffffff;
  border: 1.5px solid #dfe0db;
  border-radius: 8px;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 1001;
}

.dropdown-header {
  padding: 8px 12px 12px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #7a7f75;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: #181c18;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f5f5f2;
  color: #00a651;
}

.dropdown-divider {
  height: 1px;
  background: #dfe0db;
  margin: 8px 0;
}

.logout-btn:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* ── Mobile Controls ─────────────────────────────────────────── */
.mobile-controls {
  display: none;
  align-items: center;
  gap: 8px;
}

.mobile-control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f2;
  border: 1px solid #dfe0db;
  border-radius: 8px;
  color: #181c18;
  cursor: pointer;
}

@media (max-width: 860px) {
  .mobile-controls {
    display: flex;
  }
}

/* ── Mobile Drawer ────────────────────────────────────────────── */
.mobile-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 2000;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  background: #fff;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
}

.drawer-user-card {
  position: relative;
  padding: 32px 24px 24px;
  background: #181c18;
  color: #fff;
  overflow: hidden;
}

.drawer-user-cover {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #00a651 0%, #007d3d 100%);
  opacity: 0.1;
}

.drawer-user-info {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: #fff;
}

.drawer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-name {
  font-family: 'Lora', serif;
  font-size: 1.1rem;
  font-weight: 600;
}

.drawer-role {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #00a651;
  letter-spacing: 0.1em;
}

.drawer-guest-card {
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f5f5f2;
}

.drawer-guest-card p {
  font-family: 'Lora', serif;
  font-weight: 600;
  color: #181c18;
}

.drawer-nav {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.drawer-section {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #7a7f75;
  margin: 24px 0 12px;
}

.drawer-section:first-child {
  margin-top: 0;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  color: #3d4239;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  border-bottom: 1px solid #f5f5f2;
  transition: color 0.2s;
}

.drawer-item:hover {
  color: #00a651;
}

.drawer-item svg {
  color: #7a7f75;
}

.drawer-cta {
  background: #00a651;
  color: #fff !important;
  border: none;
  padding: 14px;
  justify-content: center;
  border-radius: 8px;
  margin-top: 12px;
}

.logout-mobile {
  width: 100%;
  background: none;
  border: none;
  font-family: inherit;
  color: #ef4444 !important;
}

/* ── Mobile Search Overlay ────────────────────────────────────── */
.mobile-search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #fff;
  z-index: 2100;
  padding: 0 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.mobile-search-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.m-search-icon {
  color: #00a651;
}

.mobile-search-container input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  font-family: inherit;
  color: #181c18;
}

.close-search {
  background: none;
  border: none;
  color: #7a7f75;
  cursor: pointer;
}

/* ── Transitions ─────────────────────────────────────────────── */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.search-slide-enter-active,
.search-slide-leave-active {
  transition: transform 0.3s ease;
}

.search-slide-enter-from,
.search-slide-leave-to {
  transform: translateY(-100%);
}

/* Rest of standard styles */
.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.nav-divider {
  width: 1px;
  height: 18px;
  background: #dfe0db;
  margin: 0 8px;
}

.get-started-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  background: #00a651;
  color: #fff;
  padding: 8px 18px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s;
}

.get-started-btn:hover {
  background: #007d3d;
  transform: translateY(-1px);
}
</style>
