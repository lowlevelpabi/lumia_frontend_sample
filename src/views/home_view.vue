<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Search, User, ArrowRight, BookOpen, Clock } from 'lucide-vue-next'
import { api, type Paper } from '../services/api'

const router = useRouter()
const searchQuery = ref('')
const recentPapers = ref<Paper[]>([])
const loading = ref(true)

onMounted(async () => {
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
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'explore', query: { q: searchQuery.value } })
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
          Lumia Archiving
        </h1>

        <div class="search-row">
          <div class="search-field">
            <Search :size="17" class="s-icon" />
            <input v-model="searchQuery" type="text" placeholder="Title, author, keywords, abstract…"
              @keyup.enter="handleSearch" spellcheck="false" autocomplete="off" />
          </div>
          <button class="search-btn" @click="handleSearch">Search</button>
        </div>

        <!--
        <div class="browse-chips">
          <span class="chips-label">Browse for:</span>
          <RouterLink :to="{ name: 'explore', query: { q: 'thesis article' } }" class="chip">thesis article</RouterLink>
          <RouterLink :to="{ name: 'explore', query: { q: 'capstone project' } }" class="chip">capstone project
          </RouterLink>
          <RouterLink :to="{ name: 'explore', query: { q: 'computer science topic' } }" class="chip">computer science
            topic
          </RouterLink>
        </div>
        -->

      </div>
    </section>

    <!-- ══ CONTENT ════════════════════════════════════════════════════ -->
    <main class="content-wrap">
      <div class="content-grid">

        <!-- ── Recent Papers ──────────────────────────────────────── -->
        <section class="feed">

          <header class="feed-head">
            <div class="feed-head-left">
              <Clock :size="13" />
              <span>Recently Added</span>
            </div>
            <RouterLink :to="{ name: 'explore', query: { q: '' } }" class="head-link">
              All records
              <ArrowRight :size="12" />
            </RouterLink>
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
            View the full repository
            <ArrowRight :size="14" />
          </RouterLink>

        </section>

        <!-- ── Sidebar ────────────────────────────────────────────── -->
        <aside class="sidebar">

          <div class="sb-panel">
            <div class="sb-title">
              <BookOpen :size="13" />
              <span>Browse Collection</span>
            </div>

            <div class="sb-group">
              <p class="sb-group-label">By Document Type</p>
              <RouterLink :to="{ name: 'explore', query: { q: 'Thesis' } }" class="sb-link">Thesis / Research
              </RouterLink>
              <RouterLink :to="{ name: 'explore', query: { q: 'Capstone Project' } }" class="sb-link">Capstone Project
              </RouterLink>
            </div>

            <div class="sb-group">
              <p class="sb-group-label">By Department</p>
              <RouterLink :to="{ name: 'explore', query: { q: 'computer science' } }" class="sb-link">Department of
                Computer
                Studies
              </RouterLink>
            </div>
          </div>
          <!--
          <div class="sb-panel">
            <div class="sb-title">
              <Hash :size="13" />
              <span>Search Tips</span>
            </div>

            <ul class="tips">
              <li>Use <code>"exact phrase"</code> for precise matches</li>
              <li>Search by author name to find all their works</li>
              <li>Abstract keywords yield broader results than titles alone</li>
              <li>Combine terms: <code>neural network classification</code></li>
            </ul>

          </div>
-->
        </aside>

      </div>
    </main>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Source+Sans+3:wght@400;500;600;700&display=swap');

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

.hero-inner {
  max-width: 1200px;
  /* Expanded for widescreen */
  margin: 0 auto;
  position: relative;
  z-index: 1;
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
  margin: 0 0 1.25rem;
  letter-spacing: -0.01em;
}

.hero-heading em {
  font-style: italic;
  color: var(--green);
}

.hero-sub {
  font-size: 1rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.46);
  margin: 0 0 2.5rem;
  max-width: 540px;
}

/* Search */
.search-row {
  display: flex;
  gap: 0.5rem;
  max-width: 620px;
  margin-bottom: 1.5rem;
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

/* Browse chips */
.browse-chips {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.chips-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.26);
  margin-right: 0.1rem;
}

.chip {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  padding: 0.25rem 0.58rem;
  text-decoration: none;
  transition: color 0.14s, border-color 0.14s;
}

.chip:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.36);
}

/* ══ CONTENT ════════════════════════════════════════════ */
.content-wrap {
  padding: 2.75rem 2rem 5rem;
}

.content-grid {
  max-width: 1440px;
  /* Expanded for widescreen */
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 360px;
  /* Increased sidebar width */
  gap: 3.5rem;
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

.head-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--green);
  text-decoration: none;
}

.head-link:hover {
  text-decoration: underline;
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

/* ── Sidebar ───────────────────────────────────────────── */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: sticky;
  top: calc(64px + 1.5rem);
}

.sb-panel {
  border-top: 2px solid var(--ink);
  padding-top: 0.85rem;
}

.sb-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.67rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink);
  margin-bottom: 1.1rem;
}

.sb-group {
  margin-bottom: 1rem;
}

.sb-group:last-child {
  margin-bottom: 0;
}

.sb-group-label {
  font-size: 0.61rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
  margin: 0 0 0.38rem;
}

.sb-link {
  display: block;
  font-size: 0.83rem;
  color: var(--ink-2);
  text-decoration: none;
  padding: 0.27rem 0;
  transition: color 0.13s, padding-left 0.13s;
}

.sb-link:hover {
  color: var(--green-dk);
  padding-left: 5px;
}

/* Tips */
.tips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.tips li {
  font-size: 0.79rem;
  color: var(--ink-2);
  line-height: 1.55;
  padding-left: 1rem;
  position: relative;
}

.tips li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: var(--ink-3);
  font-size: 0.68rem;
}

.tips code {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.72rem;
  background: #ededea;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  color: var(--ink);
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
