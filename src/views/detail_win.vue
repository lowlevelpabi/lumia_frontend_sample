<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { Calendar, User, FileText, BookOpen, Eye, Award, CheckCircle, Sparkles, TrendingUp, Loader2, ChevronRight, Columns } from 'lucide-vue-next'
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
// 'rad' is a virtual tab key used only internally when RAD is combined —
// it maps to the 'results' field on Paper (both fields are identical when combined)
type TabKey = 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'rad' | 'authors' | 'document' | 'imrad'
const activeTab = ref<TabKey>('abstract')
const pdfUrl = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
  return paper.value ? `${base}/papers/${paper.value.id}/pdf` : ''
})

// ── RAD combined detection ────────────────────────────────────────────────────
// The backend stores identical text in both results + discussion when combined.
// Must be defined BEFORE IMRAD_SECTION_CONFIGS which depends on it.
const isRadCombined = computed(() => {
  if (!paper.value) return false
  const r = paper.value.results
  const d = paper.value.discussion
  return !!(r && d && r.trim() === d.trim())
})


// Resolve virtual 'rad' key → actual Paper field key ('results')
// Use this everywhere we access paper[key] or sectionPageCache[key]
const resolveKey = (key: string): 'introduction' | 'methods' | 'results' | 'discussion' =>
  key === 'rad' ? 'results' : key as 'introduction' | 'methods' | 'results' | 'discussion'

// IMRAD section config — computed so it reacts to combined/split mode
type SectionCfg = { key: TabKey; label: string; summaryKey: keyof Paper }
const IMRAD_SECTION_CONFIGS = computed((): SectionCfg[] => {
  return [
    { key: 'introduction', label: 'Introduction', summaryKey: 'introduction_summary' },
    { key: 'methods', label: 'Methodology', summaryKey: 'methods_summary' },
    { key: 'rad', label: 'Results and Discussion', summaryKey: 'results_summary' },
  ]
})

// Parse summary text into labelled sub-sections (split on lines that look like headings)
const parseSummaryBlocks = (text: string): { heading: string; body: string }[] => {
  if (!text) return []
  const lines = text.split('\n')
  const blocks: { heading: string; body: string }[] = []
  let current: { heading: string; body: string } | null = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // A heading line: short (≤80 chars), no sentence-ending punctuation, followed by body text
    const isHeading = trimmed.length <= 80 && !trimmed.endsWith('.') && !trimmed.endsWith(',') && /^[A-Z]/.test(trimmed) && !/[a-z]{20,}/.test(trimmed)
    if (isHeading && lines.indexOf(line) < lines.length - 1) {
      if (current) blocks.push(current)
      current = { heading: trimmed, body: '' }
    } else {
      if (!current) current = { heading: '', body: '' }
      current.body += (current.body ? ' ' : '') + trimmed
    }
  }
  if (current) blocks.push(current)
  return blocks.filter(b => b.body.trim())
}


const showFullAbstract = ref(false)
const ABSTRACT_PREVIEW_LIMIT = 400

