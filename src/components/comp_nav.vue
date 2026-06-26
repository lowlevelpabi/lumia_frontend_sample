<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import {
  Search,
  BookOpen,
  ArrowRight,
  LogOut,
  Settings,
  ChevronDown,
  Home,
  Compass,
  UserCircle,
  X,
  Menu,
  Bookmark,
  Loader2,
  ArrowUpRight,
  Moon,
  Sun,
} from "lucide-vue-next";
import { api, type Paper, type UserResponse, BASE_URL } from "../services/api";
import { useAuth } from "../composables/useAuth";
import { historyService } from "../services/history";
import { useTheme } from "../composables/useTheme";

const router = useRouter();
const route = useRoute();
const searchQuery = ref("");
const searchHistory = ref<string[]>([]);
const showHistory = ref(false);
const historyRef = ref<HTMLElement | null>(null);

const showMobileMenu = ref(false);
const showMobileSearch = ref(false);
const showProfileMenu = ref(false);
const showBookmarkModal = ref(false);
const bookmarks = ref<Paper[]>([]);
const selectedBookmarks = ref<string[]>([]);
const bookmarkLoading = ref(false);
const removeLoading = ref(false);
const showLogoutModal = ref(false);

const { isLoggedIn, isStaff, fullName, userRole, refreshAuth } = useAuth();
const { isDark, toggleTheme, setTheme, resetTheme } = useTheme();

const currentUserDetails = ref<UserResponse | null>(null);

const fetchUserDetails = async () => {
  if (isLoggedIn.value) {
    try {
      const userData = await api.getUserMe();
      currentUserDetails.value = userData;
      if (userData.dark_mode !== undefined) {
        setTheme(userData.dark_mode);
      }
    } catch (e) {
      console.error("Failed to sync theme preference/user details:", e);
    }
  } else {
    currentUserDetails.value = null;
  }
};

const avatarSrc = computed(() => {
  if (currentUserDetails.value?.avatar_url) {
    const base = BASE_URL.replace('/api/v1', '');
    return `${base}${currentUserDetails.value.avatar_url}`;
  }
  return '/avatar.png'; // fallback default
});


const scrolled = ref(false);
const handleScroll = () => {
  scrolled.value = window.scrollY > 50;
};

// Click outside logic for profile dropdown
const closeProfileMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".nav-profile-container")) {
    showProfileMenu.value = false;
  }
};

onMounted(async () => {
  refreshAuth();
  fetchUserDetails();
  searchHistory.value = historyService.getHistory();
  window.addEventListener("click", closeProfileMenu);
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("avatar-update", fetchUserDetails);
  window.addEventListener("auth-change", fetchUserDetails);

  // Close history when clicking outside
  document.addEventListener("click", (e) => {
    if (historyRef.value && !historyRef.value.contains(e.target as Node)) {
      showHistory.value = false;
    }
  });
});

onUnmounted(() => {
  window.removeEventListener("click", closeProfileMenu);
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("avatar-update", fetchUserDetails);
  window.removeEventListener("auth-change", fetchUserDetails);
});

// Watch for route changes to refresh auth and close menus
watch(
  () => route.path,
  () => {
    refreshAuth();
    fetchUserDetails();
    showMobileMenu.value = false;
    showProfileMenu.value = false;
    showMobileSearch.value = false;
  },
);

// Sync search query with URL
watch(
  () => route.query.q,
  (newQ) => {
    searchQuery.value = (newQ as string) || "";
  },
  { immediate: true },
);

const toggleMobileSearch = () => {
  showMobileSearch.value = !showMobileSearch.value;
  if (showMobileSearch.value) showMobileMenu.value = false;
};

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
  if (showMobileMenu.value) showMobileSearch.value = false;
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    historyService.saveQuery(searchQuery.value);
    searchHistory.value = historyService.getHistory();
    router.push({ name: "explore", query: { q: searchQuery.value } });
    showMobileMenu.value = false;
    showMobileSearch.value = false;
    showHistory.value = false;
  }
};

