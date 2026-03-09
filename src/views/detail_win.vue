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
// Cache so each section only fetches once per page load
const sectionPageCache = ref<Record<string, { pages: { page_num: number; thumbnail: string }[], loading: boolean, shown: boolean }>>({
  introduction: { pages: [], loading: false, shown: false },
  methods: { pages: [], loading: false, shown: false },
  results: { pages: [], loading: false, shown: false },
  discussion: { pages: [], loading: false, shown: false },
})

const toggleSectionPages = async (section: string) => {
  const s = sectionPageCache.value[section]
  if (!s) return
  if (s.shown) { s.shown = false; return }     // hide if already visible
  if (s.pages.length > 0) { s.shown = true; return }  // already fetched, just show
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

// Document preview toggle
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

      // Record view (fire-and-forget)
      api.viewPaper(id).then(res => { viewCount.value = res.view_count }).catch(() => { })

      // Check citation status if logged in
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

onMounted(() => {
  loadPaperData(Number(route.params.id))
})

watch(() => route.params.id, (newId) => {
  if (newId) loadPaperData(Number(newId))
})

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
    // 409 means already cited (race condition guard), treat as success
    hasCited.value = true
  } finally {
    citeLoading.value = false
  }
}

// Split authors intelligently:
// 1. If pipe-separated → split by |
// 2. Filipino ALL-CAPS format: "SURNAME, FIRSTNAME M." repeated
//    Split on boundary: after a period, before next ALL-CAPS word + comma
const authorList = computed(() => {
  if (!paper.value?.author) return []
  const raw = paper.value.author.trim()
  if (raw.includes('|')) {
    return raw.split('|').map((a: string) => a.trim()).filter(Boolean)
  }
  // Split on ", " after a period, before an ALL-CAPS surname+comma
  // e.g. "BILLONES, PRINCE ISIAH R., ORANG, ..." → 3 separate authors
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
    <!-- Header sits above the 3-col layout so left sidebar aligns to tabs -->
    <div class="paper-header-wrap">
      <!-- Breadcrumb nav — matches manage_win topbar style -->
      <div class="paper-header-inner">
        <div class="paper-breadcrumb">
          <RouterLink :to="{ name: 'home' }" class="bc-link">Home</RouterLink>
          <ChevronRight :size="13" class="bc-sep" />
          <button @click="goBack" class="bc-link">Results</button>
          <ChevronRight :size="13" class="bc-sep" />
          <span class="bc-active">{{ paper.title.length > 60 ? paper.title.substring(0, 60) + '…' : paper.title
          }}</span>
        </div>
      </div>
      <div class="paper-header-inner">
        <div class="header-badges">
          <span class="badge badge-dept">{{ paper.department }}</span>
          <span class="badge badge-type">{{ paper.project_type }}</span>
          <span v-if="paper.degree_program !== 'N/A'" class="badge badge-degree">{{ paper.degree_program }}</span>
        </div>
        <h1>{{ paper.title }}</h1>
        <div class="metadata-grid">
          <div class="meta-item">
            <User :size="15" /><span>{{ paper.author }}</span>
          </div>
          <div class="meta-item">
            <Calendar :size="15" /><span>{{ paper.year }}</span>
          </div>
        </div>
        <div class="engagement-row">
          <div class="stat-chip">
            <Eye :size="14" /><span>{{ viewCount.toLocaleString() }} views</span>
          </div>
          <div class="stat-chip">
            <Award :size="14" /><span>{{ citationCount.toLocaleString() }} citations</span>
          </div>
          <button v-if="isLoggedIn" class="cite-btn" :class="{ cited: hasCited, loading: citeLoading }"
            :disabled="hasCited || citeLoading" @click="handleCite">
            <CheckCircle v-if="hasCited" :size="15" />
            <Award v-else :size="15" />
            {{ hasCited ? 'You Cited This' : citeLoading ? 'Citing...' : 'Cite this study' }}
          </button>
          <span v-else class="cite-hint">Authentication required to cite</span>
        </div>
      </div>
    </div>

    <!-- 3-column content row -->
    <div class="detail-layout">

      <!-- Left: Document Content sidebar -->
      <aside class="doc-content-aside">
        <p class="doc-content-title">Document Content</p>
        <nav class="doc-content-nav">
          <button class="dcn-item" :class="{ active: activeTab === 'abstract' }" @click="activeTab = 'abstract'">
            Abstract
          </button>
          <button v-if="paper.introduction" class="dcn-item" :class="{ active: activeTab === 'introduction' }"
            @click="activeTab = 'introduction'">
            Introduction
          </button>
          <button v-if="paper.methods" class="dcn-item" :class="{ active: activeTab === 'methods' }"
            @click="activeTab = 'methods'">
            Methods
          </button>
          <button v-if="paper.results" class="dcn-item" :class="{ active: activeTab === 'results' }"
            @click="activeTab = 'results'">
            Results
          </button>
          <button v-if="paper.discussion" class="dcn-item" :class="{ active: activeTab === 'discussion' }"
            @click="activeTab = 'discussion'">
            Discussion
          </button>
        </nav>
        <p class="doc-content-title" style="margin-top:1.5rem">Authors</p>
        <nav class="doc-content-nav">
          <button class="dcn-item" :class="{ active: activeTab === 'authors' }" @click="activeTab = 'authors'">
            Author(s)
          </button>
        </nav>
      </aside>

      <!-- Center: Main content -->
      <main class="paper-main">
        <!-- Tab Toggle -->
        <div class="doc-tabs">
          <button class="doc-tab" :class="{ active: activeTab === 'abstract' }" @click="activeTab = 'abstract'">
            Abstract
          </button>
          <button v-if="paper.introduction" class="doc-tab" :class="{ active: activeTab === 'introduction' }"
            @click="activeTab = 'introduction'">
            Introduction
          </button>
          <button v-if="paper.methods" class="doc-tab" :class="{ active: activeTab === 'methods' }"
            @click="activeTab = 'methods'">
            Methods
          </button>
          <button v-if="paper.results" class="doc-tab" :class="{ active: activeTab === 'results' }"
            @click="activeTab = 'results'">
            Results
          </button>
          <button v-if="paper.discussion" class="doc-tab" :class="{ active: activeTab === 'discussion' }"
            @click="activeTab = 'discussion'">
            Discussion
          </button>
          <button class="doc-tab" :class="{ active: activeTab === 'authors' }" @click="activeTab = 'authors'">
            Authors
          </button>
        </div>

        <!-- Abstract Tab -->
        <div v-if="activeTab === 'abstract'">
          <!-- Abstract Section -->
          <section class="paper-section">
            <h3>
              <FileText :size="17" /> Abstract
            </h3>
            <p class="body-text">{{ abstractPreview }}</p>
            <button v-if="paper.abstract && paper.abstract.length > ABSTRACT_PREVIEW_LIMIT" class="read-more-btn"
              @click="showFullAbstract = !showFullAbstract">
              {{ showFullAbstract ? 'Show less' : 'Read full abstract' }}
            </button>
          </section>

          <!-- Keywords -->
          <section class="paper-section" v-if="paper.keywords">
            <h3>
              <BookOpen :size="17" /> Keywords
            </h3>
            <div class="tags">
              <span v-for="tag in paper.keywords.split(',')" :key="tag" class="tag">
                {{ tag.trim() }}
              </span>
            </div>
          </section>
        </div>

        <!-- IMRAD Sections — Hybrid: readable text + on-demand page images -->
        <template v-for="(cfg, key) in {
          introduction: { label: 'Introduction', icon: 'BookOpen', content: paper.introduction },
          methods: { label: 'Methodology', icon: 'Sparkles', content: paper.methods },
          results: { label: 'Results & Findings', icon: 'TrendingUp', content: paper.results },
          discussion: { label: 'Discussion', icon: 'MessageSquare', content: paper.discussion },
        }" :key="key">
          <div v-if="activeTab === key" class="paper-section imrad-hybrid">

            <!-- Section header + View Pages toggle -->
            <div class="imrad-section-header">
              <h3>
                <BookOpen v-if="key === 'introduction'" :size="17" />
                <Sparkles v-else-if="key === 'methods'" :size="17" />
                <TrendingUp v-else-if="key === 'results'" :size="17" />
                <MessageSquare v-else :size="17" />
                {{ cfg.label }}
              </h3>
              <button class="view-pages-btn" :class="{ active: sectionPageCache[key]?.shown }"
                @click="toggleSectionPages(key)" title="Toggle original PDF pages for this section">
                <Loader2 v-if="sectionPageCache[key]?.loading" :size="14" class="spin" />
                <ImageIcon v-else :size="14" />
                {{ sectionPageCache[key]?.shown ? 'Hide Page(s)' : 'View Page(s)' }}
              </button>
            </div>

            <!-- Extracted text (always visible, selectable, copyable) -->
            <div v-if="cfg.content" class="section-text-outer">
              <div class="section-text-wrap">
                <pre class="section-text">{{ cfg.content }}</pre>
              </div>
            </div>
            <p v-else class="no-content-note">No extracted text available for this section.</p>

            <!-- On-demand PDF page thumbnails -->
            <div v-if="sectionPageCache[key]?.shown" class="section-pages-viewer">
              <div v-if="sectionPageCache[key]?.loading" class="pages-loading">
                <Loader2 :size="22" class="spin" /> Loading pages...
              </div>
              <div v-else-if="sectionPageCache[key]?.pages.length === 0" class="pages-empty">
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

        <!-- Authors Tab -->
        <div v-if="activeTab === 'authors'" class="paper-section authors-tab">
          <h3>
            <User :size="17" /> Authors
          </h3>
          <div v-if="authorList.length > 0" class="authors-list">
            <div v-for="(author, idx) in authorList" :key="idx" class="author-card">
              <div class="author-avatar">{{ author.charAt(0).toUpperCase() }}</div>
              <div class="author-info">
                <p class="author-name">{{ author }}</p>
                <p class="author-label">Author {{ idx + 1 }}</p>
              </div>
            </div>
          </div>
          <p v-else class="no-content-note">No author information available.</p>
        </div>

        <!-- Full Document Tab -->
        <div v-if="activeTab === 'document'" class="pdf-viewer-wrap">
          <iframe :src="pdfUrl" class="pdf-iframe" title="Full Research Document" allowfullscreen />
        </div>
      </main>

      <!-- Sidebar: Related Studies -->
      <aside class="recommendations-aside">
        <h3>Related Studies</h3>
        <p class="aside-info">Based on semantic similarity of the study you've picked</p>
        <div class="rec-list">
          <div v-for="rec in recommendations" :key="rec.id" class="rec-card" @click="viewDetail(rec.id)">
            <div class="rec-badges">
              <span class="rec-badge">{{ rec.payload.degree_program || '' }}</span>
            </div>
            <h4>{{ rec.payload.title }}</h4>
            <p>{{ rec.payload.author }} ({{ rec.payload.year }})</p>
            <div class="score">Match: {{ (rec.score * 100).toFixed(0) }}%</div>
          </div>
          <div v-if="recommendations.length === 0" class="no-recs">
            No related studies found yet.
          </div>
        </div>
      </aside>
    </div>
  </div>
  <div v-else-if="loading" class="loading-full">
    Loading paper details...
  </div>
</template>

<style scoped>
.detail-page {
  background: #f9fafb;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, sans-serif;
}

.paper-header-wrap {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding-top: 1.25rem;
  padding-bottom: 2rem;
}

/* ── Breadcrumb inside header-wrap ───────────────────────────── */
.paper-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 1.75rem;
}

