<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { Eye, Award, CheckCircle, Loader2, ChevronRight, Copy, Check, X, FileDown, Bookmark, Sparkles, Info } from 'lucide-vue-next'
import { api, type Paper, type SearchResult } from '../services/api'
import { pdfExportService } from '../services/pdf_export_service'

// ── Confidence badge helper ────────────────────────────────────────────────────────
const getConfidence = (score: number): { label: string; cls: string; desc: string } => {
  if (score >= 0.75) return { label: 'Strong Semantic Match', cls: 'badge-strong', desc: 'High degree of conceptual and methodological alignment.' }
  if (score >= 0.50) return { label: 'High Potential Match', cls: 'badge-good', desc: 'Significant overlap in research objectives and findings.' }
  if (score >= 0.35) return { label: 'Related Context', cls: 'badge-related', desc: 'Topical alignment with complementary research themes.' }
  return { label: 'Weak Match', cls: 'badge-related', desc: 'Low direct similarity but shares some contextual keywords.' }
}

const route = useRoute()
const router = useRouter()
const paper = ref<Paper | null>(null)
const recommendations = ref<SearchResult[]>([])
const loading = ref(true)
const activeView = ref<'paper' | 'authors'>('paper')
const activeSection = ref('abstract-section')
let observer: IntersectionObserver | null = null

// Engagement state
const viewCount = ref(0)
const citationCount = ref(0)
const hasCited = ref(false)
const citeLoading = ref(false)
const isBookmarked = ref(false)
const bookmarkLoading = ref(false)
const exportLoading = ref(false)
const { isLoggedIn } = useAuth()

// Citation Modal State
const showCiteModal = ref(false)
const citeModalLoading = ref(false)
const citeModalError = ref(false)
const formattedCitations = ref<{
  apa_6: string
  apa_7: string
  apa_intext: string
} | null>(null)

const apaVariation = ref<'6' | '7' | 'intext'>('6')
const copyStatus = ref<Record<string, boolean>>({})

// Image Zoom Modal State
const showZoomModal = ref(false)
const zoomImgSrc = ref('')

const openZoomModal = (src: string) => {
  zoomImgSrc.value = src
  showZoomModal.value = true
}

const openCiteModal = async () => {
  showCiteModal.value = true
  // Skip re-fetch if we already have data
  if (formattedCitations.value) return
  // Don't retry if already loading
  if (citeModalLoading.value) return

  citeModalError.value = false
  citeModalLoading.value = true
  try {
    const res = await api.getFormattedCitations(String(route.params.id))
    formattedCitations.value = res
  } catch (err) {
    console.error('Failed to load citations:', err)
    citeModalError.value = true
  } finally {
    citeModalLoading.value = false
  }
}

const retryCitations = () => {
  // Reset so openCiteModal will re-fetch
  formattedCitations.value = null
  citeModalError.value = false
  openCiteModal()
}

const copyToClipboard = async (text: string, key: string) => {
  try {
    // Strip HTML tags so the plain-text citation (no <em>) lands on the clipboard
    const plain = text.replace(/<[^>]+>/g, '')
    await navigator.clipboard.writeText(plain)
    copyStatus.value[key] = true
    setTimeout(() => { copyStatus.value[key] = false }, 2000)

    // Auto-vouch if copying a reference for the first time
    if (!hasCited.value && isLoggedIn.value) {
      handleCite()
    }
  } catch (err) {
    console.error('Copy failed:', err)
  }
}



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

// IMRAD section config
type SectionCfg = { key: string; label: string; summaryKey: keyof Paper }
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

        api.getBookmarkStatus(id)
          .then(res => {
            isBookmarked.value = res.is_bookmarked
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


const initScrollObserver = () => {
  if (observer) observer.disconnect()

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    })
  }, {
    // Threshold and margin to detect the section currently near the top
    rootMargin: '-80px 0px -70% 0px',
    threshold: 0
  })

  // Observe all section headers or main section divs
  const sections = document.querySelectorAll('#abstract-section, .journal-section-heading, #references-section')
  sections.forEach(s => observer?.observe(s))
}

onMounted(() => {
  loadPaperData(String(route.params.id))
  initScrollObserver()
})

// Re-init observer if paper data changes or view switches back to paper
watch(paper, () => {
  setTimeout(initScrollObserver, 500)
})

watch(activeView, (newView) => {
  if (newView === 'paper') {
    nextTick(initScrollObserver)
  }
})

watch(() => route.params.id, (newId) => { if (newId) loadPaperData(String(newId)) })

const goBack = () => router.back()
const viewDetail = (id: string) => router.push({ name: 'detail', params: { id } })