const logout = () => {
  showProfileMenu.value = false;
  showMobileMenu.value = false;
  showLogoutModal.value = true;
};

const confirmLogout = () => {
  api.logout();
  refreshAuth();
  resetTheme();
  window.location.href = "/login";
};

const openBookmarkModal = async () => {
  showProfileMenu.value = false;
  showBookmarkModal.value = true;
  bookmarkLoading.value = true;
  try {
    bookmarks.value = await api.getUserBookmarks();
  } catch (e) {
    console.error(e);
    bookmarks.value = [];
  } finally {
    bookmarkLoading.value = false;
  }
};

const closeBookmarkModal = () => {
  showBookmarkModal.value = false;
  selectedBookmarks.value = [];
};

const toggleSelectAll = () => {
  if (selectedBookmarks.value.length === bookmarks.value.length) {
    selectedBookmarks.value = [];
  } else {
    selectedBookmarks.value = bookmarks.value.map((b) => b.id);
  }
};

const removeSelected = async () => {
  if (selectedBookmarks.value.length === 0 || removeLoading.value) return;

  removeLoading.value = true;
  try {
    // We toggle bookmarks for each selected ID. Since they are in the list,
    // toggling will remove them.
    await Promise.all(selectedBookmarks.value.map((id) => api.bookmarkPaper(id)));

    // Refresh list
    bookmarks.value = await api.getUserBookmarks();
    selectedBookmarks.value = [];
  } catch (e) {
    console.error("Bulk removal failed:", e);
  } finally {
    removeLoading.value = false;
  }
};

// Collapsible drawer sections
const navSectionExpanded = ref(true);
const accountSectionExpanded = ref(true);
const accessSectionExpanded = ref(true);
</script>

