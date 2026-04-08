<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter, SlidersHorizontal, ArrowRight, User, Search, X, Award, Calendar } from 'lucide-vue-next'
import { api, type SearchResult, type SearchParams } from '../services/api'

// ── Confidence badge helper ────────────────────────────────────────────────────────
// Section weights in vector_db.py can push cosine scores above 1.0
// (title x1.5), so we use 0.6 / 0.35 as thresholds after weighting.
const getConfidence = (score: number): { label: string; cls: string } => {
  if (score >= 0.60) return { label: 'Recommended Study', cls: 'badge-strong' }
  if (score >= 0.35) return { label: 'Similar Study', cls: 'badge-good' }
  return { label: 'Related', cls: 'badge-related' }
}

const formatDate = (iso: string | undefined) => {
  if (!iso) return 'Previously indexed'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const route = useRoute()
const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const showFilters = ref(false)
const showMobileSearch = ref(false)
const mobileSearchInput = ref('')
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isDesktop = computed(() => windowWidth.value > 1100)

// Filters
const threshold = ref(0.2)
const minYear = ref<number | undefined>(undefined)
const maxYear = ref<number | undefined>(undefined)
const selectedProjectType = ref('')
const selectedDegree = ref('')
const selectedSection = ref('')
const sortBy = ref<'newest' | 'oldest' | 'cited'>('newest')

// True when no search query — used for UI labels and conditional rendering
const browseMode = computed(() => !query.value.trim())

// What the template actually renders
const displayResults = computed(() => results.value)

const performSearch = async () => {
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
      sort: sortBy.value,
    }
    console.log('[Search] Sending params:', params)
    results.value = await api.searchPapers(params)
    console.log('[Search] Results received:', results.value.length)
  } catch (err) {
    console.error('Search error occurred:', err)
  } finally {
    loading.value = false
  }
}

const load = () => {
  performSearch()
}



onMounted(async () => {
  query.value = (route.query.q as string) || ''

  await performSearch()

  const onResize = () => { windowWidth.value = window.innerWidth }
  window.addEventListener('resize', onResize)
})

watch(
  () => route.query.q,
  (q) => {
    query.value = (q as string) || ''
    load()
  }
)

watch(
  [threshold, minYear, maxYear, selectedProjectType, selectedDegree, selectedSection, sortBy],
  () => { performSearch() }
)

const viewDetail = (id: string) => router.push({ name: 'detail', params: { id } })

// ── Dynamic Results Header ──────────────────────────────────────────────────
const feedTitle = computed(() => {
  const base = browseMode.value ? 'Archive' : 'Search'
  const filterParts = []

  // 1. Sort context
  const sortLabels = { newest: 'Newest', oldest: 'Oldest', cited: 'Most Cited' }
  filterParts.push(sortLabels[sortBy.value])

  // 2. Department / Degree filter context
  if (selectedDegree.value) filterParts.push(selectedDegree.value)

  // 3. Project Type context
  if (selectedProjectType.value) filterParts.push(selectedProjectType.value)

  // 4. Section Context (search mode only)
  if (!browseMode.value && selectedSection.value) {
    filterParts.push(selectedSection.value.charAt(0).toUpperCase() + selectedSection.value.slice(1))
  }

  return `${base} — ${filterParts.join(' · ')}`
})

const submitMobileSearch = () => {
  if (!mobileSearchInput.value.trim()) return
  router.push({ name: 'explore', query: { q: mobileSearchInput.value.trim() } })
  showMobileSearch.value = false
}

const openMobileSearch = () => {
  mobileSearchInput.value = query.value
  showMobileSearch.value = true
}
</script>

