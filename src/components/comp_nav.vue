<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
  Search, BookOpen, ArrowRight, LogOut, Settings,
  ChevronDown, Home, Compass, UserCircle, X, Menu, HelpCircle,
  BookUp, Bookmark, Loader2, ArrowUpRight
} from 'lucide-vue-next'
import { api, type Paper } from '../services/api'
import { useAuth } from '../composables/useAuth'
import { historyService } from '../services/history'

const router = useRouter()
const route = useRoute()
const searchQuery = ref('')
const searchHistory = ref<string[]>([])
const showHistory = ref(false)
const historyRef = ref<HTMLElement | null>(null)

const isLoggedIn = ref(false)
const showMobileMenu = ref(false)
const showMobileSearch = ref(false)
const showProfileMenu = ref(false)
const showBookmarkModal = ref(false)
const bookmarks = ref<Paper[]>([])
const selectedBookmarks = ref<string[]>([])
const bookmarkLoading = ref(false)
const removeLoading = ref(false)
const showLogoutModal = ref(false)

const { isStaff, isStudent, fullName, userRole } = useAuth()

const isGreetingPhase = ref(true)

const greetingText = computed(() => {
  if (!fullName.value) {
    return 'Welcome to Lumia!'
  }

  const hour = new Date().getHours()
  let timeGreeting = 'Welcome'
  if (hour < 12) timeGreeting = 'Good morning'
  else if (hour < 18) timeGreeting = 'Good afternoon'
  else timeGreeting = 'Good evening'

  return `${timeGreeting}, ${fullName.value.split(' ')[0]}!`
})

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
  searchHistory.value = historyService.getHistory()
  window.addEventListener('click', closeProfileMenu)

  // Close history when clicking outside
  document.addEventListener('click', (e) => {
    if (historyRef.value && !historyRef.value.contains(e.target as Node)) {
      showHistory.value = false
    }
  })

  // Animation sequence: Start greeting, then transition to logo
  setTimeout(() => {
    isGreetingPhase.value = false
  }, 7000)
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

// Sync search query with URL
watch(() => route.query.q, (newQ) => {
  searchQuery.value = (newQ as string) || ''
}, { immediate: true })

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
    historyService.saveQuery(searchQuery.value)
    searchHistory.value = historyService.getHistory()
    router.push({ name: 'explore', query: { q: searchQuery.value } })
    showMobileMenu.value = false
    showMobileSearch.value = false
    showHistory.value = false
  }
}

const logout = () => {
  showProfileMenu.value = false
  showMobileMenu.value = false
  showLogoutModal.value = true
}

const confirmLogout = () => {
  api.logout()
  isLoggedIn.value = false
  window.location.href = '/login'
}

const openBookmarkModal = async () => {
  showProfileMenu.value = false
  showBookmarkModal.value = true
  bookmarkLoading.value = true
  try {
    bookmarks.value = await api.getUserBookmarks()
  } catch (e) {
    console.error(e)
    bookmarks.value = []
  } finally {
    bookmarkLoading.value = false
  }
}

const closeBookmarkModal = () => {
  showBookmarkModal.value = false
  selectedBookmarks.value = []
}

const toggleSelectAll = () => {
  if (selectedBookmarks.value.length === bookmarks.value.length) {
    selectedBookmarks.value = []
  } else {
    selectedBookmarks.value = bookmarks.value.map(b => b.id)
  }
}

const removeSelected = async () => {
  if (selectedBookmarks.value.length === 0 || removeLoading.value) return
  
  removeLoading.value = true
  try {
    // We toggle bookmarks for each selected ID. Since they are in the list, 
    // toggling will remove them.
    await Promise.all(selectedBookmarks.value.map(id => api.bookmarkPaper(id)))
    
    // Refresh list
    bookmarks.value = await api.getUserBookmarks()
    selectedBookmarks.value = []
  } catch (e) {
    console.error('Bulk removal failed:', e)
  } finally {
    removeLoading.value = false
  }
}
</script>

