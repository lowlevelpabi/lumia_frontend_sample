<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  FileUp, Loader2, CheckCircle, AlertCircle,
  FileText, Check, Plus, Trash2, X,
  Eye, RefreshCw, ShieldAlert, AlertTriangle
} from 'lucide-vue-next'
import { api, type PartialPaperMetadata, type SampleDocument } from '../services/api'
import { useAuth } from '../composables/useAuth'
import BookLoader from '../components/BookLoader.vue'

const router = useRouter()
const { isStaff } = useAuth()

// ── State ───────────────────────────────────────────────────────────
const step = ref(1) // 1: Upload, 2: Review, 3: Done
const processingDoc = ref(false)
const uploadingPaper = ref(false)
const uploadError = ref('')

// Reactive mobile breakpoint check
const isMobile = ref(window.innerWidth <= 768)
const onResize = () => { isMobile.value = window.innerWidth <= 768 }
onMounted(() => {
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const sessionId = ref('')
const extractionProgress = ref(0)
const extractionMessage = ref('')

interface PageData {
  page_num: number
  thumbnail: string
  preview_text: string
  label?: string
}

const pages = ref<PageData[]>([])
const uploadMetadata = reactive<PartialPaperMetadata>({
  title: '',
  author: '',
  year: '',
  abstract: '',
  department: 'N/A',
  keywords: '',
  project_type: 'Thesis',
  degree_program: 'N/A',
  detected_subheadings: [],
  trim_points: {},
  media: {} as Record<string, string>
})

const activeImradTab = ref<'introduction' | 'methods' | 'results' | 'discussion' | 'references'>('introduction')

const METHODOLOGY_SUBHEADING_LABELS = [
  'Research Design', 'Research Approach', 'Research Settings', 'Business Process',
  'Participants of the Study', 'Sampling Technique', 'Research Instruments',
  'Data Collection, Instrument, and Procedure', 'Sources of Data',
  'Statistical Treatment of Data', 'Data Analysis', 'Ethical Considerations',
  'Development Model',
]

const SECTION_KEY_MAP = {
  'Introduction': 'introduction',
  'Methodology': 'methods',
  'Results': 'results',
  'Discussion': 'discussion'
} as const

const REQUIRED_SECTIONS = Object.keys(SECTION_KEY_MAP) as (keyof typeof SECTION_KEY_MAP)[]

type ImradKey = 'introduction' | 'methods' | 'results' | 'discussion' | 'references'
const ALL_IMRAD_TABS: ImradKey[] = ['introduction', 'methods', 'results', 'discussion', 'references']

const imradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: '',
  references: ''
})

const rawImradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: '',
  references: ''
})

const availableImradTabs = computed<ImradKey[]>(() => {
  const all = ALL_IMRAD_TABS.filter(t => imradSections[t])
  const hasResults = all.includes('results')
  const hasDiscussion = all.includes('discussion')
  if (hasResults || hasDiscussion) {
    const merged: ImradKey[] = all.filter(t => t !== 'results' && t !== 'discussion')
    merged.push('results')
    return merged
  }
  return all
})

const imradTextarea = ref<HTMLTextAreaElement | null>(null)
const autoResizeTextarea = (e?: Event) => {
  const el = (e?.target as HTMLTextAreaElement) ?? imradTextarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 600) + 'px'
}
watch(activeImradTab, async () => { await nextTick(); autoResizeTextarea() })
watch(
  () => imradSections[activeImradTab.value as ImradKey],
  async () => { await nextTick(); autoResizeTextarea() }
)

