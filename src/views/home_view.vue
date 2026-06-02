<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { User, Clock, Search, X } from 'lucide-vue-next'
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

const { fullName, isAdmin, isFaculty } = useAuth()
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

  let rolePrefix = ''
  if (isAdmin.value) rolePrefix = 'Admin '
  else if (isFaculty.value) rolePrefix = 'Faculty '

  return `${timeGreeting}, ${rolePrefix}${fullName.value.split(' ')[0]}!`
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
</script>

<template>
  <div class="landing-page">
    
    <!-- ══ HERO SECTION ════════════════════════════════════════════ -->
    <section class="hero-section">
      <!-- Static Background Image -->
      <img src="/imus_campus_scaled.jpg" class="hero-bg" alt="Lumia Campus Background" />
      <div class="hero-overlay"></div>
      
      <!-- Translucent floating glowing green shapes behind content to blend correctly -->
      <div class="hero-bg-shapes">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
      </div>
      
      <!-- Hero Content Container -->
      <div class="hero-content">
        
        <!-- Lumia Header Masthead (Lumia Header Text inherited from previous page) -->
        <div class="hero-masthead">
          <span class="masthead-rule"></span>
          <span class="masthead-label">Lumia · Research Retrieval System</span>
          <span class="masthead-rule"></span>
        </div>
        
        <!-- Animated Lumia Header Brand Text (logo acts as L + umia text with gradient shine animation) -->
        <div class="hero-brand">
          <h1 class="hero-title">
            <img src="/lumia_logo.png" alt="Lumia Logo" class="brand-logo" />
            <span class="title-text">umia</span>
          </h1>
        </div>

        <!-- Animated Greeting text below Lumia title -->
        <div class="hero-greeting animate-greeting">
          {{ greetingText }}
        </div>
        
        <!-- Subtitle -->
        <p class="hero-subtitle">
          Experience the next-level of thesis archiving system with smarter ways using, <br />
          OCR + IMRAD services and BERT embedding for semantic search.
        </p>
        
        <!-- Search Input Box -->
        <div class="search-box" ref="historyRef">
          <Search :size="20" class="s-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Title, keywords, context-based search, and more..." 
            @keyup.enter="handleSearch"
            @focus="showHistory = true"
            autocomplete="off"
          />
          <button @click="handleSearch" class="btn-submit" aria-label="Search">
            <svg class="icon-up-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>

          <!-- Search History Popup -->
          <div v-if="showHistory && searchHistory.length > 0" class="history-popup">
            <div class="history-head">
              <span>Recent Searches</span>
              <button @click.stop="historyService.clearHistory(); searchHistory = []">Clear All</button>
            </div>
            <div class="history-list">
              <div v-for="h in searchHistory" :key="h" class="history-item" @click.stop="searchQuery = h; handleSearch()">
                <Search :size="12" class="history-search-icon" />
                <span class="history-text">{{ h }}</span>
                <button class="h-remove" @click.stop="historyService.removeQuery(h); searchHistory = historyService.getHistory()">
                  <X :size="10" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </section>

    <!-- ══ RECENT RESEARCH FEED ═════════════════════════════════════ -->
    <main class="content-wrap">
      <div class="container">
        <section class="feed">
          <header class="feed-head">
            <div class="feed-head-left">
              <Clock :size="14" />
              <span>Recent Contributions</span>
            </div>
            <RouterLink :to="{ name: 'explore' }" class="text-link">
              View Archive 
              <svg class="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </RouterLink>
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
  --bg: var(--bg-primary);
  --paper: var(--bg-secondary);
  --ink: var(--text-primary);
  --ink-2: var(--text-secondary);
  --ink-3: var(--text-tertiary);
  --rule: var(--border-color);
  --green: var(--accent-primary);
  --green-dk: #007d3d;
  --skeleton-bg: var(--skeleton-bg);
  --logo-border: var(--logo-border);
  --logo-bg: var(--logo-bg);
  
  background: var(--bg);
  color: var(--ink);
  font-family: 'Noto Sans', sans-serif;
  overflow-x: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 120px;
  box-sizing: border-box;
}