<template>
  <nav class="global-navbar">
    <div class="nav-container">

      <!-- Left: Logo (Institutional Branding) -->
      <RouterLink :to="{ name: 'home' }" class="nav-logo">
        <div class="animation-stage">
          <transition name="greeting-slide" appear>
            <span v-if="isGreetingPhase" class="greeting-msg">{{ greetingText }}</span>
          </transition>
          <transition name="logo-appear">
            <div v-if="!isGreetingPhase" class="logo-inner">
              <img src="/lumia_logo.ico" style="width: 32px; height: 32px;" />
              <div class="logo-text">
                UMIA <span class="logo-text--sub">Retrieval</span>
              </div>
            </div>
          </transition>
        </div>
      </RouterLink>

      <!-- Center: Search Bar (Desktop) -->
      <div
        v-if="!['home', 'management', 'login', 'register', 'about', 'profile', 'upload', 'guide'].includes(route.name as string)"
        class="nav-search-wrap">
        <div class="nav-search" ref="historyRef">
          <Search :size="14" class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Search the repository..." @keyup.enter="handleSearch"
            @focus="showHistory = true" spellcheck="false" autocomplete="off" />
          <div class="search-hint">⏎</div>

          <!-- Search History Popup (Desktop) -->
          <div v-if="showHistory && searchHistory.length > 0" class="history-popup">
            <div class="history-head">
              <span>Recent Searches</span>
              <button @click.stop="historyService.clearHistory(); searchHistory = []">Clear All</button>
            </div>
            <div class="history-list">
              <div v-for="h in searchHistory" :key="h" class="history-item"
                @click.stop="searchQuery = h; handleSearch()">
                <Search :size="12" />
                <span>{{ h }}</span>
                <button class="h-remove"
                  @click.stop="historyService.removeQuery(h); searchHistory = historyService.getHistory()">
                  <X :size="10" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Desktop Actions & Profile -->
      <div class="nav-actions-desktop">
        <RouterLink :to="{ name: 'home' }" class="nav-item">Home</RouterLink>
        <!-- <RouterLink :to="{ name: 'about' }" class="nav-item">About</RouterLink> -->
        <RouterLink :to="{ name: 'explore' }" class="nav-item">Explore</RouterLink>
        <RouterLink :to="{ name: 'guide' }" class="nav-item">User Guide</RouterLink>
        <RouterLink v-if="isLoggedIn && isStaff" :to="{ name: 'management' }"
          class="nav-item nav-item--active nav-item--mgmt">
          Management
        </RouterLink>

        <template v-if="isLoggedIn">
          <RouterLink v-if="isStudent" :to="{ name: 'upload' }" class="nav-upload-btn shadow-sm">
            Upload Document
          </RouterLink>

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
                  <UserCircle :size="16" /> My Account
                </RouterLink>
                <a href="#" @click.prevent="openBookmarkModal" class="dropdown-item">
                  <Bookmark :size="16" /> Bookmarks
                </a>
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
          v-if="!['home', 'management', 'login', 'register', 'about', 'profile', 'explore', 'upload', 'guide'].includes(route.name as string)"
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
                <span class="drawer-name">{{ fullName || 'Academic User' }}</span>
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
            <RouterLink :to="{ name: 'explore' }" class="drawer-item">
              <Compass :size="18" /> Explore
            </RouterLink>
            <RouterLink :to="{ name: 'guide' }" class="drawer-item">
              <HelpCircle :size="18" /> User Guide
            </RouterLink>

            <template v-if="isLoggedIn">
              <div class="drawer-section">Account & Actions</div>
              <RouterLink v-if="isStudent" :to="{ name: 'upload' }" class="drawer-item"
                style="color: #00a651; font-weight: 600;">
                <BookUp :size="18" /> Upload Document
              </RouterLink>
              <RouterLink :to="{ name: 'profile' }" class="drawer-item">
                <UserCircle :size="18" /> My Profile
              </RouterLink>
              <RouterLink v-if="isStaff" :to="{ name: 'management' }" class="drawer-item drawer-item--mgmt">
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
              @focus="showHistory = true" autofocus />
            <button @click="showMobileSearch = false" class="close-search">
              <X :size="20" />
            </button>

            <!-- Search History Popup (Mobile) -->
            <div v-if="showHistory && searchHistory.length > 0" class="mobile-history-popup">
              <div class="history-head">
                <span>Recent Searches</span>
                <button @click.stop="historyService.clearHistory(); searchHistory = []">Clear All</button>
              </div>
              <div class="history-list">
                <div v-for="h in searchHistory" :key="h" class="history-item"
                  @click.stop="searchQuery = h; handleSearch()">
                  <Search :size="12" />
                  <span>{{ h }}</span>
                  <button class="h-remove"
                    @click.stop="historyService.removeQuery(h); searchHistory = historyService.getHistory()">
                    <X :size="10" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Bookmarks Modal -->
      <transition name="fade">
        <div v-if="showBookmarkModal" class="bookmark-modal-overlay" @click="closeBookmarkModal"></div>
      </transition>

      <transition name="modal-slide">
        <div v-if="showBookmarkModal" class="bookmark-modal">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="modal-title-section">
              <Bookmark :size="20" class="modal-title-icon" />
              <h2 class="modal-title">My Bookmarks</h2>
            </div>
            <button class="modal-close-btn" @click="closeBookmarkModal">
              <X :size="20" />
            </button>
          </div>

          <!-- Modal Content -->
          <div class="modal-content">
            <!-- Loading State -->
            <div v-if="bookmarkLoading" class="modal-loading">
              <Loader2 :size="20" class="spin" />
              <span>Loading your bookmarks…</span>
            </div>

            <!-- Bookmarks List -->
            <div v-else-if="bookmarks.length > 0" class="bookmarks-list-wrap">
              <!-- Bulk Actions Bar -->
              <div class="modal-bulk-actions">
                <div class="bulk-stats">
                  <button class="bulk-toggle-btn" @click="toggleSelectAll">
                    {{ selectedBookmarks.length === bookmarks.length ? 'Unselect All' : 'Select All' }}
                  </button>
                  <span class="selection-count" v-if="selectedBookmarks.length > 0">
                    {{ selectedBookmarks.length }} selected
                  </span>
                </div>
                <button v-if="selectedBookmarks.length > 0" 
                  class="bulk-remove-btn" 
                  :disabled="removeLoading"
                  @click="removeSelected">
                  <X :size="14" />
                  {{ removeLoading ? 'Removing...' : 'Remove Selected' }}
                </button>
              </div>

              <div class="bookmarks-list">
                <div v-for="(paper, idx) in bookmarks" :key="paper.id" class="bookmark-row">
                  <label class="bookmark-check">
                    <input type="checkbox" :value="paper.id" v-model="selectedBookmarks" />
                    <span class="check-custom"></span>
                  </label>
                  <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="bookmark-item">
                    <div class="bookmark-item-num">{{ String(idx + 1).padStart(2, '0') }}</div>
                    <div class="bookmark-item-body">
                      <span class="bookmark-item-title">{{ paper.title }}</span>
                      <span class="bookmark-item-meta">
                        {{ paper.author }}
                        <span v-if="paper.year" class="bookmark-item-dot">·</span>
                        {{ paper.year }}
                      </span>
                    </div>
                    <ArrowUpRight :size="14" class="bookmark-item-arrow" />
                  </RouterLink>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="modal-empty-state">
              <div class="empty-icon">
                <Bookmark :size="32" />
              </div>
              <p class="empty-title">No bookmarks yet</p>
              <p class="empty-message">Papers you bookmark will appear here for quick access.</p>
              <RouterLink :to="{ name: 'home' }" class="empty-cta" @click="closeBookmarkModal">
                Browse Repository
              </RouterLink>
            </div>
          </div>
        </div>
      </transition>

      <!-- Logout Confirmation Modal -->
      <transition name="fade">
        <div v-if="showLogoutModal" class="bookmark-modal-overlay" @click="showLogoutModal = false"></div>
      </transition>

      <transition name="modal-slide">
        <div v-if="showLogoutModal" class="bookmark-modal logout-modal-sm">
          <div class="modal-header">
            <div class="modal-title-section">
              <LogOut :size="20" class="modal-title-icon" />
              <h2 class="modal-title">Sign Out</h2>
            </div>
          </div>

          <div class="modal-content logout-modal-body">
            <p class="logout-text">Are you sure you want to sign out?</p>
            <div class="logout-button-group">
              <button class="btn-confirm" @click="confirmLogout">Sign Out</button>
              <button class="btn-cancel" @click="showLogoutModal = false">Cancel</button>
            </div>
          </div>
        </div>
      </transition>

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

