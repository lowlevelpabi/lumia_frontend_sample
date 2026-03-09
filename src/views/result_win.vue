<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter, SlidersHorizontal, ArrowRight, User } from 'lucide-vue-next'
import { api, type SearchResult, type SearchParams } from '../services/api'

const route = useRoute()
const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const showFilters = ref(false)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isDesktop = computed(() => windowWidth.value > 768)

// Advanced Filters
const threshold = ref(0.2)
const minYear = ref<number | undefined>(undefined)
const maxYear = ref<number | undefined>(undefined)
const selectedProjectType = ref('')
const selectedDegree = ref('')
const selectedSection = ref('')

const performSearch = async () => {
  if (!query.value) return
  loading.value = true
  try {
    const params: SearchParams = {
      query: query.value,
      threshold: threshold.value,
      minYear: minYear.value,
      maxYear: maxYear.value,
      projectType: selectedProjectType.value || undefined,
      degreeProgram: selectedDegree.value || undefined,
      section: selectedSection.value || undefined,
    }
    results.value = await api.searchPapers(params)
  } catch {
    console.error('Search error occurred')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  query.value = (route.query.q as string) || ''
  performSearch()
  const onResize = () => { windowWidth.value = window.innerWidth }
  window.addEventListener('resize', onResize)
})

watch(
  [() => route.query.q, threshold, minYear, maxYear, selectedProjectType, selectedDegree, selectedSection],
  () => {
    query.value = (route.query.q as string) || query.value
    performSearch()
  }
)

const viewDetail = (id: number) => router.push({ name: 'detail', params: { id } })
</script>