.bc-link {
  font-size: 0.8rem;
  font-weight: 500;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  transition: color 0.15s;
}

.bc-link:hover {
  color: #00a651;
}

.bc-sep {
  color: #d1d5db;
}

.bc-active {
  font-size: 0.8rem;
  font-weight: 700;
  color: #374151;
}

.paper-header-inner {
  max-width: 1300px;
  margin: 0 auto;
}

.detail-layout {
  display: flex;
  max-width: 1300px;
  margin: 0 auto;
  padding: 2rem 2rem;
  gap: 2rem;
  align-items: flex-start;
}

.paper-main {
  flex: 1 1 0;
  min-width: 0;
}

/* Header Badges */
.header-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-dept {
  background: #f0fdf4;
  color: #059669;
}

.badge-type {
  background: #eff6ff;
  color: #2563eb;
}

.badge-degree {
  background: #fff7ed;
  color: #c2410c;
}

.paper-header-inner h1 {
  font-size: 2rem;
  margin: 0 0 1.2rem 0;
  line-height: 1.25;
  color: #111;
  font-weight: 800;
}

.metadata-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  color: #555;
  margin-bottom: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
}

/* Engagement Row */
.engagement-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #f3f4f6;
  color: #555;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
}

.cite-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #10b981;
  color: white;
  border: none;
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.cite-btn:hover:not(:disabled) {
  background: #059669;
}