const loadPaperData = async (id: string) => {
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


onMounted(() => { loadPaperData(String(route.params.id)) })
watch(() => route.params.id, (newId) => { if (newId) loadPaperData(String(newId)) })

const goBack = () => router.back()
const viewDetail = (id: string) => router.push({ name: 'detail', params: { id } })

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

// ── IMRAD structured rendering ────────────────────────────────────────────────
// The backend pre-parses flat text into typed blocks via imrad_structure_service.
// We just render them here — no client-side regex or label lists needed.

import type { ImradBlock } from '../services/api'

// Get structured blocks for a section key, falling back to an empty array.
// Resolves the virtual 'rad' key → 'results' (combined RAD documents).
const getStructuredBlocks = (key: string): ImradBlock[] => {
  if (!paper.value?.imrad_structured) return []
  if (key === 'rad') {
    const r = paper.value.imrad_structured.results ?? []
    const d = paper.value.imrad_structured.discussion ?? []
    // If they are identical (backend combined them), just return one
    if (isRadCombined.value) return r
    // Otherwise concatenate
    return [...r, ...d]
  }
  return paper.value.imrad_structured[key as keyof typeof paper.value.imrad_structured] ?? []
}

// Whether a section has structured blocks available from the backend
const hasStructured = (key: string): boolean => getStructuredBlocks(key).length > 0


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
          <span v-else class="cite-hint">Sign in with your student account to cite this study</span>
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
          <!-- RAD: combined tab or separate tabs depending on document type -->
          <button v-if="paper.results || paper.discussion" class="aside-item"
            :class="{ active: activeTab === 'rad' || activeTab === 'results' || activeTab === 'discussion' }"
            @click="activeTab = 'rad'">
            Results and Discussion
          </button>

          <button
            v-if="paper.introduction_summary || paper.methods_summary || paper.results_summary || paper.discussion_summary"
            class="aside-item aside-item-imrad" :class="{ active: activeTab === 'imrad' }" @click="activeTab = 'imrad'">
            IMRAD Format
            <span class="imrad-new-tag">NEW</span>
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
        <div class="doc-tabs" v-if="activeTab !== 'imrad'">
          <button class="doc-tab" :class="{ active: activeTab === 'abstract' }"
            @click="activeTab = 'abstract'">Abstract</button>
          <button v-if="paper.introduction" class="doc-tab" :class="{ active: activeTab === 'introduction' }"
            @click="activeTab = 'introduction'">Introduction</button>
          <button v-if="paper.methods" class="doc-tab" :class="{ active: activeTab === 'methods' }"
            @click="activeTab = 'methods'">Methods</button>
          <!-- RAD merged tab or split tabs -->
          <button v-if="paper.results || paper.discussion" class="doc-tab"
            :class="{ active: activeTab === 'rad' || activeTab === 'results' || activeTab === 'discussion' }"
            @click="activeTab = 'rad'">
            Results and Discussion
          </button>
        </div>

        <!-- ── IMRAD availability notice banner ───────────────── -->
        <div
          v-if="activeTab !== 'imrad' && (paper.introduction_summary || paper.methods_summary || paper.results_summary || paper.discussion_summary)"
          class="imrad-avail-banner" @click="activeTab = 'imrad'">
          <span class="imrad-avail-tag">NOTICE</span>
          <span class="imrad-avail-text"><strong>IMRAD Format</strong> is available for this study.</span>
          <span class="imrad-avail-cta">Take me there →</span>
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
                :to="{ name: 'explore', query: { q: tag.trim() } }" class="tag">{{ tag.trim() }}</RouterLink>
            </div>
          </section>
        </div>

        <!-- ── IMRAD Sections — Regular per-tab view ──────────── -->
        <template v-if="activeTab !== 'imrad'">
          <template v-for="cfg in IMRAD_SECTION_CONFIGS" :key="cfg.key">
            <section v-if="activeTab === cfg.key" class="paper-section">

              <h3 class="section-heading">
                <BookOpen v-if="cfg.key === 'introduction'" :size="15" />
                <Sparkles v-else-if="cfg.key === 'methods'" :size="15" />
                <TrendingUp v-else :size="15" />
                {{ cfg.label }}
              </h3>

              <!-- Section text — rendered from pre-structured backend blocks -->
              <div v-if="hasStructured(cfg.key)" class="section-text-outer">
                <div class="section-text-wrap">
                  <div class="section-text">
                    <template v-for="(block, i) in getStructuredBlocks(cfg.key)" :key="i">
                      <div v-if="block.type === 'subheading'" class="section-subheading">{{ block.text }}</div>
                      <span v-else class="section-text-block">{{ block.text }}</span>
                    </template>
                  </div>
                </div>
              </div>
              <div v-else-if="paper[resolveKey(cfg.key)]" class="section-text-outer">
                <div class="section-text-wrap">
                  <div class="section-text">
                    {{ paper[resolveKey(cfg.key)] }}
                    <template v-if="cfg.key === 'rad' && paper.discussion && !isRadCombined">
                      <br><br>
                      {{ paper.discussion }}
                    </template>
                  </div>
                </div>
              </div>
              <p v-else class="no-content">No extracted text available for this section.</p>
            </section>
          </template>
        </template>

        <!-- ── IMRAD View — All sections, 2-column layout ──────── -->
        <div v-if="activeTab === 'imrad'" class="imrad-full-view">

          <!-- Top bar -->
          <div class="imrad-full-bar">
            <div class="imrad-full-bar-left">
              <Columns :size="15" />
              <span>IMRAD Format</span>
              <span class="imrad-full-hint">Introduction summarized · Methods, Results &amp; Discussion in full</span>
            </div>
          </div>

          <!-- ONE unified 2-column flow — all sections, no section-level gaps -->
          <div class="imrad-unified-wrap">
            <div class="imrad-unified-col">
              <template v-for="cfg in IMRAD_SECTION_CONFIGS" :key="cfg.key">
                <div class="imrad-col-block imrad-section-label">
                  <div class="imrad-full-section-head">
                    <span>{{ cfg.label }}</span>
                  </div>
                </div>

                <!-- Introduction: show summary (parsed into heading blocks) -->
                <template v-if="cfg.key === 'introduction'">
                  <template v-if="paper[cfg.summaryKey]">
                    <div v-for="(block, idx) in parseSummaryBlocks(paper[cfg.summaryKey] as string)" :key="idx"
                      class="imrad-col-block">
                      <p v-if="block.heading" class="imrad-block-heading">{{ block.heading }}</p>
                      <p class="imrad-block-body">{{ block.body }}</p>
                    </div>
                  </template>
                  <div v-else class="imrad-col-block imrad-no-summary">
                    <p>No introduction summary available.</p>
                  </div>
                </template>

                <!-- Methods, Results, Discussion: structured blocks from backend -->
                <template v-else>
                  <div v-if="hasStructured(cfg.key)" class="imrad-col-block imrad-raw-block">
                    <template v-for="(block, i) in getStructuredBlocks(cfg.key)" :key="i">
                      <div v-if="block.type === 'subheading'" class="imrad-inline-subheading">{{ block.text }}</div>
                      <p v-else class="imrad-block-body imrad-raw-para">{{ block.text }}</p>
                    </template>
                  </div>
                  <div v-else-if="paper[resolveKey(cfg.key)]" class="imrad-col-block imrad-raw-block">
                    <p class="imrad-block-body imrad-raw-para">{{
                      paper[resolveKey(cfg.key)] }}</p>
                    <template v-if="cfg.key === 'rad' && paper.discussion && !isRadCombined">
                      <p class="imrad-block-body imrad-raw-para">
                        {{ paper.discussion }}
                      </p>
                    </template>
                  </div>
                  <div v-else class="imrad-col-block imrad-no-summary">
                    <p>No extracted text available for this section.</p>
                  </div>
                </template>

              </template>
            </div>
          </div>
        </div>

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

        <div v-if="recommendations.length > 0" class="rec-list">
          <div v-for="rec in recommendations" :key="rec.id" class="rec-card" @click="viewDetail(rec.id)">
            <span v-if="rec.payload.degree_program" class="rec-badge">{{ rec.payload.degree_program }}</span>
            <p class="rec-title">{{ rec.payload.title }}</p>
            <p class="rec-meta">{{ rec.payload.author }} · {{ rec.payload.year }}</p>
            <div class="rec-score">{{ (rec.score * 100).toFixed(0) }}% match</div>
          </div>
        </div>

        <div v-else class="rec-empty">
          <img src="/book_empty.ico" alt="Empty" class="rec-empty-icon" />
          <p>No related studies found.</p>
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
  max-width: 1600px;
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
  max-width: 1600px;
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



/* Section text */
.section-text-outer {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 6px;
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
  margin-bottom: 2.25rem;
}

.section-text {
  word-break: break-word;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.96rem;
  line-height: 1.9;
  color: var(--ink-2);
  margin: 0;
  padding: 0;
  background: none;
  text-align: justify;
  border: none;
}

/* Sub-heading line — merged into text flow with green left bar */
.section-subheading {
  display: block;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--green-dk);
  background: var(--green-dim);
  border-left: 3px solid var(--green);
  padding: 0.3rem 0.75rem;
  border-radius: 0 4px 4px 0;
  margin: 1rem 0 0.25rem;
}