// ── References preview ───────────────────────────────────────────────
const parsedReferencesPreview = computed((): string[] => {
  const raw = imradSections.references?.trim()
  if (!raw) return []
  const byBlankLine = raw.split(/\n\n+/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
  if (byBlankLine.length > 1) return byBlankLine
  const byIEEE = raw.split(/(?=\[\d+\])/).map(s => s.trim()).filter(Boolean)
  if (byIEEE.length > 1) return byIEEE
  const byNumbered = raw.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
  if (byNumbered.length > 1) return byNumbered
  return [raw]
})

const linkifyReferences = (raw: string): string => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const linkify = (s: string): string => {
    let out = s.replace(/https?:\/\/[^\s,)\]&]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="ref-link-preview">${url}</a>`)
    out = out.replace(/(?<!href=")(doi:\s*)(10\.[^\s,)\]&]+)/gi, (_, doi) => `doi: <a href="https://doi.org/${doi}" target="_blank" rel="noopener noreferrer" class="ref-link-preview">${doi}</a>`)
    return out
  }
  const escapedRaw = esc(raw)
  const yearMatch = escapedRaw.match(/^(.*?)\((\d{4}[a-z]?(?:,\s*[A-Z][a-z]+)?)\)\.\s*(.*)$/s)
  if (yearMatch) {
    const authorBlock = (yearMatch[1] ?? '').trim().replace(/\.$/, '').trim()
    const year = yearMatch[2] ?? ''
    const remainder = (yearMatch[3] ?? '').trim()
    const titleSourceMatch = remainder.match(/^(.*?[.!?])\s+([A-Z\d*(].*)$/s)
    let titleHtml = '', sourceHtml = ''
    if (titleSourceMatch) {
      const titleText = (titleSourceMatch[1] ?? '').replace(/\.$/, '').trim()
      const sourceText = (titleSourceMatch[2] ?? '').trim()
      titleHtml = `<em class="ref-title-preview">${titleText}.</em> `
      sourceHtml = linkify(sourceText)
    } else {
      titleHtml = `<em class="ref-title-preview">${linkify(remainder)}</em>`
    }
    return `<span class="ref-authors-preview">${esc(authorBlock)}.</span> <span class="ref-year-preview">(${year}).</span> ` + titleHtml + sourceHtml
  }
  const ieeeMatch = escapedRaw.match(/^(\[\d+\])\s+(.*)$/s)
  if (ieeeMatch) return `<span class="ref-num-preview">${ieeeMatch[1] ?? ''}</span> ` + linkify(ieeeMatch[2] ?? '')
  const numMatch = escapedRaw.match(/^(\d+\.)\s+(.*)$/s)
  if (numMatch) return `<span class="ref-num-preview">${numMatch[1] ?? ''}</span> ` + linkify(numMatch[2] ?? '')
  return linkify(escapedRaw)
}

const authors = ref<string[]>([''])
const selectedPages = ref<number[]>([])
const sectionPages = ref<Record<string, number[]>>({})
const isManuscript = ref(false)
const isDragging = ref(false)

const missingSections = computed(() => {
  const present = Object.keys(uploadMetadata.section_pages || {})
  return REQUIRED_SECTIONS.filter((s) => !present.includes(SECTION_KEY_MAP[s]))
})

// ── Zoom modal ───────────────────────────────────────────────────────
const showZoomModal = ref(false)
const zoomedPage = ref<PageData | null>(null)
const openZoom = (page: PageData) => { zoomedPage.value = page; showZoomModal.value = true }
const closeZoom = () => { showZoomModal.value = false; zoomedPage.value = null }

const thumbSrc = (thumbnail: string) => {
  if (!thumbnail) return ''
  if (thumbnail.startsWith('data:')) return thumbnail
  return `data:image/jpeg;base64,${thumbnail}`
}

// ── Progress Polling ─────────────────────────────────────────────────
let progressTimer: number | null = null

function stopProgressListening() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function listenForProgress(sid: string) {
  stopProgressListening()

  // Poll every 2 seconds
  progressTimer = window.setInterval(async () => {
    try {
      const data = await api.getUploadStatus(sid)
      if (data.progress !== undefined) extractionProgress.value = data.progress
      if (data.message) extractionMessage.value = data.message

      if (data.status === 'completed' || data.status === 'failed') {
        stopProgressListening()
      }
    } catch (err) {
      console.error('Polling error:', err)
      // We don't stop on a single error to handle transient network hiccups
    }
  }, 2000)
}

// ── File handling ────────────────────────────────────────────────────
const handleFileChange = (e: Event) => {
  if (processingDoc.value) return
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file.value = target.files[0]
    startInitialExtraction(true)
  }
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  if (processingDoc.value || step.value !== 1) return
  const dropped = e.dataTransfer?.files?.[0]
  if (dropped && dropped.type === 'application/pdf') {
    file.value = dropped
    startInitialExtraction(true)
  } else if (dropped) {
    uploadError.value = 'Only PDF files are accepted. Please retry.'
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (!processingDoc.value && step.value === 1) isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  if (e.relatedTarget === null) isDragging.value = false
}

// ── Extraction ───────────────────────────────────────────────────────
const startInitialExtraction = async (autoExtract: boolean = true) => {
  if (!file.value) return
  processingDoc.value = true
  uploadError.value = ''
  extractionProgress.value = 2
  extractionMessage.value = 'Reading PDF structure...'

  const sid = crypto.randomUUID()
  sessionId.value = sid
  listenForProgress(sid)

  try {
    const preview = await api.getUploadPreview(file.value, autoExtract, sid)
    stopProgressListening()
    extractionProgress.value = 100
    extractionMessage.value = 'Finalizing review screen...'

    sessionId.value = preview.session_id
    Object.assign(uploadMetadata, preview.metadata)
    if (preview.metadata.author) {
      const splitAuthors = preview.metadata.author.split(/\s*\|\s*/).map((a: string) => a.trim()).filter((a: string) => a.length > 0)
      authors.value = splitAuthors.length > 0 ? splitAuthors : ['']
    } else { authors.value = [''] }

    pages.value = preview.pages
    selectedPages.value = preview.pages.map((p: PageData) => p.page_num)

    if (preview.sections) {
      Object.assign(rawImradSections, preview.sections as Record<string, string>)
      const cleaned = { ...preview.sections as Record<string, string> }
      for (const k of ALL_IMRAD_TABS) {
        if (cleaned[k]) cleaned[k] = cleaned[k].replace(/\[\[(?:TABLE|FIGURE)_IMAGE:.*?\]\]/g, '')
      }
      Object.assign(imradSections, cleaned)
    }
    if (preview.media) uploadMetadata.media = preview.media
    if (preview.references) {
      imradSections.references = preview.references
      rawImradSections.references = preview.references
    }

    sectionPages.value = preview.section_pages || {}
    isManuscript.value = preview.metadata?.is_manuscript ?? false

    const firstAvailable = ALL_IMRAD_TABS.find(t => imradSections[t])
    if (firstAvailable) activeImradTab.value = firstAvailable === 'discussion' ? 'results' : firstAvailable

    setTimeout(() => { step.value = 2; processingDoc.value = false }, 400)
  } catch (err) {
    stopProgressListening()
    uploadError.value = (err as Error).message || 'Failed to parse PDF.'
    processingDoc.value = false
  }
}

const triggerFallback = async () => {
  if (!file.value) return
  processingDoc.value = true
  const prevStep = step.value
  step.value = 1
  uploadError.value = ''
  extractionProgress.value = 5
  extractionMessage.value = 'Preparing document...'

  const sid = crypto.randomUUID()
  sessionId.value = sid
  listenForProgress(sid)

  try {
    const preview = await api.getUploadPreview(file.value, false, sid)
    stopProgressListening()
    extractionProgress.value = 100
    extractionMessage.value = 'Rendering pages...'
    sessionId.value = preview.session_id
    Object.assign(uploadMetadata, preview.metadata)
    pages.value = preview.pages
    if (preview.sections) {
      Object.assign(rawImradSections, preview.sections as Record<string, string>)
      const cleaned = { ...preview.sections as Record<string, string> }
      for (const k of ALL_IMRAD_TABS) {
        if (cleaned[k]) cleaned[k] = cleaned[k].replace(/\[\[(?:TABLE|FIGURE)_IMAGE:.*?\]\]/g, '')
      }
      Object.assign(imradSections, cleaned)
    }
    if (preview.media) uploadMetadata.media = preview.media
    if (preview.references) {
      imradSections.references = preview.references
      rawImradSections.references = preview.references
    }
    sectionPages.value = preview.section_pages || {}
    selectedPages.value = preview.pages.map(p => p.page_num)
    isManuscript.value = false
    const firstAvailable = ALL_IMRAD_TABS.find(t => imradSections[t])
    if (firstAvailable) activeImradTab.value = firstAvailable === 'discussion' ? 'results' : firstAvailable
    setTimeout(() => { step.value = 2; processingDoc.value = false }, 400)
  } catch (err) {
    stopProgressListening()
    uploadError.value = (err as Error).message || 'Failed to trigger fallback.'
    step.value = prevStep
    processingDoc.value = false
  }
}

const cancelUpload = () => {
  step.value = 1
  file.value = null
  pages.value = []
  selectedPages.value = []
  uploadMetadata.title = ''
}

// ── Page selection ───────────────────────────────────────────────────
const togglePage = (pageNum: number, event: Event) => {
  const tgt = (event.target as HTMLElement)
  if (tgt.closest('.thumb-img') || tgt.closest('.thumb-hover-hint')) return
  const index = selectedPages.value.indexOf(pageNum)
  if (index > -1) selectedPages.value.splice(index, 1)
  else selectedPages.value.push(pageNum)
}

const getSectionsForPage = (pageNum: number) => {
  const found: string[] = []
  for (const [section, pNums] of Object.entries(sectionPages.value)) {
    if (pNums.includes(pageNum)) found.push(section)
  }
  return found
}

const selectAll = () => { selectedPages.value = pages.value.map(p => p.page_num) }
const deselectAll = () => { selectedPages.value = [] }
const addAuthor = () => { authors.value.push('') }
const removeAuthor = (index: number) => {
  if (authors.value.length > 1) authors.value.splice(index, 1)
  else authors.value[0] = ''
}

// ── Confirm upload ───────────────────────────────────────────────────
const handleFinalConfirm = async () => {
  if (selectedPages.value.length === 0) { uploadError.value = 'Please select at least one page to index.'; return }
  uploadingPaper.value = true
  uploadError.value = ''
  try {
    const finalAuthorString = authors.value.map(a => a.trim()).filter(a => a.length > 0).join(' | ')
    await api.confirmUpload({
      session_id: sessionId.value,
      metadata: {
        ...uploadMetadata,
        author: finalAuthorString || 'Unknown',
        degree_program: uploadMetadata.degree_program || 'N/A',
        keywords: uploadMetadata.keywords || '',
      },
      selected_pages: selectedPages.value,
      introduction: rawImradSections.introduction || imradSections.introduction,
      methods: rawImradSections.methods || imradSections.methods,
      results: rawImradSections.results || imradSections.results,
      discussion: rawImradSections.results || imradSections.results,
      references: rawImradSections.references || imradSections.references,
      media: uploadMetadata.media,
    })
    step.value = 3
    setTimeout(() => {
      if (isStaff.value) router.push({ name: 'management' })
      else router.push({ name: 'profile' })
    }, 2000)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to finalize upload.'
  } finally { uploadingPaper.value = false }
}

// ── Sample Documents ──────────────────────────────────────────────
const sampleDocs = ref<SampleDocument[]>([])
const fetchingSampleDocId = ref<string | null>(null)

const loadSampleDocs = async () => {
  try { sampleDocs.value = await api.getSampleDocuments() }
  catch { sampleDocs.value = [] }
}

const attachSampleDoc = async (doc: SampleDocument) => {
  if (processingDoc.value || fetchingSampleDocId.value || step.value !== 1) return
  fetchingSampleDocId.value = doc.id
  uploadError.value = ''
  try {
    const safeFilename = `${doc.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_')}.pdf`
    file.value = await api.fetchSampleDocumentAsFile(doc.id, safeFilename)
    startInitialExtraction(true)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to load sample document.'
  } finally {
    fetchingSampleDocId.value = null
  }
}