<template>
  <nav class="global-navbar" :class="{ 'is-scrolled': scrolled || route.name !== 'home' }">
    <div class="nav-container">
      <!-- Left: Logo (Institutional Branding) -->
      <RouterLink :to="{ name: 'home' }" class="nav-logo">
        <div class="logo-inner">
          <div class="logo-icon">
            <img src="/lumia_logo.png" style="width: 24px; height: 24px; object-fit: contain" />
          </div>
          <div class="logo-text">UMIA <span class="logo-text--sub">Retrieval</span></div>
        </div>
      </RouterLink>

      <!-- Center: Search Bar (Desktop) -->
      <div
        v-if="
          ![
            'home',
            'explore',
            'management',
            'login',
            'register',
            'about',
            'profile',
            'upload',
          ].includes(route.name as string)
        "
        class="nav-search-wrap"
      >
        <div class="nav-search" ref="historyRef">
          <Search :size="14" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search the repository..."
            @keyup.enter="handleSearch"
            @focus="showHistory = true"
            spellcheck="false"
            autocomplete="off"
          />
          <div class="search-hint">⏎</div>

          <!-- Search History Popup (Desktop) -->
          <div v-if="showHistory && searchHistory.length > 0" class="history-popup">
            <div class="history-head">
              <span>Recent Searches</span>
              <button
                @click.stop="
                  historyService.clearHistory();
                  searchHistory = [];
                "
              >
                Clear All
              </button>
            </div>
            <div class="history-list">
              <div
                v-for="h in searchHistory"
                :key="h"
                class="history-item"
                @click.stop="
                  searchQuery = h;
                  handleSearch();
                "
              >
                <Search :size="12" />
                <span>{{ h }}</span>
                <button
                  class="h-remove"
                  @click.stop="
                    historyService.removeQuery(h);
                    searchHistory = historyService.getHistory();
                  "
                >
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
        <RouterLink :to="{ name: 'explore' }" class="nav-item">Explore</RouterLink>
        <RouterLink :to="{ name: 'about' }" class="nav-item">About</RouterLink>
        <RouterLink
          v-if="isLoggedIn && isStaff"
          :to="{ name: 'management' }"
          class="nav-item nav-item--active nav-item--mgmt"
        >
          Management
        </RouterLink>

        <div class="nav-divider"></div>

        <!-- Theme Toggle -->
        <button
          class="theme-toggle-btn"
          @click="toggleTheme"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <transition name="scale" mode="out-in">
            <Sun v-if="isDark" :size="18" />
            <Moon v-else :size="18" />
          </transition>
        </button>

        <template v-if="isLoggedIn">
          <div class="nav-profile-container">
            <button class="nav-profile-trigger" @click.stop="showProfileMenu = !showProfileMenu" title="User Menu">
              <div class="profile-avatar">
                <img :src="avatarSrc" alt="User Avatar" />
              </div>
              <ChevronDown
                :size="12"
                class="dropdown-arrow"
                :class="{ rotated: showProfileMenu }"
              />
            </button>

            <!-- Desktop Dropdown (Sleeker & More Compact) -->
            <transition name="dropdown-slide">
              <div v-if="showProfileMenu" class="nav-dropdown">
                <!-- User details header inside dropdown -->
                <div class="dropdown-user-header">
                  <div class="dropdown-user-avatar">
                    <img :src="avatarSrc" alt="User Avatar" />
                  </div>
                  <div class="dropdown-user-details">
                    <span class="dropdown-user-name">{{ currentUserDetails?.full_name || fullName || "Academic User" }}</span>
                    <span class="dropdown-user-role-badge" :class="userRole.toLowerCase()">{{ userRole }}</span>
                  </div>
                </div>
                
                <div class="dropdown-divider-accent"></div>
                
                <RouterLink :to="{ name: 'profile' }" class="dropdown-item" @click="showProfileMenu = false">
                  <div class="dropdown-icon-wrapper"><UserCircle :size="15" /></div>
                  <span>My Account</span>
                </RouterLink>
                
                <a href="#" @click.prevent="openBookmarkModal(); showProfileMenu = false;" class="dropdown-item">
                  <div class="dropdown-icon-wrapper"><Bookmark :size="15" /></div>
                  <span>Bookmarks</span>
                </a>
                
                <div class="dropdown-divider"></div>
                
                <button @click="logout(); showProfileMenu = false;" class="dropdown-item logout-btn">
                  <div class="dropdown-icon-wrapper"><LogOut :size="15" /></div>
                  <span>Sign Out</span>
                </button>
              </div>
            </transition>
          </div>
        </template>

        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="get-started-btn">
            Get started
            <ArrowRight :size="14" />
          </RouterLink>
        </template>
      </div>

      <!-- Mobile UI Controls -->
      <div class="mobile-controls">
        <button
          v-if="
            ![
              'home',
              'management',
              'login',
              'register',
              'about',
              'profile',
              'explore',
              'upload',
            ].includes(route.name as string)
          "
          class="mobile-control-btn"
          @click="toggleMobileSearch"
        >
          <Search :size="20" />
        </button>
        <button class="mobile-control-btn" @click="toggleMobileMenu">
          <Menu v-if="!showMobileMenu" :size="22" />
          <X v-else :size="22" />
        </button>
      </div>

      <Teleport to="body">
        <!-- Mobile Drawer Overlay -->
        <transition name="fade">
          <div
            v-if="showMobileMenu"
            class="mobile-drawer-overlay"
            @click="showMobileMenu = false"
          ></div>
        </transition>

        <!-- Mobile Side Drawer -->
        <transition name="drawer-slide">
          <aside v-if="showMobileMenu" class="mobile-drawer">
            <!-- Drawer Header (Identity) -->
            <div v-if="isLoggedIn" class="drawer-user-card">
              <div class="drawer-user-cover"></div>
              <div class="drawer-user-info">
                <div class="drawer-avatar">
                  <img :src="avatarSrc" alt="User Avatar" />
                </div>
                <div class="drawer-text">
                  <span class="drawer-name">{{ fullName || "Academic User" }}</span>
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
              <button class="drawer-section" @click="navSectionExpanded = !navSectionExpanded" aria-label="Toggle Navigation Section">
                <span>Navigation</span>
                <ChevronDown :size="12" class="section-chevron" :class="{ collapsed: !navSectionExpanded }" />
              </button>
              <transition name="drawer-fade">
                <div v-show="navSectionExpanded" class="drawer-section-content">
                  <RouterLink :to="{ name: 'home' }" class="drawer-item">
                    <Home :size="18" /> Home
                  </RouterLink>
                  <RouterLink :to="{ name: 'explore' }" class="drawer-item">
                    <Compass :size="18" /> Explore
                  </RouterLink>
                  <RouterLink :to="{ name: 'about' }" class="drawer-item">
                    <BookOpen :size="18" /> About
                  </RouterLink>
                </div>
              </transition>

              <template v-if="isLoggedIn">
                <button class="drawer-section" @click="accountSectionExpanded = !accountSectionExpanded" aria-label="Toggle Account Section">
                  <span>Account & Actions</span>
                  <ChevronDown :size="12" class="section-chevron" :class="{ collapsed: !accountSectionExpanded }" />
                </button>
                <transition name="drawer-fade">
                  <div v-show="accountSectionExpanded" class="drawer-section-content">
                    <RouterLink :to="{ name: 'profile' }" class="drawer-item">
                      <UserCircle :size="18" /> My Profile
                    </RouterLink>
                    <RouterLink
                      v-if="isStaff"
                      :to="{ name: 'management' }"
                      class="drawer-item drawer-item--mgmt"
                    >
                      <Settings :size="18" />
                      Management
                    </RouterLink>
                    <button @click="logout" class="drawer-item logout-mobile">
                      <LogOut :size="18" /> Sign Out
                    </button>
                  </div>
                </transition>
              </template>

              <template v-else>
                <button class="drawer-section" @click="accessSectionExpanded = !accessSectionExpanded" aria-label="Toggle Access Section">
                  <span>Access</span>
                  <ChevronDown :size="12" class="section-chevron" :class="{ collapsed: !accessSectionExpanded }" />
                </button>
                <transition name="drawer-fade">
                  <div v-show="accessSectionExpanded" class="drawer-section-content">
                    <RouterLink :to="{ name: 'login' }" class="drawer-item drawer-cta">
                      Get Started
                      <ArrowRight :size="16" />
                    </RouterLink>
                  </div>
                </transition>
              </template>
            </div>

            <!-- Drawer Footer (Sticky/Pinned) -->
            <div class="drawer-footer">
              <button class="drawer-item theme-toggle-drawer" @click="toggleTheme">
                <Sun v-if="isDark" :size="18" />
                <Moon v-else :size="18" />
                <span>{{ isDark ? "Light Mode" : "Dark Mode" }}</span>
              </button>
            </div>
          </aside>
        </transition>

        <!-- Mobile Search Overlay -->
        <transition name="search-slide">
          <div v-if="showMobileSearch" class="mobile-search-overlay">
            <div class="mobile-search-container">
              <Search :size="18" class="m-search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search publications..."
                @keyup.enter="handleSearch"
                @focus="showHistory = true"
                autofocus
              />
              <button @click="showMobileSearch = false" class="close-search">
                <X :size="20" />
              </button>

              <!-- Search History Popup (Mobile) -->
              <div v-if="showHistory && searchHistory.length > 0" class="mobile-history-popup">
                <div class="history-head">
                  <span>Recent Searches</span>
                  <button
                    @click.stop="
                      historyService.clearHistory();
                      searchHistory = [];
                    "
                  >
                    Clear All
                  </button>
                </div>
                <div class="history-list">
                  <div
                    v-for="h in searchHistory"
                    :key="h"
                    class="history-item"
                    @click.stop="
                      searchQuery = h;
                      handleSearch();
                    "
                  >
                    <Search :size="12" />
                    <span>{{ h }}</span>
                    <button
                      class="h-remove"
                      @click.stop="
                        historyService.removeQuery(h);
                        searchHistory = historyService.getHistory();
                      "
                    >
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
          <div
            v-if="showBookmarkModal"
            class="bookmark-modal-overlay"
            @click="closeBookmarkModal"
          ></div>
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
                      {{
                        selectedBookmarks.length === bookmarks.length ? "Unselect All" : "Select All"
                      }}
                    </button>
                    <span class="selection-count" v-if="selectedBookmarks.length > 0">
                      {{ selectedBookmarks.length }} selected
                    </span>
                  </div>
                  <button
                    v-if="selectedBookmarks.length > 0"
                    class="bulk-remove-btn"
                    :disabled="removeLoading"
                    @click="removeSelected"
                  >
                    <X :size="14" />
                    {{ removeLoading ? "Removing..." : "Remove Selected" }}
                  </button>
                </div>

                <div class="bookmarks-list">
                  <div v-for="(paper, idx) in bookmarks" :key="paper.id" class="bookmark-row">
                    <label class="bookmark-check">
                      <input type="checkbox" :value="paper.id" v-model="selectedBookmarks" />
                      <span class="check-custom"></span>
                    </label>
                    <RouterLink
                      :to="{ name: 'detail', params: { id: paper.id } }"
                      class="bookmark-item"
                    >
                      <div class="bookmark-item-num">{{ String(idx + 1).padStart(2, "0") }}</div>
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
          <div
            v-if="showLogoutModal"
            class="bookmark-modal-overlay"
            @click="showLogoutModal = false"
          ></div>
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
      </Teleport>
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
  background: transparent;
  border-bottom: 1px solid transparent;
  z-index: 1000;
  display: flex;
  align-items: center;
  font-family: "Source Sans 3", sans-serif;
  transition: all 0.3s ease;
}

