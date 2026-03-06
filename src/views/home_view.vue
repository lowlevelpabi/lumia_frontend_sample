<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Search, User, ChevronRight } from 'lucide-vue-next'
import { api, type Paper } from '../services/api'

const router = useRouter()
const searchQuery = ref('')
const recentPapers = ref<Paper[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const allPapers = await api.listAllPapers()
    // Sort by created_at desc (if available) or just take the last 5
    recentPapers.value = allPapers
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .slice(0, 5)
  } catch (e) {
    console.error('Failed to fetch recent papers:', e)
  } finally {
    loading.value = false
  }
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'results', query: { q: searchQuery.value } })
  }
}


</script>

<template>
  <div class="home-container">
    <!-- Hero Section -->
    <header class="home-hero">
      <div class="hero-inner">
        <h1 class="hero-title">Lumia: Smart Research</h1>
        <p class="hero-subtitle">Search and discover research papers with ease.
        </p>

        <div class="hero-search">
          <div class="search-box">
            <Search :size="20" class="search-icon" />
            <input v-model="searchQuery" type="text" placeholder="Search by context, title, or keywords..."
              @keyup.enter="handleSearch" />
            <button class="search-btn" @click="handleSearch">Search</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="home-main">
      <div class="content-layout">
        <!-- Sidebar / Stats -->
        <aside class="left-aside">
          <div class="card promo-card">
            <h3>Join our researcher community</h3>
            <p>Share your publications, get stats, and stay up to date with the latest research in your field.</p>
            <RouterLink :to="{ name: 'register' }" class="promo-btn">Join for free</RouterLink>
          </div>

          <div class="card stats-card">
            <div class="stat-item">
              <span class="stat-num">250+</span>
              <span class="stat-label">Departments</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-num">50k+</span>
              <span class="stat-label">Authors</span>
            </div>
          </div>
        </aside>

        <!-- Feed / Recent Uploads -->
        <section class="main-feed">
          <h2 class="section-title">Recently added research</h2>

          <div v-if="loading" class="loading-feed">
            <div v-for="i in 3" :key="i" class="paper-card skeleton">
              <div class="skel skel-line"></div>
              <div class="skel skel-line short"></div>
              <div class="skel skel-abstract"></div>
            </div>
          </div>

          <div v-else class="papers-feed">
            <div v-for="paper in recentPapers" :key="paper.id" class="paper-card">
              <div class="paper-type">Thesis</div>
              <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="paper-title">
                {{ paper.title }}
              </RouterLink>
              <div class="paper-authors">
                <User :size="14" />
                <span>{{ paper.author }}</span>
              </div>
              <p class="paper-abstract-preview">
                {{ paper.abstract?.substring(0, 180) }}...
              </p>
              <div class="paper-actions">
                <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="view-btn">
                  View full-text
                  <ChevronRight :size="14" />
                </RouterLink>
              </div>
            </div>

            <RouterLink :to="{ name: 'results', query: { q: '' } }" class="see-more-btn">
              Explore more research
            </RouterLink>
          </div>
        </section>

        <!-- Rights Aside -->
        <aside class="right-aside">
          <div class="card network-card">
            <h3>Network with experts</h3>
            <p>Connect with authors and collaborators from various programs.</p>
            <div class="author-avatars">
              <div v-for="i in 5" :key="i" class="mini-avatar"
                :style="{ backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][i - 1] }">
                {{ 'ABCDE'[i - 1] }}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f9fafb;
}

/* ── Hero ────────────────────────────────────────────── */
.home-hero {
  background: linear-gradient(135deg, #001a0d 0%, #004d26 100%);
  padding: 6rem 1.5rem 8rem;
  color: #fff;
  text-align: center;
}

.hero-inner {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 3.5rem;
  line-height: 1.6;
}

.hero-search {
  max-width: 700px;
  margin: 0 auto;
}

.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 4px;
  padding: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.search-icon {
  color: #9ca3af;
  margin-left: 1rem;
}

.search-box input {
  flex: 1;
  border: none;
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
  outline: none;
  color: #111827;
}

.search-btn {
  background: #00a651;
  color: #fff;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.search-btn:hover {
  background: #008c44;
}

/* ── Main Layout ────────────────────────────────────────── */
.home-main {
  max-width: 1200px;
  margin: -4rem auto 4rem;
  padding: 0 1.5rem;
}

.content-layout {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 2rem;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* ── Left Aside ────────────────────────────────────────── */
.promo-card {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.promo-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #1e3a8a;
}

.promo-card p {
  font-size: 0.9rem;
  color: #3b82f6;
  margin-bottom: 1.25rem;
  line-height: 1.4;
}

.promo-btn {
  display: inline-block;
  background: #2563eb;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
}

.stats-card {
  display: flex;
  flex-direction: column;
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
}

.stat-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: #111827;
}

.stat-label {
  font-size: 0.85rem;
  color: #6b7280;
}

.stat-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 0.75rem 0;
}