onMounted(loadSampleDocs)
</script>

<template>
  <div class="up-page" @dragover.prevent="handleDragOver" @drop="handleDrop" @dragleave="handleDragLeave">

    <!-- Full-screen drag overlay -->
    <Teleport to="body">
      <div v-if="isDragging" class="drag-overlay">
        <div class="drag-overlay-inner">
          <FileUp :size="48" color="#00a651" />
          <p>Drop your PDF here</p>
        </div>
      </div>
    </Teleport>

    <!-- ── Top Bar ─────────────────────────────────────────── -->
    <header class="up-topbar">
      <div class="up-topbar-left">
        <div class="up-logo-mark">
          <FileUp :size="18" color="#00a651" />
        </div>
        <span class="up-brand">Upload Document</span>
      </div>


      <div class="up-topbar-right">
        <!-- Step rail -->
        <div class="steps-rail inside-navbar">
          <div class="step-item" :class="{ active: step >= 1, done: step > 1 }">
            <div class="step-num">
              <Check v-if="step > 1" :size="12" /><span v-else>1</span>
            </div>
            <span class="step-label">Upload</span>
          </div>
          <div class="step-line" :class="{ loading: step === 1 }" />
          <div class="step-item" :class="{ active: step >= 2, done: step > 2 }">
            <div class="step-num">
              <Check v-if="step > 2" :size="12" /><span v-else>2</span>
            </div>
            <span class="step-label">Review</span>
          </div>
          <div class="step-line" :class="{ loading: step === 2 }" />
          <div class="step-item" :class="{ active: step >= 3 }">
            <div class="step-num">
              <span>3</span>
            </div>
            <span class="step-label">Done</span>
          </div>
        </div>

        <button v-if="step === 2" class="cancel-btn" @click="cancelUpload" style="margin-left: 1rem;">
          <X :size="14" /> Cancel
        </button>
      </div>
    </header>

    <!-- ── Content ─────────────────────────────────────────── -->
    <main class="up-content">
      <!-- Step 1 & 3: Centered card -->
      <div v-if="step !== 2" class="upload-center">

        <!-- Processing -->
        <div v-if="processingDoc" class="processing-container">
          <BookLoader :progress="extractionProgress" :message="extractionMessage" />
        </div>

        <!-- Step 1: Drop zone -->
        <div v-else-if="step === 1" class="upload-card">
          <div class="upload-card-head">
            <div class="upload-card-icon">
              <FileUp :size="22" color="#00a651" />
            </div>
            <h1 class="upload-card-title">Upload Your Research</h1>
            <p>Upload a PDF to index your thesis or capstone into the repository.</p>
          </div>

          <div v-if="uploadError" class="error-banner"
            :class="{ 'terminal-error': uploadError.includes('Upload Terminated') }">
            <ShieldAlert v-if="uploadError.includes('Upload Terminated')" :size="24" />
            <AlertCircle v-else :size="16" />
            <div class="error-content">
              <strong>{{ uploadError.includes('Upload Terminated') ? 'Upload Rejected' : 'Error Detected' }}</strong>
              <p>{{ uploadError }}</p>
            </div>
          </div>

          <div class="drop-zone" @click="!processingDoc && fileInput?.click()"
            :class="{ processing: processingDoc, dragging: isDragging }">
            <input type="file" ref="fileInput" @change="handleFileChange" style="display:none" accept="application/pdf"
              :disabled="processingDoc" />
            <FileUp :size="40" color="#00a651" />
            <div class="drop-text">
              <strong>Click to upload</strong> or drag and drop
              <span>PDF files only</span>
            </div>
          </div>

          <!-- ── Sample Documents Panel ─────────────────────────── -->
          <div v-if="sampleDocs.length > 0" class="sample-docs-panel">
            <div class="sample-docs-header">
              <div class="sample-docs-header-left">
                <div class="sample-docs-icon-wrap">
                  <FileText :size="13" color="#00a651" />
                </div>
                <div>
                  <p class="sample-docs-title">Sample Documents</p>
                  <p class="sample-docs-subtitle">Select a pre-stored document to test the system evaluation.</p>
                </div>
              </div>
            </div>

            <ul class="sample-docs-list">
              <li v-for="doc in sampleDocs" :key="doc.id" class="sample-doc-row"
                :class="{ 'is-loading': fetchingSampleDocId === doc.id }" @click="attachSampleDoc(doc)">
                <div class="sample-doc-icon">
                  <Loader2 v-if="fetchingSampleDocId === doc.id" :size="14" class="spin" />
                  <FileText v-else :size="14" color="#00a651" />
                </div>
                <span class="sample-doc-name">{{ doc.name }}</span>
                <span class="sample-doc-size">
                  {{ doc.size_bytes >= 1_048_576
                    ? (doc.size_bytes / 1_048_576).toFixed(1) + ' MB'
                    : Math.round(doc.size_bytes / 1024) + ' KB' }}
                </span>
                <div class="sample-doc-actions">
                  <div class="attach-btn-mobile">
                    <Plus :size="14" />
                    <span>Attach</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div v-else-if="step === 3" class="upload-card">
          <div class="upload-success">
            <CheckCircle :size="56" color="#00a651" />
            <h2>Research Indexed!</h2>
            <p>Your paper has been stored in the repository. Redirecting you now…</p>
          </div>
        </div>
      </div>

      <!-- Step 2: Review UI -->
      <div v-else class="review-wrap">
        <header class="review-bar">
          <div class="review-bar-left">
            <div class="review-bar-icon">
              <FileText :size="20" color="#00a651" />
            </div>
            <div>
              <h1 class="review-bar-title">Review & Index Document</h1>
              <p class="review-bar-sub">Verify extracted info and select indexable pages.</p>
            </div>
          </div>
          <div class="review-bar-right">
            <div class="file-pill">
              <span class="file-pill-label">FILE</span>
              <span class="file-pill-name">{{ file?.name }}</span>
              <span class="file-pill-count"><strong>{{ selectedPages.length }}</strong>/{{ pages.length }} pages</span>
            </div>
            <button @click="handleFinalConfirm" class="confirm-btn" :disabled="uploadingPaper">
              <Loader2 v-if="uploadingPaper" :size="15" class="spin" />
              <Check v-else :size="15" />
              Confirm Indexing
            </button>
          </div>
        </header>

        <!-- Manuscript notice -->
        <div v-if="isManuscript" class="notice-banner blue">
          <div class="notice-icon">
            <AlertCircle :size="18" color="#3b82f6" />
          </div>
          <div class="notice-body">
            <p class="notice-title" style="color:#1e40af">Manuscript / In-Progress Document</p>
            <p class="notice-desc" style="color:#3b82f6">No IMRAD section headings were detected. The first 10 pages
              are shown for preview. Fill in sections manually or browse all pages.</p>
          </div>
          <div class="notice-actions">
            <button @click="triggerFallback" class="notice-btn" style="background:#1d4ed8">
              <RefreshCw :size="13" /> Browse All Pages
            </button>
            <button @click="cancelUpload" class="notice-btn ghost">Decline &amp; Reset</button>
          </div>
        </div>

        <!-- Missing sections notice -->
        <div v-if="missingSections.length > 0" class="notice-banner amber">
          <div class="notice-icon">
            <AlertTriangle :size="18" color="#f59e0b" />
          </div>
          <div class="notice-body">
            <p class="notice-title">Document uploaded has incomplete IMRAD structure.</p>
            <p class="notice-desc">The following sections could not be found. Search accuracy may be reduced.</p>
            <div class="missing-list">
              <span v-for="s in missingSections" :key="s" class="missing-badge"><span class="missing-dot" />{{ s
                }}</span>
            </div>
          </div>
          <div class="notice-actions">
            <button @click="cancelUpload" class="notice-btn ghost">Cancel Indexing</button>
          </div>
        </div>

        <!-- Error banner in review -->
        <div v-if="uploadError" class="error-banner"
          :class="{ 'terminal-error': uploadError.includes('Upload Terminated') }">
          <ShieldAlert v-if="uploadError.includes('Upload Terminated')" :size="24" />
          <AlertCircle v-else :size="16" />
          <div class="error-content">
            <strong>{{ uploadError.includes('Upload Terminated') ? 'Upload Rejected' : 'Error' }}</strong>
            <p>{{ uploadError }}</p>
          </div>
        </div>

        <div class="review-grid">
          <!-- Left: Metadata -->
          <section class="meta-panel">
            <div class="meta-panel-head">
              <span class="step-badge">1</span>
              <h4>Verify Metadata</h4>
            </div>
            <div class="fg"><label>Title</label><textarea v-model="uploadMetadata.title" placeholder="Research Title" />
            </div>
            <div class="fg">
              <label>Author(s)</label>
              <div class="authors-stack">
                <div v-for="(author, index) in authors" :key="index" class="author-row">
                  <input v-model="authors[index]" type="text" placeholder="Full Name of Author" />
                  <button @click="removeAuthor(index)" class="icon-btn red">
                    <Trash2 :size="14" />
                  </button>
                </div>
                <button @click="addAuthor" class="add-btn">
                  <Plus :size="13" /> Add Author
                </button>
              </div>
            </div>
            <div class="fg-row">
              <div class="fg"><label>Year</label><input v-model="uploadMetadata.year" type="text"
                  placeholder="e.g., 2025" /></div>
              <div class="fg">
                <label>Type</label>
                <select v-model="uploadMetadata.project_type">
                  <option>Thesis</option>
                  <option>Capstone Project</option>
                  <option>Technical Report</option>
                </select>
              </div>
            </div>
            <div class="fg"><label>Abstract</label><textarea v-model="uploadMetadata.abstract" class="abstract-area"
                placeholder="Enter abstract…" /></div>
            <div class="fg">
              <label>Department</label>
              <select v-model="uploadMetadata.department">
                <option>N/A</option>
                <option>Department of Computer Science</option>
                <option>Department of Information Technology</option>
                <option>Department of Information Systems</option>
                <option>Department of Computer Engineering</option>
                <option>College of Computer Science</option>
                <option>College of Engineering</option>
                <option>College of Information Technology</option>
              </select>
            </div>
            <div class="fg">
              <label>Degree Program</label>
              <select v-model="uploadMetadata.degree_program">
                <option>N/A</option>
                <option>BSCS</option>
                <option>BSIT</option>
                <option>BSIS</option>
                <option>BSCpE</option>
              </select>
            </div>
            <div class="fg"><label>Keywords</label>
              <input v-model="uploadMetadata.keywords" type="text"
                placeholder="e.g. machine learning, NLP, deep learning" />
            </div>
          </section>

          <div class="review-main">
            <!-- IMRAD panel -->
            <section class="imrad-panel">
              <div class="meta-panel-head" style="margin-bottom:1.5rem">
                <span class="step-badge">2</span>
                <h4>Refine IMRAD Sections</h4>
              </div>

              <div v-if="uploadMetadata.detected_subheadings && uploadMetadata.detected_subheadings.length > 0"
                class="subheadings-preview">
                <template
                  v-if="uploadMetadata.detected_subheadings.some(s => METHODOLOGY_SUBHEADING_LABELS.includes(s))">
                  <label class="fg-label">Detected Methodology Components:</label>
                  <div class="sub-tags" style="margin-bottom:0.75rem">
                    <span
                      v-for="sub in uploadMetadata.detected_subheadings.filter(s => METHODOLOGY_SUBHEADING_LABELS.includes(s))"
                      :key="sub" class="sub-tag">
                      <Check :size="12" /> {{ sub }}
                    </span>
                  </div>
                </template>
                <template
                  v-if="uploadMetadata.detected_subheadings.some(s => !METHODOLOGY_SUBHEADING_LABELS.includes(s))">
                  <label class="fg-label">Detected Results Components:</label>
                  <div class="sub-tags">
                    <span
                      v-for="sub in uploadMetadata.detected_subheadings.filter(s => !METHODOLOGY_SUBHEADING_LABELS.includes(s))"
                      :key="sub" class="sub-tag sub-tag-results">
                      <Check :size="12" /> {{ sub }}
                    </span>
                  </div>
                </template>
              </div>

              <div class="imrad-tabs">
                <button v-for="tab in availableImradTabs" :key="tab" type="button" class="imrad-tab-btn"
                  :class="{ active: activeImradTab === tab }" @click="activeImradTab = tab as ImradKey">
                  {{ tab === 'results' ? 'Results and Discussion' : tab.charAt(0).toUpperCase() + tab.slice(1) }}
                </button>
              </div>

              <div class="imrad-content">
                <div v-if="uploadMetadata.trim_points && uploadMetadata.trim_points[activeImradTab]" class="trim-alert">
                  <AlertCircle :size="16" />
                  <span><strong>Auto-Trimmed:</strong> This section was trimmed at
                    <strong>"{{ uploadMetadata.trim_points[activeImradTab] }}"</strong></span>
                </div>

                <!-- References: split pane -->
                <template v-if="activeImradTab === 'references'">
                  <div class="ref-split-wrap">
                    <div class="ref-preview-pane">
                      <div class="ref-pane-label">
                        <span>Preview</span>
                        <span class="ref-count-badge">{{ parsedReferencesPreview.length }} entr{{
                          parsedReferencesPreview.length === 1 ? 'y' : 'ies' }} detected</span>
                      </div>
                      <div v-if="parsedReferencesPreview.length > 0" class="ref-preview-list">
                        <div v-for="(entry, idx) in parsedReferencesPreview" :key="idx" class="ref-preview-entry"
                          v-html="linkifyReferences(entry)" />
                      </div>
                      <div v-else class="ref-preview-empty"><span>No references extracted yet.</span></div>
                    </div>
                    <div class="ref-editor-pane">
                      <div class="ref-pane-label">
                        <span>Raw Text <span class="ref-pane-hint">(editable)</span></span>
                      </div>
                      <textarea ref="imradTextarea" v-model="imradSections[activeImradTab]"
                        class="imrad-textarea ref-textarea" @input="autoResizeTextarea"
                        placeholder="No references extracted for this section…" />
                    </div>
                  </div>
                </template>

                <!-- All other tabs -->
                <textarea v-else ref="imradTextarea" v-model="imradSections[activeImradTab]"
                  class="imrad-textarea maximized" @input="autoResizeTextarea"
                  placeholder="No text extracted for this section…"></textarea>
              </div>
            </section>

            <!-- Page selector -->
            <section class="page-panel">
              <div class="page-panel-head">
                <div class="page-panel-title">
                  <span class="step-badge">3</span>
                  <h4>Select Pages to Index</h4>
                </div>
                <div class="page-panel-actions">
                  <p class="selector-hint">IMRAD pages are pre-selected.</p>
                  <div class="selector-btns">
                    <button @click="selectAll" class="text-btn">Select All</button>
                    <span class="dot-sep" />
                    <button @click="deselectAll" class="text-btn">Uncheck All</button>
                  </div>
                </div>
              </div>
              <div class="thumbs-grid">
                <div v-for="(p, idx) in pages" :key="p.label || p.page_num + '-' + idx" class="thumb-card"
                  :class="{ selected: selectedPages.includes(p.page_num) }" @click="togglePage(p.page_num, $event)">
                  <div class="thumb-wrap">
                    <img :src="thumbSrc(p.thumbnail)" loading="lazy" class="thumb-img" @click.stop="openZoom(p)"
                      title="Click to preview" />
                    <div class="thumb-num">{{ p.label || 'P' + p.page_num }}</div>
                    <div class="thumb-sec-badges" v-if="getSectionsForPage(p.page_num).length > 0">
                      <span v-for="sec in getSectionsForPage(p.page_num)" :key="sec" class="sec-badge" :class="sec">{{
                        sec.substring(0, 4) }}</span>
                    </div>
                    <div class="thumb-hover-hint">
                      <Eye :size="14" />
                    </div>
                    <div class="thumb-overlay">
                      <div class="thumb-check">
                        <Check :size="14" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>

    <!-- Zoom modal -->
    <Teleport to="body">
      <div v-if="showZoomModal" class="zoom-overlay" @click="closeZoom">
        <div class="zoom-modal" @click.stop>
          <button class="zoom-close" @click="closeZoom">
            <X :size="20" />
          </button>
          <img :src="thumbSrc(zoomedPage?.thumbnail ?? '')" class="zoom-img" />
          <p class="zoom-caption">Page {{ zoomedPage?.page_num }}</p>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@400;500;600;700&display=swap');

