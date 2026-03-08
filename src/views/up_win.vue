<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  FileUp, ArrowLeft, Loader2, CheckCircle, AlertCircle,
  FileText, Check, Plus, Trash2, X, ZoomIn,
  Sparkles, Eye, Settings2
} from 'lucide-vue-next'
import { api, type PartialPaperMetadata } from '../services/api'

const router = useRouter()

// --- State Management ---
const step = ref(1) // 1: Select, 2: Review, 3: Success
const uploading = ref(false)
const processing = ref(false)
const showStrategyModal = ref(false)
const errorMsg = ref('')

// File selection
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Preview Data
const sessionId = ref('')
interface PageData {
  page_num: number;
  thumbnail: string;
  preview_text: string;
}

const pages = ref<PageData[]>([])
const metadata = reactive<PartialPaperMetadata>({
  title: '',
  author: '',
  year: '',
  abstract: '',
  department: 'N/A',
  keywords: '',
  project_type: 'Thesis',
  degree_program: 'N/A',
  detected_subheadings: []
})

const imradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: ''
})

const activeImradTab = ref<'introduction' | 'methods' | 'results' | 'discussion'>('introduction')

const authors = ref<string[]>([''])
const sectionPages = ref<Record<string, number[]>>({})

// Page Selection
const selectedPages = ref<number[]>([])

// Zoom Modal State
const showZoomModal = ref(false)
const zoomedPage = ref<PageData | null>(null)

// --- Actions ---
const openZoom = (page: PageData) => {
  zoomedPage.value = page
  showZoomModal.value = true
}

const closeZoom = () => {
  showZoomModal.value = false
  zoomedPage.value = null
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file.value = target.files[0]
    showStrategyModal.value = true
  }
}

const selectStrategy = (auto: boolean) => {
  showStrategyModal.value = false
  startInitialExtraction(auto)
}

const startInitialExtraction = async (autoExtract: boolean = true) => {
  if (!file.value) return
  processing.value = true
  errorMsg.value = ''

  try {
    const preview = await api.getUploadPreview(file.value, autoExtract)
    sessionId.value = preview.session_id

    // Fill metadata
    Object.assign(metadata, preview.metadata)

    // Handle authors split
    if (preview.metadata.author) {
      // Split by pipe delimiter (names use 'SURNAME, FIRSTNAME' format with commas inside)
      const splitAuthors = preview.metadata.author
        .split(/\s*\|\s*/)
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0)

      if (splitAuthors.length > 0) {
        authors.value = splitAuthors
      } else {
        authors.value = ['']
      }
    }

    // Fill pages
    pages.value = preview.pages

    // Fill IMRAD sections
    if (preview.sections) {
      Object.assign(imradSections, preview.sections)
    }

    // Store section→pages mapping for badge display
    sectionPages.value = preview.section_pages || {}

    // Backend already filtered pages to IMRAD-only.
    // Select all returned pages by default — user can deselect manually.
    selectedPages.value = preview.pages.map(p => p.page_num)

    step.value = 2
  } catch (err) {
    errorMsg.value = (err as Error).message || 'Failed to parse PDF.'
  } finally {
    processing.value = false
  }
}

const togglePage = (pageNum: number, event: Event) => {
  // If clicking a button/icon inside, don't toggle
  if ((event.target as HTMLElement).closest('.zoom-trigger')) return

  const index = selectedPages.value.indexOf(pageNum)
  if (index > -1) {
    selectedPages.value.splice(index, 1)
  } else {
    selectedPages.value.push(pageNum)
  }
}

const getSectionsForPage = (pageNum: number) => {
  const found: string[] = []
  for (const [section, pages] of Object.entries(sectionPages.value)) {
    if (pages.includes(pageNum)) {
      found.push(section)
    }
  }
  return found
}

const selectAll = () => {
  selectedPages.value = pages.value.map(p => p.page_num)
}

const deselectAll = () => {
  selectedPages.value = []
}

