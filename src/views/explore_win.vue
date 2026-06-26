<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, type SearchResult, type SearchParams } from '../services/api'
import { historyService } from '../services/history'
import {
  Search, SlidersHorizontal, X, ArrowRight, Filter,
  Award, User, Calendar
} from 'lucide-vue-next'

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
const isDesktop = computed(() => windowWidth.value > 1024)

// Pagination
const currentPage = ref(1)
const totalResults = ref(0)
const pageSize = ref(5)
const totalPages = computed(() => Math.ceil(totalResults.value / pageSize.value))

// Filters
const threshold = ref(0.2)
const currentYear = new Date().getFullYear()
const availableYears = computed(() => {
  const years = []
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i)
  }
  return years
})
const minYear = ref<number | undefined>(currentYear - 4)
const maxYear = ref<number | undefined>(currentYear)

const selectedProjectType = ref('')
const selectedDegree = ref('')
const selectedSection = ref('')
const sortBy = ref<'newest' | 'oldest' | 'cited' | string>('newest')

// Search History
const searchHistory = ref<string[]>([])
const showHistory = ref(false)
const historyRef = ref<HTMLElement | null>(null)

// True when no search query — used for UI labels and conditional rendering
const browseMode = computed(() => !query.value.trim())

// What the template actually renders
const displayResults = computed(() => results.value)

const performSearch = async (resetPage: boolean = true) => {
  if (resetPage) currentPage.value = 1
  loading.value = true
  if (resetPage) results.value = []
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
      page: currentPage.value,
      pageSize: pageSize.value
    }
    
    console.log('[Search] Sending params:', params)
    const data = await api.searchPapers(params)
    results.value = data.results
    totalResults.value = data.total
    
    // Save to history if query is significant
    if (query.value.trim().length > 2) {
      historyService.saveQuery(query.value)
      searchHistory.value = historyService.getHistory()
    }
    
    console.log('[Search] Results received:', results.value.length, 'Total:', totalResults.value)
  } catch (err) {
    console.error('Search error occurred:', err)
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  performSearch(false)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const load = () => {
  performSearch()
}

onMounted(async () => {
  query.value = (route.query.q as string) || ''
  searchHistory.value = historyService.getHistory()

  await performSearch()

  const onResize = () => { windowWidth.value = window.innerWidth }
  window.addEventListener('resize', onResize)
  
  // Close history when clicking outside
  document.addEventListener('click', (e) => {
    if (historyRef.value && !historyRef.value.contains(e.target as Node)) {
      showHistory.value = false
    }
  })
})

watch(
  () => route.query.q,
  (q) => {
    query.value = (q as string) || ''
    load()
  }
)

watch(minYear, (newMin) => {
  if (newMin && maxYear.value && newMin > maxYear.value) {
    maxYear.value = newMin
  }
})

watch(maxYear, (newMax) => {
  if (newMax && minYear.value && newMax < minYear.value) {
    minYear.value = newMax
  }
})

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
  const sortLabels: Record<string, string> = { newest: 'Newest', oldest: 'Oldest', cited: 'Most Cited' }
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
  showHistory.value = false
}

const openMobileSearch = () => {
  mobileSearchInput.value = query.value
  showMobileSearch.value = true
}
</script>

<template>
  <div class="results-page">

    <!-- Ambient Background Vignettes -->
    <div class="hero-bg-shapes" aria-hidden="true">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
    </div>

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
            {{ browseMode ? 'Loading the archives…' : 'Searching the archives…' }}
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
              @keyup.enter="submitMobileSearch" @focus="showHistory = true" autocomplete="off" spellcheck="false" />
            
            <!-- Search History Popup -->
            <div v-if="showHistory && searchHistory.length > 0" class="history-popup" ref="historyRef">
              <div class="history-head">
                <span>Recent Searches</span>
                <button @click="historyService.clearHistory(); searchHistory = []">Clear All</button>
              </div>
              <div class="history-list">
                <div v-for="h in searchHistory" :key="h" class="history-item" @click="mobileSearchInput = h; submitMobileSearch()">
                  <Search :size="12" />
                  <span>{{ h }}</span>
                  <button class="h-remove" @click.stop="historyService.removeQuery(h); searchHistory = historyService.getHistory()">
                    <X :size="10" />
                  </button>
                </div>
              </div>
            </div>

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
                    s === 'methods' ? 'Methodology' : s.charAt(0).toUpperCase() + s.slice(1) }}</button>
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
                <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
              </select>
              <span class="year-to">—</span>
              <select v-model="maxYear" class="year-select">
                <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
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
                @click="sortBy = s[0]!">{{ s[1] }}</button>
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

                <p class="item-abstract">{{ res.payload.abstract.substring(0, 220) }}…</p>

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

          <!-- Pagination -->
          <footer v-if="totalResults > 0" class="pagination-wrap">
            <div class="pg-info">
              Page <strong>{{ currentPage }} - {{ totalPages }}</strong> of {{ totalResults }} results
            </div>
            <div class="pg-controls">
              <button class="pg-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
                <X :size="14" style="transform: rotate(90deg)" /> Prev
              </button>
              
              <div class="pg-pages">
                <button v-for="p in totalPages" :key="p" 
                  class="pg-num" :class="{ active: p === currentPage }"
                  v-show="p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)"
                  @click="changePage(p)">
                  {{ p }}
                </button>
                <span v-if="totalPages > 5" class="pg-sep">...</span>
              </div>

              <button class="pg-btn" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
                Next <ArrowRight :size="14" />
              </button>
            </div>
          </footer>
        </section>

      </div>
    </main>

  </div>