/* ── Tokens ──────────────────────────────────────────────────── */
.up-page {
  --green: #00a651;
  --green-dk: #007d3d;
  --green-dim: #e6f4ed;
  --ink: #181c18;
  --ink-2: #3d4239;
  --ink-3: #7a7f75;
  --rule: #e4e5e0;
  --surface: #f5f5f2;
  --paper: #ffffff;
  --hero: #0d1f12;

  min-height: 100vh;
  background: var(--surface);
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
  display: flex;
  flex-direction: column;
}

/* ── Top bar ─────────────────────────────────────────────────── */
.up-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 2rem;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
}

.up-topbar-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.up-logo-mark {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
}

.up-brand {
  font-family: 'Lora', serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
}

@media (max-width: 480px) {
  .up-brand {
    display: block;
  }
}

.up-topbar-right {
  min-width: 120px;
  display: flex;
  justify-content: flex-end;
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: 1.5px solid var(--rule);
  border-radius: 6px;
  padding: 0.4rem 0.85rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.82rem;
  color: var(--ink-3);
  cursor: pointer;
  transition: all 0.14s;
}

.cancel-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

/* ── Steps rail ──────────────────────────────────────────────── */
.steps-rail {
  display: flex;
  align-items: center;
}

/* Detached version (Mobile content area) */
.steps-rail.detached {
  justify-content: center;
  gap: 1.5rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 1rem;
  background: var(--paper);
}