<template>
  <div class="results-page">

    <!-- ══ RESULTS TOPBAR ══════════════════════════════════════════ -->
    <div class="results-topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <span class="topbar-label">Search Results</span>
          <span class="topbar-rule"></span>
          <span v-if="!loading" class="topbar-count">
            <strong>{{ results.length }}</strong> record{{ results.length !== 1 ? 's' : '' }}
            <span v-if="query" class="topbar-query"> for &ldquo;{{ query }}&rdquo;</span>
          </span>
          <span v-else class="topbar-count topbar-searching">Searching the archives&hellip;</span>
        </div>

        <!-- Mobile filter toggle -->
        <button class="filter-toggle-btn" @click="showFilters = !showFilters" :class="{ active: showFilters }">
          <SlidersHorizontal :size="14" />
          <span>Filters</span>
        </button>
      </div>
    </div>

    <!-- ══ MAIN LAYOUT ═════════════════════════════════════════════ -->
    <main class="results-layout">
      <div class="layout-inner">

        <!-- ── FILTERS SIDEBAR ──────────────────────────────────── -->
        <aside class="filters-sidebar" v-show="showFilters || isDesktop">

          <div class="sb-panel">
            <div class="sb-title">
              <Filter :size="12" />
              <span>Refine Results</span>
            </div>

            <!-- Project Type -->
            <div class="filter-group">
              <p class="filter-label">Project Type</p>
              <div class="filter-options">
                <button
                  v-for="pt in ['All', 'Capstone Project', 'Thesis']"
                  :key="pt"
                  class="filter-tag"
                  :class="{ active: (pt === 'All' && selectedProjectType === '') || selectedProjectType === pt }"
                  @click="selectedProjectType = pt === 'All' ? '' : pt"
                >{{ pt }}</button>
              </div>
            </div>

            <!-- Degree Program -->
            <div class="filter-group">
              <p class="filter-label">Degree Program</p>
              <div class="filter-options">
                <button
                  v-for="deg in ['All', 'BSCS', 'BSIT', 'BSIS', 'BSCpE']"
                  :key="deg"
                  class="filter-tag"
                  :class="{ active: (deg === 'All' && selectedDegree === '') || selectedDegree === deg }"
                  @click="selectedDegree = deg === 'All' ? '' : deg"
                >{{ deg }}</button>
              </div>
            </div>

            <!-- Search Target -->
            <div class="filter-group">
              <p class="filter-label">Search Target</p>
              <div class="filter-options">
                <button
                  v-for="s in ['Full Text', 'introduction', 'methods', 'results', 'discussion']"
                  :key="s"
                  class="filter-tag"
                  :class="{ active: (s === 'Full Text' && selectedSection === '') || selectedSection === s }"
                  @click="selectedSection = s === 'Full Text' ? '' : s"
                >{{ s === 'Full Text' ? 'Full Text' : s.charAt(0).toUpperCase() + s.slice(1) }}</button>
              </div>
            </div>
          </div>

          <!-- Year Range -->
          <div class="sb-panel">
            <div class="sb-title">
              <span>Year Range</span>
            </div>
            <div class="year-range">
              <select v-model="minYear" class="year-select">
                <option :value="undefined">From</option>
                <option v-for="y in [2024, 2023, 2022, 2021, 2020]" :key="y" :value="y">{{ y }}</option>
              </select>
              <span class="year-to">—</span>
              <select v-model="maxYear" class="year-select">
                <option :value="undefined">To</option>
                <option v-for="y in [2024, 2023, 2022, 2021, 2020]" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>

          <!-- Similarity Threshold -->
          <div class="sb-panel">
            <div class="sb-title">
              <span>Similarity Threshold</span>
            </div>
            <p class="threshold-info">
              Controls how strictly results must match your query. Lower values return broader results.
            </p>
            <div class="range-wrap">
              <input type="range" v-model.number="threshold" min="0" max="1" step="0.05" class="threshold-slider" />
              <div class="range-labels">
                <span>Loose &nbsp;({{ threshold }})</span>
                <span>Strict</span>
              </div>
            </div>
          </div>

        </aside>

        <!-- ── RESULTS FEED ─────────────────────────────────────── -->
        <section class="results-feed">

          <header class="feed-head">
            <div class="feed-head-left">
              <span>Records</span>
            </div>
            <span v-if="!loading" class="feed-head-count">
              {{ results.length }} found
            </span>
          </header>

          <!-- Skeleton loading state -->
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

          <!-- Empty state -->
          <div v-else-if="results.length === 0" class="empty-state">
            <p class="empty-heading">No records found</p>
            <p class="empty-sub">No matches for &ldquo;{{ query }}&rdquo;. Try broader terms or adjust your filters.</p>
          </div>

          <!-- Results list -->
          <ol v-else class="paper-list">
            <li
              v-for="(res, idx) in results"
              :key="res.id"
              class="paper-item"
              @click="viewDetail(res.id)"
            >
              <span class="item-num">{{ String(idx + 1).padStart(2, '0') }}</span>

              <div class="item-body">
                <div class="item-tags">
                  <span class="type-tag">{{ res.payload.project_type }}</span>
                  <span
                    v-if="res.payload.degree_program && res.payload.degree_program !== 'N/A'"
                    class="degree-tag"
                  >{{ res.payload.degree_program }}</span>
                  <span class="score-tag">{{ (res.score * 100).toFixed(0) }}% match</span>
                </div>

                <span class="item-title">{{ res.payload.title }}</span>

                <div class="item-meta">
                  <User :size="11" />
                  <span>{{ res.payload.author }}</span>
                  <span class="dot">·</span>
                  <span>{{ res.payload.year }}</span>
                </div>

                <p class="item-abstract">{{ res.payload.abstract.substring(0, 220) }}&hellip;</p>

                <span class="item-action">
                  View full record
                  <ArrowRight :size="12" />
                </span>
              </div>
            </li>
          </ol>

        </section>

      </div>
    </main>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Source+Sans+3:wght@400;500;600;700&display=swap');

/* ── Design tokens ───────────────────────────────────────── */
.results-page {
  --ink:       #181c18;
  --ink-2:     #3d4239;
  --ink-3:     #7a7f75;
  --rule:      #dfe0db;
  --surface:   #f5f5f2;
  --paper:     #ffffff;
  --green:     #00a651;
  --green-dk:  #007d3d;
  --green-dim: #e6f4ed;

  min-height: 100vh;
  background: var(--surface);
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
}

/* ══ TOPBAR ══════════════════════════════════════════════ */
.results-topbar {
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 0;
  z-index: 20;
}

.topbar-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.topbar-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink);
  white-space: nowrap;
  flex-shrink: 0;
}

.topbar-rule {
  width: 1px;
  height: 14px;
  background: var(--rule);
  flex-shrink: 0;
}