</template>

<style scoped>

/* ── Design tokens ───────────────────────────────────────── */
.results-page {
  --ink: var(--text-primary);
  --ink-2: var(--text-secondary);
  --ink-3: var(--text-tertiary);
  --rule: var(--border-color);
  --surface: var(--bg-primary);
  --paper: var(--bg-secondary);
  --green: var(--accent-primary);
  --green-dk: #007d3d;
  --green-dim: rgba(0, 166, 81, 0.08);

  min-height: 100vh;
  background: var(--surface);
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  position: relative;
  overflow: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Translucent floating glowing green shapes behind content */
.hero-bg-shapes {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.floating-shape {
  position: absolute;
  background: linear-gradient(135deg, var(--green) 0%, transparent 80%);
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.04;
  pointer-events: none;
}

.dark .floating-shape {
  opacity: 0.08;
}

.shape-1 {
  width: 500px;
  height: 500px;
  top: -10%;
  left: 5%;
  animation: float-shape-1 12s ease-in-out infinite alternate;
}
.shape-2 {
  width: 450px;
  height: 450px;
  bottom: 10%;
  right: 5%;
  animation: float-shape-2 15s ease-in-out infinite alternate;
}
.shape-3 {
  width: 300px;
  height: 300px;
  top: 40%;
  left: 50%;
  animation: float-shape-3 10s ease-in-out infinite alternate;
}

@keyframes float-shape-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, -30px) scale(1.05); }
}

@keyframes float-shape-2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-20px, 20px) scale(0.95); }
}

@keyframes float-shape-3 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(20px, 15px) scale(1.06); }
}

/* ══ TOPBAR ══════════════════════════════════════════════ */
.results-topbar {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 166, 81, 0.12);
  position: sticky;
  top: 0;
  z-index: 20;
  transition: background 0.3s ease, border-color 0.3s ease;
}

.dark .results-topbar {
  background: rgba(10, 10, 10, 0.7);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.topbar-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 2.5rem;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.topbar-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--green);
  white-space: nowrap;
  flex-shrink: 0;
}

.topbar-rule {
  width: 1px;
  height: 16px;
  background: var(--rule);
  flex-shrink: 0;
}

.topbar-count {
  font-size: 0.85rem;
  color: var(--ink-2);
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
  color: var(--green);
}

.topbar-searching {
  font-style: italic;
  color: var(--ink-3);
}

/* Filter toggle (mobile) */
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mobile-search-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(0, 166, 81, 0.2);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  color: var(--ink-2);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.mobile-search-btn:hover {
  background: rgba(0, 166, 81, 0.05);
  border-color: var(--green);
  color: var(--green);
}

.mobile-search-btn.active {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.filter-toggle-btn {
  display: none;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid rgba(0, 166, 81, 0.2);
  border-radius: 8px;
  padding: 0.4rem 1rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-toggle-btn:hover {
  background: rgba(0, 166, 81, 0.05);
  border-color: var(--green);
  color: var(--green);
}

.filter-toggle-btn.active {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

/* Mobile search bar */
.mobile-search-bar {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease, border-color 0.25s ease;
  border-top: 0px solid var(--rule);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.dark .mobile-search-bar {
  background: rgba(10, 10, 10, 0.8);
}

.mobile-search-bar.open {
  max-height: 88px;
  border-top: 1px solid var(--rule);
}

.mobile-search-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.5rem;
}

.mobile-search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 0 1rem;
  position: relative;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.mobile-search-field:focus-within {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(0, 166, 81, 0.1);
}

.ms-icon {
  color: var(--ink-3);
  flex-shrink: 0;
}

.mobile-search-field input {
  flex: 1;
  background: transparent;
  border: none;
  height: 40px;
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
}

.history-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  margin-top: 0.5rem;
  box-shadow: 0 15px 30px -10px rgba(0,0,0,0.15);
  z-index: 100;
  overflow: hidden;
}

.history-head {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink-3);
}

.history-head button {
  background: none;
  border: none;
  color: var(--green);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 600;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9rem;
  color: var(--ink-2);
}

.history-item:hover {
  background: var(--surface);
  color: var(--ink);
}

.history-item .h-remove {
  margin-left: auto;
  opacity: 0.5;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-3);
  transition: opacity 0.2s;
}