/* ══ HERO SECTION ════════════════════════════════════════════ */
.hero-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* Center content vertically within the hero section */
  padding: 100px 0 60px 0; /* Safe padding-top avoids navbar overlap, padding-bottom balances layout */
  overflow: hidden;
  background-color: var(--bg);
  box-sizing: border-box;
}

/* Background image: 115% width and height, centered, top anchored */
.hero-bg {
  position: absolute;
  top: 0;
  left: 50%;
  width: 115%;
  height: 115%;
  transform: translateX(-50%);
  object-fit: cover;
  object-position: top;
  z-index: 1;
  pointer-events: none;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, 
    rgba(0, 166, 81, 0.06) 0%, 
    rgba(255, 255, 255, 0.4) 40%, 
    var(--bg-primary) 100%
  );
  z-index: 2;
  pointer-events: none;
  transition: background 0.3s ease;
}

.dark .hero-overlay {
  background: linear-gradient(180deg, 
    rgba(0, 200, 83, 0.12) 0%, 
    rgba(10, 10, 10, 0.4) 50%, 
    var(--bg-primary) 100%
  );
}

/* Translucent floating glowing green shapes behind content to blend correctly */
.hero-bg-shapes {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.floating-shape {
  position: absolute;
  background: linear-gradient(135deg, var(--green) 0%, transparent 80%);
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.16;
  pointer-events: none;
}

.shape-1 { 
  width: 500px; 
  height: 500px; 
  top: -5%; 
  left: -5%; 
  animation: float-shape-1 9s ease-in-out infinite alternate;
}
.shape-2 { 
  width: 420px; 
  height: 420px; 
  bottom: 15%; 
  right: -5%; 
  opacity: 0.12; 
  animation: float-shape-2 11s ease-in-out infinite alternate;
}
.shape-3 { 
  width: 320px; 
  height: 320px; 
  top: 35%; 
  left: 55%; 
  opacity: 0.06; 
  animation: float-shape-3 8s ease-in-out infinite alternate;
}

@keyframes float-shape-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(25px, -25px) scale(1.06); }
}

@keyframes float-shape-2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-20px, 20px) scale(0.94); }
}

@keyframes float-shape-3 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(20px, 15px) scale(1.08); }
}

/* Lumia Academic Masthead Text and Rules */
.hero-masthead {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  width: 100%;
  justify-content: center;
  opacity: 0;
  animation: brand-entrance 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
}

.masthead-rule {
  flex: 1;
  max-width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--green), transparent);
}

.masthead-label {
  font-family: 'Schibsted Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--green);
  text-shadow: 0 0 8px rgba(0, 166, 81, 0.2);
}



/* Hero Content Container */
.hero-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1200px;
  padding: 0 120px;
  margin-top: 0; /* Vertically centered by parent flex container */
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-sizing: border-box;
}

/* Animated Lumia Header Brand Text (logo acts as L + umia text with gradient shine animation) */
.hero-brand {
  display: flex;
  justify-content: center;
  margin-bottom: 34px; /* Gap within header elements: 34px */
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
  filter: drop-shadow(0 0 15px rgba(0, 166, 81, 0.3));
  animation: brand-pulse 4s ease-in-out infinite;
  margin-right: -0.05em;
}