/* ── History Popup ────────────────────────────────────────────── */
.history-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #dfe0db;
  border-radius: 8px;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  overflow: hidden;
}

.mobile-history-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #dfe0db;
  z-index: 2200;
  max-height: 300px;
  overflow-y: auto;
}

.history-head {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f5f5f2;
  border-bottom: 1px solid #dfe0db;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7a7f75;
}

.history-head button {
  background: none;
  border: none;
  color: #00a651;
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 700;
}

.history-list {
  max-height: 280px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 0.9rem;
  color: #3d4239;
}

.history-item:hover {
  background: #f5f5f2;
  color: #00a651;
}

.history-item svg {
  color: #7a7f75;
  opacity: 0.5;
}

.h-remove {
  margin-left: auto;
  opacity: 0.3;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.h-remove:hover {
  opacity: 1;
  background: #fee2e2;
  color: #ef4444;
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

.nav-item--mgmt {
  color: #3b82f6 !important;
}

.nav-item--mgmt.router-link-active {
  color: #00a651 !important;
  background: rgba(0, 166, 81, 0.08) !important;
}

.nav-item--mgmt:hover:not(.router-link-active) {
  color: #2563eb !important;
  background: rgba(59, 130, 246, 0.08) !important;
}

.drawer-item--mgmt {
  color: #3b82f6 !important;
}

.drawer-item--mgmt.router-link-active {
  color: #00a651 !important;
  background: rgba(0, 166, 81, 0.08) !important;
}

.drawer-item--mgmt:hover:not(.router-link-active) {
  background: rgba(59, 130, 246, 0.08) !important;
}

/* Upload Button */
.nav-upload-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #00a651;
  color: white;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-upload-btn:hover {
  background: #007d3d;
  transform: translateY(-1px);
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
  font-family: 'Source Sans 3', sans-serif;
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

/* ── Bookmarks Modal ─────────────────────────────────────────── */
.bookmark-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1050;
}

.bookmark-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 1051;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #dfe0db;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title-icon {
  color: #00a651;
}

.modal-title {
  font-family: 'Lora', serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: #181c18;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  color: #7a7f75;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s;
}

.modal-close-btn:hover {
  background: #f5f5f2;
  color: #181c18;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 300px;
  color: #7a7f75;
  font-size: 0.95rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.bookmarks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}



.bookmark-item-num {
  font-family: 'Lora', serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #dfe0db;
  flex-shrink: 0;
  min-width: 24px;
  transition: color 0.2s;
}

.bookmark-item:hover .bookmark-item-num {
  color: #00a651;
}

.bookmark-item-body {
  flex: 1;
  min-width: 0;
}

.bookmark-item-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #181c18;
  line-height: 1.3;
  margin-bottom: 4px;
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bookmark-item-meta {
  display: block;
  font-size: 0.75rem;
  color: #7a7f75;
}

.bookmark-item-dot {
  margin: 0 0.25rem;
}

.bookmark-item-arrow {
  color: #dfe0db;
  flex-shrink: 0;
  margin-top: 2px;
  transition: color 0.2s, transform 0.2s;
}

.bookmark-item:hover .bookmark-item-arrow {
  color: #00a651;
  transform: translate(2px, -2px);
}

.modal-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 300px;
  text-align: center;
  padding: 24px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f5f5f2;
  color: #dfe0db;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: #181c18;
  margin: 0;
}

