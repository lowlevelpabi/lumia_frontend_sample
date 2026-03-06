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
    <!-- Top Navigation (ScienceDirect-like blended) -->
    <nav class="site-nav">
      <div class="nav-inner">
        <div class="logo">Lumia</div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">Explore</RouterLink>
          <RouterLink :to="{ name: 'results', query: { q: '' } }" class="nav-link">Articles</RouterLink>
          <RouterLink :to="{ name: 'register' }" class="nav-link">Authors</RouterLink>
        </div>
        <div class="nav-actions">
          <RouterLink :to="{ name: 'login' }" class="login-btn">Sign in</RouterLink>
        </div>
      </div>
    </nav>

    <!-- Hero/Search Panel (blended look) -->
    <header class="home-hero sd-hero">
      <div class="hero-inner sd-hero-inner">
        <div class="hero-left">
          <h1 class="hero-title">Discover trusted research faster</h1>
          <p class="hero-subtitle">Search across titles, abstracts, and full-text — powered by Lumia's search.</p>
          <div class="search-panel">
            <div class="search-card">
              <div class="search-left">
                <Search :size="20" class="search-icon" />
                <input v-model="searchQuery" type="text" placeholder="Search by topic, title, author, or DOI"
                  @keyup.enter="handleSearch" />
              </div>
              <div class="search-right">
                <button class="search-btn" @click="handleSearch">Search</button>
              </div>
            </div>
            <div class="search-hint">Try: "deep learning for healthcare" or "renewable energy policy"</div>
          </div>
        </div>
        <div class="hero-right">
          <div class="featured-card">
            <h4>Featured thesis</h4>
            <p class="feat-title">A compact overview of modern retrieval techniques</p>
            <RouterLink :to="{ name: 'results', query: { q: '' } }" class="cta-link">Browse related papers</RouterLink>
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
  background-color: #f3f5f7;
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  color: #111827;
}

/* Top navigation (clean, white) */
.site-nav {
  background: #ffffff;
  border-bottom: 1px solid #e6e9ee;
  position: sticky;
  top: 0;
  z-index: 20;
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
}

.logo {
  font-weight: 800;
  font-size: 1.25rem;
  color: #0b2330;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.nav-link {
  color: #475569;
  text-decoration: none;
  font-weight: 600;
}

.nav-link:hover {
  color: #0b6b5a;
}

.nav-actions .login-btn {
  background: transparent;
  border: 1px solid #d1d5db;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  color: #0b2330;
  text-decoration: none;
}

/* Hero area resembling ScienceDirect: spacious, white cards on pale background */
.sd-hero {
  padding: 3.5rem 1rem 2.5rem;
}

.sd-hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  align-items: start;
}

.hero-left {
  padding: 1.25rem 1.5rem;
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #0b2330;
  margin-bottom: 0.5rem;
}

.hero-subtitle {
  color: #475569;
  margin-bottom: 1.25rem;
}

.search-panel {
  margin-top: 0.75rem;
}

.search-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e6e9ee;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(11, 35, 48, 0.06);
}

.search-left {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex: 1;
}

.search-icon {
  color: #94a3b8;
  margin-left: 0.5rem;
}

.search-card input {
  border: none;
  outline: none;
  padding: 0.6rem 0.5rem;
  font-size: 1rem;
  color: #0b2330;
  width: 100%;
}

.search-right {
  margin-left: 1rem;
}

.search-btn {
  background: #0b6b5a;
  color: #fff;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

.search-hint {
  margin-top: 0.5rem;
  color: #94a3b8;
  font-size: 0.875rem;
}

.hero-right .featured-card {
  background: linear-gradient(180deg, #ffffff 0%, #fbfdfe 100%);
  border: 1px solid #e6e9ee;
  padding: 1rem;
  border-radius: 8px;
}

.featured-card h4 {
  margin: 0 0 0.25rem 0;
  color: #0b2330;
  font-size: 0.95rem;
}

.feat-title {
  font-weight: 700;
  color: #0b6b5a;
  margin-bottom: 0.75rem;
}

.cta-link {
  color: #0b6b5a;
  text-decoration: none;
  font-weight: 700;
}

/* Main content area */
.home-main {
  max-width: 1200px;
  margin: 1.5rem auto 4rem;
  padding: 0 1.5rem;
}

.content-layout {
  display: grid;
  grid-template-columns: 280px 1fr 260px;
  gap: 1.5rem;
}

.card {
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0b2330;
  margin-bottom: 1rem;
}

.paper-card {
  background: #ffffff;
  border: 1px solid #eef2f6;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.15s, transform 0.12s;
}

.paper-card:hover {
  box-shadow: 0 8px 20px rgba(11, 35, 48, 0.06);
  transform: translateY(-3px);
}

.paper-type {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0b6b5a;
  margin-bottom: 0.4rem;
}

.paper-title {
  font-size: 1.05rem;
  color: #0b2330;
  font-weight: 700;
}

.paper-authors {
  color: #475569;
}

.paper-abstract-preview {
  color: #475569;
}

.see-more-btn {
  display: block;
  text-align: center;
  padding: 0.85rem;
  background: #ffffff;
  border: 1px solid #e6e9ee;
  border-radius: 8px;
  color: #475569;
  font-weight: 700;
  text-decoration: none;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .left-aside,
  .right-aside {
    display: none;
  }

  .sd-hero-inner {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .nav-links {
    display: none;
  }

  .nav-actions .login-btn {
    display: none;
  }

  .hero-title {
    font-size: 1.5rem;
  }

  .search-card {
    padding: 0.4rem;
  }

  .search-btn {
    padding: 0.5rem 0.7rem;
  }
}
</style>