/* Navbar version (Desktop topbar) */
.steps-rail.inside-navbar {
  margin: 0;
}

@media (max-width: 600px) {
  .steps-rail.detached {
    padding: 1rem 0.5rem;
    gap: 0.75rem;
  }
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--ink-3);
}

.step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--rule);
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.step-item.active .step-num {
  border-color: var(--rule);
  color: var(--green);
  background: var(--paper);
}

.step-item.done .step-num {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.step-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.step-item.active .step-label {
  color: var(--green-dk);
}

.step-line {
  width: 28px;
  height: 2px;
  background: var(--rule);
  margin: 0 0.4rem;
  position: relative;
  overflow: hidden;
}

.step-line.loading {
  background: linear-gradient(90deg,
      var(--rule) 0%,
      var(--green) 50%,
      var(--rule) 100%);
  background-size: 200% 100%;
  animation: step-line-sweep 1.2s infinite linear;
}

@keyframes step-line-sweep {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Main content ────────────────────────────────────────────── */
.up-content {
  flex: 1;
  padding: 2rem 2.5rem 5rem;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* ── Upload center ───────────────────────────────────────────── */
.upload-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
}

.upload-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 2.5rem;
  width: 100%;
  max-width: 520px;
}

.upload-card-head {
  text-align: center;
  margin-bottom: 1.75rem;
}

.upload-card-icon {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.upload-card-title {
  font-family: 'Lora', serif;
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.upload-card p {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
}

.processing-container {
  width: 100%;
  max-width: 600px;
  margin: 2rem auto;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.drop-zone {
  border: 2px dashed var(--rule);
  border-radius: 8px;
  padding: 2.5rem 1.5rem;
  cursor: pointer;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  transition: border-color 0.14s, background 0.14s;
}

.drop-zone.dragging,
.drop-zone:hover:not(.processing) {
  border-color: var(--green);
  background: var(--green-dim);
}

.drop-zone.processing {
  cursor: wait;
  opacity: 0.6;
  pointer-events: none;
}

.drop-text {
  font-size: 0.88rem;
  color: var(--ink-3);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.drop-text strong {
  color: var(--ink);
  font-weight: 700;
}

/* ── Sample Documents Panel (Evaluation Feature) ────────────────── */
.sample-docs-panel {
  margin-top: 1.5rem;
  border: 1.5px solid var(--rule);
  border-radius: 10px;
  background: var(--paper);
  overflow: hidden;
}

.sample-docs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--rule);
  background: var(--surface);
}

.sample-docs-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sample-docs-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sample-docs-title {
  margin: 0 0 0.1rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink);
}

.sample-docs-subtitle {
  margin: 0;
  font-size: 0.72rem;
  color: var(--ink-3);
  line-height: 1.3;
}

.sample-docs-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sample-doc-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--rule);
  transition: background 0.12s, border-left-color 0.12s;
  border-left: 3px solid transparent;
  user-select: none;
}