.title-text {
  margin-left: -0.05em;
  background: linear-gradient(to right, #000 20%, var(--green) 50%, #000 80%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 8s linear infinite;
}

.dark .title-text {
  background: linear-gradient(to right, #fff 20%, var(--green) 50%, #fff 80%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Animated Greeting text below Lumia title */
.hero-greeting {
  font-family: 'Fustat', sans-serif;
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--green) 0%, #00e676 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-top: -8px;
  margin-bottom: 34px;
  opacity: 0;
  transform: translateY(20px);
  filter: blur(8px);
  animation: premium-greeting-reveal 1.4s cubic-bezier(0.19, 1, 0.22, 1) forwards 0.8s,
             greeting-glow 4s ease-in-out infinite alternate 2.2s;
  display: inline-block;
}

@keyframes premium-greeting-reveal {
  0% {
    opacity: 0;
    transform: translateY(25px) scale(0.95);
    filter: blur(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes greeting-glow {
  0% {
    filter: drop-shadow(0 0 2px rgba(0, 200, 83, 0.1));
  }
  100% {
    filter: drop-shadow(0 0 10px rgba(0, 200, 83, 0.35));
  }
}

/* Subtitle */
.hero-subtitle {
  font-family: 'Fustat', sans-serif;
  font-weight: 500; /* Fustat Medium */
  font-size: 20px;
  letter-spacing: -0.4px;
  color: var(--ink-2); /* Supports dark mode! */
  width: 100%;
  max-width: 800px; /* Expands container to let the subtitle flow beautifully and wrap exactly at <br /> */
  margin: 0 auto 44px auto; /* Gap between header and search box: 44px */
  line-height: 1.45;
  text-align: center;
}

/* Search Input Box */
.search-box {
  width: 100%;
  max-width: 700px;
  height: 56px;
  background: rgba(255, 255, 255, 0.7); /* Frosted glassmorphism */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1.5px solid rgba(0, 166, 81, 0.15);
  border-radius: 28px; /* Capsule/pill shape */
  padding: 0 8px 0 20px;
  display: flex;
  align-items: center;
  position: relative;
  box-sizing: border-box;
  box-shadow: 0 15px 35px rgba(0, 166, 81, 0.06), 0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  margin: 0 auto 44px auto; /* Gap below subtitle: 44px */
}

.search-box:focus-within {
  border-color: var(--green);
  box-shadow: 0 15px 40px rgba(0, 166, 81, 0.15), 0 2px 4px rgba(0, 0, 0, 0.02);
  transform: translateY(-1.5px);
  background: rgba(255, 255, 255, 0.85);
}

.dark .search-box {
  background: rgba(10, 10, 10, 0.55);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 25px rgba(0, 200, 83, 0.03);
}

.dark .search-box:focus-within {
  border-color: var(--green);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 200, 83, 0.06);
  background: rgba(15, 15, 15, 0.75);
}

.s-icon {
  color: rgba(0, 166, 81, 0.4);
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.search-box:focus-within .s-icon {
  color: var(--green);
}

.dark .s-icon {
  color: rgba(255, 255, 255, 0.35);
}

.dark .search-box:focus-within .s-icon {
  color: var(--green);
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  color: #000000;
  background: transparent;
  padding: 0;
  margin: 0 12px;
}

.search-box input::placeholder {
  color: rgba(0, 0, 0, 0.45);
}

.dark .search-box input {
  color: #ffffff;
}

.dark .search-box input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.btn-submit {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #000000; /* Black circular submit button */
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.btn-submit:hover {
  background-color: var(--green); /* Hover submit button turns green */
  transform: scale(1.05);
}

.btn-submit:active {
  transform: scale(0.95);
}

.dark .btn-submit {
  background: #ffffff;
  color: #000000;
}

.dark .btn-submit:hover {
  background: var(--green);
  color: #ffffff;
}

.icon-up-arrow {
  width: 16px;
  height: 16px;
}

/* Search History Dropdown inside Card */
.history-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: 12px;
  right: 12px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  text-align: left;
  transition: all 0.2s ease;
}

.dark .history-popup {
  background: #0a0a0a;
  border-color: #262626;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}

.history-head {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #f0f0f0;
  font-family: 'Schibsted Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #707070;
}

.dark .history-head {
  background: #141414;
  border-bottom-color: #262626;
  color: #707070;
}

.history-head button {
  background: none;
  border: none;
  color: var(--green);
  cursor: pointer;
  font-weight: 600;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: #000000;
}

.dark .history-item {
  color: #f0f0f0;
}

.history-search-icon {
  color: var(--text-tertiary);
  opacity: 0.7;
}

.history-item:hover {
  background: #f5f5f5;
  color: var(--green);
}

.dark .history-item:hover {
  background: #141414;
  color: var(--green);
}

.history-text {
  flex: 1;
}

.h-remove {
  background: none;
  border: none;
  color: #a0a0a0;
  cursor: pointer;
  opacity: 0.7;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.h-remove:hover {
  opacity: 1;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* ══ RECENT CONTRIBUTIONS FEED ════════════════════════════════ */
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
  font-family: 'Schibsted Grotesk', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  color: var(--ink-2);
}

.text-link {
  color: var(--green);
  text-decoration: none;
  font-family: 'Schibsted Grotesk', sans-serif;
  font-weight: 600;
  display: flex;
  align-items: center;
  transition: opacity 0.2s;
}
.text-link:hover {
  opacity: 0.8;
}

.paper-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.paper-item {
  background: var(--bg);
  border-radius: 14px;
  border: 1px solid var(--rule);
  border-left: 3px solid var(--green);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
}

.paper-item:hover {
  transform: translateX(4px);
  box-shadow: 0 6px 24px rgba(0, 166, 81, 0.07);
  border-color: var(--green);
  border-left-color: var(--green);
}

.item-body {
  padding: 1.25rem 1.5rem;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 0.25rem 1.5rem;
  align-items: start;
}

.item-tags {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.type-tag {
  background: rgba(0, 166, 81, 0.08);
  color: var(--green);
  font-family: 'Inter', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.year-tag {
  background: transparent;
  color: var(--ink-3);
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0;
}

.item-title {
  grid-column: 1;
  grid-row: 2;
  display: block;
  font-family: 'Fustat', serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  line-height: 1.35;
  transition: color 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}
.item-title:hover {
  color: var(--green);
}

.item-meta {
  grid-column: 1;
  grid-row: 3;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  color: var(--ink-3);
  margin-top: 0.25rem;
}

.item-dept {
  font-size: 0.75rem;
  color: var(--ink-3);
}

.dot {
  opacity: 0.5;
}

.item-abstract {
  grid-column: 2;
  grid-row: 1 / 4;
  font-family: 'Noto Sans', sans-serif;
  font-size: 0.82rem;
  color: var(--ink-3);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 380px;
  align-self: center;
  border-left: 1px solid var(--rule);
  padding-left: 1.25rem;
}

@media (max-width: 768px) {
  .item-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  .item-abstract {
    grid-column: 1;
    grid-row: auto;
    max-width: 100%;
    border-left: none;
    padding-left: 0;
    border-top: 1px solid var(--rule);
    padding-top: 0.75rem;
    margin-top: 0.5rem;
  }
}

/* Skeleton Loading styles */
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

.empty-feed {
  text-align: center;
  padding: 4rem;
  color: var(--ink-3);
  font-family: 'Inter', sans-serif;
}

/* Animations inherited from original codebase */
@keyframes brand-entrance {
  0% { transform: translateY(30px) scale(0.95); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes brand-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(0, 166, 81, 0.3)); }
  50% { transform: scale(1.03); filter: drop-shadow(0 0 25px rgba(0, 166, 81, 0.5)); }
}

@keyframes shine {
  to { background-position: 200% center; }
}

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
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.96);
  }
}

@keyframes greeting-fade-in {
  from {
    opacity: 0;
    transform: translateY(15px);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

/* Responsive Overrides */
@media (max-width: 1024px) {
  .hero-content {
    padding: 0 40px;
  }
  .container {
    padding: 0 40px;
  }
}

@media (max-width: 768px) {
  .hero-content {
    padding: 0 24px;
    margin-top: 0; /* Vertically centered by parent flex container */
  }
  .container {
    padding: 0 24px;
  }
  .hero-title {
    font-size: 54px;
    letter-spacing: -2px;
  }
  .hero-greeting {
    font-size: 20px;
  }
  .hero-subtitle {
    width: 100%;
    font-size: 16px;
  }
  .search-box {
    height: auto;
    gap: 16px;
  }
  .paper-list {
    grid-template-columns: 1fr;
  }
}
</style>
