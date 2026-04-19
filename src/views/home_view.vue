<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Search, User, ArrowRight, Clock, X } from 'lucide-vue-next'
import { api, type Paper } from '../services/api'
import { historyService } from '../services/history'

const searchHistory = ref<string[]>([])
const showHistory = ref(false)
const historyRef = ref<HTMLElement | null>(null)

const router = useRouter()
const searchQuery = ref('')
const recentPapers = ref<Paper[]>([])
const loading = ref(true)

onMounted(async () => {
  searchHistory.value = historyService.getHistory()
  try {
    const allPapers = await api.listAllPapers()
    
    recentPapers.value = allPapers
      .sort((a, b) => String(b.id).localeCompare(String(a.id)))
      .slice(0, 6)
  } catch (e) {
    console.error('Failed to fetch recent papers:', e)
  } finally {
    loading.value = false
  }

  // Close history when clicking outside
  document.addEventListener('click', (e) => {
    if (historyRef.value && !historyRef.value.contains(e.target as Node)) {
      showHistory.value = false
    }
  })
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
  <div class="home">

    <!-- ══ HERO ══════════════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero-inner">

        <div class="hero-masthead">
          <span class="masthead-rule"></span>
          <span class="masthead-label">Lumia · Research Retrieval System</span>
          <span class="masthead-rule"></span>
        </div>

        <h1 class="hero-heading">
          What are we looking for?
        </h1>

        <div class="search-row">
          <div class="search-field" ref="historyRef">
            <Search :size="17" class="s-icon" />
            <input v-model="searchQuery" type="text" placeholder="Title, keywords, context-based search, and more…"
              @keyup.enter="handleSearch" @focus="showHistory = true" spellcheck="false" autocomplete="off" />

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
    </section>

    <!-- ══ CONTENT ════════════════════════════════════════════════════ -->
    <main class="content-wrap">
      <div class="content-grid">

        <!-- Recent Papers Feed -->
        <section class="feed">

          <header class="feed-head">
            <div class="feed-head-left">
              <Clock :size="13" />
              <span>Recently Added</span>
            </div>
          </header>

          <!-- Skeleton state -->
          <div v-if="loading" class="paper-list">
            <div v-for="i in 5" :key="i" class="paper-item skeleton">
              <div class="sk-num"></div>
              <div class="sk-body">
                <div class="sk-tag"></div>
                <div class="sk-title"></div>
                <div class="sk-meta"></div>
                <div class="sk-abstract"></div>
              </div>
            </div>
          </div>

          <!-- Papers list -->
          <ol v-else-if="recentPapers.length > 0" class="paper-list">
            <li v-for="(paper) in recentPapers" :key="paper.id" class="paper-item">
              <span class="item-num"></span>

              <div class="item-body">
                <div class="item-tags">
                  <span class="type-tag">{{ paper.project_type || 'Research' }}</span>
                  <span v-if="paper.year" class="year-tag">{{ paper.year }}</span>
                </div>

                <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="item-title">{{ paper.title }}
                </RouterLink>

                <div class="item-meta">
                  <User :size="11" />
                  <span>{{ paper.author }}</span>
                  <template v-if="paper.department">
                    <span class="dot">·</span>
                    <span class="item-dept">{{ paper.department }}</span>
                  </template>
                </div>

                <p class="item-abstract">{{ paper.abstract?.substring(0, 210) }}…</p>

                <RouterLink :to="{ name: 'detail', params: { id: paper.id } }" class="item-action">
                  Read full record
                  <ArrowRight :size="12" />
                </RouterLink>
              </div>
            </li>
          </ol>

          <!-- Empty state when no papers are found -->
          <div v-else class="empty-feed">
            <p class="empty-feed-title">The archive is currently empty</p>
            <p class="empty-feed-sub">No research papers or capstone projects have been uploaded yet.</p>
          </div>

          <RouterLink v-if="recentPapers.length > 0" :to="{ name: 'explore' }" class="view-more">
            Go to explore
            <ArrowRight :size="14" />
          </RouterLink>

        </section>

      </div>
    </main>

  </div>
</template>

<style scoped>

/* ── Design tokens ───────────────────────────────────────── */
.home {
  --ink: #181c18;
  --ink-2: #3d4239;
  --ink-3: #7a7f75;
  --rule: #dfe0db;
  --surface: #f5f5f2;
  --paper: #ffffff;
  --green: #00a651;
  --green-dk: #007d3d;
  --green-dim: #e6f4ed;
  --hero-bg: #0d1f12;

  min-height: calc(100vh - 64px);
  background: var(--surface);
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
}

/* ══ HERO ════════════════════════════════════════════════ */
.hero {
  background: var(--hero-bg);
  padding: 4.5rem 2rem 4rem;
  position: relative;
  border-bottom: 3px solid var(--green);
}

/* Subtle dot-grid texture */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

/* Search History Popup */
.history-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  margin-top: 0.5rem;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
  z-index: 100;
  overflow: hidden;
  text-align: left;
}

.history-head {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink-3);
}

.history-head button {
  background: none;
  border: none;
  color: var(--green);
  cursor: pointer;
  font-size: 0.65rem;
}

.history-list {
  max-height: 250px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 0.85rem;
  color: var(--ink-2);
}

.history-item:hover {
  background: var(--surface);
}

.history-item .h-remove {
  margin-left: auto;
  opacity: 0.5;
  background: none;
  border: none;
  cursor: pointer;
}