.empty-message {
  font-size: 0.85rem;
  color: #7a7f75;
  max-width: 280px;
  margin: 0;
  line-height: 1.5;
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  background: #00a651;
  color: #fff;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
}

.empty-cta:hover {
  background: #007d3d;
}

/* ── Bulk Actions ── */
.modal-bulk-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #f8f9f8;
  border-bottom: 1px solid #dfe0db;
  position: sticky;
  top: 0;
  z-index: 10;
}

.bulk-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bulk-toggle-btn {
  background: none;
  border: none;
  color: #00a651;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.selection-count {
  font-size: 0.75rem;
  color: #7a7f75;
  background: #dfe0db;
  padding: 2px 8px;
  border-radius: 12px;
}

.bulk-remove-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fee2e2;
  color: #ef4444;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-remove-btn:hover:not(:disabled) {
  background: #fecaca;
}

.bulk-remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Bookmark Row with Checkbox ── */
.bookmark-row {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid #f0f0f0;
}

.bookmark-row:hover {
  background: #fcfcfc;
}

.bookmark-check {
  padding-left: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 100%;
}

.bookmark-check input {
  display: none;
}

.check-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #dfe0db;
  border-radius: 4px;
  display: inline-block;
  position: relative;
  transition: all 0.2s;
}

