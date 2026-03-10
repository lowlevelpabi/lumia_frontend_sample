<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { Calendar, User, FileText, BookOpen, Eye, Award, CheckCircle, Sparkles, TrendingUp, MessageSquare, ImageIcon, Loader2, ChevronRight } from 'lucide-vue-next'
import { api, type Paper, type SearchResult } from '../services/api'

const route = useRoute()
const router = useRouter()
const paper = ref<Paper | null>(null)
const recommendations = ref<SearchResult[]>([])
const loading = ref(true)

// Engagement state
const viewCount = ref(0)
const citationCount = ref(0)
const hasCited = ref(false)
const citeLoading = ref(false)
const { isLoggedIn } = useAuth()

// Document view state
const activeTab = ref<'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'authors' | 'document'>('abstract')
const pdfUrl = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
  return paper.value ? `${base}/papers/${paper.value.id}/pdf` : ''
})

// Section page viewer state
const sectionPageCache = ref<Record<string, { pages: { page_num: number; thumbnail: string }[], loading: boolean, shown: boolean }>>({
  introduction: { pages: [], loading: false, shown: false },
  methods: { pages: [], loading: false, shown: false },
  results: { pages: [], loading: false, shown: false },
  discussion: { pages: [], loading: false, shown: false },
})

const toggleSectionPages = async (section: string) => {
  const s = sectionPageCache.value[section]
  if (!s) return
  if (s.shown) { s.shown = false; return }
  if (s.pages.length > 0) { s.shown = true; return }
  if (!paper.value) return

  s.loading = true
  s.shown = true
  try {
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
    const res = await fetch(`${base}/papers/${paper.value.id}/section-pages/${section}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    s.pages = data.pages ?? []
  } catch (e) {
    console.error('Failed to load section pages:', e)
    s.pages = []
  } finally {
    s.loading = false
  }
}

const showFullAbstract = ref(false)
const ABSTRACT_PREVIEW_LIMIT = 400

const loadPaperData = async (id: number) => {
  loading.value = true
  try {
    const details = await api.getPaperDetails(id)
    paper.value = details || null
    recommendations.value = await api.getRecommendations(id)

    if (paper.value) {
      viewCount.value = paper.value.view_count || 0
      citationCount.value = paper.value.citation_count || 0

      api.viewPaper(id).then(res => { viewCount.value = res.view_count }).catch(() => { })

      if (isLoggedIn.value) {
        api.getCiteStatus(id)
          .then(res => {
            hasCited.value = res.has_cited
            citationCount.value = res.citation_count
          })
          .catch(() => { })
      }
    }
  } catch (error) {
    console.error('Error fetching details:', error)
  } finally {
    loading.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

onMounted(() => { loadPaperData(Number(route.params.id)) })
watch(() => route.params.id, (newId) => { if (newId) loadPaperData(Number(newId)) })

const goBack = () => router.back()
const viewDetail = (id: number) => router.push({ name: 'detail', params: { id } })

const handleCite = async () => {
  if (!isLoggedIn.value || hasCited.value || citeLoading.value || !paper.value) return
  citeLoading.value = true
  try {
    const res = await api.citePaper(paper.value.id)
    hasCited.value = res.has_cited
    citationCount.value = res.citation_count
  } catch {
    hasCited.value = true
  } finally {
    citeLoading.value = false
  }
}

const authorList = computed(() => {
  if (!paper.value?.author) return []
  const raw = paper.value.author.trim()
  if (raw.includes('|')) {
    return raw.split('|').map((a: string) => a.trim()).filter(Boolean)
  }
  const parts = raw.split(/(?<=\.),\s+(?=[A-Z]{2,},)/)
  if (parts.length > 1) {
    return parts.map((a: string) => {
      const t = a.trim()
      return t.endsWith('.') ? t : t + '.'
    }).filter(Boolean)
  }
  return [raw]
})

const abstractPreview = computed(() => {
  if (!paper.value?.abstract) return ''
  return paper.value.abstract.length > ABSTRACT_PREVIEW_LIMIT && !showFullAbstract.value
    ? paper.value.abstract.substring(0, ABSTRACT_PREVIEW_LIMIT) + '...'
    : paper.value.abstract
})
</script>

<template>
  <div class="detail-page" v-if="!loading && paper">

    <!-- ══ HEADER ═════════════════════════════════════════════════ -->
    <div class="paper-header-wrap">
      <div class="header-inner">

        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <RouterLink :to="{ name: 'home' }" class="bc-link">Home</RouterLink>
          <ChevronRight :size="12" class="bc-sep" />
          <button @click="goBack" class="bc-link">Results</button>
          <ChevronRight :size="12" class="bc-sep" />
          <span class="bc-active">{{ paper.title.length > 55 ? paper.title.substring(0, 55) + '…' : paper.title
            }}</span>
        </nav>

        <!-- Badges -->
        <div class="header-badges">
          <span class="badge badge-dept">{{ paper.department }}</span>
          <span class="badge badge-type">{{ paper.project_type }}</span>
          <span v-if="paper.degree_program !== 'N/A'" class="badge badge-degree">{{ paper.degree_program }}</span>
        </div>

        <!-- Title -->
        <h1 class="paper-title">{{ paper.title }}</h1>

        <!-- Metadata -->
        <div class="meta-row">
          <span class="meta-item">
            <User :size="13" />
            {{ paper.author }}
          </span>
          <span class="meta-dot">·</span>
          <span class="meta-item">
            <Calendar :size="13" />
            {{ paper.year }}
          </span>
        </div>

        <!-- Engagement -->
        <div class="engagement-row">
          <span class="stat-chip">
            <Eye :size="13" />{{ viewCount.toLocaleString() }} views
          </span>
          <span class="stat-chip">
            <Award :size="13" />{{ citationCount.toLocaleString() }} citations
          </span>
          <button v-if="isLoggedIn" class="cite-btn" :class="{ cited: hasCited, loading: citeLoading }"
            :disabled="hasCited || citeLoading" @click="handleCite">
            <CheckCircle v-if="hasCited" :size="14" />
            <Award v-else :size="14" />
            {{ hasCited ? 'Cited' : citeLoading ? 'Citing…' : 'Cite this study' }}
          </button>
          <span v-else class="cite-hint">Sign in to cite</span>
        </div>

      </div>
    </div>

    <!-- ══ BODY ════════════════════════════════════════════════════ -->
    <div class="detail-layout">

      <!-- Left: Document nav sidebar -->
      <aside class="doc-nav-aside">
        <p class="aside-group-label">Document Content</p>
        <nav class="aside-nav">
          <button class="aside-item" :class="{ active: activeTab === 'abstract' }" @click="activeTab = 'abstract'">
            Abstract
          </button>
          <button v-if="paper.introduction" class="aside-item" :class="{ active: activeTab === 'introduction' }"
            @click="activeTab = 'introduction'">
            Introduction
          </button>
          <button v-if="paper.methods" class="aside-item" :class="{ active: activeTab === 'methods' }"
            @click="activeTab = 'methods'">
            Methods
          </button>
          <button v-if="paper.results" class="aside-item" :class="{ active: activeTab === 'results' }"
            @click="activeTab = 'results'">
            Results
          </button>
          <button v-if="paper.discussion" class="aside-item" :class="{ active: activeTab === 'discussion' }"
            @click="activeTab = 'discussion'">
            Discussion
          </button>
        </nav>

        <p class="aside-group-label" style="margin-top: 1.5rem">Study Info</p>
        <nav class="aside-nav">
          <button class="aside-item" :class="{ active: activeTab === 'authors' }" @click="activeTab = 'authors'">
            Authors
          </button>
        </nav>
      </aside>

      <!-- Center: Main content -->
      <main class="paper-main">

        <!-- Tabs (horizontal, visible on all sizes) -->
        <div class="doc-tabs">
          <button class="doc-tab" :class="{ active: activeTab === 'abstract' }"
            @click="activeTab = 'abstract'">Abstract</button>
          <button v-if="paper.introduction" class="doc-tab" :class="{ active: activeTab === 'introduction' }"
            @click="activeTab = 'introduction'">Introduction</button>
          <button v-if="paper.methods" class="doc-tab" :class="{ active: activeTab === 'methods' }"
            @click="activeTab = 'methods'">Methods</button>
          <button v-if="paper.results" class="doc-tab" :class="{ active: activeTab === 'results' }"
            @click="activeTab = 'results'">Results</button>
          <button v-if="paper.discussion" class="doc-tab" :class="{ active: activeTab === 'discussion' }"
            @click="activeTab = 'discussion'">Discussion</button>
          <button class="doc-tab" :class="{ active: activeTab === 'authors' }"
            @click="activeTab = 'authors'">Authors</button>
        </div>

        <!-- ── Abstract Tab ─────────────────────────────────────── -->
        <div v-if="activeTab === 'abstract'">
          <section class="paper-section">
            <h3 class="section-heading">
              <FileText :size="15" /> Abstract
            </h3>
            <p class="body-text">{{ abstractPreview }}</p>
            <button v-if="paper.abstract && paper.abstract.length > ABSTRACT_PREVIEW_LIMIT" class="read-more-btn"
              @click="showFullAbstract = !showFullAbstract">
              {{ showFullAbstract ? 'Show less' : 'Read full abstract' }}
            </button>
          </section>

          <section class="paper-section" v-if="paper.keywords">
            <h3 class="section-heading">
              <BookOpen :size="15" /> Keywords
            </h3>
            <div class="tags">
              <RouterLink v-for="tag in paper.keywords.split(',')" :key="tag"
                :to="{ name: 'results', query: { q: tag.trim() } }" class="tag">{{ tag.trim() }}</RouterLink>
            </div>
          </section>
        </div>

        <!-- ── IMRAD Sections ───────────────────────────────────── -->
        <template v-for="(cfg, key) in {
          introduction: { label: 'Introduction', icon: 'BookOpen', content: paper.introduction },
          methods: { label: 'Methodology', icon: 'Sparkles', content: paper.methods },
          results: { label: 'Results & Findings', icon: 'TrendingUp', content: paper.results },
          discussion: { label: 'Discussion', icon: 'MessageSquare', content: paper.discussion },
        }" :key="key">
          <div v-if="activeTab === key" class="paper-section imrad-section">

            <div class="imrad-header">
              <h3 class="section-heading">
                <BookOpen v-if="key === 'introduction'" :size="15" />
                <Sparkles v-else-if="key === 'methods'" :size="15" />
                <TrendingUp v-else-if="key === 'results'" :size="15" />
                <MessageSquare v-else :size="15" />
                {{ cfg.label }}
              </h3>
              <button class="view-pages-btn" :class="{ active: sectionPageCache[key]?.shown }"
                @click="toggleSectionPages(key)" title="Toggle original PDF pages">
                <Loader2 v-if="sectionPageCache[key]?.loading" :size="13" class="spin" />
                <ImageIcon v-else :size="13" />
                {{ sectionPageCache[key]?.shown ? 'Hide pages' : 'View pages' }}
              </button>
            </div>

            <div v-if="cfg.content" class="section-text-outer">
              <div class="section-text-wrap">
                <pre class="section-text">{{ cfg.content }}</pre>
              </div>
            </div>
            <p v-else class="no-content">No extracted text available for this section.</p>

            <div v-if="sectionPageCache[key]?.shown" class="pages-viewer">
              <div v-if="sectionPageCache[key]?.loading" class="pages-state">
                <Loader2 :size="18" class="spin" /> Loading pages…
              </div>
              <div v-else-if="sectionPageCache[key]?.pages.length === 0" class="pages-state">
                No page images available for this section.
              </div>
              <div v-else class="pages-stack">
                <div v-for="pg in sectionPageCache[key].pages" :key="pg.page_num" class="page-card">
                  <div class="page-label">Page {{ pg.page_num }}</div>
                  <img :src="'data:image/jpeg;base64,' + pg.thumbnail" :alt="'Page ' + pg.page_num" class="page-img" />
                </div>
              </div>
            </div>

          </div>
        </template>

        <!-- ── Authors Tab ──────────────────────────────────────── -->
        <div v-if="activeTab === 'authors'" class="paper-section">
          <h3 class="section-heading">
            <User :size="15" /> Authors
          </h3>
          <div v-if="authorList.length > 0" class="authors-list">
            <div v-for="(author, idx) in authorList" :key="idx" class="author-row">
              <div class="author-initial">{{ author.charAt(0).toUpperCase() }}</div>
              <div class="author-info">
                <p class="author-name">{{ author }}</p>
                <p class="author-label">Author {{ idx + 1 }}</p>
              </div>
            </div>
          </div>
          <p v-else class="no-content">No author information available.</p>
        </div>

        <!-- ── Full Document Tab ────────────────────────────────── -->
        <div v-if="activeTab === 'document'" class="pdf-viewer-wrap">
          <iframe :src="pdfUrl" class="pdf-iframe" title="Full Research Document" allowfullscreen />
        </div>

      </main>

      <!-- Right: Related Studies -->
      <aside class="rec-aside">
        <div class="rec-head">
          <p class="aside-group-label">Related Studies</p>
          <p class="rec-sub">Based on semantic similarity</p>
        </div>

        <div class="rec-list">
          <div v-for="rec in recommendations" :key="rec.id" class="rec-card" @click="viewDetail(rec.id)">
            <span v-if="rec.payload.degree_program" class="rec-badge">{{ rec.payload.degree_program }}</span>
            <p class="rec-title">{{ rec.payload.title }}</p>
            <p class="rec-meta">{{ rec.payload.author }} · {{ rec.payload.year }}</p>
            <div class="rec-score">{{ (rec.score * 100).toFixed(0) }}% match</div>
          </div>

          <p v-if="recommendations.length === 0" class="no-content" style="text-align:center; padding: 2rem 0">
            No related studies found.
          </p>
        </div>
      </aside>

    </div>
  </div>

  <!-- Loading state -->
  <div v-else-if="loading" class="loading-full">
    <Loader2 :size="24" class="spin" />
    <span>Loading paper…</span>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Source+Sans+3:wght@400;500;600;700&display=swap');

/* ── Tokens ──────────────────────────────────────────────── */
.detail-page {
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

  background: var(--surface);
  min-height: 100vh;
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
}

/* ══ HEADER ══════════════════════════════════════════════ */
.paper-header-wrap {
  background: var(--hero-bg);
  border-bottom: 3px solid var(--green);
  padding: 2rem 2rem 2.5rem;
  position: relative;
}

/* dot-grid texture — same as hero/footer */
.paper-header-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.header-inner {
  max-width: 1300px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 1.5rem;
}

.bc-link {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  transition: color 0.14s;
  font-family: 'Source Sans 3', sans-serif;
}

.bc-link:hover {
  color: rgba(255, 255, 255, 0.75);
}

.bc-sep {
  color: rgba(255, 255, 255, 0.18);
}

.bc-active {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
}

/* Badges */
.header-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.22rem 0.55rem;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.badge-dept {
  background: rgba(0, 166, 81, 0.18);
  color: #6ee7aa;
}

.badge-type {
  background: rgba(96, 165, 250, 0.15);
  color: #93c5fd;
}

.badge-degree {
  background: rgba(251, 191, 36, 0.15);
  color: #fcd34d;
}

/* Title */
.paper-title {
  font-family: 'Lora', Georgia, serif;
  font-size: clamp(1.5rem, 3vw, 2.1rem);
  font-weight: 600;
  line-height: 1.25;
  color: #fff;
  margin: 0 0 1.1rem;
  max-width: 900px;
}

/* Metadata */
.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.5);
}

.meta-dot {
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.8rem;
}

/* Engagement */
.engagement-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
}

.cite-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--green);
  color: #fff;
  border: none;
  padding: 0.38rem 1rem;
  border-radius: 5px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;
}

.cite-btn:hover:not(:disabled) {
  background: var(--green-dk);
}

.cite-btn.cited {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
  cursor: default;
}

.cite-btn.loading {
  opacity: 0.6;
  cursor: wait;
}

.cite-hint {
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.28);
}

/* ══ BODY ════════════════════════════════════════════════ */
.detail-layout {
  display: flex;
  max-width: 1300px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  gap: 2rem;
  align-items: flex-start;
}

/* ── Left doc nav sidebar ─────────────────────────────── */
.doc-nav-aside {
  width: 180px;
  flex-shrink: 0;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
}

.aside-group-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-3);
  margin: 0 0 0.4rem 0.5rem;
}

.aside-nav {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.aside-item {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.42rem 0.6rem;
  border-radius: 5px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--ink-3);
  cursor: pointer;
  transition: background 0.13s, color 0.13s;
}

.aside-item:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--ink);
}

.aside-item.active {
  background: var(--green-dim);
  color: var(--green-dk);
  font-weight: 700;
}

/* ── Main content ─────────────────────────────────────── */
.paper-main {
  flex: 1 1 0;
  min-width: 0;
}

/* Tabs */
.doc-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border-bottom: 2px solid var(--rule);
  margin-bottom: 2rem;
}

.doc-tab {
  padding: 0.6rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--ink-3);
  transition: color 0.14s, border-color 0.14s;
}

.doc-tab:hover {
  color: var(--ink);
}

.doc-tab.active {
  color: var(--green-dk);
  border-bottom-color: var(--green);
}

/* Paper sections */
.paper-section {
  margin-bottom: 2.25rem;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--ink-3);
  margin: 0 0 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}

.body-text {
  font-size: 0.96rem;
  line-height: 1.9;
  color: var(--ink-2);
  text-align: justify;
  margin: 0 0 0.75rem;
}

.read-more-btn {
  background: none;
  border: none;
  color: var(--green-dk);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.read-more-btn:hover {
  text-decoration: underline;
}

/* Keywords */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 0.3rem 0.65rem;
  border-radius: 4px;
  font-size: 0.78rem;
  color: var(--ink-2);
  text-decoration: none;
  transition: border-color 0.13s, color 0.13s;
}

.tag:hover {
  border-color: var(--green);
  color: var(--green-dk);
}

/* IMRAD section */
.imrad-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.imrad-header .section-heading {
  margin: 0;
  border: none;
  padding: 0;
}

.view-pages-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 5px;
  border: 1.5px solid var(--rule);
  background: var(--paper);
  color: var(--ink-3);
  cursor: pointer;
  transition: all 0.14s;
  white-space: nowrap;
}

.view-pages-btn:hover {
  border-color: var(--green);
  color: var(--green-dk);
}

.view-pages-btn.active {
  background: var(--green-dim);
  border-color: var(--green);
  color: var(--green-dk);
}

/* Section text */
.section-text-outer {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 6px;
}

.section-text-outer::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 6px;
  border: 1.5px solid rgba(0, 166, 81, 0.5);
  animation: border-ripple 2.6s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes border-ripple {
  0% {
    inset: -1px;
    border-color: rgba(0, 166, 81, 0.55);
    opacity: 1;
  }

  100% {
    inset: -14px;
    border-color: rgba(0, 166, 81, 0);
    opacity: 0;
  }
}

.section-text-wrap {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 1.25rem 1.5rem;
  max-height: 480px;
  overflow-y: auto;
  position: relative;
  z-index: 2;
}

.section-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.94rem;
  line-height: 1.9;
  color: var(--ink-2);
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  text-align: justify;
}

.no-content {
  font-size: 0.84rem;
  color: var(--ink-3);
  font-style: italic;
}

/* Pages viewer */
.pages-viewer {
  margin-top: 1.25rem;
  border-top: 1px dashed var(--rule);
  padding-top: 1.25rem;
}

.pages-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink-3);
  font-size: 0.84rem;
  padding: 0.75rem 0;
}

.pages-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-card {
  border: 1px solid var(--rule);
  border-radius: 6px;
  overflow: hidden;
  background: var(--paper);
}

.page-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--ink-3);
  padding: 0.35rem 0.75rem;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.page-img {
  width: 100%;
  display: block;
}

/* PDF viewer */
.pdf-viewer-wrap {
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}

.pdf-iframe {
  width: 100%;
  height: 80vh;
  border: none;
  display: block;
}

/* ── Authors tab ──────────────────────────────────────── */
.authors-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 6px;
}

.author-initial {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--hero-bg);
  border: 2px solid var(--green);
  color: #fff;
  font-family: 'Lora', Georgia, serif;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.1rem;
}

.author-label {
  font-size: 0.75rem;
  color: var(--ink-3);
  margin: 0;
}

/* ── Recommendations sidebar ──────────────────────────── */
.rec-aside {
  width: 256px;
  flex-shrink: 0;
  position: sticky;
  top: 1.5rem;
  align-self: flex-start;
}

.rec-head {
  border-top: 2px solid var(--ink);
  padding-top: 0.85rem;
  margin-bottom: 1.25rem;
}

.rec-sub {
  font-size: 0.75rem;
  color: var(--ink-3);
  margin: 0.25rem 0 0;
  line-height: 1.4;
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.rec-card {
  padding: 1rem 0;
  border-bottom: 1px solid var(--rule);
  cursor: pointer;
  transition: padding-left 0.14s;
}

.rec-card:last-of-type {
  border-bottom: none;
}

.rec-card:hover {
  padding-left: 4px;
}

.rec-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--green-dk);
  background: var(--green-dim);
  padding: 0.12rem 0.4rem;
  border-radius: 2px;
  margin-bottom: 0.4rem;
}

.rec-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.4;
  margin: 0 0 0.35rem;
}

.rec-card:hover .rec-title {
  color: var(--green-dk);
}

.rec-meta {
  font-size: 0.74rem;
  color: var(--ink-3);
  margin: 0 0 0.4rem;
}

.rec-score {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--green-dk);
}

/* Loading */
.loading-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  height: 50vh;
  color: var(--ink-3);
  font-size: 0.9rem;
  font-family: 'Source Sans 3', sans-serif;
}

/* Spinner */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 1024px) {
  .rec-aside {
    display: none;
  }
}

@media (max-width: 768px) {
  .detail-layout {
    flex-direction: column;
    padding: 1.5rem 1.25rem;
  }

  .doc-nav-aside {
    display: none;
  }

  .paper-header-wrap {
    padding: 1.5rem 1.25rem 2rem;
  }

  .paper-title {
    font-size: 1.4rem;
  }
}

@media (max-width: 480px) {
  .detail-layout {
    padding: 1rem;
  }

  .paper-title {
    font-size: 1.2rem;
  }

  .doc-tab {
    font-size: 0.78rem;
    padding: 0.5rem 0.7rem;
  }

  .meta-dot {
    display: none;
  }

  .meta-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
  }
}
</style>