.history-item .h-remove:hover {
  opacity: 1;
}

.search-row {
  max-width: 700px;
  margin: 0 auto 3.5rem;
  display: flex;
  gap: 0.5rem;
  position: relative;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  text-align: center;
}

/* Masthead bar — journal-header feel */
.hero-masthead {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.masthead-rule {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.14);
}

.masthead-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.32);
  white-space: nowrap;
}

/* Heading */
.hero-heading {
  font-family: 'Lora', Georgia, serif;
  font-size: clamp(2.5rem, 5.5vw, 3.75rem);
  font-weight: 600;
  line-height: 1.1;
  color: #fff;
  margin: 0 auto 1.25rem;
  letter-spacing: -0.01em;
}

/* Search */
.search-row {
  display: flex;
  gap: 0.5rem;
  max-width: 620px;
  margin: 0 auto 1.5rem;
}

.search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 6px;
  padding: 0 1rem;
  transition: border-color 0.15s, background 0.15s;
}

.search-field:focus-within {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.3);
}

.s-icon {
  color: rgba(255, 255, 255, 0.28);
  flex-shrink: 0;
}

.search-field input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.95rem;
  padding: 0.85rem 0;
}

.search-field input::placeholder {
  color: rgba(255, 255, 255, 0.22);
}

.search-btn {
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.85rem 1.6rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.search-btn:hover {
  background: var(--green-dk);
}

/* ══ CONTENT ════════════════════════════════════════════ */
.content-wrap {
  padding: 2.75rem 2rem 5rem;
}

.content-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: block;
  align-items: start;
}

/* ── Feed ──────────────────────────────────────────────── */
.feed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--ink);
  margin-bottom: 0;
}

.feed-head-left {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--ink-2);
}

/* Paper list */
.paper-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.paper-item {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 0 1rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--rule);
}

.paper-item:last-of-type {
  border-bottom: none;
}

.item-num {
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--ink-3);
  opacity: 0.45;
  padding-top: 0.22rem;
  font-variant-numeric: tabular-nums;
}

.item-body {
  min-width: 0;
}

.item-tags {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.38rem;
}

.type-tag {
  font-size: 0.61rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--green-dk);
  background: var(--green-dim);
  padding: 0.14rem 0.44rem;
  border-radius: 2px;
}

.year-tag {
  font-size: 0.68rem;
  color: var(--ink-3);
}

.item-title {
  display: block;
  font-family: 'Lora', Georgia, serif;
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  line-height: 1.45;
  margin-bottom: 0.38rem;
  transition: color 0.14s;
}

.item-title:hover {
  color: var(--green-dk);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.77rem;
  color: var(--ink-3);
  margin-bottom: 0.65rem;
  flex-wrap: wrap;
}

.dot {
  opacity: 0.38;
}

.item-dept {
  font-style: italic;
}

.item-abstract {
  font-size: 0.84rem;
  color: var(--ink-2);
  line-height: 1.7;
  margin: 0 0 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-action {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.77rem;
  font-weight: 600;
  color: var(--green-dk);
  text-decoration: none;
  transition: gap 0.14s;
}

.item-action:hover {
  gap: 0.5rem;
}

/* View more */
.view-more {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--ink);
  border: 1.5px solid var(--ink);
  border-radius: 5px;
  padding: 0.6rem 1.15rem;
  text-decoration: none;
  transition: background 0.14s, color 0.14s;
}

.view-more:hover {
  background: var(--ink);
  color: #fff;
}

/* ── Skeleton ──────────────────────────────────────────── */
@keyframes shimmer {
  0% {
    background-position: -500px 0;
  }

  100% {
    background-position: 500px 0;
  }
}

.skeleton {
  pointer-events: none;
}

.sk-num,
.sk-tag,
.sk-title,
.sk-meta,
.sk-abstract {
  background: linear-gradient(90deg, var(--rule) 25%, #e8e8e3 50%, var(--rule) 75%);
  background-size: 500px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 3px;
  margin-bottom: 0.5rem;
}

.sk-num {
  width: 22px;
  height: 13px;
  margin-top: 0.22rem;
}

.sk-tag {
  width: 62px;
  height: 15px;
}

.sk-title {
  width: 88%;
  height: 18px;
}

.sk-meta {
  width: 50%;
  height: 12px;
}

.sk-abstract {
  width: 100%;
  height: 50px;
  margin-bottom: 0;
}

/* ── Empty Feed ────────────────────────────────────────── */
.empty-feed {
  padding: 4rem 2rem;
  text-align: center;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.empty-feed-title {
  font-family: 'Lora', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.25rem;
}

.empty-feed-sub {
  font-size: 0.88rem;
  color: var(--ink-3);
  max-width: 320px;
  margin: 0 auto;
}

.bar-fill.secondary {
  background: var(--hero-bg);
}

@media (max-width: 768px) {
  .analytics-inner {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 860px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .sidebar {
    position: static;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 600px) {
  .hero {
    padding: 3rem 1.25rem 3rem;
  }

  .hero-heading {
    font-size: 2.2rem;
  }

  .hero-masthead {
    display: none;
  }

  .search-row {
    flex-direction: column;
  }

  .search-btn {
    width: 100%;
    text-align: center;
  }

  .content-wrap {
    padding: 2rem 1.25rem 4rem;
  }

  .paper-item {
    grid-template-columns: 28px 1fr;
    gap: 0 0.6rem;
  }

  .sidebar {
    grid-template-columns: 1fr;
  }
}
</style>