const switchToPaper = (sectionId: string) => {
  activeView.value = 'paper'
  activeSection.value = sectionId
  // Small delay to ensure the DOM is visible if using v-show or v-if
  nextTick(() => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

const handleCite = async () => {
  if (!isLoggedIn.value || citeLoading.value || !paper.value) return

  // If already cited, just open the modal to get the reference
  if (hasCited.value) {
    openCiteModal()
    return
  }

  // If not cited, cite it first then open the modal
  await handleToggleCitation()
  if (hasCited.value) {
    openCiteModal()
  }
}

const handleToggleCitation = async () => {
  if (!isLoggedIn.value || citeLoading.value || !paper.value) return
  citeLoading.value = true
  try {
    const res = await api.citePaper(paper.value!.id)
    hasCited.value = res.has_cited
    citationCount.value = res.citation_count
  } catch (err) {
    console.error('Citation toggle failed:', err)
  } finally {
    citeLoading.value = false
  }
}

const handleBookmark = async () => {
  if (!isLoggedIn.value || bookmarkLoading.value || !paper.value) return
  bookmarkLoading.value = true
  try {
    const res = await api.bookmarkPaper(paper.value.id)
    isBookmarked.value = res.is_bookmarked
  } catch (err) {
    console.error('Bookmark failed:', err)
  } finally {
    bookmarkLoading.value = true
    // Mini delay for better feel
    setTimeout(() => { bookmarkLoading.value = false }, 400)
  }
}

const handleDownloadPDF = async () => {
  if (!paper.value || exportLoading.value) return

  // Auto-cite on download if not already cited (as per panel recommendation)
  if (isLoggedIn.value && !hasCited.value) {
    handleToggleCitation()
  }

  exportLoading.value = true
  try {
    await pdfExportService.downloadPaper(paper.value)
  } catch (err) {
    console.error('Export failed:', err)
    alert('Failed to generate PDF. Please try again.')
  } finally {
    exportLoading.value = false
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

// Strip any [[TABLE_IMAGE:X]] or [TABLE_IMAGE:X] markers from raw text
// Used in the fallback path for older papers without structured data
const stripMarkers = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/\[{1,2}(?:TABLE|FIGURE)_IMAGE:.*?\]{1,2}/gi, '')
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── References helpers ────────────────────────────────────────────────────────

// Parse the flat references string into individual entries.
// The backend's _postprocess_references() separates entries with blank lines.
// We fall back to splitting on common citation markers for older records.
const parsedReferences = computed((): string[] => {
  if (!paper.value?.references) return []
  const raw = paper.value.references.trim()

  // Primary: blank-line separation (output of _postprocess_references)
  const byBlankLine = raw.split(/\n\n+/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
  if (byBlankLine.length > 1) return byBlankLine

  // Fallback A: IEEE-style numeric markers [1] [2] ...
  const byIEEE = raw.split(/(?=\[\d+\])/).map(s => s.trim()).filter(Boolean)
  if (byIEEE.length > 1) return byIEEE

  // Fallback B: numbered list "1. " "2. " ...
  const byNumbered = raw.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
  if (byNumbered.length > 1) return byNumbered

  // Last resort: treat the whole string as one entry
  return [raw]
})

// Turn DOIs and bare URLs inside a reference entry into clickable links.
/**
 * formatReferenceEntry
 * --------------------
 * Renders a single APA reference entry with semantic HTML so it matches the
 * target visual style (bold authors, italic title/journal, live DOI links).
 *
 * Parsing strategy (handles APA 6th / 7th and IEEE numeric styles):
 *   1. Author block  — everything up to the first "(YEAR)" token
 *   2. Year          — the (YEAR) token itself
 *   3. Rest          — title + source + DOI/URL, split further heuristically
 *
 * Falls back to plain text + linkification for entries that don't match.
 */
const formatReferenceEntry = (raw: string): string => {
  // ── 0. HTML-escape the raw string to prevent XSS ──────────────────────
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // ── 1. Linkify URLs and bare DOIs (operates on already-escaped text) ──
  const linkify = (s: string): string => {
    // URLs
    let out = s.replace(
      /https?:\/\/[^\s,)\]&]+/g,
      url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="ref-link">${url}</a>`
    )
    // bare doi: 10.xxx not already inside an href
    out = out.replace(
      /(?<!href=")(?:doi:\s*)(10\.[^\s,)\]&]+)/gi,
      (_, doi) =>
        `doi: <a href="https://doi.org/${doi}" target="_blank" rel="noopener noreferrer" class="ref-link">${doi}</a>`
    )
    return out
  }

  const escapedRaw = esc(raw)

  // ── 2. Try to detect APA format: "Authors. (Year). Title. Source." ────
  //   Match the first (4-digit year) or (Year, Month) parenthetical
  const yearMatch = escapedRaw.match(/^(.*?)\((\d{4}[a-z]?(?:,\s*[A-Z][a-z]+)?)\)\.\s*(.*)$/s)

  if (yearMatch) {
    const authorBlock = (yearMatch[1] ?? '').trim().replace(/\.$/, '').trim()
    const year = yearMatch[2] ?? ''
    const remainder = (yearMatch[3] ?? '').trim()

    // Split remainder into title vs. source at the first ". " that follows
    // a lowercase letter or closing paren/bracket — heuristic boundary.
    // Title ends at the first period that is followed by a space + capital or digit.
    const titleSourceMatch = remainder.match(/^(.*?[.!?])\s+([A-Z\d*(].*)$/s)

    let titleHtml = ''
    let sourceHtml = ''

    if (titleSourceMatch) {
      // Title: strip trailing period for display, render in italics
      const titleText = (titleSourceMatch[1] ?? '').replace(/\.$/, '').trim()
      const sourceText = (titleSourceMatch[2] ?? '').trim()

      titleHtml = `<em class="ref-title">${titleText}.</em> `
      sourceHtml = linkify(sourceText)
    } else {
      // Can't split — treat the whole remainder as title
      titleHtml = `<em class="ref-title">${linkify(remainder)}</em>`
    }

    return (
      `<span class="ref-authors">${esc(authorBlock)}.</span> ` +
      `<span class="ref-year">(${year}).</span> ` +
      titleHtml +
      sourceHtml
    )
  }

  // ── 3. IEEE numeric  [1] Authors, "Title," Journal, … ─────────────────
  const ieeeMatch = escapedRaw.match(/^(\[\d+\])\s+(.*)$/s)
  if (ieeeMatch) {
    return (
      `<span class="ref-number">${ieeeMatch[1] ?? ''}</span> ` +
      linkify(ieeeMatch[2] ?? '')
    )
  }

  // ── 4. Numbered list  1. Authors … ────────────────────────────────────
  const numMatch = escapedRaw.match(/^(\d+\.)\s+(.*)$/s)
  if (numMatch) {
    return (
      `<span class="ref-number">${numMatch[1] ?? ''}</span> ` +
      linkify(numMatch[2] ?? '')
    )
  }

  // ── 5. Fallback: plain linkified text ─────────────────────────────────
  return linkify(escapedRaw)
}

// ── Inverted Pyramid Title ─────────────────────────────────────────────────────
// Splits a title into lines where each line is shorter than the previous,
// producing a top-heavy inverted pyramid shape regardless of title length.
const pyramidTitleLines = computed((): string[] => {
  const title = paper.value?.title
  if (!title) return []

  const words = title.trim().split(/\s+/)
  const total = words.length

  // Very short titles: single line
  if (total <= 3) return [words.join(' ')]

  const charLen = title.length

  // FIX: Base the number of lines on character length instead of word count.
  // This breaks longer titles into more lines, preventing the top line
  // from exceeding the container width and triggering a CSS wrap.
  const numLines = charLen <= 45 ? 2 : charLen <= 80 ? 3 : charLen <= 115 ? 4 : 5

  // Strategy: greedily fill each line up to a shrinking character budget.
  const shareWeights: number[] = []
  for (let i = numLines; i >= 1; i--) shareWeights.push(i)
  const shareSum = shareWeights.reduce((a, b) => a + b, 0)

  // Character budgets per line (descending)
  const budgets = shareWeights.map(w => Math.floor((w / shareSum) * charLen))

  const lines: string[] = []
  let wi = 0 // word index

  for (let li = 0; li < numLines; li++) {
    if (wi >= total) break
    const remaining = numLines - li - 1
    const wordsLeft = total - wi

    // Last line: take all remaining words
    if (li === numLines - 1 || wordsLeft <= remaining) {
      lines.push(words.slice(wi).join(' '))
      wi = total
      break
    }

    const budget = budgets[li]
    if (budget === undefined) break

    // Greedily add words while under budget, but always leave at least
    // 1 word per remaining line
    let count = 0
    let len = 0
    while (wi + count < total - remaining) {
      const word = words[wi + count]
      if (!word) break

      const wordLen = word.length + (count > 0 ? 1 : 0)
      if (count > 0 && len + wordLen > budget) break
      len += wordLen
      count++
    }
    count = Math.max(1, count)
    lines.push(words.slice(wi, wi + count).join(' '))
    wi += count
  }

  return lines.filter(l => l.length > 0)
})

</script>

<template>
  <div class="detail-page" v-if="!loading && paper">



    <!-- ══ PAGE LAYOUT ════════════════════════════════════════════ -->
    <div class="journal-page-layout">

      <!-- ── Left Sidebar: Study Navigation ── -->
      <aside class="journal-toc">
        <div class="toc-inner">
          <p class="toc-label">Available Sections</p>
          <nav class="toc-list">
            <a href="#abstract-section" class="toc-item"
              :class="{ active: activeView === 'paper' && activeSection === 'abstract-section' }"
              @click.prevent="switchToPaper('abstract-section')">
              <span class="toc-bullet"></span>
              Abstract
            </a>
            <a v-for="cfg in IMRAD_SECTION_CONFIGS" :key="cfg.key" :href="'#' + cfg.key + '-section'" class="toc-item"
              :class="{ active: activeView === 'paper' && activeSection === cfg.key + '-section' }"
              @click.prevent="switchToPaper(cfg.key + '-section')">
              <span class="toc-bullet"></span>
              {{ cfg.label }}
            </a>
            <a v-if="parsedReferences.length > 0" href="#references-section" class="toc-item"
              :class="{ active: activeView === 'paper' && activeSection === 'references-section' }"
              @click.prevent="switchToPaper('references-section')">
              <span class="toc-bullet"></span>
              References
            </a>

            <!-- Authors Toggle -->
            <div class="toc-divider"></div>
            <button class="toc-item" :class="{ active: activeView === 'authors' }" @click="activeView = 'authors'">
              <span class="toc-bullet"></span>
              Authors
            </button>
          </nav>
        </div>
      </aside>

      <div class="journal-main-col">
        <transition name="view-fade" mode="out-in">
          <!-- ── Main Journal Paper ── -->
          <div v-if="activeView === 'paper'" class="journal-paper-wrap" key="paper">
            <!-- Breadcrumb relocated from topbar -->
            <nav class="breadcrumb detail-breadcrumb">
              <RouterLink :to="{ name: 'home' }" class="bc-link">Home</RouterLink>
              <ChevronRight :size="12" class="bc-sep" />
              <button @click="goBack" class="bc-link">Results</button>
              <ChevronRight :size="12" class="bc-sep" />
              <span class="bc-active">{{ paper.title.length > 55 ? paper.title.substring(0, 55) + '…' : paper.title
                }}</span>
            </nav>

            <article class="imrad-journal-page">

              <!-- ── Journal Header (Title / Authors / Abstract) ── -->
              <header class="journal-header">

                <div class="journal-meta-top">
                  <span class="journal-badge">{{ paper.department }}</span>
                  <span class="journal-badge journal-badge-type">{{ paper.project_type }}</span>
                  <span v-if="paper.degree_program !== 'N/A'" class="journal-badge journal-badge-degree">{{
                    paper.degree_program }}</span>
                </div>

                <h1 class="journal-title">
                  <span v-for="(line, i) in pyramidTitleLines" :key="i" class="journal-title-line">{{ line }}</span>
                </h1>

                <div class="journal-authors">
                  <span v-for="(author, idx) in authorList" :key="idx" class="journal-author">
                    {{ author }}<span class="author-sep"> · </span>
                  </span>
                  <span class="journal-author">Year: {{ paper.year }}</span>
                </div>

                <div class="journal-stats">
                  <span class="j-stat">
                    <Eye :size="12" /> {{ viewCount.toLocaleString() }} views
                  </span>
                  <span class="j-stat">
                    <Award :size="12" /> {{ citationCount.toLocaleString() }} citations
                  </span>

                  <button v-if="isLoggedIn" class="j-cite-btn" :class="{ cited: hasCited }" :disabled="citeLoading"
                    @click="handleCite">
                    <CheckCircle v-if="hasCited" :size="13" />
                    <Award v-else :size="13" />
                    {{ hasCited ? 'Cited (Get Ref)' : citeLoading ? 'Citing…' : 'Cite this study' }}
                  </button>
                  <span v-else class="j-login-hint">Sign in to cite this study</span>

                  <button v-if="isLoggedIn" class="j-bookmark-btn" :class="{ bookmarked: isBookmarked }"
                    :disabled="bookmarkLoading" @click="handleBookmark">
                    <Loader2 v-if="bookmarkLoading" :size="13" class="spin" />
                    <Bookmark v-else :size="13" :fill="isBookmarked ? 'currentColor' : 'none'" />
                    {{ isBookmarked ? 'Bookmarked' : 'Bookmark' }}
                  </button>

                  <button class="j-download-btn" :disabled="exportLoading" @click="handleDownloadPDF">
                    <Loader2 v-if="exportLoading" :size="13" class="spin" />
                    <FileDown v-else :size="13" />
                    {{ exportLoading ? 'Generating PDF…' : 'Download PDF' }}
                  </button>
                </div>

                <!-- Plain Abstract -->
                <div id="abstract-section" class="journal-abstract-plain">
                  <span class="journal-abstract-label">Abstract</span>
                  <p class="journal-abstract-text">{{ paper.abstract }}</p>
                  <div v-if="paper.keywords" class="journal-keywords">
                    <strong>Keywords: </strong>
                    <span>{{ paper.keywords }}</span>
                  </div>
                </div>

                <hr class="journal-divider" />
              </header>

              <!-- ── 2-Column IMRAD Body ── -->
              <div class="journal-body">
                <template v-for="cfg in IMRAD_SECTION_CONFIGS" :key="cfg.key">
                  <div :id="cfg.key + '-section'" class="journal-section-heading">
                    <span>{{ cfg.label }}</span>
                  </div>

                  <!-- Section Wrapper to reset CSS counter -->
                  <div class="journal-section-content">
                    <!-- Introduction → AI summary blocks -->
                    <template v-if="cfg.key === 'introduction'">
                      <template v-if="paper.introduction_summary">
                        <div v-for="(block, idx) in parseSummaryBlocks(paper.introduction_summary as string)"
                          :key="idx">
                          <p v-if="block.heading" class="journal-subheading">{{ block.heading }}</p>
                          <p class="journal-para">{{ block.body }}</p>
                        </div>
                      </template>
                      <div v-else-if="paper.introduction">
                        <p class="journal-para">{{ stripMarkers(paper.introduction) }}</p>
                      </div>
                      <p v-else class="journal-para journal-no-content">No introduction available.</p>
                    </template>

                    <!-- Methods / Results / Discussion → structured blocks -->
                    <template v-else>
                      <div v-if="hasStructured(cfg.key)">
                        <template v-for="(block, i) in getStructuredBlocks(cfg.key)" :key="i">
                          <div v-if="block.type === 'subheading'" class="journal-subheading">{{ block.text }}</div>
                          <div v-else-if="block.type === 'table-image'" class="journal-figure">
                            <img :src="block.text" :alt="block.id" class="journal-figure-img"
                              @click="openZoomModal(block.text)" />
                          </div>
                          <p v-else-if="block.type === 'table-label'" class="journal-figure-caption">{{ block.text }}
                          </p>
                          <p v-else class="journal-para">{{ block.text }}</p>
                        </template>
                      </div>
                      <div v-else-if="paper[resolveKey(cfg.key)]">
                        <p class="journal-para">{{ stripMarkers(paper[resolveKey(cfg.key)] as string) }}</p>
                        <template v-if="cfg.key === 'rad' && paper.discussion && !isRadCombined">
                          <p class="journal-para">{{ stripMarkers(paper.discussion as string) }}</p>
                        </template>
                      </div>
                      <p v-else class="journal-para journal-no-content">No extracted text available for this section.
                      </p>
                    </template>
                  </div>
                </template>
              </div>

              <!-- ── References — full-width below the 2-column body ── -->
              <section v-if="parsedReferences.length > 0" id="references-section" class="journal-references-section">
                <div class="journal-references-heading">
                  <span>References</span>
                </div>
                <ol class="journal-references-list">
                  <li v-for="(entry, idx) in parsedReferences" :key="idx" class="journal-reference-entry"
                    v-html="formatReferenceEntry(entry)" />
                </ol>
              </section>

            </article>
          </div>

          <!-- ── Authors List View ── -->
          <div v-else-if="activeView === 'authors'" class="authors-view-wrap" key="authors">
            <div class="authors-card-page">
              <header class="authors-header">
                <h2 class="authors-view-title">Contributing Authors</h2>
                <p class="authors-view-sub">Information about the researchers behind this study</p>
              </header>

              <div class="authors-grid">
                <div v-for="(name, idx) in authorList" :key="idx" class="author-row-card">
                  <div class="author-avatar">
                    {{ name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="author-info">
                    <h3 class="author-card-name">{{ name }}</h3>
                    <p class="author-card-role">Author</p>
                    <div class="author-meta">
                      <span class="auth-dept">{{ paper.department }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="authors-footer">
                <button class="return-btn" @click="activeView = 'paper'">
                  Return to Paper View
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- ── Related Studies Sidebar ── -->
      <aside class="journal-sidebar">
        <div class="sidebar-inner">
          <p class="sidebar-label">Recommended Studies</p>
          <p class="sidebar-sub">Expert recommended matches</p>

          <div v-if="recommendations.length > 0" class="rec-list">
            <div v-for="rec in recommendations" :key="rec.id" class="rec-card" @click="viewDetail(rec.id)">
              <!-- Left: Main Card Content -->
              <div class="rec-card-main">
                <div class="rec-card-header">
                  <div class="rec-match-score" :class="getConfidence(rec.score).cls"
                    :title="getConfidence(rec.score).desc">
                    <Sparkles :size="11" />
                    <span>{{ (rec.score * 100).toFixed(0) }}% Semantic Match</span>
                  </div>
                  <span v-if="rec.payload?.degree_program !== 'N/A'" class="rec-program-tag">
                    {{ rec.payload?.degree_program }}
                  </span>
                </div>

                <h4 class="rec-card-title">{{ rec.payload?.title }}</h4>

                <div class="rec-card-meta">
                  <span class="rec-author">{{rec.payload?.author ? rec.payload.author.split('|').map(a =>
                    (a.split(',')[0] ||
                      '').trim()).join(', ') : ''}}</span>
                  <span class="rec-dot"></span>
                  <span class="rec-year">{{ rec.payload?.year }}</span>
                </div>

                <!-- Teaser pill (visible before hover) -->
                <div v-if="rec.recommendation_reason" class="rec-insight-teaser">
                  <Info :size="10" />
                  <span>Hover for insight</span>
                </div>
              </div>

              <!-- Right: Insight Flow Content (Reveals on Hover) -->
              <div v-if="rec.recommendation_reason" class="rec-insight-side">
                <div class="insight-side-head">
                  <Info :size="12" /> AI INSIGHT
                </div>
                <p class="rec-insight-text">{{ rec.recommendation_reason }}</p>
              </div>
            </div>
          </div>

          <div v-else class="rec-empty">
            <img src="/book_empty.ico" alt="Empty" class="rec-empty-icon" />
            <p class="rec-empty-title">No related studies found</p>
            <div class="rec-empty-insight">
              <div class="insight-head">
                <Info :size="12" /> <span>Possible Reasons</span>
              </div>
              <ul class="insight-list">
                <li>
                  <span class="insight-marker">1</span>
                  <span><strong>Limited Repository:</strong> The database may not have sufficient records yet to
                    establish
                    semantic links.</span>
                </li>
                <li>
                  <span class="insight-marker">2</span>
                  <span><strong>Low Similarity:</strong> No other papers share close conceptual keywords or research
                    themes.</span>
                </li>
                <li>
                  <span class="insight-marker">3</span>
                  <span><strong>Highly Niche Topic:</strong> This study covers a unique academic area without matching
                    methodologies.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </aside>

    </div>
  </div>

  <!-- Skeleton Loading State -->
  <div v-else-if="loading" class="imrad-journal-page skeleton-page">
    <!-- Header Skeleton -->
    <div class="journal-header">
      <div class="journal-meta-top">
        <div class="skeleton-badge"></div>
        <div class="skeleton-badge"></div>
        <div class="skeleton-badge"></div>
      </div>
      <div class="skeleton-title"></div>
      <div class="skeleton-title short"></div>
      <div class="skeleton-authors"></div>
      <div class="skeleton-stats"></div>
    </div>

    <!-- Body Skeleton -->
    <div class="detail-layout">
      <!-- Left sidebar -->
      <aside class="doc-nav-aside">
        <div class="skeleton-nav-label"></div>
        <div class="skeleton-nav-item"></div>
        <div class="skeleton-nav-item"></div>
        <div class="skeleton-nav-item"></div>
        <div class="skeleton-nav-item"></div>
      </aside>

      <!-- Main Content -->
      <div class="paper-main">
        <div class="skeleton-tab-bar">
          <div class="skeleton-tab"></div>
          <div class="skeleton-tab"></div>
          <div class="skeleton-tab"></div>
        </div>
        <div class="skeleton-section-title"></div>
        <div class="skeleton-text-block"></div>
        <div class="skeleton-text-block"></div>
        <div class="skeleton-text-block short"></div>

        <div class="skeleton-section-title mt-4"></div>
        <div class="skeleton-text-block"></div>
        <div class="skeleton-text-block"></div>
        <div class="skeleton-text-block short"></div>
      </div>

      <!-- Right Sidebar (Recommendations) -->
      <aside class="journal-sidebar">
        <div class="sidebar-inner">
          <div class="skeleton-sidebar-title"></div>
          <div class="skeleton-sidebar-sub"></div>
          <div class="rec-list">
            <div class="rec-card skeleton-card">
              <div class="skeleton-card-header"></div>
              <div class="skeleton-card-title"></div>
              <div class="skeleton-card-meta"></div>
            </div>
            <div class="rec-card skeleton-card">
              <div class="skeleton-card-header"></div>
              <div class="skeleton-card-title"></div>
              <div class="skeleton-card-meta"></div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <!-- ══ CITATION MODAL ══════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="cite-fade">
      <div v-if="showCiteModal" class="modal-overlay" @click.self="showCiteModal = false">
        <div class="citation-modal">

          <!-- Dark header band -->
          <div class="modal-header">
            <div class="modal-header-left">
              <Award :size="15" class="modal-header-icon" />
              <span class="modal-title">Cite this Study</span>
            </div>
            <button class="modal-close" @click="showCiteModal = false">
              <X :size="15" />
            </button>
          </div>

          <!-- Loading -->
          <div v-if="citeModalLoading" class="modal-loading">
            <Loader2 :size="18" class="spin" />
            <span>Generating citations…</span>
          </div>

          <!-- Error -->
          <div v-else-if="citeModalError" class="modal-error">
            <span>Could not load citation data.</span>
            <button class="m-retry-btn" @click="retryCitations">Retry</button>
          </div>

          <!-- Body -->
          <div v-else-if="formattedCitations" class="modal-body">

            <!-- Edition selector -->
            <div class="modal-selectors">
              <div class="selector-field">
                <label class="selector-label">APA Edition</label>
                <div class="select-wrap">
                  <select class="m-select" v-model="apaVariation">
                    <option value="6">6th Edition</option>
                    <option value="7">7th Edition</option>
                    <option value="intext">In-Text</option>
                  </select>
                  <span class="select-arrow">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                        stroke-linejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <!-- Citation text area -->
            <div class="citation-area">
              <div class="citation-area-inner">
                <p class="citation-text" v-html="apaVariation === '6' ? formattedCitations.apa_6 : apaVariation === '7' ? formattedCitations.apa_7 : formattedCitations.apa_intext
                  "></p>
              </div>
              <p class="selector-note">Note: If you are citating this study, please make sure that you are manually
                adding
                it to your reference list.<br><br>
                Auto-citation detection in the system is not available at this time due to lack of resources and local
                development and testing.</p>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <button v-if="hasCited" class="m-uncite-btn" :disabled="citeLoading"
                @click="handleToggleCitation(); showCiteModal = false">
                <X :size="12" />
                Remove Citation
              </button>

              <div style="flex: 1"></div>

              <button class="m-copy-btn" :class="{ copied: copyStatus[apaVariation] }" @click="copyToClipboard(
                apaVariation === '6' ? formattedCitations.apa_6 : apaVariation === '7' ? formattedCitations.apa_7 : formattedCitations.apa_intext,
                apaVariation
              )">
                <Check v-if="copyStatus[apaVariation]" :size="13" />
                <Copy v-else :size="13" />
                {{ copyStatus[apaVariation] ? 'Copied!' : 'Copy Citation' }}
              </button>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ══ IMAGE ZOOM MODAL (LIGHTBOX) ════════════════════════════ -->
  <Teleport to="body">
    <Transition name="zoom-fade">
      <div v-if="showZoomModal" class="zoom-overlay" @click="showZoomModal = false">
        <div class="zoom-container">
          <button class="zoom-close" @click="showZoomModal = false">
            <X :size="24" />
          </button>
          <img :src="zoomImgSrc" class="zoom-full-img" @click.stop />
          <p class="zoom-hint">Click outside to close</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>


<style scoped>
/* ── Tokens ──────────────────────────────────────────────── */
.detail-page {
  --ink: var(--text-primary);
  --ink-2: var(--text-secondary);
  --ink-3: var(--text-tertiary);
  --rule: var(--border-color);
  --surface: var(--bg-primary);
  --paper: var(--bg-secondary);
  --green: var(--accent-primary);
  --green-dk: var(--accent-primary);
  --green-dim: rgba(16, 185, 129, 0.1);
  --hero-bg: #0d1f12;

  background: var(--surface);
  min-height: 100vh;
  padding-top: 64px;
  /* Height of the nav */
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
  /* Prevent horizontal scroll without breaking sticky */
  width: 100%;
}

.dark .detail-container {
  --hero-bg: #050505;
}

/* Breadcrumb - Improved visibility */
.detail-breadcrumb {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  padding-left: 0.25rem;
}

.bc-link {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink-2);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  transition: all 0.2s ease;
  font-family: 'Source Sans 3', sans-serif;
  opacity: 0.7;
}

.bc-link:hover {
  color: var(--green);
  opacity: 1;
}

.bc-sep {
  color: var(--rule);
  margin: 0 4px;
}

.bc-active {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink);
}

/* ══ PAGE LAYOUT ══════════════════════════════════════════ */

/* Paper wrapper — must have min-width:0 so 1fr column doesn't overflow grid */
.journal-paper-wrap {
  min-width: 0;
  width: 100%;
}

/* ══ RELATED STUDIES SIDEBAR ══════════════════════════════ */
.journal-sidebar {
  width: 260px;
  flex-shrink: 0;
  position: relative;
  align-self: stretch;
}

.sidebar-inner {
  position: sticky;
  top: 1.5rem;
  background: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
}

.sidebar-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--green-dk);
  margin: 0 0 0.2rem;
}

.sidebar-sub {
  font-size: 0.75rem;
  color: var(--ink-3);
  margin: 0 0 1rem;
}

/* ── Confidence badges ──────────────────────────────────────────── */
.confidence-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.12rem 0.4rem;
  border-radius: 99px;
  white-space: nowrap;
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

.badge-pct {
  font-weight: 500;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}




/* ══ CITATION MODAL ══════════════════════════════════════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 14, 8, 0.72);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.citation-modal {
  background: var(--bg-secondary);
  width: 100%;
  max-width: 540px;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px rgba(0, 166, 81, 0.18),
    0 24px 48px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* ── Header — dark theme band ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--hero-bg);
  border-bottom: 2.5px solid var(--green);
  position: relative;
}

.modal-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  position: relative;
  z-index: 1;
}

.modal-header-icon {
  color: var(--green);
  flex-shrink: 0;
}

.modal-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #000000;
  font-family: 'Source Sans 3', sans-serif;
}

.modal-close {
  background: none;
  border: none;
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  display: flex;
  border-radius: 2px;
  transition: color 0.15s, background 0.15s;
  position: relative;
  z-index: 1;
}

.modal-close:hover {
  color: var(--green-dk);
  background: rgb(255, 255, 255);
}

/* ── Loading state ── */
.modal-loading {
  padding: 3.5rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  color: var(--ink-3);
  font-size: 0.82rem;
  font-family: 'Source Sans 3', sans-serif;
}

/* ── Error state ── */
.modal-error {
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.82rem;
  color: var(--ink-3);
  font-family: 'Source Sans 3', sans-serif;
}

.m-retry-btn {
  background: none;
  border: 1.5px solid var(--green);
  border-radius: 2px;
  padding: 0.4rem 1.1rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--green-dk);
  cursor: pointer;
  font-family: 'Source Sans 3', sans-serif;
  transition: background 0.15s, color 0.15s;
}

.m-retry-btn:hover {
  background: var(--green-dim);
}

/* ── Body ── */
.modal-body {
  padding: 0;
}

/* ── Selectors row ── */
.modal-selectors {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  padding: 1.1rem 1.4rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
}

.selector-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.selector-note {
  font-size: 0.70rem;
  color: var(--ink-3);
  margin: 0.25rem 0 0;
  font-style: italic;
}

.selector-label {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--green-dk);
  font-family: 'Source Sans 3', sans-serif;
}

.select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.m-select {
  appearance: none;
  -webkit-appearance: none;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: 3px;
  padding: 0.4rem 2.2rem 0.4rem 0.75rem;
  font-size: 0.84rem;
  font-weight: 600;
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
  cursor: pointer;
  outline: none;
  min-width: 140px;
  transition: border-color 0.15s, box-shadow 0.15s;
  line-height: 1.3;
}

.m-select:hover {
  border-color: var(--green);
}

.m-select:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(0, 166, 81, 0.12);
}

.select-arrow {
  position: absolute;
  right: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--green-dk);
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

/* ── Citation text area ── */
.citation-area {
  padding: 1.4rem 1.4rem 1.1rem;
  min-height: 110px;
}

.citation-area-inner {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  border-left: 3px solid var(--green);
  padding: 1rem 1.1rem;
}

.citation-text {
  font-family: 'Lora', Georgia, serif;
  font-size: 0.91rem;
  line-height: 1.85;
  margin: 0;
  color: var(--ink);
  /* APA hanging indent: first line flush, subsequent lines indented */
  padding-left: 1.5em;
  text-indent: -1.5em;
}

.citation-bibtex {
  font-family: 'Courier New', monospace;
  font-size: 0.76rem;
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  color: var(--ink-2);
  background: none;
  padding: 0;
  width: 100%;
}

/* ── Footer ── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.4rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  gap: 1rem;
}

.m-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--green);
  color: #000000;
  border: none;
  border-radius: 3px;
  padding: 0.45rem 1.1rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: 'Source Sans 3', sans-serif;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 1px 4px rgba(0, 166, 81, 0.25);
}

.m-copy-btn:hover {
  background: var(--green-dk);
  box-shadow: 0 2px 8px rgba(0, 166, 81, 0.3);
}

.m-copy-btn:active {
  transform: scale(0.97);
}

.m-copy-btn.copied {
  background: #1a6b3a;
}

.citation-hint {
  font-size: 0.6rem;
  color: var(--ink-3);
  margin: 0;
  line-height: 1.4;
  text-align: right;
  font-family: 'Source Sans 3', sans-serif;
  letter-spacing: 0.02em;
}

/* ── Transitions ── */
.cite-fade-enter-active,
.cite-fade-leave-active {
  transition: opacity 0.2s ease;
}

.cite-fade-enter-from,
.cite-fade-leave-to {
  opacity: 0;
}

.slide-in-enter-active {
  transition: all 0.18s ease-out;
}

.slide-in-leave-active {
  transition: all 0.14s ease-in;
}

.slide-in-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

.slide-in-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

/* ── Zoom Modal (Lightbox) Styles ── */
.zoom-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  cursor: zoom-out;
}

.zoom-container {
  position: relative;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.zoom-full-img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--bg-secondary);
  /* Use theme bg instead of pure white */
}

.zoom-close {
  position: absolute;
  top: -3rem;
  right: 0;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
}

.zoom-close:hover {
  opacity: 1;
  transform: scale(1.1);
}

.zoom-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

/* Transitions */
.zoom-fade-enter-active,
.zoom-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.zoom-fade-enter-from,
.zoom-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
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

.j-cite-btn {
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

.j-cite-btn:hover:not(:disabled) {
  background: var(--green-dk);
}

.j-cite-btn.cited {
  background: var(--paper);
  border: 1px solid var(--green);
  color: var(--green-dk);
  cursor: pointer;
}

.j-cite-btn.cited:hover {
  background: var(--green-dim);
  border-color: var(--green-dk);
  color: var(--green-dk);
}

.j-cite-btn.loading {
  opacity: 0.6;
  cursor: wait;
}

.j-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  color: var(--ink-2);
  padding: 0.38rem 1rem;
  border-radius: 5px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s;
}

.j-download-btn:hover:not(:disabled) {
  border-color: var(--green);
  color: var(--green-dk);
  background: var(--green-dim);
}

.j-download-btn:disabled {
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
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
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
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
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

.rec-score-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.rec-score-bar {
  flex: 1;
  height: 4px;
  background: var(--surface);
  border-radius: 2px;
  overflow: hidden;
}

.rec-score-fill {
  height: 100%;
  background: var(--green);
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.rec-score-pct {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--green-dk);
  white-space: nowrap;
}

.rec-card-top {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}

/* ── Skeleton Loading Styles ───────────────────────────── */
.skeleton-page {
  animation: pulse-bg 1.5s infinite ease-in-out;
  pointer-events: none;
}

@keyframes pulse-bg {
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
}

.skeleton-badge {
  width: 60px;
  height: 18px;
  background: var(--skeleton-bg);
  border-radius: 3px;
}

.skeleton-title {
  width: 70%;
  height: 34px;
  background: var(--skeleton-highlight);
  margin: 0 auto 0.6rem;
  border-radius: 6px;
}

.skeleton-title.short {
  width: 45%;
  margin-bottom: 1.25rem;
}

.skeleton-authors {
  width: 40%;
  height: 16px;
  background: var(--skeleton-bg);
  margin: 0 auto 1.5rem;
  border-radius: 4px;
}

.skeleton-stats {
  width: 30%;
  height: 32px;
  background: var(--skeleton-bg);
  margin: 0 auto;
  border-radius: 6px;
}

/* Nav Skeleton */
.skeleton-nav-label {
  width: 80%;
  height: 12px;
  background: var(--skeleton-bg);
  margin-bottom: 1rem;
  border-radius: 4px;
}

.skeleton-nav-item {
  width: 100%;
  height: 28px;
  background: var(--skeleton-bg);
  margin-bottom: 0.4rem;
  border-radius: 4px;
  opacity: 0.6;
}

/* Main Content Skeleton */
.skeleton-tab-bar {
  display: flex;
  gap: 1.5rem;
  border-bottom: 2px solid var(--rule);
  margin-bottom: 2rem;
  padding-bottom: 0.5rem;
}

.skeleton-tab {
  width: 80px;
  height: 20px;
  background: var(--skeleton-bg);
  border-radius: 4px;
}

.skeleton-section-title {
  width: 150px;
  height: 16px;
  background: var(--skeleton-highlight);
  margin-bottom: 1rem;
  border-radius: 4px;
}

.skeleton-section-title.mt-4 {
  margin-top: 2.5rem;
}

.skeleton-text-block {
  width: 100%;
  height: 14px;
  background: var(--skeleton-bg);
  margin-bottom: 0.6rem;
  border-radius: 4px;
  opacity: 0.7;
}

.skeleton-text-block.short {
  width: 85%;
  margin-bottom: 1.5rem;
}

/* Sidebar Skeleton */
.skeleton-sidebar-title {
  width: 140px;
  height: 14px;
  background: var(--skeleton-highlight);
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.skeleton-sidebar-sub {
  width: 180px;
  height: 12px;
  background: var(--skeleton-bg);
  margin-bottom: 1.5rem;
  border-radius: 4px;
}

.skeleton-card {
  height: 130px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  box-shadow: none;
  cursor: default;
}

.skeleton-card:hover {
  transform: none;
  width: 260px;
  /* Prevent expansion */
  box-shadow: none;
  border-color: var(--rule);
}

.skeleton-card-header {
  width: 100%;
  height: 22px;
  background: var(--skeleton-bg);
  border-radius: 20px;
  margin-bottom: 0.2rem;
  opacity: 0.8;
}

.skeleton-card-title {
  width: 100%;
  height: 14px;
  background: var(--skeleton-bg);
  border-radius: 4px;
}

.skeleton-card-meta {
  width: 60%;
  height: 12px;
  background: var(--skeleton-bg);
  border-radius: 4px;
  margin-top: auto;
  opacity: 0.6;
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
  column-count: 2;
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
  color: var(--text-secondary);
  margin: 0;
  text-align: justify;
}

.section-text-block {
  display: inline;
  /* Continuous flow */
  font-size: 0.98rem;
  line-height: 1.85;
  color: var(--text-secondary);
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


/* ═══════════════════════════════════════════════════════════
   IMRAD JOURNAL PAGE
   A white academic paper layout matching real IMRAD format.
   ═══════════════════════════════════════════════════════════ */

.imrad-journal-page {
  background: var(--bg-secondary);
  border-radius: 6px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 2rem;
  transition: background-color 0.3s ease;
}

.dark .imrad-journal-page {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

/* ── Journal Header (Title / Authors / Abstract) ── */
.journal-header {
  padding: 2.5rem 3rem 2rem;
  border-bottom: 1px solid #e8e8e0;
  text-align: center;
}

.journal-meta-top {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.journal-badge {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.6rem;
  border-radius: 3px;
  background: var(--green-dim);
  color: var(--green-dk);
  border: 1px solid rgba(0, 125, 61, 0.15);
}

.journal-badge-type {
  background: rgba(96, 165, 250, 0.1);
  color: #1d4ed8;
  border-color: rgba(96, 165, 250, 0.2);
}

.journal-badge-degree {
  background: rgba(251, 191, 36, 0.1);
  color: #92400e;
  border-color: rgba(251, 191, 36, 0.2);
}

.journal-title {
  font-family: 'Lora', Georgia, serif;
  font-size: clamp(1.35rem, 2.5vw, 1.95rem);
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
  margin: 0 auto 1.1rem;
  max-width: 820px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.journal-title-line {
  display: block;
  white-space: normal;
  text-align: center;
}

.journal-authors {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0;
}

.journal-author {
  font-weight: 600;
}

.author-sep {
  color: #bbb;
  font-weight: 400;
  padding: 0 0.2rem;
}

.journal-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.j-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.73rem;
  color: #999;
  font-weight: 500;
}

.j-cite-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--green);
  color: #fff;
  border: none;
  padding: 0.32rem 0.85rem;
  border-radius: 4px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s;
}

.j-cite-btn:hover:not(:disabled) {
  background: var(--green-dk);
}

.j-cite-btn.cited:hover {
  background: var(--green-dim);
  border-color: var(--green-dk);
  color: var(--green-dk);
}

.j-bookmark-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  color: var(--ink-2);
  border: 1px solid var(--rule);
  padding: 0.32rem 0.85rem;
  border-radius: 4px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.14s;
}

.j-bookmark-btn:hover:not(:disabled) {
  border-color: var(--ink-3);
  background: var(--surface);
}

.j-bookmark-btn.bookmarked {
  background: var(--hero-bg);
  color: #fff;
  border-color: var(--hero-bg);
}

.j-bookmark-btn.bookmarked:hover {
  opacity: 0.9;
}


/* Plain Abstract layout */
.journal-abstract-plain {
  text-align: left;
  margin: 1.5rem 0 1.25rem;
  max-width: 100%;
}

.journal-abstract-label {
  display: block;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--green-dk);
  margin-bottom: 0.4rem;
}

.journal-abstract-text {
  font-family: 'Lora', Georgia, serif;
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
  text-align: justify;
  text-indent: 2rem;
}

.journal-keywords {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.78rem;
  color: var(--ink-2);
  margin-top: 0.5rem;
}

.journal-divider {
  border: none;
  border-top: 2.5px solid var(--green);
  margin: 2.5rem auto 1.5rem;
  max-width: 80px;
  opacity: 0.35;
}

.journal-body {
  display: block;
  width: 100%;
  padding: 2.5rem 3rem 4rem;
  column-count: 2;
  column-gap: 3.5rem;
  column-rule: 1.5px solid rgba(0, 0, 0, 0.04);
  text-align: justify;
}

.journal-section-heading {
  break-inside: avoid;
  /* Prevents heading from being orphaned at column bottom */
  break-after: avoid;
  margin: 0 0 1rem;
}

.journal-section-heading:first-child {
  margin-top: 0;
}

.journal-section-heading span {
  display: block;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.85rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--green-dk);
  padding-bottom: 0.4rem;
  border-bottom: 2.5px solid var(--green);
  width: fit-content;
}

/* Section content resets the A. B. C. counter */
.journal-section-content {
  counter-reset: subheading;
  margin-bottom: 2rem;
}

.journal-subheading {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 1.25rem 0 0.5rem;
  break-after: avoid;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.journal-subheading::before {
  counter-increment: subheading;
  content: counter(subheading, upper-alpha) ". ";
  font-weight: 700;
  color: var(--ink);
}

.journal-para {
  font-family: 'Lora', Georgia, serif;
  font-size: 0.92rem;
  line-height: 1.85;
  color: var(--text-secondary);
  margin: 0 0 0.75rem;
  padding-left: 2rem;
  /* Academic indentation */
  text-indent: 1.5rem;
  /* First-line indentation */
}

/* ── References — full-width section below the 2-col body ── */
.journal-references-section {
  padding: 2.5rem 4rem 3.5rem;
  border-top: 2.5px solid var(--green);
  background: var(--bg-tertiary);
  /* Explicitly single-column — must NOT inherit the parent's column layout */
  columns: 1 !important;
  column-rule: none !important;
}

.journal-references-heading {
  margin-bottom: 1.5rem;
}

.journal-references-heading span {
  display: inline-block;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.85rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--green-dk);
  padding-bottom: 0.4rem;
  border-bottom: 2.5px solid var(--green);
}

.journal-references-list {
  list-style: none;
  padding: 0;
  margin: 0;
  /* Two-column reference list, matching Nature / IEEE style */
  column-count: 2;
  column-gap: 3rem;
}

.journal-reference-entry {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.86rem;
  line-height: 1.7;
  color: var(--text-secondary);
  /* APA hanging indent */
  padding-left: 2.5rem;
  text-indent: -2.5rem;
  margin-bottom: 1rem;
  break-inside: avoid;
  text-align: left;
}

/* Bold author block */
.ref-authors {
  font-weight: 700;
  color: var(--text-primary);
}

/* Year in parentheses — slightly muted */
.ref-year {
  font-weight: 600;
  color: var(--text-secondary);
}

/* Title in italics */
.ref-title {
  font-style: italic;
  font-weight: 400;
  color: var(--text-secondary);
}

/* IEEE / numbered citation marker */
.ref-number {
  font-weight: 700;
  color: var(--green-dk);
  margin-right: 0.2rem;
}

.ref-link {
  color: var(--green-dk);
  text-decoration: none;
  word-break: break-all;
}

.ref-link:hover {
  text-decoration: underline;
}

.journal-no-content {
  color: var(--ink-3);
  font-style: italic;
  padding-left: 2rem;
}

/* Figures / Tables inline */
.journal-figure {
  break-inside: avoid;
  text-align: center;
  margin: 1.5rem 0 1.2rem;
}

.journal-figure-img {
  max-width: 100%;
  height: auto;
  border: none;
  box-shadow: none;
  transition: transform 0.22s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.22s ease;
  cursor: zoom-in;
  position: relative;
  z-index: 1;
}

.journal-figure-img:hover {
  transform: scale(1.15);
  z-index: 10;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.14), 0 4px 10px rgba(0, 0, 0, 0.08);
}

.journal-figure-caption {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.73rem;
  color: var(--text-tertiary);
  text-align: center;
  font-style: italic;
  margin: 0.3rem 0 0.7rem;
  break-inside: avoid;
}


/* ── Loading ───────────────────────────────────────────────── */
.loading-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 6rem 2rem;
  font-size: 0.9rem;
  color: var(--ink-3);
}

/* ── Responsive ────────────────────────────────────────────── */


/* ══ PAGE LAYOUT ════════════════════════════════════════════ */
.journal-page-layout {
  max-width: 1580px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  /* 3-Column: Navigation | Paper | Recommendations */
  grid-template-columns: 220px 1fr 320px;
  gap: 2rem;
  padding: 0 1.5rem 5rem;
  box-sizing: border-box;
}

.journal-toc {
  position: relative;
  z-index: 10;
  align-self: stretch;
}

.toc-inner {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: sticky;
  top: 84px;
}

.toc-divider {
  height: 1px;
  background: var(--rule);
  margin: 0.5rem 0;
  opacity: 0.5;
}

.toc-item.active {
  color: var(--green-dk);
  background: var(--green-dim);
  font-weight: 600;
}

.toc-item.active .toc-bullet {
  background: var(--green);
  transform: scale(1.2);
}

.toc-item.active .m-copy-btn:hover {
  background: var(--green-dk);
  transform: translateY(-1px);
}

.m-uncite-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 4px;
  color: #c53030;
  /* Red color for removal */
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.m-uncite-btn:hover {
  background: #fff5f5;
  border-color: #feb2b2;
}

.m-uncite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.journal-main-col {
  min-width: 0;
  width: 100%;
}

/* ── View Transitions ── */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ── Authors View Styles ── */
.authors-view-wrap {
  width: 100%;
  min-height: 600px;
}

.authors-card-page {
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 3rem;
  border: 1px solid var(--border-color);
}

.authors-header {
  text-align: center;
  margin-bottom: 3rem;
}

.authors-view-title {
  font-family: 'Lora', serif;
  font-size: 2rem;
  color: var(--ink);
  margin-bottom: 0.5rem;
}

.authors-view-sub {
  color: var(--ink-3);
  font-size: 0.95rem;
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.author-row-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: transform 0.2s;
}

.author-row-card:hover {
  transform: translateY(-2px);
  border-color: var(--green);
}

.author-avatar {
  width: 54px;
  height: 54px;
  background: var(--hero-bg);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'Lora', serif;
  border: 2px solid var(--green);
}

.author-card-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.2rem;
}

.author-card-role {
  font-size: 0.8rem;
  color: var(--green-dk);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.auth-dept {
  font-size: 0.85rem;
  color: var(--ink-3);
}

.authors-footer {
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--rule);
  padding-top: 2rem;
}

.return-btn {
  background: var(--green);
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.return-btn:hover {
  background: var(--green-dk);
}



.toc-label {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-3);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--rule);
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  text-decoration: none;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-2);
  border-radius: 4px;
  transition: all 0.15s ease;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.toc-bullet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-4);
  transition: transform 0.2s, background 0.2s;
}

.toc-item:hover {
  background: var(--surface);
  color: var(--green-dk);
  transform: translateX(4px);
}

.toc-item:hover .toc-bullet {
  background: var(--green);
  transform: scale(1.5);
}

.toc-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px dashed var(--rule);
}

.toc-footer p {
  font-size: 0.68rem;
  color: var(--ink-4);
  margin: 0.2rem 0;
  font-weight: 600;
}

/* Anchor Offsets for Topbar */
#abstract-section,
#introduction-section,
#methods-section,
#rad-section,
#references-section {
  scroll-margin-top: 100px;
}



/* ── Rec Cards (used in sidebar) ───────────────────────────── */
.rec-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.rec-card {
  position: relative;
  display: flex;
  width: 260px;
  /* Base width matching sidebar */
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  overflow: hidden;
  animation: slide-up-fade 0.6s ease-out backwards;
}

.rec-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--green);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
}

.rec-card:hover {
  width: 480px;
  /* Fully accommodate both the 260px main card and the 220px insight panel */
  transform: translateY(-5px);
  border-color: var(--green-dim);
  box-shadow: 0 12px 24px rgba(0, 166, 81, 0.12);
  z-index: 100;
}

.rec-card:hover::before {
  opacity: 1;
}

/* Left Main Content */
.rec-card-main {
  width: 260px;
  flex-shrink: 0;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.rec-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.85rem;
}

.rec-match-score {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  letter-spacing: 0.02em;
}

.rec-match-score.badge-strong {
  background: var(--green-dim);
  color: var(--green-dk);
}

.rec-match-score.badge-good {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.rec-program-tag {
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-dim);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.rec-card-title {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--ink);
  margin: 0 0 0.75rem;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s ease;
}

.rec-card:hover .rec-card-title {
  color: var(--green-dk);
}

.rec-card-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
  /* Reduced to make room for teaser */
}

.rec-author {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
  /* Prevent long author lists from pushing the year off-screen */
}

.rec-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--rule-dk);
}

.rec-year {
  font-size: 0.75rem;
  color: var(--ink-3);
}

/* Teaser pill (shown before hover) */
.rec-insight-teaser {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--green-dk);
  background: var(--green-dim);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  margin-top: auto;
  align-self: flex-start;
  transition: opacity 0.3s ease;
}

.rec-card:hover .rec-insight-teaser {
  opacity: 0;
  /* Hide teaser when expanded */
  pointer-events: none;
}

/* Right Insight Content (Revealed on hover) */
.rec-insight-side {
  width: 220px;
  flex-shrink: 0;
  padding: 1.25rem;
  background: var(--bg-tertiary);
  border-left: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.4s ease 0.1s;
  /* Delayed fade in */
}

.rec-card:hover .rec-insight-side {
  opacity: 1;
  transform: translateX(0);
}

.insight-side-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--green-dk);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.rec-insight-text {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--ink-2);
  margin: 0;
  font-family: 'Lora', serif;
  font-style: italic;
}

.rec-empty {
  padding: 2.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  background: var(--bg-secondary);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px dashed var(--border-color);
  width: 100%;
  box-sizing: border-box;
}

.rec-empty-icon {
  width: 40px;
  height: 40px;
  opacity: 0.25;
  filter: grayscale(1);
  margin-bottom: 0.25rem;
}

.rec-empty-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-2);
  margin: 0 0 0.5rem;
}

.rec-empty-insight {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  text-align: left;
  width: 100%;
  max-width: 260px;
  box-sizing: border-box;
}

.rec-empty-insight .insight-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.rec-empty-insight .insight-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.rec-empty-insight .insight-list li {
  font-size: 0.72rem;
  line-height: 1.5;
  color: #475569;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.rec-empty-insight .insight-marker {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
  font-size: 0.65rem;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.j-login-hint {
  font-size: 0.73rem;
  color: #999;
  font-style: italic;
}

/* ── Responsive ────────────────────────────────────────────── */

@media (max-width: 1200px) {
  .journal-toc {
    display: none;
  }

  .journal-page-layout {
    /* TOC hidden → 2-column: Paper | Sidebar */
    grid-template-columns: 1fr 280px;
    gap: 2rem;
  }
}

@media (max-width: 1100px) {

  .journal-toc,
  .journal-sidebar {
    display: none;
  }

  .journal-page-layout {
    /* Both sidebars hidden → single column, centered */
    grid-template-columns: 1fr;
    gap: 0;
    padding: 0.75rem 1.5rem 4rem;
  }
}

@media (max-width: 1024px) {
  .rec-aside {
    display: none;
  }
}

@media (max-width: 768px) {
  .journal-page-layout {
    grid-template-columns: 1fr;
    padding: 0.5rem 1rem 3rem;
  }

  .journal-body {
    column-count: 1;
    column-rule: none;
    column-gap: 0;
    padding: 1.5rem 1.25rem;
  }

  .journal-header {
    padding: 1.75rem 1.25rem 1.5rem;
  }

  .journal-references-section {
    padding: 2rem 1.25rem 2.5rem;
  }

  .journal-references-list {
    column-count: 1;
  }

  /* Old detail-layout classes fallback */
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

@media (max-width: 640px) {
  .imrad-two-col {
    columns: 1;
  }
}

@media (max-width: 480px) {
  .journal-page-layout {
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
