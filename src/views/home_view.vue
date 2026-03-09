<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Search, User, ChevronRight, Filter } from 'lucide-vue-next'
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
    <!-- Hero / Search Panel -->
    <header class="home-hero">
      <div class="hero-inner">
        <div class="hero-content">
          <h1 class="hero-title">Lumia: Smart Research</h1>
          <p class="hero-subtitle">Search across various domains or topics.
          </p>

          <div class="search-panel">
            <div class="search-box">
              <div class="search-input-wrap">
                <Search :size="20" class="search-icon" />
                <input v-model="searchQuery" type="text" placeholder="Search by title, abstract content, or keywords"
                  @keyup.enter="handleSearch" />
              </div>
              <button class="search-btn" @click="handleSearch">Search</button>
            </div>
            <div class="search-hint">Try: "deep learning for healthcare" or "machine learning"</div>
          </div>
        </div>

        <div class="hero-featured">
          <div class="featured-card">
            <span class="feat-badge">Featured Thesis</span>
            <h4 class="feat-title">A compact overview of modern retrieval techniques</h4>
            <p class="feat-desc">Exploring how neural search is transforming academic discovery.</p>
            <RouterLink :to="{ name: 'results', query: { q: '' } }" class="cta-link">
              Browse Related
              <ChevronRight :size="16" />
            </RouterLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="home-main">
      <div class="content-layout">
        <!-- Left Sidebar: Quick Refine -->
        <aside class="left-aside">
          <div class="utility-card">
            <div class="card-header-row">
              <Filter :size="16" />
              <h4>Refine Discovery</h4>
            </div>
            <div class="filter-group">
              <span class="group-label">Document / Article Type</span>
              <RouterLink :to="{ name: 'results', query: { q: 'Thesis' } }" class="filter-link">Thesis</RouterLink>
              <RouterLink :to="{ name: 'results', query: { q: 'Capstone' } }" class="filter-link">Capstone Projects
              </RouterLink>
            </div>
            <div class="filter-group">
              <span class="group-label">Department(s)</span>
              <RouterLink :to="{ name: 'results', query: { q: 'Computer Science' } }" class="filter-link">Computer
                Studies</RouterLink>
            </div>
          </div>
        </aside>

        <!-- Feed / Recent Uploads -->
        <section class="main-feed">
          <div class="feed-header">
            <h2 class="section-title">Recently Added Research</h2>
            <RouterLink :to="{ name: 'results', query: { q: '' } }" class="text-link">View all</RouterLink>
          </div>

          <div v-if="loading" class="loading-feed">
            <div v-for="i in 3" :key="i" class="paper-card skeleton">
              <div class="skel skel-line"></div>
              <div class="skel skel-line short"></div>
              <div class="skel skel-abstract"></div>
            </div>
          </div>

          <div v-else class="papers-feed">
            <div v-for="paper in recentPapers" :key="paper.id" class="paper-card">
              <div class="paper-type">{{ paper.project_type || 'Research' }}</div>
              <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="paper-title">
                {{ paper.title }}
              </RouterLink>
              <div class="paper-authors">
                <User :size="14" class="inline-icon" />
                <span>{{ paper.author }}</span>
              </div>
              <p class="paper-abstract-preview">
                {{ paper.abstract?.substring(0, 180) }}...
              </p>
              <div class="paper-actions">
                <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="view-btn">
                  View Full-text
                  <ChevronRight :size="14" />
                </RouterLink>
              </div>
            </div>

            <RouterLink :to="{ name: 'results', query: { q: '' } }" class="see-more-btn">
              Explore More Research
            </RouterLink>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<style scoped>
.home-container {
  min-height: calc(100vh - 64px);
  background-color: #f8fafc;
}