.global-navbar.is-scrolled {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border-bottom: 1.5px solid var(--border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.dark .global-navbar.is-scrolled {
  background: rgba(5, 5, 5, 0.75) !important;
  backdrop-filter: blur(20px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
}

/* Subtle top-border accent to match the institutional theme */
.global-navbar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.global-navbar.is-scrolled::before {
  opacity: 1;
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
  font-family: "Lora", serif;
  font-size: 1.35rem;
  /* Slightly larger Umia */
  font-weight: 700;
  /* Bolder weight */
  color: var(--text-primary);
  letter-spacing: -0.01em;
  display: flex;
  flex-direction: column;
  line-height: 0.85;
  /* Tighter line height for the sub-text */
  opacity: 0;
  z-index: 1;
  animation: text-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 1s;
}

.logo-text--sub {
  font-family: "Source Sans 3", sans-serif;
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  /* More tracking for Discovery */
  color: var(--accent-primary);
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
  background: var(--bg-tertiary);
  border-radius: 6px;
  padding: 0 12px;
  height: 38px;
  border: 1px solid var(--border-color);
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.nav-search:focus-within {
  background: var(--bg-secondary);
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px -4px rgba(0, 166, 81, 0.12);
}

.search-icon {
  color: var(--text-primary);
  opacity: 0.3;
  margin-right: 10px;
  flex-shrink: 0;
}

.dark .search-icon {
  opacity: 0.55;
}

.nav-search input {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.nav-search input::placeholder {
  color: var(--text-tertiary);
}

.search-hint {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--border-color);
  border: 1px solid var(--border-color);
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
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  z-index: 1100;
  overflow: hidden;
}

.mobile-history-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  z-index: 2200;
  max-height: 300px;
  overflow-y: auto;
}

.history-head {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
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
  color: var(--text-secondary);
}

.history-item:hover {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
}

.history-item svg {
  color: var(--text-tertiary);
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
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 4px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
}

/* Elegant slide-out active indicators */
.nav-item::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--accent-primary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(-50%);
  border-radius: 2px;
}

.nav-item:hover::after,
.nav-item.router-link-active::after {
  width: 60%;
}

.nav-item--mgmt::after {
  background: var(--accent-secondary) !important;
}

.nav-item--mgmt.router-link-active::after {
  background: var(--accent-primary) !important;
}

/* Theme-sensitive text color for transparent home navbar */
.global-navbar:not(.is-scrolled) .nav-item {
  color: rgba(24, 28, 24, 0.8);
}

.global-navbar:not(.is-scrolled) .logo-text {
  color: #181c18;
}

.global-navbar:not(.is-scrolled) .profile-name {
  color: #181c18;
}

.global-navbar:not(.is-scrolled) .theme-toggle-btn {
  color: rgba(24, 28, 24, 0.8);
}

.dark .global-navbar:not(.is-scrolled) .nav-item {
  color: rgba(255, 255, 255, 0.85);
}

.dark .global-navbar:not(.is-scrolled) .logo-text {
  color: #ffffff;
}

.dark .global-navbar:not(.is-scrolled) .profile-name {
  color: #ffffff;
}

.dark .global-navbar:not(.is-scrolled) .theme-toggle-btn {
  color: rgba(255, 255, 255, 0.85);
}

.nav-item:hover {
  color: var(--text-primary);
  background: rgba(0, 166, 81, 0.04);
}

.global-navbar:not(.is-scrolled) .nav-item:hover {
  color: var(--text-primary);
  background: rgba(24, 28, 24, 0.06);
}

.dark .global-navbar:not(.is-scrolled) .nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.router-link-active:not(.logout-btn) {
  color: var(--accent-primary) !important;
}

.nav-item.nav-item--active {
  color: var(--text-primary);
}

.nav-item--mgmt {
  color: var(--accent-secondary) !important;
}

.nav-item--mgmt.router-link-active {
  color: var(--accent-primary) !important;
  background: rgba(0, 166, 81, 0.04) !important;
}

.nav-item--mgmt:hover:not(.router-link-active) {
  color: var(--accent-secondary) !important;
  background: rgba(59, 130, 246, 0.04) !important;
}



.drawer-item--mgmt {
  color: var(--accent-secondary) !important;
}

.drawer-item--mgmt.router-link-active {
  color: var(--accent-primary) !important;
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
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 9999px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.nav-profile-trigger:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  box-shadow: var(--shadow-sm);
}

.profile-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 1.5px solid var(--accent-primary);
  background: var(--bg-secondary);
  transition: all 0.2s ease;
}

.nav-profile-trigger:hover .profile-avatar {
  transform: scale(1.05);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropdown-arrow {
  color: var(--text-tertiary);
  transition: transform 0.2s;
}

.global-navbar:not(.is-scrolled) .dropdown-arrow {
  color: rgba(24, 28, 24, 0.6);
}

.dark .global-navbar:not(.is-scrolled) .dropdown-arrow {
  color: rgba(255, 255, 255, 0.6);
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

/* ── Theme Toggle Button ── */
.theme-toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.theme-toggle-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.scale-enter-active,
.scale-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.scale-enter-from {
  transform: scale(0.8);
  opacity: 0;
}

.scale-leave-to {
  transform: scale(1.2);
  opacity: 0;
}

/* ── Dropdown Menu (Desktop - Revamped) ─────────────────────────── */
.nav-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 230px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 16px -6px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 8px;
  z-index: 1001;
  transform-origin: top right;
}

.dark .nav-dropdown {
  background: rgba(30, 30, 30, 0.95);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 16px -6px rgba(0, 0, 0, 0.2);
}

.dropdown-user-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 8px;
}

.dropdown-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 1.5px solid var(--accent-primary);
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.dropdown-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropdown-user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.dropdown-user-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 140px;
}