/* ── Main Feed ───────────────────────────────────────────── */
.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.5rem;
}

.paper-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
}

.paper-card:hover {
  border-color: #00a651;
}

.paper-type {
  font-size: 0.75rem;
  font-weight: 700;
  color: #059669;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.paper-title {
  display: block;
  font-size: 1.15rem;
  font-weight: 700;
  color: #111827;
  text-decoration: none;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.paper-title:hover {
  color: #00a651;
  text-decoration: underline;
}

.paper-authors {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #4b5563;
  margin-bottom: 1rem;
}

.paper-abstract-preview {
  font-size: 0.95rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #00a651;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
}

.see-more-btn {
  display: block;
  text-align: center;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #4b5563;
  font-weight: 600;
  text-decoration: none;
  margin-top: 1.5rem;
}

.see-more-btn:hover {
  background: #f9fafb;
}

/* ── Right Aside ────────────────────────────────────────── */
.network-card h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.network-card p {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.author-avatars {
  display: flex;
  gap: 0.5rem;
}

.mini-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
}

/* ── Skeleton ───────────────────────────────────────────── */
.skeleton .skel {
  background: #f3f4f6;
  border-radius: 4px;
}

.skel-line {
  height: 1.25rem;
  margin-bottom: 0.75rem;
}

.skel-line.short {
  width: 60%;
}

.skel-abstract {
  height: 4rem;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 1024px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .left-aside,
  .right-aside {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .home-hero {
    padding: 4rem 1.5rem 6rem;
  }
}

.home-page {
  font-family: 'Inter', -apple-system, sans-serif;
  color: #1a1a1a;
  background-color: #fff;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 800;
  font-size: 1.25rem;
  color: #111;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: #666;
  font-weight: 600;
  font-size: 0.9rem;
}

.nav-link:hover {
  color: #10b981;
}

.login-btn {
  background-color: #f3f4f6;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #374151;
  text-decoration: none;
}

.login-btn.manage {
  background-color: #ecfdf5;
  color: #047857;
}

.login-btn:hover {
  background-color: #e5e7eb;
}

.hero {
  padding: 8rem 2rem;
  text-align: center;
}

.hero-content h1 {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.02rem;
  margin-bottom: 1rem;
}

.hero-content p {
  font-size: 1.25rem;
  color: #666;
  max-width: 600px;
  margin: 0 auto 3rem;
}

.search-container {
  display: flex;
  justify-content: center;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 23px;
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  width: 100%;
  max-width: 700px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s;
}

.search-bar:focus-within {
  border-color: #10b981;
}

.search-icon {
  color: #999;
}

.search-input {
  border: none;
  padding: 0.75rem 1rem;
  flex: 1;
  font-size: 1.1rem;
  outline: none;
}

.search-btn {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 9999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}

.search-btn:active {
  transform: scale(0.95);
}

.stats {
  display: flex;
  justify-content: center;
  gap: 4rem;
  padding: 4rem 2rem;
  border-top: 1px solid #eee;
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card h3 {
  font-size: 2rem;
  font-weight: 800;
  color: #111;
}

.stat-card p {
  color: #666;
  font-weight: 600;
}

/* ── Tablet (≤768px) ─────────────────────────────────────────── */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
  }

  .hero {
    padding: 5rem 1.25rem;
  }

  .hero-content h1 {
    font-size: 2.5rem;
  }

  .search-bar {
    max-width: 100%;
  }
}

/* ── Phone (≤480px) — Primary Android target 360–412px ───────── */
@media (max-width: 480px) {
  .navbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
  }

  .logo span {
    font-size: 1rem;
  }

  .nav-links {
    gap: 0.75rem;
    width: 100%;
    flex-wrap: wrap;
  }

  .nav-link {
    display: none;
    /* hide Explore / About on phones */
  }

  .hero {
    padding: 3.5rem 1rem 2.5rem;
  }

  .hero-content h1 {
    font-size: 1.8rem;
    letter-spacing: -0.01rem;
  }

  .hero-content p {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .search-bar {
    max-width: 100%;
    padding: 0.4rem 0.4rem 0.4rem 1rem;
    border-radius: 16px;
  }

  .search-input {
    font-size: 0.95rem;
    padding: 0.6rem 0.75rem;
  }

  .search-btn {
    padding: 0.65rem;
  }
}
</style>