.history-item .h-remove:hover {
  opacity: 1;
  color: var(--ink);
}

/* ══ LAYOUT ══════════════════════════════════════════════ */
.results-layout {
  position: relative;
  z-index: 2;
  padding: 3rem 2.5rem 6rem;
}

.layout-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 3.5rem;
  align-items: start;
}

/* ── SIDEBAR ═════════════════════════════════════════════ */
.filters-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: sticky;
  top: calc(52px + 2rem);
  z-index: 10;
}

.sb-panel {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 166, 81, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
}

.dark .sb-panel {
  background: rgba(15, 15, 15, 0.5);
  border-color: rgba(255, 255, 255, 0.05);
}

.sb-panel:hover {
  border-color: rgba(0, 166, 81, 0.2);
}

.sb-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink);
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--rule);
}

.filter-group {
  margin-bottom: 1.5rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  margin: 0 0 0.75rem;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-tag {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 166, 81, 0.15);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.dark .filter-tag {
  background: rgba(25, 25, 25, 0.5);
  border-color: rgba(255, 255, 255, 0.08);
}

.filter-tag:hover {
  border-color: var(--green);
  color: var(--green);
  background: rgba(0, 166, 81, 0.05);
  transform: translateY(-1px);
}

.filter-tag.active {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.2);
}

/* Year range */
.year-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.year-select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid rgba(0, 166, 81, 0.15);
  border-radius: 8px;
  background: var(--paper);
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  color: var(--ink-2);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.dark .year-select {
  border-color: rgba(255, 255, 255, 0.08);
}

.year-select:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(0, 166, 81, 0.1);
}

.year-to {
  font-size: 0.8rem;
  color: var(--ink-3);
  flex-shrink: 0;
}

/* Threshold slider */
.threshold-info {
  font-size: 0.78rem;
  color: var(--ink-3);
  line-height: 1.6;
  margin: 0 0 1rem;
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
  font-size: 0.72rem;
  color: var(--ink-3);
  margin-top: 0.5rem;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

/* ══ RESULTS FEED ════════════════════════════════════════ */
.results-feed {
  min-width: 0;
}

.feed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--ink);
  margin-bottom: 2rem;
  transition: border-color 0.3s;
}

.dark .feed-head {
  border-bottom-color: rgba(255, 255, 255, 0.15);
}

.feed-head-left {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--green);
}

.feed-head-count {
  font-size: 0.75rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

/* Paper list */
.paper-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.paper-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 1.5rem;
  padding: 1.75rem;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 166, 81, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), 
              box-shadow 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), 
              border-color 0.4s ease, 
              background-color 0.4s ease;
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.02);
}

.dark .paper-item {
  background: rgba(15, 15, 15, 0.5);
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.15);
}

.paper-item:hover {
  transform: translateY(-4px) scale(1.005);
  box-shadow: 0 20px 35px -10px rgba(0, 166, 81, 0.1);
  border-color: var(--green);
  background: rgba(255, 255, 255, 0.65);
}

.dark .paper-item:hover {
  background: rgba(20, 20, 20, 0.65);
  box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.35);
}

.paper-item:hover .item-title {
  color: var(--green);
}

.paper-item:hover .item-action {
  gap: 0.5rem;
  color: var(--green-dk);
}

.item-num {
  font-family: 'Lora', serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--green);
  opacity: 0.8;
  padding: 0.15rem 0.5rem;
  background: var(--green-dim);
  border-radius: 8px;
  height: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  border: 1px solid rgba(0, 166, 81, 0.15);
}

.item-body {
  min-width: 0;
}

.item-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}

.type-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--green);
  background: var(--green-dim);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  border: 1px solid rgba(0, 166, 81, 0.15);
}

.degree-tag {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-2);
  background: var(--bg-secondary);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  border: 1px solid var(--rule);
}

/* ── Confidence badges ──────────────────────────────────────────── */
.confidence-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  white-space: nowrap;
}