.sample-doc-row:last-child {
  border-bottom: none;
}

.sample-doc-row:hover:not(.is-loading) {
  background: var(--green-dim);
  border-left-color: var(--green);
}

.sample-doc-row.is-loading {
  opacity: 0.65;
  cursor: wait;
}

.sample-doc-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sample-doc-name {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sample-doc-size {
  font-size: 0.72rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}

.sample-doc-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.attach-btn-mobile {
  display: none;
  align-items: center;
  gap: 0.35rem;
  background: var(--green);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

@media (max-width: 768px) {
  .attach-btn-mobile {
    display: flex;
  }
}

.upload-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  text-align: center;
}

.upload-success h2 {
  font-family: 'Lora', serif;
  margin: 0;
}

.upload-success p {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
}

/* ── Error banner ────────────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 0.84rem;
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.terminal-error {
  background: #fff1f2 !important;
  border-color: #e11d48 !important;
  color: #9f1239 !important;
  padding: 1.5rem !important;
}

.error-content {
  flex: 1;
}

.error-content strong {
  display: block;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
  font-weight: 800;
}

.error-content p {
  font-size: 0.88rem;
  margin: 0;
  opacity: 0.9;
  line-height: 1.4;
}

/* ── Review ──────────────────────────────────────────────────── */
.review-wrap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-bar {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.review-bar-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.review-bar-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.review-bar-title {
  font-family: 'Lora', serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.15rem;
}

.review-bar-sub {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin: 0;
}

.review-bar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.file-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 5px;
  padding: 0.35rem 0.75rem;
  font-size: 0.76rem;
}

.file-pill-label {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.62rem;
  color: var(--ink-3);
}

.file-pill-name {
  color: var(--ink);
  font-weight: 600;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-pill-count strong {
  color: var(--green-dk);
}

.confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.1rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;
  flex-shrink: 0;
}

.confirm-btn:hover:not(:disabled) {
  background: var(--green-dk);
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

/* ── Notices ─────────────────────────────────────────────────── */
.notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.9rem 1.1rem;
  border-radius: 8px;
  border: 1px solid;
  flex-wrap: wrap;
}

.notice-banner.amber {
  background: #fffbeb;
  border-color: #fde68a;
}

.notice-banner.blue {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.notice-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.notice-body {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-size: 0.86rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.notice-desc {
  font-size: 0.80rem;
  margin: 0;
  text-align: justify;
}

.notice-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.notice-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.35rem 0.8rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  background: #b45309;
}

.notice-btn.ghost {
  background: transparent;
  border: 1.5px solid #b45309;
  color: #b45309;
}

.missing-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.4rem;
}

.missing-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #fef9c3;
  color: #78350f;
  border: 1px solid #fde68a;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  width: fit-content;
  text-transform: capitalize;
}