.bookmark-check input:checked + .check-custom {
  background: #00a651;
  border-color: #00a651;
}

.bookmark-check input:checked + .check-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.bookmark-item {
  flex: 1;
  text-decoration: none;
  display: flex;
  align-items: center;
  padding: 1.25rem 1.5rem;
  gap: 1.25rem;
  transition: background 0.2s;
  border-bottom: none !important; /* Managed by row */
}

/* ── Transitions ─────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -48%);
}

.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: all 0.2s ease;
}

.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Greeting & Logo Animation ── */
.animation-stage {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 40px;
  min-width: 180px;
}

.greeting-msg {
  position: absolute;
  left: 0;
  white-space: nowrap;
  font-family: 'Lora', serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #00a651;
  letter-spacing: -0.01em;
  text-shadow: 0 0 20px rgba(0, 166, 81, 0.1);
}

.logo-inner {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Greeting slide: Fade in from Right, Fade out to Left */
.greeting-slide-enter-active {
  transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.greeting-slide-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.greeting-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.greeting-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Logo: Smooth fade in during greeting fade out */
.logo-appear-enter-active {
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
}
.logo-appear-enter-from {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}

/* ── Logout Modal Specifics ── */
.logout-modal-sm {
  max-width: 420px;
  max-height: fit-content;
}

.logout-modal-body {
  padding: 32px 24px;
}

.logout-text {
  font-size: 0.95rem;
  color: #3d4239;
  line-height: 1.6;
  margin-bottom: 28px;
  text-align: left;
}

.logout-button-group {
  display: flex;
  gap: 12px;
}

.logout-button-group button {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm {
  background: #00a651;
  color: white;
  border: none;
}

.btn-confirm:hover {
  background: #007d3d;
}

.btn-cancel {
  background: #f5f5f2;
  color: #7a7f75;
  border: 1px solid #dfe0db;
}

.btn-cancel:hover {
  background: #ffffff;
  border-color: #7a7f75;
  color: #3d4239;
}
</style>