.cite-btn.cited {
  background: #d1fae5;
  color: #065f46;
  cursor: default;
}

.cite-btn.loading {
  opacity: 0.6;
  cursor: wait;
}

.cite-hint {
  font-size: 0.8rem;
  color: #999;
}

.divider {
  display: none;
}

/* Paper Sections */
.paper-section {
  margin-bottom: 2rem;
}

.paper-section h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  color: #1a3a6c;
  margin-bottom: 0.85rem;
  font-weight: 700;
}

.body-text {
  line-height: 1.85;
  color: #444;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  text-align: justify;
}

.read-more-btn {
  background: none;
  border: none;
  color: #10b981;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-top: 0.25rem;
}

.read-more-btn:hover {
  text-decoration: underline;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #fff;
  border: 1px solid #ddd;
  padding: 0.35rem 0.7rem;
  border-radius: 4px;
  font-size: 0.82rem;
  color: #555;
}

/* Document Tabs */
.doc-tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 1.75rem;
}

.doc-tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.1rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: #6b7280;
  transition: color 0.15s, border-color 0.15s;
  border-radius: 6px 6px 0 0;
}

.doc-tab:hover {
  color: #111;
}

.doc-tab.active {
  color: #10b981;
  border-bottom-color: #10b981;
  background: #f0fdf4;
}