.missing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

/* ── Review grid ─────────────────────────────────────────────── */
.review-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 1.25rem;
  align-items: start;
}

.review-main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

/* ── Form groups ─────────────────────────────────────────────── */
.fg {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.9rem;
}

.fg label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07rem;
  color: var(--ink-3);
}

.fg input,
.fg select,
.fg textarea {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: 1.5px solid var(--rule);
  border-radius: 3px;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.9rem;
  transition: border-color 0.14s;
  box-sizing: border-box;
}

.fg input:focus,
.fg select:focus,
.fg textarea:focus {
  outline: none;
  border-color: var(--green);
}

.fg textarea {
  resize: vertical;
  min-height: 80px;
}

.abstract-area {
  min-height: 180px !important;
}

.fg-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .fg-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

.authors-stack {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.author-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.author-row input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 5px;
  padding: 0.45rem 0.65rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.86rem;
  color: var(--ink);
  outline: none;
}

.author-row input:focus {
  border-color: var(--green);
}

.icon-btn {
  background: none;
  border: 1px solid var(--rule);
  border-radius: 5px;
  padding: 0.35rem;
  cursor: pointer;
  color: var(--ink-3);
  display: flex;
  align-items: center;
  transition: all 0.13s;
}

.icon-btn.red:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: 1.5px dashed var(--rule);
  border-radius: 5px;
  padding: 0.4rem 0.7rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.78rem;
  color: var(--ink-3);
  cursor: pointer;
  transition: all 0.13s;
}

.add-btn:hover {
  border-color: var(--green);
  color: var(--green-dk);
}

/* ── Panels ──────────────────────────────────────────────────── */
.meta-panel,
.imrad-panel,
.page-panel {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1.25rem;
}

.imrad-panel {
  padding: 1.5rem;
}

.meta-panel-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--rule);
}

.meta-panel-head h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}

.step-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--hero);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── IMRAD ───────────────────────────────────────────────────── */
.subheadings-preview {
  margin-bottom: 1.25rem;
}

.fg-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-3);
  margin-bottom: 0.5rem;
}

.sub-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sub-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--green-dim);
  color: var(--green-dk);
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}

.sub-tag-results {
  background: #fff7ed;
  color: #c2410c;
}

.imrad-tabs {
  display: flex;
  gap: 0.25rem;
  background: var(--surface);
  padding: 0.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow-x: auto;
  scrollbar-width: none;
  /* Hide scrollbar for cleaner look */
}