/* ── Hero Section ────────────────────────────────────────── */
.home-hero {
  background: linear-gradient(135deg, #001a0d 0%, #004d26 100%);
  padding: 4rem 1.5rem 5rem;
  color: #fff;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 3rem;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.75rem;
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 2rem;
  line-height: 1.5;
  max-width: 600px;
}

/* Search Box */
.search-panel {
  max-width: 650px;
}

.search-box {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 0.4rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
}

.search-input-wrap input {
  width: 100%;
  border: none;
  padding: 0.75rem 0.5rem;
  font-size: 1rem;
  outline: none;
  color: #1a1a1a;
}

.search-icon {
  color: #94a3b8;
}

.search-btn {
  background: #00a651;
  color: #fff;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.search-btn:hover {
  background: #008c44;
  transform: translateY(-1px);
}

.search-hint {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Hero Featured Card */
.hero-featured {
  width: 340px;
}

.featured-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1.5rem;
  border-radius: 16px;
  color: #fff;
}

.feat-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  background: #00a651;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.feat-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.feat-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1.5rem;
}

.cta-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #00a651;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
}

.cta-link:hover {
  text-decoration: underline;
}

/* ── Main Layout (3-Column Utility) ─────────────────────── */
.home-main {
  max-width: 1200px;
  margin: 0 auto 5rem;
  padding: 0 1.5rem;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin: -2.5rem auto 3rem;
  position: relative;
  z-index: 10;
}

.feature-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.feature-icon {
  width: 48px;
  height: 48px;
  background: #f0fdf4;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-info h3 {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.15rem;
}

.feature-info p {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.4;
}

.content-layout {
  display: grid;
  grid-template-columns: 260px 1fr 260px;
  gap: 2rem;
  align-items: start;
}

/* Sidebar Cards */
.utility-card,
.guide-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  color: #0f172a;
}

.card-header-row h4 {
  font-size: 0.95rem;
  font-weight: 700;
}

.filter-group {
  margin-bottom: 1.5rem;
}

.group-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.filter-link {
  display: block;
  font-size: 0.9rem;
  color: #475569;
  text-decoration: none;
  padding: 0.4rem 0;
  transition: all 0.2s;
}

.filter-link:hover {
  color: #00a651;
  padding-left: 4px;
}

/* Guide Card */
.guide-intro {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.tip-box {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.tip-cmd {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: #00a651;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.tip-desc {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.3;
}

.guide-link {
  display: block;
  margin-top: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #00a651;
  text-decoration: none;
}

.guide-link:hover {
  text-decoration: underline;
}

/* Main Feed */
.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
}

.text-link {
  color: #00a651;
  text-decoration: none;
  font-weight: 700;
}

.paper-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
  transition: all 0.2s;
}

.paper-card:hover {
  border-color: #00a651;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.paper-type {
  font-size: 0.7rem;
  font-weight: 800;
  color: #059669;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.paper-title {
  text-decoration: none;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
  margin-bottom: 0.75rem;
  display: block;
}

.paper-title:hover {
  color: #00a651;
}

.paper-authors {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 1rem;
}

.inline-icon {
  color: #94a3b8;
}

.paper-abstract-preview {
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #00a651;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.875rem;
}

.see-more-btn {
  display: block;
  text-align: center;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #64748b;
  font-weight: 700;
  text-decoration: none;
  margin-top: 2rem;
  transition: all 0.2s;
}

.see-more-btn:hover {
  border-color: #00a651;
  color: #00a651;
}

/* ── Skeletons ─────────────────────────────────────────── */
.skeleton .skel {
  background: #f1f5f9;
  border-radius: 6px;
}

.skel-line {
  height: 1.2rem;
  margin-bottom: 0.75rem;
}

.skel-line.short {
  width: 60%;
}

.skel-abstract {
  height: 4rem;
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 1200px) {
  .hero-inner {
    flex-direction: column;
    text-align: center;
  }

  .hero-subtitle {
    margin-left: auto;
    margin-right: auto;
  }

  .search-panel {
    margin: 0 auto;
  }

  .hero-featured {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }
}

@media (max-width: 1100px) {
  .home-main {
    max-width: 800px;
  }

  .content-layout {
    grid-template-columns: 1fr;
  }

  .left-aside,
  .right-aside {
    display: none;
  }
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
    margin-top: -1.5rem;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2rem;
  }

  .search-box {
    flex-direction: column;
    padding: 0.5rem;
  }

  .search-btn {
    width: 100%;
    margin-top: 0.5rem;
  }
}
</style>