/* PDF Iframe */
.pdf-viewer-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #f3f4f6;
}

.pdf-iframe {
  width: 100%;
  height: 80vh;
  border: none;
  display: block;
}

.preview-notice {
  background: #fafafa;
  border: 1px dashed #ddd;
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.preview-notice p {
  font-size: 0.88rem;
  color: #777;
  margin: 0;
}

/* Recommendations Sidebar */
.recommendations-aside {
  width: 280px;
  flex-shrink: 0;
}

.recommendations-aside h3 {
  margin-bottom: 0.25rem;
  font-size: 1rem;
  color: #111;
}

.aside-info {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 1.5rem;
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rec-card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: border-color 0.15s;
}

.rec-card:hover {
  border-color: #10b981;
}

.rec-badges {
  margin-bottom: 0.4rem;
}

.rec-badge {
  background: #fff7ed;
  color: #c2410c;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  text-transform: uppercase;
}

.rec-card h4 {
  font-size: 0.88rem;
  margin: 0 0 0.4rem 0;
  line-height: 1.4;
  color: #222;
}

.rec-card p {
  font-size: 0.78rem;
  color: #777;
  margin-bottom: 0.6rem;
}

.score {
  font-size: 0.7rem;
  font-weight: 700;
  color: #059669;
}

.loading-full {
  display: flex;
  height: 50vh;
  align-items: center;
  justify-content: center;
  color: #888;
}

.no-recs {
  font-size: 0.85rem;
  color: #999;
  text-align: center;
  padding: 2rem;
}

/* ── Hybrid IMRAD section ──────────────────────────────────────── */
.imrad-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.imrad-section-header h3 {
  margin: 0;
}

.view-pages-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  border: 1.5px solid #d1d5db;
  background: white;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.view-pages-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

.view-pages-btn.active {
  background: #f0fdf4;
  border-color: #10b981;
  color: #059669;
}

/* Extracted text wrapper */
/* Outer wrapper: holds the ripple, no overflow clipping */
.section-text-outer {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 8px;
}

/* Ripple ring — sits on outer wrapper so overflow:auto can't clip it */
.section-text-outer::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 8px;
  border: 1.5px solid rgba(16, 185, 129, 0.7);
  animation: border-ripple 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes border-ripple {
  0% {
    inset: -1px;
    border-color: rgba(16, 185, 129, 0.7);
    opacity: 1;
  }

  100% {
    inset: -14px;
    border-color: rgba(16, 185, 129, 0);
    opacity: 0;
  }
}

/* Inner box: the actual scrollable text area */
.section-text-wrap {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  max-height: 480px;
  overflow-y: auto;
  position: relative;
  z-index: 2;
}

/* Extracted text — pre preserves paragraphs, wraps long lines */
.section-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.97rem;
  line-height: 1.9;
  color: #374151;
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  text-align: justify;
}