<template>
  <div class="results-page">

    <!-- ══ RESULTS TOPBAR ══════════════════════════════════════════ -->
    <div class="results-topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <span class="topbar-label">{{ browseMode ? 'Browse Archive' : 'Search Results' }}</span>
          <span class="topbar-rule"></span>
          <span v-if="!loading" class="topbar-count">
            <strong>{{ displayResults.length }}</strong> record{{ displayResults.length !== 1 ? 's' : '' }}
            <span v-if="query" class="topbar-query"> for &ldquo;{{ query }}&rdquo;</span>
          </span>
          <span v-else class="topbar-count topbar-searching">
            {{ browseMode ? 'Loading the archives&hellip;' : 'Searching the archives&hellip;' }}
          </span>
        </div>

        <div class="topbar-actions">
          <!-- Mobile search toggle -->
          <button class="mobile-search-btn" @click="openMobileSearch" :class="{ active: showMobileSearch }"
            title="Search">
            <Search :size="15" />
          </button>
          <!-- Mobile filter toggle -->
          <button class="filter-toggle-btn" @click="showFilters = !showFilters" :class="{ active: showFilters }">
            <SlidersHorizontal :size="14" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <!-- Mobile search bar — expands below topbar -->
      <div class="mobile-search-bar" :class="{ open: showMobileSearch }">
        <div class="mobile-search-inner">
          <div class="mobile-search-field">
            <Search :size="15" class="ms-icon" />
            <input v-model="mobileSearchInput" type="text" placeholder="Search the archive…"
              @keyup.enter="submitMobileSearch" autocomplete="off" spellcheck="false" />
            <button v-if="mobileSearchInput" class="ms-clear" @click="mobileSearchInput = ''">
              <X :size="13" />
            </button>
          </div>
          <button class="ms-submit" @click="submitMobileSearch">Search</button>
          <button class="ms-cancel" @click="showMobileSearch = false">
            <X :size="15" />
          </button>
        </div>
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
                <button v-for="pt in ['All', 'Capstone Project', 'Thesis']" :key="pt" class="filter-tag"
                  :class="{ active: (pt === 'All' && selectedProjectType === '') || selectedProjectType === pt }"
                  @click="selectedProjectType = pt === 'All' ? '' : pt">{{ pt }}</button>
              </div>
            </div>

            <!-- Degree Program -->
            <div class="filter-group">
              <p class="filter-label">Degree Program</p>
              <div class="filter-options">
                <button v-for="deg in ['All', 'BSCS', 'BSIT']" :key="deg" class="filter-tag"
                  :class="{ active: (deg === 'All' && selectedDegree === '') || selectedDegree === deg }"
                  @click="selectedDegree = deg === 'All' ? '' : deg">{{ deg }}</button>
              </div>
            </div>

            <!-- Search Target (search mode only) -->
            <div class="filter-group" v-if="!browseMode">
              <p class="filter-label">Search Target</p>
              <div class="filter-options">
                <button v-for="s in ['Full Text', 'introduction', 'methods', 'results', 'discussion']" :key="s"
                  class="filter-tag"
                  :class="{ active: (s === 'Full Text' && selectedSection === '') || selectedSection === s }"
                  @click="selectedSection = s === 'Full Text' ? '' : s">{{ s === 'Full Text' ? 'Full Text' :
                    s.charAt(0).toUpperCase() + s.slice(1) }}</button>
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
                <option v-for="y in [2025, 2024, 2023, 2022, 2021]" :key="y" :value="y">{{ y }}</option>
              </select>
              <span class="year-to">—</span>
              <select v-model="maxYear" class="year-select">
                <option :value="undefined">To</option>
                <option v-for="y in [2025, 2024, 2023, 2022, 2021]" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>

          <!-- Similarity Threshold -->
          <div class="sb-panel" v-if="!browseMode">
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

          <!-- Sort -->
          <div class="sb-panel">
            <div class="sb-title">
              <span>Sort By</span>
            </div>
            <div class="filter-options">
              <button v-for="s in [['newest', 'Newest'], ['oldest', 'Oldest'], ['cited', 'Most Cited']]" :key="s[0]"
                class="filter-tag" :class="{ active: sortBy === s[0] }"
                @click="sortBy = s[0] as 'newest' | 'oldest' | 'cited'">{{ s[1] }}</button>
            </div>
          </div>

        </aside>

        <!-- ── RESULTS FEED ─────────────────────────────────────── -->
        <section class="results-feed">

          <header class="feed-head">
            <div class="feed-head-left">
              <span>{{ feedTitle }}</span>
            </div>
            <span v-if="!loading" class="feed-head-count">
              {{ displayResults.length }} found
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
          <div v-else-if="displayResults.length === 0" class="empty-state">
            <p class="empty-heading">{{ browseMode ? 'No papers found' : 'No records found' }}</p>
            <p class="empty-sub">
              <template v-if="browseMode">The archive appears to be empty or no papers match your filters.</template>
              <template v-else>No matches for &ldquo;{{ query }}&rdquo;. Try broader terms or adjust your
                filters.</template>
            </p>
          </div>

          <!-- Results list -->
          <ol v-else class="paper-list">
            <li v-for="(res, idx) in displayResults" :key="res.id" class="paper-item" @click="viewDetail(res.id)">
              <span class="item-num">{{ String(idx + 1).padStart(2, '0') }}</span>

              <div class="item-body">
                <div class="item-tags">
                  <span class="type-tag">{{ res.payload.project_type }}</span>
                  <span v-if="res.payload.degree_program && res.payload.degree_program !== 'N/A'" class="degree-tag">{{
                    res.payload.degree_program }}</span>
                  <!-- Confidence badge (search mode only) -->
                  <template v-if="!browseMode">
                    <span :class="['confidence-badge', getConfidence(res.score).cls]">
                      {{ getConfidence(res.score).label }}
                      <span class="badge-pct">&nbsp;·&nbsp;{{ (res.score * 100).toFixed(0) }}%</span>
                    </span>
                    <span v-if="selectedSection" class="section-target-tag">
                      ► {{ selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1) }}
                    </span>
                  </template>
                </div>

                <span class="item-title">{{ res.payload.title }}</span>

                <div class="item-meta">
                  <User :size="11" />
                  <span>{{ res.payload.author }}</span>
                  <span class="dot">·</span>
                  <span>{{ res.payload.year }}</span>
                </div>

                <p class="item-abstract">{{ res.payload.abstract.substring(0, 220) }}&hellip;</p>

                <div class="item-footer">
                  <span v-if="(sortBy === 'newest' || sortBy === 'oldest') && res.payload.created_at"
                    class="upload-date-badge">
                    <Calendar :size="11" />
                    Uploaded on {{ formatDate(res.payload.created_at) }}
                    <template v-if="res.payload.uploaded_by"> · {{ res.payload.uploader_role === 'Admin' ? 'Admin' :
                      'Verified' }}: {{ res.payload.uploaded_by }}</template>
                  </span>
                  <span v-if="sortBy === 'cited' && res.payload.citation_count > 0" class="most-cited-badge"
                    :data-rank="idx + 1">
                    <Award :size="11" />
                    Rank #{{ idx + 1 }} <span class="badge-dot">·</span> Citation Count:
                    {{
                      res.payload.citation_count }}
                  </span>
                  <span class="item-action">
                    See full study
                    <ArrowRight :size="12" />
                  </span>
                </div>
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
  --ink: #181c18;
  --ink-2: #3d4239;
  --ink-3: #7a7f75;
  --rule: #dfe0db;
  --surface: #f5f5f2;
  --paper: #ffffff;
  --green: #00a651;
  --green-dk: #007d3d;
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
  max-width: 1440px;
  /* Expanded for widescreen */
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
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mobile-search-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1.5px solid var(--ink);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.14s, color 0.14s;
  flex-shrink: 0;
}

