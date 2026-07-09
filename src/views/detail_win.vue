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
// The backend stores identical (or near-identical) text in both results +
// discussion when they are a single combined section in the PDF.
// We detect this via raw-text comparison OR structured-block comparison.
// Must be defined BEFORE IMRAD_SECTION_CONFIGS which depends on it.
const isRadCombined = computed(() => {
  if (!paper.value) return false

  // 1. Raw text equality check (fast path)
  const rawR = paper.value.results ?? ''
  const rawD = paper.value.discussion ?? ''
  if (rawR && rawD && rawR.trim() === rawD.trim()) return true

  // 2. Structured blocks equality check (catches cases where raw text differs
  //    slightly due to whitespace/extraction variance)
  const imrad = paper.value.imrad_structured
  if (imrad) {
    const r = imrad.results ?? []
    const d = imrad.discussion ?? []
    // If both non-empty AND the first text block of each matches → combined
    if (r.length > 0 && d.length > 0) {
      const rKey = r.map(b => b.text).join('|')
      const dKey = d.map(b => b.text).join('|')
      if (rKey === dKey) return true
      // Also: if discussion blocks are a suffix-subset of results blocks
      // (backend appended discussion into results), treat as combined
      if (rKey.endsWith(dKey) || dKey.endsWith(rKey)) return true
    }
    // If discussion is empty but results has content → effectively combined
    if (r.length > 0 && d.length === 0 && rawD === '') return true
  }

  // 3. If only one side has data at all → treat as effectively combined
  if (rawR && !rawD) return true

  return false
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
import type { ImradBlock } from '../services/api'

/**
 * Normalizes a flat list of ImradBlocks so that:
 * 1. Each table-label is immediately followed by its table-image (keeps the pair together).
 * 2. Orphan table-image blocks that appear before their label are moved to follow the label.
 * 3. Exact consecutive duplicate blocks are removed.
 *
 * This fixes backend-side ordering issues where the image block may be emitted
 * out of sequence relative to its caption, causing body text to appear "cut off".
 */
const normalizeBlocks = (blocks: ImradBlock[]): ImradBlock[] => {
  if (!blocks.length) return blocks

  // Step 1: Remove exact consecutive duplicates
  const deduped: ImradBlock[] = blocks.filter((block: ImradBlock, idx: number) => {
    if (idx === 0) return true
    const prev: ImradBlock = blocks[idx - 1] as ImradBlock
    return !(prev.type === block.type && prev.text === block.text)
  })

  // Step 2: Pair table-label with its following table-image
  // Pattern from backend can be:
  //   A) label → image  (correct, keep as-is)
  //   B) image → label  (wrong order, swap)
  //   C) label → text → image  (image drifted away, pull it back)
  const result: ImradBlock[] = []
  let i = 0
  while (i < deduped.length) {
    const block: ImradBlock = deduped[i] as ImradBlock

    if (block.type === 'table-label') {
      // Look ahead: find the matching table-image within the next few blocks
      result.push(block)
      i++
      // Collect non-image blocks immediately after the label
      const pending: ImradBlock[] = []
      while (i < deduped.length && (deduped[i] as ImradBlock).type !== 'table-image' && (deduped[i] as ImradBlock).type !== 'table-label') {
        pending.push(deduped[i] as ImradBlock)
        i++
      }
      // If the next block (after skipped non-image blocks) is a table-image, attach it directly
      if (i < deduped.length && (deduped[i] as ImradBlock).type === 'table-image') {
        result.push(deduped[i] as ImradBlock) // image immediately after its label
        i++
        result.push(...pending) // text continuation after the table
      } else {
        // No image found — just emit pending text and continue
        result.push(...pending)
      }
    } else if (block.type === 'table-image') {
      // Orphan image with no preceding label — just render it
      result.push(block)
      i++
    } else {
      result.push(block)
      i++
    }
  }

  return result
}

// Get structured blocks for a section key, falling back to an empty array.
const getStructuredBlocks = (key: string): ImradBlock[] => {
  if (!paper.value?.imrad_structured) return []
  if (key === 'rad') {
    const r = paper.value.imrad_structured.results ?? []
    const d = paper.value.imrad_structured.discussion ?? []
    // If combined (backend duplicated content), only use results blocks
    if (isRadCombined.value) return normalizeBlocks(r)
    // Separate sections: merge, then normalize
    return normalizeBlocks([...r, ...d])
  }
  const raw = paper.value.imrad_structured[key as keyof typeof paper.value.imrad_structured] ?? []
  return normalizeBlocks(raw)
}

// Whether a section has structured blocks available from the backend
const hasStructured = (key: string): boolean => getStructuredBlocks(key).length > 0

// Strip any [[TABLE_IMAGE:X]] or [TABLE_IMAGE:X] markers from raw text
const stripMarkers = (text: string): string => {
  if (!text) return ''
  
  // Truncate at Appendix/Annex/Curriculum Vitae / back-matter headers
  const lines = text.split('\n')
  const cleaned: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    const lower = trimmed.toLowerCase()
    if (
      lower.startsWith('appendix') ||
      lower.startsWith('annex') ||
      lower.startsWith('curriculum vitae') ||
      lower.startsWith('about the author') ||
      lower.startsWith('biographical data')
    ) {
      break
    }
    cleaned.push(line)
  }
  const cleanedText = cleaned.join('\n').trim()

  return cleanedText
    .replace(/\[{1,2}(?:TABLE|FIGURE)_IMAGE:.*?\]{1,2}/gi, '')
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Parse the flat references string into individual entries.
const parsedReferences = computed((): string[] => {
  if (!paper.value?.references) return []
  const raw = paper.value.references.trim()

  // Primary: blank-line separation
  const byBlankLine = raw.split(/\n\n+/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
  if (byBlankLine.length > 1) return byBlankLine

  // Fallback A: IEEE-style numeric markers [1] [2] ...
  const byIEEE = raw.split(/(?=\[\d+\])/).map(s => s.trim()).filter(Boolean)
  if (byIEEE.length > 1) return byIEEE

  // Fallback B: numbered list "1. " "2. " ...
  const byNumbered = raw.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
  if (byNumbered.length > 1) return byNumbered

  // Last resort
  return [raw]
})

// Turn DOIs and bare URLs inside a reference entry into clickable links.
const formatReferenceEntry = (raw: string): string => {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const linkify = (s: string): string => {
    let out = s.replace(
      /https?:\/\/[^\s,)\]&]+/g,
      url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="ref-link">${url}</a>`
    )
    out = out.replace(
      /(?<!href=")(?:doi:\s*)(10\.[^\s,)\]&]+)/gi,
      (_, doi) =>
        `doi: <a href="https://doi.org/${doi}" target="_blank" rel="noopener noreferrer" class="ref-link">${doi}</a>`
    )
    return out
  }

  const escapedRaw = esc(raw)

  // APA Format detection
  const yearMatch = escapedRaw.match(/^(.*?)\((\d{4}[a-z]?(?:,\s*[A-Z][a-z]+)?)\)\.\s*(.*)$/s)

  if (yearMatch) {
    const authorBlock = (yearMatch[1] ?? '').trim().replace(/\.$/, '').trim()
    const year = yearMatch[2] ?? ''
    const remainder = (yearMatch[3] ?? '').trim()

    const titleSourceMatch = remainder.match(/^(.*?[.!?])\s+([A-Z\d*(].*)$/s)

    let titleHtml = ''
    let sourceHtml = ''

    if (titleSourceMatch) {
      const titleText = (titleSourceMatch[1] ?? '').replace(/\.$/, '').trim()
      const sourceText = (titleSourceMatch[2] ?? '').trim()

      titleHtml = `<em class="ref-title">${titleText}.</em> `
      sourceHtml = linkify(sourceText)
    } else {
      titleHtml = `<em class="ref-title">${linkify(remainder)}</em>`
    }

    return (
      `<span class="ref-authors">${esc(authorBlock)}.</span> ` +
      `<span class="ref-year">(${year}).</span> ` +
      titleHtml +
      sourceHtml
    )
  }

  // IEEE format
  const ieeeMatch = escapedRaw.match(/^(\[\d+\])\s+(.*)$/s)
  if (ieeeMatch) {
    return (
      `<span class="ref-number">${ieeeMatch[1] ?? ''}</span> ` +
      linkify(ieeeMatch[2] ?? '')
    )
  }

  // Numbered list
  const numMatch = escapedRaw.match(/^(\d+\.)\s+(.*)$/s)
  if (numMatch) {
    return (
      `<span class="ref-number">${numMatch[1] ?? ''}</span> ` +
      linkify(numMatch[2] ?? '')
    )
  }

  return linkify(escapedRaw)
}

// Inverted Pyramid Title
const pyramidTitleLines = computed((): string[] => {
  const title = paper.value?.title
  if (!title) return []

  const words = title.trim().split(/\s+/)
  const total = words.length

  if (total <= 3) return [words.join(' ')]

  const charLen = title.length
  const numLines = charLen <= 45 ? 2 : charLen <= 80 ? 3 : charLen <= 115 ? 4 : 5

  const shareWeights: number[] = []
  for (let i = numLines; i >= 1; i--) shareWeights.push(i)
  const shareSum = shareWeights.reduce((a, b) => a + b, 0)
  const budgets = shareWeights.map(w => Math.floor((w / shareSum) * charLen))

  const lines: string[] = []
  let wi = 0

  for (let li = 0; li < numLines; li++) {
    if (wi >= total) break
    const remaining = numLines - li - 1
    const wordsLeft = total - wi

    if (li === numLines - 1 || wordsLeft <= remaining) {
      lines.push(words.slice(wi).join(' '))
      wi = total
      break
    }

    const budget = budgets[li]
    if (budget === undefined) break

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

    <!-- Ambient background shapes for premium overlay -->
    <div class="hero-bg-shapes" aria-hidden="true">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
    </div>

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
            <!-- Breadcrumb -->
            <nav class="breadcrumb detail-breadcrumb">
              <RouterLink :to="{ name: 'home' }" class="bc-link">Home</RouterLink>
              <ChevronRight :size="12" class="bc-sep" />
              <button @click="goBack" class="bc-link">Results</button>
              <ChevronRight :size="12" class="bc-sep" />
              <span class="bc-active">{{ paper.title.length > 55 ? paper.title.substring(0, 55) + '…' : paper.title }}</span>
            </nav>

            <div class="imrad-journal-page">

              <!-- Sheet 1: Cover / Abstract -->
              <article class="journal-paper-sheet">
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
                </header>
              </article>

              <!-- Sheet 2: Introduction -->
              <article v-if="paper.introduction || paper.introduction_summary" class="journal-paper-sheet" id="introduction-section">
                <div class="journal-section-heading">
                  <span>INTRODUCTION</span>
                </div>
                <div class="journal-body">
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
                </div>
              </article>

              <!-- Sheet 3: Methodology -->
              <article v-if="hasStructured('methods') || paper.methods" class="journal-paper-sheet" id="methods-section">
                <div class="journal-section-heading">
                  <span>METHODOLOGY</span>
                </div>
                <div class="journal-body">
                  <div v-if="hasStructured('methods')">
                    <template v-for="(block, i) in getStructuredBlocks('methods')" :key="i">
                      <div v-if="block.type === 'subheading'" class="journal-subheading">{{ block.text }}</div>
                      <div v-else-if="block.type === 'table-image'" class="journal-figure">
                        <img :src="block.text" :alt="block.id" class="journal-figure-img"
                          @click="openZoomModal(block.text)" />
                      </div>
                      <p v-else-if="block.type === 'table-label'" class="journal-figure-caption">{{ block.text }}</p>
                      <p v-else class="journal-para">{{ block.text }}</p>
                    </template>
                  </div>
                  <div v-else-if="paper.methods">
                    <p class="journal-para">{{ stripMarkers(paper.methods) }}</p>
                  </div>
                </div>
              </article>

              <!-- Sheet 4: Results & Discussion -->
              <article v-if="hasStructured('rad') || paper.results || (paper.discussion && !isRadCombined)" class="journal-paper-sheet" id="rad-section">
                <div class="journal-section-heading">
                  <span>RESULTS AND DISCUSSION</span>
                </div>
                <div class="journal-body">
                  <div v-if="hasStructured('rad')">
                    <template v-for="(block, i) in getStructuredBlocks('rad')" :key="i">
                      <div v-if="block.type === 'subheading'" class="journal-subheading">{{ block.text }}</div>
                      <div v-else-if="block.type === 'table-image'" class="journal-figure">
                        <img :src="block.text" :alt="block.id" class="journal-figure-img"
                          @click="openZoomModal(block.text)" />
                      </div>
                      <p v-else-if="block.type === 'table-label'" class="journal-figure-caption">{{ block.text }}</p>
                      <p v-else class="journal-para">{{ block.text }}</p>
                    </template>
                  </div>
                  <div v-else-if="paper.results">
                    <p class="journal-para">{{ stripMarkers(paper.results as string) }}</p>
                    <template v-if="paper.discussion && !isRadCombined">
                      <p class="journal-para">{{ stripMarkers(paper.discussion as string) }}</p>
                    </template>
                  </div>
                </div>
              </article>

              <!-- Sheet 5: References -->
              <article v-if="parsedReferences.length > 0" class="journal-paper-sheet" id="references-section">
                <section class="journal-references-section">
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
                    (a.split(',')[0] || '').trim()).join(', ') : ''}}</span>
                  <span class="rec-dot"></span>
                  <span class="rec-year">{{ rec.payload?.year }}</span>
                </div>

                <div v-if="rec.recommendation_reason" class="rec-insight-teaser">
                  <Info :size="10" />
                  <span>Hover for insight</span>
                </div>
              </div>

              <!-- Right: Insight Flow Content -->
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
                  <span><strong>Limited Repository:</strong> The database may not have sufficient records yet to establish semantic links.</span>
                </li>
                <li>
                  <span class="insight-marker">2</span>
                  <span><strong>Low Similarity:</strong> No other papers share close conceptual keywords or research themes.</span>
                </li>
                <li>
                  <span class="insight-marker">3</span>
                  <span><strong>Highly Niche Topic:</strong> This study covers a unique academic area without matching methodologies.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </aside>

    </div>
  </div>

  <!-- Skeleton Loading State -->
  <div v-else-if="loading" class="detail-page skeleton-page-wrap">
    <div class="journal-page-layout">
      <!-- Left sidebar -->
      <aside class="journal-toc skeleton-toc">
        <div class="toc-inner">
          <div class="skeleton-nav-label"></div>
          <div class="skeleton-nav-item"></div>
          <div class="skeleton-nav-item"></div>
          <div class="skeleton-nav-item"></div>
          <div class="skeleton-nav-item"></div>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="journal-main-col">
        <div class="imrad-journal-page skeleton-page">
          <div class="journal-header">
            <div class="journal-meta-top">
              <div class="skeleton-badge"></div>
              <div class="skeleton-badge"></div>
            </div>
            <div class="skeleton-title"></div>
            <div class="skeleton-title short"></div>
            <div class="skeleton-authors"></div>
            <div class="skeleton-stats"></div>
          </div>
          <div class="skeleton-text-block"></div>
          <div class="skeleton-text-block"></div>
          <div class="skeleton-text-block short"></div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <aside class="journal-sidebar skeleton-sidebar">
        <div class="sidebar-inner">
          <div class="skeleton-sidebar-title"></div>
          <div class="skeleton-sidebar-sub"></div>
          <div class="rec-card skeleton-card"></div>
          <div class="rec-card skeleton-card"></div>
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
                <p class="citation-text" v-html="apaVariation === '6' ? formattedCitations.apa_6 : apaVariation === '7' ? formattedCitations.apa_7 : formattedCitations.apa_intext"></p>
              </div>
              <p class="selector-note">Note: If you are citing this study, please make sure that you are manually adding it to your reference list.<br><br>
                Auto-citation detection in the system is not available at this time due to lack of resources and local development and testing.</p>
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
/* ── Tokens & Reset ──────────────────────────────────────── */
.detail-page {
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

/* Translucent floating glowing green shapes */
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

/* ══ PAGE LAYOUT ════════════════════════════════════════════ */
.journal-page-layout {
  position: relative;
  z-index: 2;
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
  display: grid;
  grid-template-columns: 200px 1fr 260px;
  gap: 1.75rem;
  align-items: start;
}

/* ── Left Sidebar (TOC) ────────────────────────────────── */
.journal-toc {
  position: sticky;
  top: calc(52px + 2rem);
  z-index: 10;
}

.toc-inner {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 166, 81, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.02);
}

.dark .toc-inner {
  background: rgba(15, 15, 15, 0.5);
  border-color: rgba(255, 255, 255, 0.05);
}

.toc-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--green);
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--rule);
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-2);
  text-decoration: none;
  background: transparent;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
  width: 100%;
}

.toc-bullet {
  width: 6px;
  height: 6px;
  background: var(--ink-3);
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toc-item:hover {
  color: var(--green);
  background: rgba(0, 166, 81, 0.05);
  transform: translateX(3px);
}

.toc-item:hover .toc-bullet {
  background: var(--green);
  transform: scale(1.3);
}

.toc-item.active {
  color: #fff;
  background: var(--green);
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.2);
}

.toc-item.active .toc-bullet {
  background: #fff;
  transform: scale(1.3);
}

.toc-divider {
  height: 1px;
  background: var(--rule);
  margin: 0.75rem 0;
}

/* ── Main Journal Column ───────────────────────────────── */
.journal-main-col {
  min-width: 0;
}

.journal-paper-wrap {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--ink-3);
  flex-wrap: wrap;
}

.bc-link {
  color: var(--ink-2);
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.bc-link:hover {
  color: var(--green);
}

.bc-sep {
  opacity: 0.5;
}

.bc-active {
  color: var(--ink-3);
  font-weight: 400;
}

/* Main Academic Paper Card */
.imrad-journal-page {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  width: 100%;
}

.journal-paper-sheet {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(0, 166, 81, 0.15);
  border-radius: 16px;
  padding: 4rem 3.5rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.03);
  transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
  box-sizing: border-box;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  min-height: 800px;
}

.dark .journal-paper-sheet {
  background: rgba(15, 15, 15, 0.95);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
}

/* Header inside paper */
.journal-header {
  margin-bottom: 2.5rem;
}

.journal-meta-top {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.journal-badge {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-2);
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
}

.journal-badge-type {
  color: var(--green);
  background: var(--green-dim);
  border-color: rgba(0, 166, 81, 0.15);
}

.journal-badge-degree {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.15);
}

.journal-title {
  font-family: 'Lora', serif;
  font-size: clamp(1.8rem, 3.5vw, 2.5rem);
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
  margin-bottom: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.journal-title-line {
  display: block;
}

.journal-authors {
  text-align: center;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ink-2);
  margin-bottom: 2rem;
}

.author-sep {
  opacity: 0.5;
  color: var(--green);
}

.journal-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  border-radius: 12px;
  margin-bottom: 2.5rem;
}

.j-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--ink-2);
  font-weight: 600;
}

.j-cite-btn,
.j-bookmark-btn,
.j-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.j-cite-btn {
  background: var(--green);
  color: #fff;
  border: none;
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.15);
}

.j-cite-btn:hover {
  background: var(--green-dk);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 166, 81, 0.25);
}

.j-cite-btn.cited {
  background: var(--green-dim);
  color: var(--green);
  border: 1px solid rgba(0, 166, 81, 0.3);
  box-shadow: none;
}

.j-cite-btn.cited:hover {
  background: rgba(0, 166, 81, 0.12);
}

.j-bookmark-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  color: var(--ink-2);
}

.j-bookmark-btn:hover {
  border-color: var(--green);
  color: var(--green);
}

.j-bookmark-btn.bookmarked {
  color: var(--green);
  background: var(--green-dim);
  border-color: rgba(0, 166, 81, 0.2);
}

.j-download-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  color: var(--ink-2);
}

.j-download-btn:hover {
  border-color: var(--green);
  color: var(--green);
  background: var(--green-dim);
}

.j-login-hint {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-3);
  font-style: italic;
}

/* Abstract segment inside paper */
.journal-abstract-plain {
  padding: 2rem;
  background: rgba(0, 166, 81, 0.03);
  border-left: 4px solid var(--green);
  border-radius: 0 12px 12px 0;
  margin-bottom: 1.5rem;
}

.dark .journal-abstract-plain {
  background: rgba(0, 200, 83, 0.04);
}

.journal-abstract-label {
  display: block;
  font-family: 'Lora', serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--green);
  margin-bottom: 0.75rem;
}

.journal-abstract-text {
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--ink-2);
  text-align: justify;
}

.journal-keywords {
  margin-top: 1rem;
  font-size: 0.82rem;
  color: var(--ink-3);
}

.journal-keywords strong {
  color: var(--ink);
}

.journal-divider {
  border: none;
  height: 1px;
  background: var(--rule);
  margin: 3rem 0;
}

/* ── 2-Column IMRAD Body (academic journal format) ── */
.journal-body {
  display: block;
  width: 100%;
  column-count: 2;
  column-gap: 3rem;
  column-rule: 1px solid rgba(0, 0, 0, 0.06);
  text-align: justify;
  box-sizing: border-box;
}

.dark .journal-body {
  column-rule-color: rgba(255, 255, 255, 0.04);
}

/* Prevent headings and section blocks from being split across columns */
.journal-section-heading {
  break-inside: avoid;
  break-after: avoid;
  column-span: none;
}

.journal-section-content {
  break-inside: auto;
}

/* Keep figures from splitting */
.journal-figure {
  break-inside: avoid;
}

/* References full-width below 2-col body */
.journal-references-section {
  columns: 1 !important;
  column-rule: none !important;
  border-top: 2px solid var(--green);
  padding-top: 2.5rem;
  margin-top: 2rem;
}

/* Collapse to 1 column on narrow screens */
@media (max-width: 900px) {
  .journal-body {
    column-count: 1;
    column-gap: 0;
    column-rule: none;
  }
}

/* IMRAD Section Headings & Text */
.journal-section-heading {
  font-family: 'Lora', serif;
  font-size: 1.45rem;
  font-weight: 600;
  color: var(--green);
  margin: 3rem 0 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--green);
}

.journal-section-content {
  margin-bottom: 2.5rem;
}

.journal-subheading {
  font-family: 'Lora', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  margin: 2rem 0 0.85rem;
}

.journal-para {
  font-size: 0.96rem;
  line-height: 1.8;
  color: var(--ink-2);
  margin-bottom: 1.25rem;
  text-align: justify;
}

.journal-no-content {
  color: var(--ink-3);
  font-style: italic;
  font-size: 0.88rem;
}

.journal-figure {
  margin: 2rem 0;
  text-align: center;
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  padding: 1rem;
  border-radius: 12px;
}

.journal-figure-img {
  max-width: 100%;
  max-height: 380px;
  border-radius: 8px;
  cursor: zoom-in;
  transition: transform 0.2s ease;
}

.journal-figure-img:hover {
  transform: scale(1.01);
}

.journal-figure-caption {
  margin-top: 0.75rem;
  font-size: 0.78rem;
  color: var(--ink-3);
  font-style: italic;
}

/* References Section */
.journal-references-section {
  margin-top: 5rem;
  padding-top: 3rem;
  border-top: 1px solid var(--rule);
}

.journal-references-heading {
  font-family: 'Lora', serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1.5rem;
}

.journal-references-list {
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.journal-reference-entry {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--ink-2);
  text-align: justify;
}

.journal-reference-entry :deep(.ref-authors) {
  font-weight: 600;
}

.journal-reference-entry :deep(.ref-year) {
  font-weight: 500;
}

.journal-reference-entry :deep(.ref-title) {
  font-style: italic;
  font-family: 'Lora', serif;
}

.journal-reference-entry :deep(.ref-link) {
  color: var(--green);
  text-decoration: underline;
  word-break: break-all;
}

.journal-reference-entry :deep(.ref-link:hover) {
  color: var(--green-dk);
}

/* ── Authors Card Page ────────────────────────────────── */
.authors-view-wrap {
  width: 100%;
}

.authors-card-page {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(0, 166, 81, 0.15);
  border-radius: 20px;
  padding: 3.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.02);
}

.dark .authors-card-page {
  background: rgba(12, 12, 12, 0.65);
  border-color: rgba(255, 255, 255, 0.08);
}

.authors-header {
  text-align: center;
  margin-bottom: 3rem;
}

.authors-view-title {
  font-family: 'Lora', serif;
  font-size: 2rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.5rem;
}

.authors-view-sub {
  font-size: 0.95rem;
  color: var(--ink-3);
}

.authors-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.author-row-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  border-radius: 14px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--green-dim);
  color: var(--green);
  border: 1px solid rgba(0, 166, 81, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Lora', serif;
  font-size: 1.25rem;
  font-weight: 700;
}

.author-info {
  flex: 1;
}

.author-card-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.2rem;
}

.author-card-role {
  font-size: 0.8rem;
  color: var(--ink-3);
  margin: 0 0 0.4rem;
}

.auth-dept {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--green);
  background: var(--green-dim);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.authors-footer {
  text-align: center;
  margin-top: 3rem;
}

.return-btn {
  background: transparent;
  border: 1px solid var(--green);
  color: var(--green);
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.return-btn:hover {
  background: var(--green);
  color: #fff;
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.15);
}

/* ── Right Recommended Sidebar ─────────────────────────── */
.journal-sidebar {
  position: sticky;
  top: calc(52px + 2rem);
  z-index: 10;
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--green);
  margin-bottom: 0.25rem;
}

.sidebar-sub {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin-bottom: 1rem;
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rec-card {
  position: relative;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 166, 81, 0.08);
  border-radius: 16px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.02);
}

.dark .rec-card {
  background: rgba(15, 15, 15, 0.5);
  border-color: rgba(255, 255, 255, 0.05);
}

.rec-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 30px -10px rgba(0, 166, 81, 0.1);
  border-color: var(--green);
}

.rec-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.rec-match-score {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.15rem 0.45rem;
  border-radius: 99px;
}

.rec-match-score.badge-strong {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.rec-match-score.badge-good {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.rec-match-score.badge-related {
  background: rgba(120, 120, 120, 0.08);
  color: var(--ink-2);
}

.rec-program-tag {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--ink-3);
  border: 1px solid var(--rule);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.rec-card-title {
  font-family: 'Lora', serif;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ink);
  margin: 0 0 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rec-card-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--ink-3);
  margin-bottom: 0.5rem;
}

.rec-dot {
  width: 3px;
  height: 3px;
  background: var(--ink-3);
  border-radius: 50%;
  opacity: 0.5;
}

.rec-insight-teaser {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--green);
  opacity: 0.8;
}

/* AI Insight — expands inline below the card content on hover (pushes card height, not overlap) */
.rec-insight-side {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding: 0 0.85rem;
  background: rgba(0, 166, 81, 0.04);
  border-radius: 10px;
  border: 1px solid transparent;
  transition:
    max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s ease,
    margin-top 0.25s ease,
    padding 0.25s ease,
    border-color 0.25s ease;
}

.dark .rec-insight-side {
  background: rgba(0, 200, 83, 0.05);
}

.rec-card:hover .rec-insight-side {
  max-height: 180px;
  opacity: 1;
  margin-top: 0.75rem;
  padding: 0.75rem 0.85rem;
  border-color: rgba(0, 166, 81, 0.18);
}

.insight-side-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--green);
  margin-bottom: 0.4rem;
}

.rec-insight-text {
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--ink-2);
  margin: 0;
}

/* Empty recommendation state */
.rec-empty {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid var(--rule);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
}

.rec-empty-icon {
  width: 32px;
  height: 32px;
  opacity: 0.5;
  margin-bottom: 0.75rem;
}

.rec-empty-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink-3);
  margin-bottom: 1rem;
}

.rec-empty-insight {
  text-align: left;
  border-top: 1px dashed var(--rule);
  padding-top: 1rem;
}

.insight-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--green);
  margin-bottom: 0.5rem;
}

.insight-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.insight-list li {
  display: flex;
  gap: 0.5rem;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--ink-2);
}

.insight-marker {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--green-dim);
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── Skeletons ─────────────────────────────────────────── */
.skeleton-page-wrap {
  pointer-events: none;
}

.skeleton-toc .skeleton-nav-label {
  height: 12px;
  width: 60%;
  background: var(--border-color);
  border-radius: 3px;
  margin-bottom: 1rem;
}

.skeleton-toc .skeleton-nav-item {
  height: 28px;
  background: var(--border-color);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.skeleton-page .skeleton-badge {
  width: 70px;
  height: 18px;
  background: var(--border-color);
  border-radius: 4px;
  display: inline-block;
  margin-right: 0.5rem;
}

.skeleton-page .skeleton-title {
  height: 32px;
  width: 80%;
  background: var(--border-color);
  border-radius: 6px;
  margin: 1rem auto;
}

.skeleton-page .skeleton-title.short {
  width: 50%;
}

.skeleton-page .skeleton-authors {
  height: 16px;
  width: 40%;
  background: var(--border-color);
  border-radius: 4px;
  margin: 1rem auto 2rem;
}

.skeleton-page .skeleton-stats {
  height: 48px;
  background: var(--border-color);
  border-radius: 12px;
  margin-bottom: 2.5rem;
}

.skeleton-page .skeleton-text-block {
  height: 14px;
  background: var(--border-color);
  border-radius: 3px;
  margin-bottom: 0.65rem;
}

.skeleton-page .skeleton-text-block.short {
  width: 70%;
}

.skeleton-sidebar .skeleton-sidebar-title {
  height: 12px;
  width: 70%;
  background: var(--border-color);
  border-radius: 3px;
  margin-bottom: 0.5rem;
}

.skeleton-sidebar .skeleton-sidebar-sub {
  height: 10px;
  width: 50%;
  background: var(--border-color);
  border-radius: 3px;
  margin-bottom: 1.5rem;
}

.skeleton-card {
  height: 120px;
  background: var(--border-color) !important;
  border-radius: 16px;
}

/* Shimmer animation on all skeletons */
@keyframes skeleton-shimmer {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}

.skeleton-page-wrap [class^="skeleton-"] {
  animation: skeleton-shimmer 1.2s ease-in-out infinite alternate;
}

/* ── Citation Modal ────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.citation-modal {
  background: var(--paper);
  border: 1px solid rgba(0, 166, 81, 0.2);
  border-radius: 20px;
  width: 90%;
  max-width: 550px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: modal-enter 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.dark .citation-modal {
  border-color: rgba(255, 255, 255, 0.08);
}

@keyframes modal-enter {
  0% { transform: scale(0.95) translateY(10px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.modal-header {
  background: var(--green);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.modal-close {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
}

.modal-close:hover {
  opacity: 1;
}

.modal-loading,
.modal-error {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--ink-3);
  font-size: 0.9rem;
}

.m-retry-btn {
  background: var(--green);
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.modal-selectors {
  margin-bottom: 1.25rem;
}

.selector-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.selector-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink-3);
  letter-spacing: 0.05em;
}

.select-wrap {
  position: relative;
  width: fit-content;
}

.m-select {
  appearance: none;
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  outline: none;
  min-width: 140px;
}

.select-arrow {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--ink-3);
}

.citation-area {
  margin-bottom: 1.5rem;
}

.citation-area-inner {
  background: var(--bg-secondary);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 0.75rem;
}

.citation-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--ink);
  font-family: 'Lora', serif;
  text-align: justify;
}

.citation-text :deep(em) {
  font-style: italic;
}

.selector-note {
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--ink-3);
}

.modal-footer {
  display: flex;
  align-items: center;
  border-top: 1px solid var(--rule);
  padding-top: 1.25rem;
}

.m-uncite-btn {
  background: transparent;
  border: 1px solid rgba(220, 53, 69, 0.2);
  color: #dc3545;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s;
}

.m-uncite-btn:hover {
  background: rgba(220, 53, 69, 0.05);
  border-color: #dc3545;
}

.m-copy-btn {
  background: var(--green);
  color: #fff;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.15);
  transition: all 0.2s;
}

.m-copy-btn:hover {
  background: var(--green-dk);
  box-shadow: 0 6px 14px rgba(0, 166, 81, 0.25);
}

.m-copy-btn.copied {
  background: #10b981;
  box-shadow: none;
}

/* ── Image Zoom Lightbox ───────────────────────────────── */
.zoom-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: zoom-out;
}

.zoom-container {
  position: relative;
  width: 90%;
  max-width: 960px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.zoom-close {
  position: absolute;
  top: -3rem;
  right: 0;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.zoom-close:hover {
  opacity: 1;
}

.zoom-full-img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  cursor: default;
}

.zoom-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin-top: 1rem;
}

/* ── Transitions ───────────────────────────────────────── */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.cite-fade-enter-active,
.cite-fade-leave-active {
  transition: opacity 0.2s ease;
}

.cite-fade-enter-from,
.cite-fade-leave-to {
  opacity: 0;
}

.zoom-fade-enter-active,
.zoom-fade-leave-active {
  transition: opacity 0.2s ease;
}

.zoom-fade-enter-from,
.zoom-fade-leave-to {
  opacity: 0;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 1200px) {
  .journal-page-layout {
    grid-template-columns: 200px 1fr;
    padding: 2rem 1.5rem 4rem;
  }

  .journal-sidebar {
    grid-column: 1 / -1;
    position: static;
    margin-top: 2rem;
  }

  .rec-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 900px) {
  .journal-page-layout {
    grid-template-columns: 1fr;
  }

  .journal-toc {
    display: none; /* Hide TOC on mobile for space */
  }

  .imrad-journal-page,
  .authors-card-page {
    padding: 2rem 1.5rem;
  }

  .rec-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .journal-page-layout {
    padding: 1rem 0.75rem 3rem;
  }

  .journal-stats {
    flex-direction: column;
    align-items: stretch;
  }

  .j-cite-btn,
  .j-bookmark-btn,
  .j-download-btn {
    justify-content: center;
  }
}
</style>