.dropdown-user-role-badge {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1.5px 5px;
  border-radius: 4px;
  margin-top: 2px;
  background: rgba(37, 99, 235, 0.1);
  color: #3b82f6;
}

.dropdown-user-role-badge.admin {
  background: rgba(124, 58, 237, 0.1);
  color: #a78bfa;
}

.dropdown-user-role-badge.faculty {
  background: rgba(0, 166, 81, 0.1);
  color: #10b981;
}

.dropdown-divider-accent {
  height: 1px;
  background: linear-gradient(to right, var(--accent-primary), transparent);
  margin: 4px 0 10px;
  opacity: 0.4;
}

.dropdown-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all 0.25s;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  text-decoration: none;
  font-family: "Source Sans 3", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.dropdown-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.dropdown-item:hover .dropdown-icon-wrapper {
  background: var(--accent-primary);
  color: #fff;
  transform: scale(1.05);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 6px 0;
}

.logout-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.logout-btn:hover .dropdown-icon-wrapper {
  background: #ef4444;
  color: #fff;
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
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary) !important;
  cursor: pointer;
  transition: all 0.2s;
}

.mobile-control-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-primary);
  color: var(--accent-primary) !important;
}

.mobile-control-btn svg {
  color: inherit !important;
  stroke: currentColor !important;
}