.badge-strong {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.badge-good {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.badge-related {
  background: rgba(120, 120, 120, 0.08);
  color: var(--ink-2);
  border: 1px solid rgba(120, 120, 120, 0.15);
}

.section-target-tag {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  opacity: 0.8;
  white-space: nowrap;
}

.badge-pct {
  font-weight: 500;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
}

.item-title {
  display: block;
  font-family: 'Lora', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.4;
  margin-bottom: 0.5rem;
  transition: color 0.2s ease;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--ink-3);
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.item-meta span {
  display: inline-flex;
  align-items: center;
}

.dot {
  opacity: 0.5;
}

.item-abstract {
  font-size: 0.88rem;
  color: var(--ink-2);
  line-height: 1.7;
  margin: 0 0 1rem;
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
  flex-wrap: wrap;
  gap: 0.75rem;
}

.upload-date-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink-2);
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
}

.most-cited-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--green);
  background: var(--green-dim);
  border: 1px solid rgba(0, 166, 81, 0.15);
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-dot {
  opacity: 0.5;
}

.item-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--green);
  transition: all 0.2s ease;
  margin-left: auto;
}

.paper-item:hover .item-action {
  transform: translateX(3px);
}

/* Empty state */
.empty-state {
  padding: 5rem 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 166, 81, 0.08);
  border-radius: 16px;
}

.dark .empty-state {
  background: rgba(15, 15, 15, 0.5);
  border-color: rgba(255, 255, 255, 0.05);
}

.empty-heading {
  font-family: 'Lora', serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.75rem;
}

.empty-sub {
  font-size: 0.92rem;
  color: var(--ink-3);
  margin: 0;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ── Pagination ─────────────────────────────────────────── */
.pagination-wrap {
  margin-top: 3.5rem;
  padding-top: 2.5rem;
  border-top: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.pg-info {
  font-size: 0.85rem;
  color: var(--ink-3);
  font-weight: 500;
}

.pg-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pg-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 166, 81, 0.15);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--ink-2);
  transition: all 0.2s ease;
}

.dark .pg-btn {
  background: rgba(25, 25, 25, 0.6);
  border-color: rgba(255, 255, 255, 0.08);
}

.pg-btn:hover:not(:disabled) {
  border-color: var(--green);
  color: var(--green);
  background: rgba(0, 166, 81, 0.05);
  transform: translateY(-1px);
}

.pg-btn:disabled {
  background: transparent;
  border-color: var(--rule);
  color: var(--ink-3);
  cursor: not-allowed;
  opacity: 0.5;
}

.pg-pages {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.pg-num {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(0, 166, 81, 0.15);
  background: rgba(255, 255, 255, 0.5);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--ink-2);
  transition: all 0.2s ease;
}

.dark .pg-num {
  background: rgba(25, 25, 25, 0.5);
  border-color: rgba(255, 255, 255, 0.08);
}

.pg-num:hover:not(.active) {
  border-color: var(--green);
  color: var(--green);
  background: rgba(0, 166, 81, 0.05);
}

.pg-num.active {
  border-color: var(--green);
  color: #fff;
  background: var(--green);
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.2);
}

.pg-sep {
  color: var(--ink-3);
  font-weight: 600;
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

.skeleton .sk-num,
.skeleton .sk-tag,
.skeleton .sk-title,
.skeleton .sk-meta,
.skeleton .sk-abstract {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%);
  background-size: 500px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.skeleton .sk-num {
  width: 32px;
  height: 24px;
}

.skeleton .sk-tag {
  width: 80px;
  height: 20px;
  margin-bottom: 0.75rem;
}

.skeleton .sk-title {
  width: 90%;
  height: 24px;
  margin-bottom: 0.75rem;
}

.skeleton .sk-meta {
  width: 50%;
  height: 16px;
  margin-bottom: 1rem;
}

.skeleton .sk-abstract {
  width: 100%;
  height: 60px;
  margin-bottom: 0;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 1024px) {
  .layout-inner {
    grid-template-columns: 1fr;
    gap: 2.5rem;
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
    padding: 2rem 1.5rem 4rem;
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
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .filter-tag {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .topbar-inner {
    padding: 0 1.25rem;
  }

  .results-layout {
    padding: 1.25rem 1rem 3rem;
  }

  .paper-item {
    grid-template-columns: 1fr;
    gap: 0.75rem 0;
    padding: 1.25rem;
  }

  .item-num {
    width: fit-content;
  }

  .item-title {
    font-size: 1.05rem;
  }

  .item-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .item-action {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}
</style>