.imrad-tabs::-webkit-scrollbar {
  display: none;
}

.imrad-tab-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 0.5rem;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.imrad-tab-btn:hover {
  background: rgba(0, 0, 0, 0.03);
  color: var(--ink);
}

.imrad-tab-btn.active {
  background: var(--paper);
  color: var(--green-dk);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.imrad-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.trim-alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  line-height: 1.4;
}

.trim-alert strong {
  color: #78350f;
}

.imrad-textarea {
  width: 100%;
  min-height: 480px;
  max-height: 600px;
  background: var(--paper);
  border: 1.5px solid var(--rule);
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.9rem;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  overflow-y: auto;
  color: var(--ink-2);
}

.imrad-textarea:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px var(--green-dim);
}

/* ── References split pane ───────────────────────────────────── */
.ref-split-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

.ref-preview-pane,
.ref-editor-pane {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ref-pane-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--rule);
}

.ref-pane-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  font-style: italic;
}

.ref-count-badge {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  background: var(--green-dim);
  color: var(--green-dk);
  padding: 0.12rem 0.45rem;
  border-radius: 3px;
}

.ref-preview-list {
  background: var(--paper);
  border: 1.5px solid var(--rule);
  border-radius: 8px;
  padding: 1rem;
  max-height: 560px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.ref-preview-entry {
  font-size: 0.82rem;
  line-height: 1.7;
  color: #2a2a2a;
  padding: 0.65rem 0 0.65rem 1.75rem;
  text-indent: -1.75rem;
  border-bottom: 1px solid var(--rule);
  word-break: break-word;
}

.ref-preview-entry:last-child {
  border-bottom: none;
}

.ref-authors-preview {
  font-weight: 700;
  color: #1a1a1a;
}

.ref-year-preview {
  font-weight: 600;
  color: #444;
}

.ref-title-preview {
  font-style: italic;
  font-weight: 400;
  color: #222;
}

.ref-num-preview {
  font-weight: 700;
  color: var(--green-dk);
  margin-right: 0.2rem;
}

.ref-link-preview {
  color: var(--green-dk);
  text-decoration: none;
  word-break: break-all;
}

.ref-link-preview:hover {
  text-decoration: underline;
}

.ref-preview-empty {
  background: var(--surface);
  border: 1.5px dashed var(--rule);
  border-radius: 8px;
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.82rem;
  color: var(--ink-3);
  font-style: italic;
}

.ref-textarea {
  min-height: 560px;
  max-height: 560px;
  font-size: 0.82rem;
  line-height: 1.6;
}

/* ── Page panel ──────────────────────────────────────────────── */
.page-panel-head {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--rule);
}

.page-panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.page-panel-title h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}

.page-panel-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.selector-hint {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin: 0;
}

.selector-btns {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.text-btn {
  background: none;
  border: none;
  color: var(--green-dk);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.text-btn:hover {
  text-decoration: underline;
}

.dot-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--rule);
}

.thumbs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.thumb-card {
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid var(--rule);
  transition: border-color 0.14s;
}

.thumb-card.selected {
  border-color: var(--green);
}

.thumb-wrap {
  position: relative;
}

.thumb-img {
  width: 100%;
  display: block;
  cursor: zoom-in;
  transition: filter 0.15s;
}

.thumb-wrap:hover .thumb-img {
  filter: brightness(0.88);
}

.thumb-num {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  text-align: center;
  padding: 0.2rem;
}

.thumb-sec-badges {
  position: absolute;
  top: 4px;
  left: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sec-badge {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  color: #fff;
}

.sec-badge.introduction {
  background: #7c3aed;
}

.sec-badge.methods {
  background: #2563eb;
}

.sec-badge.results {
  background: #059669;
}

.sec-badge.discussion {
  background: #d97706;
}

.sec-badge.abstract {
  background: #be185d;
}

.thumb-hover-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.thumb-wrap:hover .thumb-hover-hint {
  opacity: 1;
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 166, 81, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.14s;
  pointer-events: none;
}

.thumb-card.selected .thumb-overlay {
  opacity: 1;
}

.thumb-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Drag overlay ────────────────────────────────────────────── */
.drag-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 166, 81, 0.08);
  border: 3px dashed #00a651;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drag-overlay-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  background: #fff;
  border-radius: 16px;
  padding: 2rem 3rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.drag-overlay-inner p {
  font-size: 1.1rem;
  font-weight: 600;
  color: #00a651;
  margin: 0;
}

/* ── Zoom modal ──────────────────────────────────────────────── */
.zoom-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-modal {
  background: #fff;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  position: relative;
  padding: 1rem;
}

.zoom-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 0.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--ink-3);
}

.zoom-img {
  max-width: 75vw;
  max-height: 80vh;
  display: block;
  border-radius: 4px;
}

.zoom-caption {
  text-align: center;
  font-size: 0.82rem;
  color: var(--ink-3);
  margin-top: 0.5rem;
}

/* ── Spinner ─────────────────────────────────────────────────── */
.spin {
  animation: spin 0.9s linear infinite;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .review-grid {
    grid-template-columns: 1fr;
  }

  .up-content {
    padding: 1.5rem 1rem 4rem;
  }
}

@media (max-width: 768px) {
  .up-topbar {
    padding: 0.75rem 1rem;
  }

  .ref-split-wrap {
    grid-template-columns: 1fr;
  }

  .ref-textarea {
    min-height: 300px;
    max-height: 400px;
  }
}

@media (max-width: 480px) {
  .step-label {
    display: none;
  }

  .step-line {
    width: 18px;
    margin: 0 0.2rem;
  }

  .upload-card {
    padding: 1.5rem;
  }

  .review-bar {
    padding: 0.75rem;
  }

  .review-bar-right {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .confirm-btn {
    width: 100%;
    justify-content: center;
  }

  .file-pill {
    width: 100%;
    justify-content: space-between;
    box-sizing: border-box;
  }

  .imrad-panel,
  .meta-panel,
  .page-panel {
    padding: 1rem;
  }
}
</style>