const addAuthor = () => {
  authors.value.push('')
}

const removeAuthor = (index: number) => {
  if (authors.value.length > 1) {
    authors.value.splice(index, 1)
  } else {
    authors.value[0] = ''
  }
}

const handleFinalConfirm = async () => {
  if (selectedPages.value.length === 0) {
    errorMsg.value = 'Please select at least one page to index.'
    return
  }

  uploading.value = true
  errorMsg.value = ''

  try {
    // Prepare final author string
    const finalAuthorString = authors.value
      .map(a => a.trim())
      .filter(a => a.length > 0)
      .join(', ')

    await api.confirmUpload({
      session_id: sessionId.value,
      metadata: {
        ...metadata,
        author: finalAuthorString || 'Unknown'
      },
      selected_pages: selectedPages.value,
      // Pass IMRAD sections
      introduction: imradSections.introduction,
      methods: imradSections.methods,
      results: imradSections.results,
      discussion: imradSections.discussion
    })
    step.value = 3
    setTimeout(() => {
      router.push({ name: 'management' })
    }, 2000)
  } catch (err) {
    errorMsg.value = (err as Error).message || 'Failed to finalize upload.'
  } finally {
    uploading.value = false
  }
}

const goBack = () => {
  if (step.value === 2) {
    step.value = 1
    file.value = null
    showStrategyModal.value = false
  } else {
    router.back()
  }
}
</script>