.no-content-note {
  color: #aaa;
  font-style: italic;
  font-size: 0.9rem;
}

/* Page viewer */
.section-pages-viewer {
  margin-top: 1.25rem;
  border-top: 2px dashed #e5e7eb;
  padding-top: 1.25rem;
}

.pages-loading,
.pages-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #888;
  font-size: 0.9rem;
  padding: 1rem 0;
}

.pages-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
}

.page-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0.4rem 0.75rem;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.page-img {
  width: 100%;
  display: block;
}

/* Spinner animation */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* ── Left Document Content sidebar ──────────────────────────── */
.doc-content-aside {
  width: 190px;
  flex-shrink: 0;
  position: sticky;
  top: 4.5rem;
  align-self: flex-start;
}

.doc-content-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #9ca3af;
  margin: 0 0 0.4rem 0.5rem;
}

.doc-content-nav {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.dcn-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.45rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.dcn-item:hover {
  background: #f3f4f6;
  color: #111;
}

.dcn-item.active {
  background: #f0fdf4;
  color: #059669;
  font-weight: 700;
}

/* ── Authors tab ─────────────────────────────────────────────── */
.authors-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.author-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.author-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111;
  margin: 0 0 0.15rem 0;
}

.author-label {
  font-size: 0.78rem;
  color: #9ca3af;
  margin: 0;
}

/* ── Tablet (≤768px) ─────────────────────────────────────────── */
@media (max-width: 768px) {
  .detail-layout {
    flex-direction: column;
    padding: 1.5rem 1.25rem;
    gap: 2rem;
  }

  .doc-content-aside {
    display: none;
  }

  .recommendations-aside {
    width: 100%;
  }

  .paper-header-inner h1 {
    font-size: 1.6rem;
  }
}

/* ── Phone (≤480px) — Primary Android target 360–412px ───────── */
@media (max-width: 480px) {
  .detail-layout {
    padding: 1rem;
    gap: 1.5rem;
  }

  .paper-header-inner h1 {
    font-size: 1.3rem;
  }

  .metadata-grid {
    gap: 0.75rem 1rem;
  }

  .engagement-row {
    gap: 0.5rem;
  }

  .recommendations-aside {
    width: 100%;
  }

  .rec-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .body-text {
    font-size: 0.95rem;
    line-height: 1.75;
  }

  .paper-section h3 {
    font-size: 0.98rem;
  }
}
</style>