.global-navbar:not(.is-scrolled) .mobile-control-btn {
  background: rgba(24, 28, 24, 0.05) !important;
  border-color: rgba(24, 28, 24, 0.1) !important;
  color: rgba(24, 28, 24, 0.8) !important;
}

.global-navbar:not(.is-scrolled) .mobile-control-btn:hover {
  background: rgba(24, 28, 24, 0.1) !important;
  color: var(--accent-primary) !important;
}

.dark .global-navbar:not(.is-scrolled) .mobile-control-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: rgba(255, 255, 255, 0.85) !important;
}

.dark .global-navbar:not(.is-scrolled) .mobile-control-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: var(--accent-primary) !important;
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
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: 2000;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  background: #f8faf9;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  border-top-left-radius: 24px;
  border-bottom-left-radius: 24px;
  box-shadow: -15px 0 50px rgba(0, 0, 0, 0.05);
  border-left: 1px solid rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.dark .mobile-drawer {
  background: #141714;
  box-shadow: -15px 0 50px rgba(0, 0, 0, 0.3);
  border-left-color: rgba(255, 255, 255, 0.03);
}

.drawer-user-card {
  position: relative;
  padding: 32px 24px 24px;
  background: linear-gradient(to bottom, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
  color: var(--text-primary);
  overflow: hidden;
}

.dark .drawer-user-card {
  background: linear-gradient(to bottom, rgba(16, 185, 129, 0.08) 0%, transparent 100%);
}

.drawer-user-cover {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #00a651 0%, #007d3d 100%);
  opacity: 0.03;
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
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
}

.drawer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.drawer-name {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.drawer-role {
  font-size: 10px;
  font-weight: 700;
  color: #047857; /* text-emerald-700 */
  background: #e6fbf2; /* bg-emerald-100 */
  padding: 3px 10px;
  border-radius: 9999px;
  display: inline-block;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.dark .drawer-role {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.drawer-guest-card {
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.02);
}

.dark .drawer-guest-card {
  background: rgba(255, 255, 255, 0.02);
}

.drawer-guest-card p {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 600;
  color: var(--text-primary);
}

.drawer-nav {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.drawer-section {
  background: rgba(0, 0, 0, 0.02);
  border: none;
  border-left: 3px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 14px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #6b7280;
  margin: 24px 0 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .drawer-section {
  background: rgba(255, 255, 255, 0.02);
  border-left-color: #4b5563;
  color: #9ca3af;
}

.drawer-section:first-child {
  margin-top: 0;
}

.drawer-section:hover {
  background: rgba(0, 166, 81, 0.05);
  border-left-color: #00a651;
  color: #00a651;
}

.dark .drawer-section:hover {
  background: rgba(16, 185, 129, 0.08);
  border-left-color: #34d399;
  color: #34d399;
}

.section-chevron {
  transition: transform 0.2s ease;
  color: inherit;
}

.section-chevron.collapsed {
  transform: rotate(-90deg);
}

/* Drawer Section Content Transition */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 250px;
  opacity: 1;
  overflow: hidden;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
  transform: translateY(-8px);
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  color: #4b5563; /* text-gray-600 */
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 12px; /* rounded-xl */
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.dark .drawer-item {
  color: #d1d5db; /* text-gray-300 */
}

.drawer-item:hover:not(.router-link-active):not(.logout-mobile) {
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-primary);
}

.dark .drawer-item:hover:not(.router-link-active):not(.logout-mobile) {
  background: rgba(255, 255, 255, 0.03);
}

.drawer-item.router-link-active {
  background: #ecfdf5; /* bg-emerald-50 */
  color: #065f46; /* text-emerald-800 */
}

.dark .drawer-item.router-link-active {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.drawer-item svg {
  color: #9ca3af; /* text-gray-400 equivalent for icons */
  transition: color 0.2s ease;
}

.drawer-item:hover svg {
  color: var(--text-primary);
}

.drawer-item.router-link-active svg {
  color: #065f46;
}

.dark .drawer-item.router-link-active svg {
  color: #34d399;
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

.drawer-cta svg {
  color: #fff !important;
}

.logout-mobile {
  width: 100%;
  background: none;
  border: none;
  margin-top: 24px;
  color: #4b5563 !important; /* Standard text color */
  justify-content: flex-start;
  padding: 12px 16px;
}

.dark .logout-mobile {
  color: #d1d5db !important;
}

.logout-mobile:hover {
  background: rgba(239, 68, 68, 0.05) !important;
  color: #ef4444 !important;
}

.logout-mobile svg {
  color: rgba(239, 68, 68, 0.7); /* soft red tint on icon */
}

.logout-mobile:hover svg {
  color: #ef4444;
}

button.drawer-item {
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

/* ── Drawer Footer ── */
.drawer-footer {
  border-top: 1px solid var(--border-color);
  padding: 16px 24px;
  background: #f8faf9;
}

.dark .drawer-footer {
  border-top-color: rgba(255, 255, 255, 0.06);
  background: #141714;
}

.theme-toggle-drawer {
  margin-bottom: 0;
}

/* ── Mobile Search Overlay ────────────────────────────────────── */
.mobile-search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bg-secondary);
  z-index: 2100;
  padding: 0 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  background: transparent;
  font-size: 1rem;
  font-family: inherit;
  color: var(--text-primary);
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
  transition: background 0.2s;
}

.global-navbar:not(.is-scrolled) .nav-divider {
  background: rgba(255, 255, 255, 0.2);
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
  background: var(--bg-secondary);
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
  border-bottom: 1px solid var(--border-color);
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
  font-family: "Lora", serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
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
  transition:
    background 0.2s,
    color 0.2s;
}

.modal-close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
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
  color: var(--text-tertiary);
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
  font-family: "Lora", serif;
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
  color: var(--text-primary);
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
  transition:
    color 0.2s,
    transform 0.2s;
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
  color: var(--text-primary);
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
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
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
  content: "✓";
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
  border-bottom: none !important;
  /* Managed by row */
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

.logo-inner {
  display: flex;
  align-items: center;
  gap: 8px;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--logo-border);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation:
    logo-entrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards,
    logo-breathe 3s ease-in-out infinite 0.8s;
}

.nav-logo:hover .logo-icon {
  transform: scale(1.06) rotate(3deg);
  filter: drop-shadow(0 0 10px rgba(0, 166, 81, 0.4));
}

/* Merged with main .logo-text definition in variables section */

@keyframes logo-entrance {
  from {
    opacity: 0;
    transform: translateX(-15px) rotate(-8deg);
  }

  to {
    opacity: 1;
    transform: translateX(0) rotate(0);
  }
}

@keyframes text-reveal {
  from {
    opacity: 0;
    transform: translateX(-20px);
    filter: blur(4px);
  }

  to {
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
    opacity: 0.92;
    transform: scale(0.97);
  }
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