/* Table / Figure caption label — amber bar */
.section-table-label {
  display: block;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  font-style: italic;
  color: #92400e;
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  padding: 0.25rem 0.75rem;
  border-radius: 0 4px 4px 0;
  margin: 0.75rem 0 0.2rem;
}

/* Plain paragraph block between sub-headings — flows as prose, no forced breaks */
.section-text-block {
  word-break: break-word;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.96rem;
  line-height: 1.9;
  color: var(--ink-2);
  margin: 0 0 0.25rem;
  padding: 0;
  background: none;
  border: none;
  text-align: justify;
  white-space: normal;
}

/* ── IMRAD full view — inline subheading / table label ──────── */
.imrad-raw-block {
  padding: 0;
}

.imrad-inline-subheading {
  display: block;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--green-dk);
  background: var(--green-dim);
  border-left: 3px solid var(--green);
  padding: 0.25rem 0.6rem;
  border-radius: 0 4px 4px 0;
  margin: 0.75rem 0 0.2rem;
}

.imrad-inline-table-label {
  display: block;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  font-style: italic;
  color: #92400e;
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  padding: 0.2rem 0.6rem;
  border-radius: 0 4px 4px 0;
  margin: 0.5rem 0 0.15rem;
}

.imrad-raw-para {
  white-space: normal;
  word-break: break-word;
  font-size: 0.88rem;
  line-height: 1.8;
  color: var(--ink-2);
  margin: 0 0 0.4rem;
  text-align: justify;
}