.topbar-count {
  font-size: 0.8rem;
  color: var(--ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-count strong {
  color: var(--ink);
  font-weight: 700;
}

.topbar-query {
  font-style: italic;
}

.topbar-searching {
  font-style: italic;
}

/* Filter toggle (mobile) */
.filter-toggle-btn {
  display: none;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1.5px solid var(--ink);
  border-radius: 4px;
  padding: 0.3rem 0.7rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.14s, color 0.14s;
  flex-shrink: 0;
}

.filter-toggle-btn:hover,
.filter-toggle-btn.active {
  background: var(--ink);
  color: var(--paper);
}

/* ══ LAYOUT ══════════════════════════════════════════════ */
.results-layout {
  padding: 2.5rem 2rem 5rem;
}

.layout-inner {
  max-width: 1140px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 3.5rem;
  align-items: start;
}

/* ══ SIDEBAR ═════════════════════════════════════════════ */
.filters-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: sticky;
  top: calc(44px + 1.75rem);
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

.filter-group {
  margin-bottom: 1.25rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  font-size: 0.61rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
  margin: 0 0 0.5rem;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.filter-tag {
  background: transparent;
  border: 1.5px solid var(--rule);
  padding: 0.22rem 0.55rem;
  border-radius: 3px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--ink-2);
  cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}

.filter-tag:hover {
  border-color: var(--ink-2);
  color: var(--ink);
}

.filter-tag.active {
  background: var(--green);
  border-color: var(--green);
  color: var(--paper);
}

/* Year range */
.year-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.year-select {
  flex: 1;
  padding: 0.38rem 0.5rem;
  border: 1.5px solid var(--rule);
  border-radius: 3px;
  background: var(--paper);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.78rem;
  color: var(--ink-2);
  cursor: pointer;
  transition: border-color 0.13s;
}

.year-select:focus {
  outline: none;
  border-color: var(--ink-2);
}

.year-to {
  font-size: 0.75rem;
  color: var(--ink-3);
  flex-shrink: 0;
}

/* Threshold slider */
.threshold-info {
  font-size: 0.76rem;
  color: var(--ink-3);
  line-height: 1.55;
  margin: 0 0 0.75rem;
}

.range-wrap {
  padding: 0.25rem 0;
}

.threshold-slider {
  width: 100%;
  accent-color: var(--green);
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  color: var(--ink-3);
  margin-top: 0.3rem;
  font-variant-numeric: tabular-nums;
}

/* ══ RESULTS FEED ════════════════════════════════════════ */
.results-feed {
  min-width: 0;
}

/* Feed header — 2px top rule editorial style */
.feed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--ink);
  margin-bottom: 0;
}

.feed-head-left {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--ink-2);
}

.feed-head-count {
  font-size: 0.68rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
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
  cursor: pointer;
  transition: background 0.12s;
}

.paper-item:last-of-type {
  border-bottom: none;
}

.paper-item:hover .item-title {
  color: var(--green-dk);
}

.paper-item:hover .item-action {
  gap: 0.5rem;
  color: var(--green-dk);
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
  flex-wrap: wrap;
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

.degree-tag {
  font-size: 0.61rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-3);
  background: #ededea;
  padding: 0.14rem 0.44rem;
  border-radius: 2px;
}

.score-tag {
  font-size: 0.68rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.item-title {
  display: block;
  font-family: 'Lora', Georgia, serif;
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.45;
  margin-bottom: 0.38rem;
  transition: color 0.14s;
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

.item-abstract {
  font-size: 0.84rem;
  color: var(--ink-2);
  line-height: 1.7;
  margin: 0 0 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
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
  transition: gap 0.14s, color 0.14s;
}

/* Empty state */
.empty-state {
  padding: 4rem 0;
  border-top: 1px solid var(--rule);
}

.empty-heading {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.5rem;
}

.empty-sub {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
}

/* ── Skeleton loader ────────────────────────────────────── */
@keyframes shimmer {
  0%   { background-position: -500px 0; }
  100% { background-position:  500px 0; }
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

.sk-num     { width: 22px;  height: 13px; margin-top: 0.22rem; }
.sk-tag     { width: 66px;  height: 15px; }
.sk-title   { width: 84%;   height: 18px; }
.sk-meta    { width: 48%;   height: 12px; }
.sk-abstract{ width: 100%;  height: 54px; margin-bottom: 0; }

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 860px) {
  .layout-inner {
    grid-template-columns: 1fr;
  }

  .filters-sidebar {
    position: static;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .filter-toggle-btn {
    display: flex;
  }

  .results-layout {
    padding: 1.5rem 1.25rem 4rem;
  }

  .layout-inner {
    gap: 1.5rem;
  }

  .filters-sidebar {
    grid-template-columns: 1fr;
  }

  .filter-options {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }

  .filter-tag {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .topbar-inner {
    padding: 0 1rem;
  }

  .results-layout {
    padding: 1rem 0.85rem 3rem;
  }

  .paper-item {
    grid-template-columns: 28px 1fr;
    gap: 0 0.6rem;
    padding: 1.25rem 0;
  }

  .item-title {
    font-size: 0.96rem;
  }
}
</style>
