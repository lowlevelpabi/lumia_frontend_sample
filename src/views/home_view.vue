<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Search, User, ArrowRight, Clock, X, Shield, Zap, Database } from 'lucide-vue-next'
import { api, type Paper } from '../services/api'
import { historyService } from '../services/history'
import { useAuth } from '../composables/useAuth'

const searchHistory = ref<string[]>([])
const showHistory = ref(false)
const historyRef = ref<HTMLElement | null>(null)

const router = useRouter()
const searchQuery = ref('')
const recentPapers = ref<Paper[]>([])
const loading = ref(true)

const { fullName } = useAuth()
const scrollY = ref(0)

const handleScroll = () => {
  scrollY.value = window.scrollY
}

const greetingText = computed(() => {
  if (!fullName.value) {
    return 'Lumia Discovery'
  }
  const hour = new Date().getHours()
  let timeGreeting = 'Welcome'
  if (hour < 12) timeGreeting = 'Good morning'
  else if (hour < 18) timeGreeting = 'Good afternoon'
  else timeGreeting = 'Good evening'

  return `${timeGreeting}, ${fullName.value.split(' ')[0]}!`
})

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  searchHistory.value = historyService.getHistory()
  try {
    const allPapers = await api.listAllPapers()
    recentPapers.value = allPapers
      .sort((a, b) => String(b.id).localeCompare(String(a.id)))
      .slice(0, 4)
  } catch (e) {
    console.error('Failed to fetch recent papers:', e)
  } finally {
    loading.value = false
  }

  document.addEventListener('click', (e) => {
    if (historyRef.value && !historyRef.value.contains(e.target as Node)) {
      showHistory.value = false
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    historyService.saveQuery(searchQuery.value)
    router.push({ name: 'explore', query: { q: searchQuery.value } })
    showHistory.value = false
  }
}

const scrollToSearch = () => {
  const el = document.getElementById('main-search')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="landing-page">
    
    <!-- ══ PARALLAX HERO ════════════════════════════════════════════ -->
    <section class="parallax-hero">
      <div class="parallax-bg" :style="{ transform: `translateY(${scrollY * 0.5}px)` }">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
      </div>
      
      <div class="hero-content" :style="{ transform: `translateY(${scrollY * 0.1}px)`, opacity: 1 - scrollY / 600 }">
        <div class="hero-brand">
          <h1 class="hero-title">
            <img src="/lumia_logo.png" alt="Lumia Logo" class="brand-logo" />
            <span class="title-text">umia</span>
          </h1>
        </div>
        
        <p class="hero-subtitle">
          Intelligent information retrieval and analysis for modern academic research.
        </p>
        
        <div class="hero-actions">
          <button @click="scrollToSearch" class="primary-btn">
            Get Started <ArrowRight :size="18" />
          </button>
          <RouterLink :to="{ name: 'about' }" class="secondary-btn">Learn More</RouterLink>
        </div>
      </div>

      <div class="scroll-indicator" :class="{ 'hidden': scrollY > 50 }">
        <div class="mouse">
          <div class="wheel"></div>
        </div>
      </div>
    </section>

    <!-- ══ FEATURES SECTION ═════════════════════════════════════════ -->
    <section class="features-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Why Lumia?</h2>
          <p class="section-desc">Designed to streamline the way you interact with academic documents.</p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon"><Zap :size="24" /></div>
            <h3>Fast Retrieval</h3>
            <p>Locate specific sections of any manuscript in milliseconds with our optimized indexing engine.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><Database :size="24" /></div>
            <h3>Structured Data</h3>
            <p>Automatically extracts IMRAD components and metadata from uploaded PDF documents.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><Shield :size="24" /></div>
            <h3>Secure Storage</h3>
            <p>Your research is protected with enterprise-grade security and role-based access control.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ SEARCH SECTION (Anchored) ════════════════════════════════ -->
    <section id="main-search" class="search-section">
      <div class="container">
        <div class="search-container">
          <div class="search-header">
            <span class="search-greeting">{{ greetingText }}</span>
            <h2 class="search-title">What are we looking for today?</h2>
          </div>

          <div class="search-box-wrap" ref="historyRef">
            <div class="search-field">
              <Search :size="20" class="s-icon" />
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search by title, author, or keywords..."
                @keyup.enter="handleSearch" 
                @focus="showHistory = true" 
                spellcheck="false" 
                autocomplete="off" 
              />
              <button @click="handleSearch" class="search-go">Search</button>

              <!-- Search History Popup -->
              <div v-if="showHistory && searchHistory.length > 0" class="history-popup">
                <div class="history-head">
                  <span>Recent Searches</span>
                  <button @click="historyService.clearHistory(); searchHistory = []">Clear All</button>
                </div>
                <div class="history-list">
                  <div v-for="h in searchHistory" :key="h" class="history-item" @click="searchQuery = h; handleSearch()">
                    <Search :size="12" />
                    <span>{{ h }}</span>
                    <button class="h-remove" @click.stop="historyService.removeQuery(h); searchHistory = historyService.getHistory()">
                      <X :size="10" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ RECENT RESEARCH ══════════════════════════════════════════ -->
    <main class="content-wrap">
      <div class="container">
        <section class="feed">
          <header class="feed-head">
            <div class="feed-head-left">
              <Clock :size="14" />
              <span>Recent Contributions</span>
            </div>
            <RouterLink :to="{ name: 'explore' }" class="text-link">View Archive <ArrowRight :size="14" /></RouterLink>
          </header>

          <div v-if="loading" class="paper-list">
            <div v-for="i in 4" :key="i" class="paper-item skeleton">
              <div class="sk-body">
                <div class="sk-tag"></div>
                <div class="sk-title"></div>
                <div class="sk-meta"></div>
              </div>
            </div>
          </div>

          <ol v-else-if="recentPapers.length > 0" class="paper-list">
            <li v-for="paper in recentPapers" :key="paper.id" class="paper-item">
              <div class="item-body">
                <div class="item-tags">
                  <span class="type-tag">{{ paper.project_type || 'Research' }}</span>
                  <span v-if="paper.year" class="year-tag">{{ paper.year }}</span>
                </div>

                <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="item-title">
                  {{ paper.title }}
                </RouterLink>

                <div class="item-meta">
                  <User :size="12" />
                  <span>{{ paper.author }}</span>
                  <template v-if="paper.department">
                    <span class="dot">·</span>
                    <span class="item-dept">{{ paper.department }}</span>
                  </template>
                </div>

                <p class="item-abstract">{{ paper.abstract?.substring(0, 180) }}...</p>
              </div>
            </li>
          </ol>

          <div v-else class="empty-feed">
            <p>The archive is currently empty</p>
          </div>
        </section>
      </div>
    </main>

  </div>
</template>

<style scoped>
.landing-page {
  --green: var(--accent-primary);
  --green-dk: #008f45;
  --bg: var(--bg-primary);
  --paper: var(--bg-secondary);
  --ink: var(--text-primary);
  --ink-2: var(--text-secondary);
  --ink-3: var(--text-tertiary);
  --rule: var(--border-color);
  
  background: var(--bg);
  color: var(--ink);
  font-family: 'Source Sans 3', sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* ══ PARALLAX HERO ════════════════════════════════════════════ */
.parallax-hero {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #0d1f12;
  color: #fff;
  text-align: center;
}

.dark .parallax-hero {
  background: #020617;
}

.parallax-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 120%;
  pointer-events: none;
  z-index: 1;
}

.floating-shape {
  position: absolute;
  background: linear-gradient(135deg, var(--green) 0%, transparent 80%);
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
}

.shape-1 { width: 500px; height: 500px; top: -10%; left: -10%; }
.shape-2 { width: 400px; height: 400px; bottom: 10%; right: -5%; opacity: 0.1; }
.shape-3 { width: 300px; height: 300px; top: 40%; left: 60%; opacity: 0.05; }

.hero-content {
  position: relative;
  z-index: 10;
  max-width: 900px;
  padding: 0 2rem;
}

.hero-brand {
  display: flex;
  justify-content: center;
  margin-bottom: 2.5rem;
  animation: brand-entrance 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.hero-title {
  display: flex;
  align-items: center;
  gap: 0;
  font-family: 'Lora', serif;
  font-size: clamp(3.5rem, 8vw, 6.5rem);
  font-weight: 600;
  margin: 0;
  line-height: 1;
  letter-spacing: -0.02em;
}

.brand-logo {
  height: 1.3em;
  width: auto;
  filter: drop-shadow(0 0 15px rgba(0, 166, 81, 0.4));
  animation: brand-pulse 4s ease-in-out infinite;
  margin-right: -0.05em;
}

.title-text {
  margin-left: -0.05em;
  background: linear-gradient(to right, #fff 20%, var(--green) 50%, #fff 80%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 8s linear infinite;
}

@keyframes brand-entrance {
  0% { transform: translateY(30px) scale(0.95); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes brand-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(0, 166, 81, 0.4)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(0, 166, 81, 0.6)); }
}

@keyframes shine {
  to { background-position: 200% center; }
}

.hero-subtitle {
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  opacity: 0;
  animation: fade-in-up 1s ease-out 0.5s forwards;
}

@keyframes fade-in-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.hero-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  opacity: 0;
  animation: fade-in-up 1s ease-out 0.8s forwards;
}

.primary-btn {
  background: var(--green);
  color: #fff;
  border: none;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s;
}

.primary-btn:hover {
  background: var(--green-dk);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 166, 81, 0.3);
}

.secondary-btn {
  background: transparent;
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 2rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all 0.3s;
}

.secondary-btn:hover {
  border-color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  transition: opacity 0.3s;
}

.scroll-indicator.hidden {
  opacity: 0;
}

.mouse {
  width: 26px;
  height: 42px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.wheel {
  width: 4px;
  height: 8px;
  background: var(--green);
  border-radius: 2px;
  animation: scroll-anim 1.5s infinite;
}

@keyframes scroll-anim {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(15px); opacity: 0; }
}

/* ══ FEATURES SECTION ═════════════════════════════════════════ */
.features-section {
  padding: 8rem 0;
  background: var(--paper);
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-family: 'Lora', serif;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.section-desc {
  font-size: 1.1rem;
  color: var(--ink-2);
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  padding: 3rem 2rem;
  background: var(--bg);
  border: 1px solid var(--rule);
  border-radius: 16px;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
  border-color: var(--green);
}

.feature-icon {
  width: 60px;
  height: 60px;
  background: rgba(0, 166, 81, 0.1);
  color: var(--green);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.feature-card h3 {
  font-family: 'Lora', serif;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.feature-card p {
  color: var(--ink-2);
  line-height: 1.6;
}

/* ══ SEARCH SECTION ═══════════════════════════════════════════ */
.search-section {
  padding: 6rem 0;
  background: var(--bg);
  border-top: 1px solid var(--rule);
}

.search-container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.search-greeting {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
}

.search-title {
  font-family: 'Lora', serif;
  font-size: 2.2rem;
  margin-bottom: 3rem;
}

.search-box-wrap {
  position: relative;
}

.search-field {
  display: flex;
  align-items: center;
  background: var(--paper);
  border: 2px solid var(--rule);
  border-radius: 12px;
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.search-field:focus-within {
  border-color: var(--green);
  box-shadow: 0 10px 30px rgba(0, 166, 81, 0.1);
}

.search-field input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 1.1rem;
  padding: 0.75rem 1rem;
  color: var(--ink);
}

.s-icon {
  color: var(--ink-3);
}

.search-go {
  background: var(--green);
  color: #fff;
  border: none;
  padding: 0.85rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.search-go:hover {
  background: var(--green-dk);
}

/* History Popup */
.history-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  margin-top: 0.75rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  text-align: left;
}

.history-head {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--bg);
  border-bottom: 1px solid var(--rule);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-3);
}

.history-head button {
  background: none;
  border: none;
  color: var(--green);
  cursor: pointer;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--bg);
}

.h-remove {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  opacity: 0.5;
}

.h-remove:hover {
  opacity: 1;
  color: #ef4444;
}

/* ══ RECENT RESEARCH ══════════════════════════════════════════ */
.content-wrap {
  padding: 6rem 0;
  background: var(--paper);
}

.feed-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--rule);
}

.feed-head-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  color: var(--ink-2);
}

.text-link {
  color: var(--green);
  text-decoration: none;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.paper-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 2rem;
  list-style: none;
  padding: 0;
}

.paper-item {
  background: var(--bg);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid var(--rule);
  transition: all 0.3s;
}

.paper-item:hover {
  border-color: var(--green);
}

.item-tags {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
}

.type-tag {
  background: rgba(0, 166, 81, 0.1);
  color: var(--green);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}

.item-title {
  display: block;
  font-family: 'Lora', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--ink-3);
  margin-bottom: 1rem;
}

.item-abstract {
  font-size: 0.95rem;
  color: var(--ink-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Skeleton */
.skeleton {
  pointer-events: none;
}
.sk-body div {
  background: var(--skeleton-bg);
  border-radius: 4px;
  margin-bottom: 1rem;
}
.sk-tag { width: 60px; height: 20px; }
.sk-title { width: 90%; height: 24px; }
.sk-meta { width: 50%; height: 16px; }

@media (max-width: 768px) {
  .hero-title { font-size: 3rem; }
  .paper-list { grid-template-columns: 1fr; }
  .hero-actions { flex-direction: column; }
}
</style>