.no-content {
  font-size: 0.84rem;
  color: var(--ink-3);
  font-style: italic;
}

/* Pages viewer */

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
.rad-toggle-btn {
  font-size: 0.72rem;
  padding: 0.25rem 0.6rem;
  background: var(--green-dim, #e6f4ed);
  color: var(--green-dk, #007d3d);
  border: 1px solid var(--green, #00a651);
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.rad-toggle-btn:hover {
  background: var(--green, #00a651);
  color: #fff;
}

.rad-split-inline-btn {
  font-size: 0.65rem;
  padding: 0.15rem 0.45rem;
  background: transparent;
  color: var(--green-dk, #007d3d);
  border: 1px solid var(--green, #00a651);
  border-radius: 3px;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.15s;
}

.rad-split-inline-btn:hover {
  background: var(--green-dim, #e6f4ed);
}

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

/* ── IMRAD "NEW" tag on sidebar button ───────────────── */
.imrad-new-tag {
  margin-left: auto;
  background: #e63946;
  color: #fff;
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  text-transform: uppercase;
  flex-shrink: 0;
  line-height: 1.4;
}

/* ── IMRAD availability banner ────────────────────────── */
.imrad-avail-banner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 1rem;
  margin-bottom: 1rem;
  background: var(--green-dim);
  border: 1.5px solid var(--green);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.imrad-avail-banner:hover {
  background: #c8ecd9;
  border-color: var(--green-dk);
}

.imrad-avail-tag {
  background: var(--green);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.imrad-avail-text {
  font-size: 0.82rem;
  color: var(--green-dk);
  flex: 1;
  line-height: 1.4;
}

.imrad-avail-cta {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--green-dk);
  white-space: nowrap;
  flex-shrink: 0;
}

/* IMRAD Summary top tab — subtle accent */
.doc-tab-imrad {
  color: var(--green-dk);
}

.doc-tab-imrad.active {
  color: var(--green-dk);
  border-bottom-color: var(--green);
}

/* ── IMRAD summary shortcut in sidebar ────────────────── */
.aside-item-imrad {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  border-top: 1px dashed var(--rule);
  padding-top: 0.65rem;
  color: var(--green-dk);
  font-weight: 600;
}

.aside-item-imrad.active {
  background: var(--green-dim);
  color: var(--green-dk);
}

.aside-item-imrad:hover:not(.active) {
  background: var(--surface);
  color: var(--green-dk);
}

.aside-imrad-icon {
  flex-shrink: 0;
  opacity: 0.75;
}

/* ── IMRAD view toggle + 2-column layout ──────────────── */

.imrad-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.view-toggle {
  display: inline-flex;
  border: 1.5px solid var(--rule);
  border-radius: 6px;
  overflow: hidden;
  background: var(--paper);
}

.toggle-opt {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.7rem;
  background: none;
  border: none;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  transition: background 0.13s, color 0.13s;
  white-space: nowrap;
}

.toggle-opt+.toggle-opt {
  border-left: 1.5px solid var(--rule);
}

.toggle-opt:hover {
  background: var(--surface);
  color: var(--ink);
}

.toggle-opt.active {
  background: var(--green-dim);
  color: var(--green-dk);
}

/* 2-column flowing layout — content fills columns top-to-bottom, no orphan gaps */
.imrad-two-col-wrap {
  margin-bottom: 1rem;
}

.imrad-two-col {
  columns: 2;
  column-gap: 1.75rem;
  padding: 1.25rem 1.5rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 6px;
  border-top: 3px solid var(--green);
}

.imrad-col-block {
  break-inside: avoid;
  margin-bottom: 1.1rem;
  display: block;
}

.imrad-block-heading {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--green-dk);
  margin: 0 0 0.4rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--green-dim);
}

.imrad-block-body {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.95rem;
  line-height: 1.85;
  /* Reverted to preferred spacing */
  color: #334155;
  margin: 0;
  text-align: justify;
}

.section-text-block {
  display: inline;
  /* Continuous flow */
  font-size: 0.98rem;
  line-height: 1.85;
  color: #334155;
}

/* No summary fallback */
.imrad-no-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1.5rem;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 6px;
  text-align: center;
  color: var(--ink-3);
  font-size: 0.88rem;
}

.imrad-no-summary-icon {
  opacity: 0.35;
  margin-bottom: 0.25rem;
}

.imrad-no-summary-hint {
  font-size: 0.8rem;
  color: var(--ink-3);
  margin: 0;
  max-width: 380px;
}

/* Collapse to single column on narrow screens */
@media (max-width: 640px) {
  .imrad-two-col {
    columns: 1;
  }
}

/* ── IMRAD Full View (all sections at once) ──────────────── */
.imrad-full-view {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.imrad-full-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--hero-bg);
  border-radius: 8px 8px 0 0;
  border-bottom: 2px solid var(--green);
  gap: 1rem;
  flex-wrap: wrap;
}

.imrad-notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  background: #fffbeb;
  border-bottom: 1px solid #f59e0b;
  font-size: 0.78rem;
  color: #92400e;
  line-height: 1.5;
}

.imrad-notice-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: #f59e0b;
}

.imrad-full-bar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  font-weight: 600;
}

.imrad-full-hint {
  font-size: 0.72rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 0.25rem;
}

.toggle-opt.active-green {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.85rem;
  background: var(--green);
  border: none;
  border-radius: 5px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: background 0.13s;
  white-space: nowrap;
}

.toggle-opt.active-green:hover {
  background: var(--green-dk);
}

.imrad-unified-wrap {
  background: var(--paper);
  border-left: 1px solid var(--rule);
  border-right: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  border-radius: 0 0 8px 8px;
}

/* Single unified 2-column flow — all IMRAD content in one container */
.imrad-unified-col {
  columns: 2;
  column-gap: 2rem;
  padding: 1.5rem 1.75rem;
}

/* Section label: keep heading pinned to its first content block */
.imrad-section-label {
  margin-top: 1.25rem;
  break-after: avoid;
}

.imrad-section-label:first-child {
  margin-top: 0;
}

.imrad-full-section-head {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--green-dk);
  margin-bottom: 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1.5px solid var(--green-dim);
}




/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 1200px) {
  .rec-aside {
    display: none;
  }
}

@media (max-width: 1024px) {
  .detail-layout {
    gap: 1.5rem;
  }

  .paper-main {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .detail-layout {
    flex-direction: column;
  }

  .doc-nav-aside {
    width: 100%;
    position: static;
  }

  .imrad-unified-col {
    columns: 1;
  }

  .paper-title {
    font-size: 1.45rem;
  }
}

@media (max-width: 480px) {
  .paper-header-wrap {
    padding: 1.5rem 1rem;
  }

  .header-inner {
    padding: 0;
  }

  .doc-tabs {
    gap: 0.75rem;
  }

  .doc-tab {
    font-size: 0.75rem;
  }
}

.rec-empty {
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  border-radius: 6px;
  margin-top: 1rem;
}

.rec-empty-icon {
  width: 48px;
  height: 48px;
  opacity: 0.40;
  filter: grayscale(1);
}

.rec-empty p {
  font-size: 0.85rem;
  color: var(--ink-3);
  margin: 0;
}
</style>