<template>
  <div class="upload-page">
    <!-- Vertical Step Indicator (Fixed Right) -->
    <div class="steps-rail">
      <div class="step-item" :class="{ active: step >= 1, completed: step > 1 }">
        <div class="step-num shadow-sm">
          <Check v-if="step > 1" :size="14" />
          <span v-else>1</span>
          <div v-if="step === 1" class="pulse-ring"></div>
        </div>
        <span class="step-label">Upload</span>
      </div>
      <div class="step-line-v"></div>
      <div class="step-item" :class="{ active: step >= 2, completed: step > 2 }">
        <div class="step-num shadow-sm">
          <Check v-if="step > 2" :size="14" />
          <span v-else>2</span>
          <div v-if="step === 2" class="pulse-ring"></div>
        </div>
        <span class="step-label">Review</span>
      </div>
      <div class="step-line-v"></div>
      <div class="step-item" :class="{ active: step >= 3, completed: step > 3 }">
        <div class="step-num shadow-sm">
          <span>3</span>
          <div v-if="step === 3" class="pulse-ring"></div>
        </div>
        <span class="step-label">Done</span>
      </div>
    </div>

    <!-- Step 1 & 3 Container (Standard width) -->
    <div v-if="step !== 2" class="standard-container">
      <button @click="goBack" class="back-link">
        <ArrowLeft :size="16" /> Back
      </button>

      <div class="upload-card shadow-lg">
        <div v-if="step === 1">
          <div class="card-header">
            <div class="icon-circle">
              <FileUp :size="24" color="#10b981" />
            </div>
            <h1>Upload Document</h1>
            <p>Start by uploading your PDF document. Our system will analyze the content for indexing.</p>
          </div>

          <div v-if="errorMsg" class="error-banner">
            <AlertCircle :size="18" /> {{ errorMsg }}
          </div>

          <div class="drop-zone" @click="fileInput?.click()" :class="{ 'is-processing': processing }">
            <input type="file" ref="fileInput" @change="handleFileChange" style="display: none"
              accept="application/pdf" />

            <div v-if="processing" class="loading-state">
              <Loader2 class="spinner" :size="48" color="#10b981" />
              <h3>Parsing PDF...</h3>
              <p>Running OCR and generating thumbnails</p>
            </div>
            <template v-else>
              <FileUp :size="48" color="#10b981" />
              <div class="drop-text">
                <strong>Click to upload</strong> or drag and drop
                <span>PDF files only</span>
              </div>
            </template>
          </div>

          <!-- Strategy Selection Modal -->
          <Teleport to="body">
            <div v-if="showStrategyModal" class="modal-overlay">
              <div class="strategy-modal">
                <div class="modal-header">
                  <div class="header-icon">
                    <Settings2 :size="24" color="#10b981" />
                  </div>
                  <div class="header-text">
                    <h3>Upload Strategy</h3>
                    <p>Title: <strong>{{ file?.name }}</strong>?</p>
                  </div>
                  <button @click="showStrategyModal = false" class="close-modal">
                    <X :size="20" />
                  </button>
                </div>

                <div class="strategy-options">
                  <button @click="selectStrategy(true)" class="strategy-card smart">
                    <div class="strategy-icon">
                      <Sparkles :size="28" />
                    </div>
                    <div class="strategy-info">
                      <h4>Smart Auto-Scan</h4>
                      <p>Automatically extract title, authors, and abstract using OCR.</p>
                    </div>
                    <div class="strategy-badge">Recommended</div>
                  </button>

                  <button @click="selectStrategy(false)" class="strategy-card manual">
                    <div class="strategy-icon">
                      <Eye :size="28" />
                    </div>
                    <div class="strategy-info">
                      <h4>Manual Review</h4>
                      <p>Just show me the pages. I'll enter the metadata manually.</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>

        <div v-else-if="step === 3" class="success-state">
          <CheckCircle :size="64" color="#10b981" />
          <h2>Research Indexed!</h2>
          <p>Paper and selected vectors have been stored in the repository.</p>
        </div>
      </div>
    </div>

    <!-- Step 2: Full Width Review UI -->
    <div v-else class="review-container">
      <header class="review-header shadow-sm">
        <div class="header-left">
          <div class="header-icon">
            <FileText :size="24" color="#10b981" />
          </div>
          <div>
            <h1>Finalize Repository Data</h1>
            <p class="header-subtext">Verification Required: Please check the extracted info and select indexable pages.
            </p>
          </div>
        </div>
        <div class="header-right">
          <div class="file-info-header">
            <span class="file-label">Active File:</span>
            <span class="file-name">{{ file?.name }}</span>
          </div>
          <div class="v-divider"></div>
          <div class="selection-count">
            <strong>{{ selectedPages.length }}</strong>/{{ pages.length }} Pages
          </div>
          <button @click="handleFinalConfirm" class="confirm-btn primary" :disabled="uploading">
            <Loader2 v-if="uploading" class="spinner" :size="18" />
            <Check v-else :size="18" />
            <span>Confirm Indexing</span>
          </button>
        </div>
      </header>

      <main class="review-grid">
        <!-- Left: Metadata Form -->
        <section class="metadata-form shadow-sm">
          <div class="form-section">
            <div class="section-banner">
              <span class="step-badge">1</span>
              <h4>Verify Paper Information</h4>
            </div>

            <div class="input-group">
              <label>Title</label>
              <textarea v-model="metadata.title" placeholder="Research Title"></textarea>
            </div>

            <div class="input-group">
              <label>Author(s)</label>
              <div class="authors-list">
                <div v-for="(author, index) in authors" :key="index" class="author-input-row">
                  <input v-model="authors[index]" type="text" placeholder="Full Name of Author" />
                  <button @click="removeAuthor(index)" class="remove-btn" title="Remove Author">
                    <Trash2 :size="16" />
                  </button>
                </div>
                <button @click="addAuthor" class="add-author-btn">
                  <Plus :size="14" /> Add Another Author
                </button>
              </div>
            </div>

            <div class="input-group">
              <label>Year</label>
              <input v-model="metadata.year" type="text" placeholder="e.g., 2025" />
            </div>

            <div class="input-group">
              <label>Abstract</label>
              <textarea v-model="metadata.abstract" class="abstract-area" placeholder="Enter abstract..."></textarea>
            </div>

            <div class="row">
              <div class="input-group">
                <label>Department</label>
                <select v-model="metadata.department">
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
              <div class="input-group">
                <label>Type</label>
                <select v-model="metadata.project_type">
                  <option>Thesis</option>
                  <option>Capstone Project</option>
                  <option>Technical Report</option>
                </select>
              </div>
            </div>

            <!-- IMRAD Section Analysis -->
            <div class="imrad-editor shadow-sm">
              <div class="section-banner">
                <span class="step-badge">1.5</span>
                <div class="banner-title">
                  <h4>Refine IMRAD Sections</h4>
                  <span class="required-badge">Auto-extracted</span>
                </div>
              </div>

              <!-- NEW: Detected Methodology Components -->
              <div v-if="metadata.detected_subheadings && metadata.detected_subheadings.length > 0" class="subheadings-preview">
                <label class="sub-label">Detected Methodology Components:</label>
                <div class="sub-tags">
                  <span v-for="sub in metadata.detected_subheadings" :key="sub" class="sub-tag">
                    <Check :size="12" /> {{ sub }}
                  </span>
                </div>
              </div>

              <div class="imrad-tabs">
                <button v-for="tab in (['introduction', 'methods', 'results', 'discussion'] as const)" :key="tab"
                  type="button" class="imrad-tab-btn" :class="{ active: activeImradTab === tab }"
                  @click="activeImradTab = tab">
                  {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
                </button>
              </div>

              <div class="imrad-content">
                <textarea v-model="imradSections[activeImradTab]" class="imrad-textarea"
                  placeholder="No content detected for this section. You can manually paste it here if needed."></textarea>
              </div>
            </div>
          </div>
        </section>

        <!-- Right: Page Selection Grid -->
        <section class="page-selector shadow-sm">
          <div class="selector-header">
            <div class="section-banner">
              <span class="step-badge">2</span>
              <div class="banner-title">
                <h4>Select Reference Pages</h4>
                <span class="required-badge">Required for AI Search</span>
              </div>
            </div>
            <div class="selector-title-row">
              <p class="selector-hint">Highlight the pages that contain relevant research content (Introduction,
                Abstract,
                Context).</p>
              <div class="selector-actions">
                <button @click="selectAll" class="text-btn">Select All</button>
                <span class="dot"></span>
                <button @click="deselectAll" class="text-btn">Uncheck All</button>
              </div>
            </div>
          </div>

          <div class="thumbnails-grid">
            <div v-for="p in pages" :key="p.page_num" class="page-card"
              :class="{ 'is-selected': selectedPages.includes(p.page_num) }" @click="togglePage(p.page_num, $event)">
              <div class="thumbnail-wrapper">
                <img :src="`data:image/jpeg;base64,${p.thumbnail}`" loading="lazy" class="page-thumb-img" />
                <div class="page-num">P{{ p.page_num }}</div>

                <!-- Section Badges -->
                <div class="section-badges" v-if="getSectionsForPage(p.page_num).length > 0">
                  <span v-for="sec in getSectionsForPage(p.page_num)" :key="sec" class="s-badge" :class="sec">
                    {{ sec.substring(0, 4) }}
                  </span>
                </div>

                <button class="zoom-trigger" @click.stop="openZoom(p)" title="Enlarge Page">
                  <ZoomIn :size="20" />
                </button>

                <div class="selection-overlay">
                  <div class="check-circle">
                    <Check :size="16" />
                  </div>
                </div>
              </div>
              <div class="page-preview-text">
                {{ p.preview_text || '(No indexable text)' }}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- Portals -->
    <Teleport to="body">
      <div v-if="showZoomModal" class="modal-overlay" @click="closeZoom">
        <div class="zoom-modal" @click.stop>
          <button class="modal-close" @click="closeZoom">
            <X :size="24" />
          </button>
          <div class="modal-content">
            <img :src="`data:image/jpeg;base64,${zoomedPage?.thumbnail}`" class="full-page-img" />
            <div class="modal-info">
              <h2>Page {{ zoomedPage?.page_num }}</h2>
              <p>{{ zoomedPage?.preview_text || 'No text extracted from this page.' }}</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Base Styles */
.upload-page {
  min-height: calc(100vh - 64px);
  background: #f8fafc;
  padding: 2rem;
}

/* Vertical Step Rail */
.steps-rail {
  position: fixed;
  right: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  z-index: 100;
  width: 60px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #94a3b8;
  position: relative;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  z-index: 2;
  position: relative;
  transition: all 0.3s;
}

.active .step-num {
  border-color: #10b981;
  color: #10b981;
}

.completed .step-num {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.step-line-v {
  width: 2px;
  height: 32px;
  background: #e2e8f0;
  margin: 0.15rem 0;
}

.step-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Pulse Effect */
.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid #10b981;
  animation: pulse 2s infinite;
  opacity: 0;
  z-index: 1;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }

  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.standard-container {
  max-width: 650px;
  margin: 0 auto;
}

.upload-card {
  background: white;
  padding: 3rem;
  border-radius: 20px;
  text-align: center;
}

.card-header {
  margin-bottom: 2.5rem;
}

.icon-circle {
  width: 64px;
  height: 64px;
  background: #f0fdf4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.card-header h1 {
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  color: #0f172a;
}

.card-header p {
  color: #64748b;
  font-size: 0.95rem;
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* Review UI */
/* Review UI Overhaul */
.review-container {
  max-width: 1500px;
  margin: 0 auto;
  height: calc(100vh - 8rem);
  display: flex;
  flex-direction: column;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.25rem 2.5rem;
  border-radius: 20px;
  margin-bottom: 1.5rem;
  border: 1px solid #eef2f6;
}

.header-icon {
  background: #f0fdf4;
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-left p.header-subtext {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.file-info-header {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 400px;
  overflow: hidden;
}

.file-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.file-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  width: 100%;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-divider {
  width: 1px;
  height: 32px;
  background: #e2e8f0;
}

/* Section Banners */
.section-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.step-badge {
  background: #0f172a;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.section-banner h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.required-badge {
  background: #fef2f2;
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #fee2e2;
}

.selector-hint {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
}

.dot {
  width: 4px;
  height: 4px;
  background: #cbd5e1;
  border-radius: 50%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-left h1 {
  font-size: 1.5rem;
  margin: 0;
}

.file-badge {
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.8rem;
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.selection-count {
  color: #10b981;
  font-weight: 600;
  font-size: 0.9rem;
}

.review-grid {
  display: grid;
  grid-template-columns: 450px 1fr;
  gap: 1.5rem;
  flex: 1;
  overflow: hidden;
}

/* Form Styling */
.metadata-form {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  overflow-y: auto;
}

.form-section h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  color: #111;
  font-weight: 700;
}

.input-group {
  margin-bottom: 1.5rem;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.input-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 0.5rem;
  text-align: left;
}

textarea,
input,
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.95rem;
  background: #f9fafb;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

textarea:focus,
input:focus,
select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

textarea.abstract-area {
  height: 280px;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}

.row {
  display: flex;
  gap: 1.5rem;
  width: 100%;
  align-items: flex-start;
}

.row .input-group {
  flex: 1;
}

.authors-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.author-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.remove-btn {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #fecaca;
  color: #dc2626;
}

.add-author-btn {
  background: #f0fdf4;
  color: #10b981;
  border: 1px dashed #10b981;
  padding: 0.5rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
  transition: all 0.2s;
}

.add-author-btn:hover {
  background: #dcfce7;
}

/* Thumbnail Grid */
.page-selector {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.selector-header {
  margin-bottom: 2rem;
}

.selector-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.selector-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.text-btn {
  background: none;
  border: none;
  color: #10b981;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.text-btn:hover {
  text-decoration: underline;
}

.divider {
  color: #e5e7eb;
  font-size: 0.8rem;
}

.selector-header p {
  font-size: 0.9rem;
  color: #666;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.5rem;
  overflow-y: auto;
  padding: 0.5rem;
}

.page-card {
  cursor: pointer;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
}

.thumbnail-wrapper {
  position: relative;
  aspect-ratio: 1 / 1.4;
  overflow: hidden;
  background: #fff;
  border-bottom: 1px solid #eee;
  cursor: zoom-in;
}

.page-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.zoom-trigger {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.2s;
  z-index: 10;
  color: #4b5563;
  cursor: pointer;
}

.page-card:hover .zoom-trigger {
  opacity: 1;
  transform: translateY(0);
}

.zoom-trigger:hover {
  background: #10b981;
  color: white;
}

.page-num {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  z-index: 5;
}

.section-badges {
  position: absolute;
  top: 30px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 5;
}

.s-badge {
  font-size: 8px;
  font-weight: 800;
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.s-badge.introduction { background: #3b82f6; }
.s-badge.methods { background: #10b981; }
.s-badge.results { background: #f59e0b; }
.s-badge.discussion { background: #8b5cf6; }

.selection-overlay {
  position: absolute;
  inset: 0;
  background: rgba(16, 185, 129, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.check-circle {
  background: white;
  color: #10b981;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.page-preview-text {
  padding: 0.75rem;
  font-size: 0.75rem;
  color: #666;
  height: 60px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.page-card:hover {
  border-color: #10b981;
  transform: translateY(-2px);
}

.page-card:hover img {
  transform: scale(1.05);
}

.page-card.is-selected {
  border-color: #10b981;
}

.page-card.is-selected .selection-overlay {
  opacity: 1;
}

/* Buttons */
.back-link {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  cursor: pointer;
  margin-bottom: 1.5rem;
}

.confirm-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.confirm-btn.primary {
  background: #10b981;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
}

.confirm-btn.primary:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
}

.confirm-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.icon-btn {
  background: #f3f4f6;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Animations */
.spinner {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.drop-zone {
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 3rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.drop-zone:hover:not(.is-processing) {
  border-color: #10b981;
  background: #f0fdf4;
}

.is-processing {
  cursor: default;
}

.error-banner {
  background: #fef2f2;
  color: #b91c1c;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

/* IMRAD Editor Styles */
.imrad-editor {
  margin-top: 2rem;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.subheadings-preview {
  margin: 1rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
}

.sub-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.sub-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sub-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #ecfdf5;
  color: #059669;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid #10b98122;
}

.imrad-tabs {
  display: flex;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.5rem;
  gap: 0.5rem;
}

.imrad-tab-btn {
  flex: 1;
  padding: 0.6rem 0.5rem;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.imrad-tab-btn:hover {
  background: #f3f4f6;
  color: #111;
}

.imrad-tab-btn.active {
  background: white;
  color: #10b981;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.imrad-content {
  padding: 1rem;
}

.imrad-textarea {
  width: 100%;
  height: 250px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.6;
  resize: vertical;
  background: #fff;
}

.imrad-textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
  padding: 2rem;
}

.zoom-modal {
  background: white;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  border-radius: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalSlide 0.3s ease-out;
}

@keyframes modalSlide {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: white;
  border: 1px solid #eee;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f9fafb;
  transform: rotate(90deg);
  color: #ef4444;
}

.modal-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  height: 100%;
  overflow: hidden;
}

.full-page-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f3f4f6;
}

.modal-info {
  padding: 3rem 2rem;
  background: white;
  border-left: 1px solid #eee;
  overflow-y: auto;
}

.modal-info h2 {
  color: #111;
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
}

.modal-info p {
  color: #4b5563;
  line-height: 1.7;
  font-size: 1.1rem;
}

@media (max-width: 900px) {
  .modal-content {
    grid-template-columns: 1fr;
  }

  .modal-info {
    display: none;
  }
}

/* Strategy Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.strategy-modal {
  background: white;
  width: 90%;
  max-width: 500px;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: modalSlide 0.3s ease-out;
}

@keyframes modalSlide {
  from {
    transform: translateY(20px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  position: relative;
}

.header-icon {
  background: #f0fdf4;
  padding: 0.75rem;
  border-radius: 12px;
}

.header-text h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.header-text p {
  margin: 0.25rem 0 0;
  color: #666;
  font-size: 0.9rem;
}

.close-modal {
  position: absolute;
  top: 0;
  right: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
}

.strategy-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.strategy-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  border: 2px solid #f3f4f6;
  background: white;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.strategy-card:hover {
  border-color: #10b981;
  background: #f0fdf4;
  transform: translateX(4px);
}

.strategy-icon {
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 12px;
  color: #4b5563;
}

.smart .strategy-icon {
  color: #10b981;
  background: #ecfdf5;
}

.manual .strategy-icon {
  color: #3b82f6;
  background: #eff6ff;
}

.strategy-info h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.strategy-info p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
}

.strategy-badge {
  position: absolute;
  top: -10px;
  right: 20px;
  background: #10b981;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  text-transform: uppercase;
}

/* ── Tablet (≤768px) ─────────────────────────────────────────── */
@media (max-width: 768px) {

  /* Step rail: fixed vertical → static horizontal top bar */
  .steps-rail {
    position: static;
    transform: none;
    flex-direction: row;
    justify-content: center;
    width: 100%;
    gap: 0;
    padding: 0.75rem 1rem;
    background: white;
    border-bottom: 1px solid #eee;
    margin-bottom: 1rem;
  }

  .step-item {
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
  }

  .step-line-v {
    width: 40px;
    height: 2px;
    margin: 0 0.5rem;
  }

  .upload-page {
    padding: 0;
  }

  .standard-container {
    padding: 1.25rem;
  }

  /* Review header wraps */
  .review-container {
    height: auto;
    min-height: calc(100vh - 6rem);
    padding: 0 0.75rem 1rem;
  }

  .review-header {
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: 12px;
  }

  .header-right {
    flex-wrap: wrap;
    gap: 0.75rem;
    width: 100%;
    justify-content: space-between;
  }

  .confirm-btn {
    flex: 1;
    justify-content: center;
  }

  /* Review grid: 2 columns → 1 column */
  .review-grid {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .metadata-form,
  .page-selector {
    overflow: visible;
  }

  .thumbnails-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }

  .upload-card {
    padding: 2rem 1.5rem;
  }

  .drop-zone {
    padding: 2rem;
  }
}

/* ── Phone (≤480px) — Primary Android target 360–412px ───────── */
@media (max-width: 480px) {
  .steps-rail {
    padding: 0.6rem 0.75rem;
    gap: 0;
  }

  .step-num {
    width: 26px;
    height: 26px;
    font-size: 0.75rem;
  }

  .step-label {
    font-size: 0.6rem;
  }

  .step-line-v {
    width: 24px;
  }

  .standard-container {
    padding: 0.85rem;
  }

  .upload-card {
    padding: 1.5rem 1.1rem;
    border-radius: 14px;
  }

  .card-header h1 {
    font-size: 1.4rem;
  }

  .drop-zone {
    padding: 1.5rem 1rem;
    border-radius: 10px;
  }

  .review-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.85rem 1rem;
    border-radius: 10px;
  }

  .header-left h1 {
    font-size: 1.15rem;
  }

  .file-info-header {
    max-width: 100%;
    align-items: flex-start;
  }

  .file-name {
    text-align: left;
  }

  .v-divider {
    display: none;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .confirm-btn {
    padding: 0.65rem 1rem;
    font-size: 0.9rem;
  }

  .review-container {
    padding: 0 0.5rem 1rem;
  }

  .metadata-form,
  .page-selector {
    padding: 1.25rem 1rem;
    border-radius: 12px;
  }

  .thumbnails-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.85rem;
  }

  .selector-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .strategy-modal {
    width: 95%;
    padding: 1.5rem;
    border-radius: 16px;
  }

  .strategy-card {
    gap: 0.85rem;
    padding: 1rem;
  }

  .modal-overlay {
    padding: 1rem;
  }

  .row {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