.mobile-search-btn:hover,
.mobile-search-btn.active {
  background: var(--ink);
  color: var(--paper);
}

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

/* Mobile search bar */
.mobile-search-bar {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.22s ease, border-color 0.22s;
  border-top: 0px solid var(--rule);
}

.mobile-search-bar.open {
  max-height: 80px;
  border-top: 1px solid var(--rule);
}

.mobile-search-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
}

.mobile-search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface);
  border: 1.5px solid var(--rule);
  border-radius: 6px;
  padding: 0 0.75rem;
  transition: border-color 0.14s;
}

.mobile-search-field:focus-within {
  border-color: var(--green);
}

.ms-icon {
  color: var(--ink-3);
  flex-shrink: 0;
}

.mobile-search-field input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.9rem;
  color: var(--ink);
  padding: 0.6rem 0;
}

.mobile-search-field input::placeholder {
  color: var(--ink-3);
}

.ms-clear {
  background: none;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.ms-submit {
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.55rem 1rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.14s;
}

.ms-submit:hover {
  background: var(--green-dk);
}

.ms-cancel {
  background: none;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.14s;
}

.ms-cancel:hover {
  color: var(--ink);
}

/* ══ LAYOUT ══════════════════════════════════════════════ */
.results-layout {
  padding: 2.5rem 2rem 5rem;
}

.layout-inner {
  max-width: 1440px;
  /* Expanded for widescreen */
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px 1fr;
  /* 2-Column: Filters | Feed */
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

/* ── Confidence badges ──────────────────────────────────────────── */
.confidence-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.60rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.13rem 0.45rem;
  border-radius: 99px;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.badge-strong {
  background: #d4f0e2;
  color: #0a6639;
}

.badge-good {
  background: #dceeff;
  color: #1a5fa8;
}

.badge-related {
  background: #efefed;
  color: #6b7068;
}

.section-target-tag {
  font-size: 0.60rem;
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  opacity: 0.72;
  white-space: nowrap;
}

.badge-pct {
  font-weight: 500;
  opacity: 0.75;
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
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.25rem;
}

.most-cited-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--green);
  background: var(--green-dim);
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-dot {
  opacity: 0.5;
}

.most-cited-badge,
.upload-date-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--ink-2);
  background: #f0f0ed;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}

.most-cited-badge {
  color: var(--green-dk);
  background: var(--green-dim);
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
  width: 66px;
  height: 15px;
}

.sk-title {
  width: 84%;
  height: 18px;
}

.sk-meta {
  width: 48%;
  height: 12px;
}

.sk-abstract {
  width: 100%;
  height: 54px;
  margin-bottom: 0;
}

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
  .mobile-search-btn {
    display: flex;
  }

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
