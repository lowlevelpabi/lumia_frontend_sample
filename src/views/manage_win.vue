<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, reactive, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Library, Trash2, Edit3,
  Search, Plus, FolderOpen, Home, Loader2,
  FileText, Users, Calendar, ChevronRight,
  Settings, ArrowLeft, Save, Hash, BookOpen,
  UserCheck, Menu, X, Clock, TrendingUp,
  FileUp, Sparkles, Eye, Settings2, ZoomIn, CheckCircle, AlertCircle, Check,
  AlertTriangle, RefreshCw, SquareArrowRight
} from 'lucide-vue-next'
import { api, type Paper, type UserResponse, type PartialPaperMetadata } from '../services/api'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { isAdmin } = useAuth()

// ── Sidebar collapse ────────────────────────────────────────────
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)

const toggleSidebar = () => {
  if (window.innerWidth <= 768) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

const closeMobileSidebar = () => {
  mobileSidebarOpen.value = false
}

// Reactive mobile breakpoint check
const isMobile = ref(window.innerWidth <= 768)
const onResize = () => { isMobile.value = window.innerWidth <= 768 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// ── Sidebar ─────────────────────────────────────────────────────
type Section = 'dashboard' | 'repository' | 'users' | 'upload'
const activeSection = ref<Section>('dashboard')

// Base nav — all staff see these
const baseNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Overview of repository' },
  { id: 'upload', label: 'Upload Research', icon: FileUp, description: 'Index new PDF documents' },
  { id: 'repository', label: 'Thesis & Research', icon: Library, description: 'Browse & manage indexed works' },
]
// Admin-only nav item
const adminNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'users', label: 'User Manager', icon: Users, description: 'Manage students & faculty' },
]
const navItems = computed(() =>
  isAdmin.value ? [...baseNavItems, ...adminNavItems] : baseNavItems
)

const activeLabel = computed(() => {
  return navItems.value.find(i => i.id === activeSection.value)?.label ?? 'Dashboard'
})

const setSection = (s: Section) => {
  // Guard: only admin can access user manager
  if (s === 'users' && !isAdmin.value) return
  activeSection.value = s
  router.push({ query: { ...router.currentRoute.value.query, tab: s } })
  // Close mobile sidebar after selecting a section
  mobileSidebarOpen.value = false
  // Auto-collapse desktop sidebar on tablet after selecting
  if (window.innerWidth < 1024 && window.innerWidth > 768) sidebarCollapsed.value = true
}

// Browser History Sync
onMounted(() => {
  const tab = router.currentRoute.value.query.tab as Section
  if (tab && navItems.value.map(i => i.id).includes(tab)) {
    activeSection.value = tab
  }
})
watch(() => router.currentRoute.value.query.tab, (newTab) => {
  if (newTab && navItems.value.map(i => i.id).includes(newTab as Section)) {
    activeSection.value = newTab as Section
  }
})

// ── Data ─────────────────────────────────────────────────────────
const papers = ref<Paper[]>([])
const loading = ref(true)
const searchQuery = ref('')
const activeFilter = ref<'all' | 'Thesis' | 'Capstone Project'>('all')

const fetchPapers = async () => {
  loading.value = true
  try { papers.value = await api.listAllPapers() }
  catch (e) { console.error(e) }
  finally { loading.value = false }
}
onMounted(fetchPapers)

const filteredPapers = computed(() => {
  let list = papers.value
  if (activeFilter.value !== 'all')
    list = list.filter(p => p.project_type === activeFilter.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.author.toLowerCase().includes(q) ||
    (p.department ?? '').toLowerCase().includes(q)
  )
})

const totalPapers = computed(() => papers.value.length)
const thesisCount = computed(() => papers.value.filter(p => p.project_type === 'Thesis').length)
const capstoneCount = computed(() => papers.value.filter(p => p.project_type === 'Capstone Project').length)
const yearSpan = computed(() => new Set(papers.value.map(p => p.year)).size)

// ── Helpers ───────────────────────────────────────────────────────
const initials = (title: string) =>
  title.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

const typeColor = (type: string) => type === 'Thesis' ? 'blue' : 'orange'

// ── Editing ──────────────────────────────────────────────────────
const showEditModal = ref(false)
const editingPaper = ref<Partial<Paper>>({})
const updating = ref(false)

const openEditModal = (paper: Paper) => {
  editingPaper.value = { ...paper }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingPaper.value = {}
}

const handleUpdate = async () => {
  if (!editingPaper.value.id) return
  updating.value = true
  try {
    const { id, ...updates } = editingPaper.value as Paper
    await api.updatePaper(id, updates)
    await fetchPapers()
    closeEditModal()
  } catch (err) {
    console.error('Update failed:', err)
    alert('Failed to update paper details.')
  } finally {
    updating.value = false
  }
}

// ── Actions ───────────────────────────────────────────────────────
const handleDelete = async (id: number) => {
  if (!confirm('Delete this paper? This cannot be undone.')) return
  try { await api.deletePaper(id); await fetchPapers() }
  catch { alert('Failed to delete. Are you logged in as admin?') }
}

// ── User Management ──────────────────────────────────────────────
const users = ref<UserResponse[]>([])
const loadingUsers = ref(false)

const fetchUsers = async () => {
  loadingUsers.value = true
  try {
    users.value = await api.listUsers()
  } catch (e) {
    console.error('Failed to fetch users:', e)
  } finally {
    loadingUsers.value = false
  }
}

const adminCount = computed(() => users.value.filter(u => u.role === 'Admin').length)
const facultyCount = computed(() => users.value.filter(u => u.role === 'Faculty').length)
const studentCount = computed(() => users.value.filter(u => u.role === 'User').length) // Based on models/user.py UserRole.USER = "User"


// (Announcements UI removed)
// ── Upload ──
const step = ref(1) // 1: Select, 2: Review, 3: Success
const uploadingPaper = ref(false)
const processingDoc = ref(false)
const showStrategyModal = ref(false)
const uploadError = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const sessionId = ref('')

interface PageData {
  page_num: number;
  thumbnail: string;
  preview_text: string;
  label?: string;
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
  detected_subheadings: []
})

const imradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: ''
})

const authors = ref<string[]>([''])
const selectedPages = ref<number[]>([])
const sectionPages = ref<Record<string, number[]>>({})
const isManuscript = ref(false)

// IMRAD Validation
const REQUIRED_SECTIONS = ['abstract', 'introduction', 'methods', 'results', 'discussion']
const missingSections = computed(() => {
  const present = Object.keys(uploadMetadata.section_pages || {})
  return REQUIRED_SECTIONS.filter(s => !present.includes(s))
})

const triggerFallback = async () => {
  if (!file.value) return
  processingDoc.value = true
  const prevStep = step.value
  step.value = 1 // Go back to show loading state

  try {
    // Calling with autoExtract=false disables IMRAD filtering and returns ALL pages
    const preview = await api.getUploadPreview(file.value, false)
    sessionId.value = preview.session_id
    Object.assign(uploadMetadata, preview.metadata)
    pages.value = preview.pages

    // Select all pages by default in fallback mode
    selectedPages.value = preview.pages.map(p => p.page_num)

    // Fallback mode always shows full doc — clear manuscript flag
    isManuscript.value = false

    setTimeout(() => {
      step.value = 2
      processingDoc.value = false
    }, 400)
  } catch (err) {
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

const showZoomModal = ref(false)
const zoomedPage = ref<PageData | null>(null)

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

const selectStrategy = async (auto: boolean) => {
  showStrategyModal.value = false
  // Small delay to let modal close animation finish and loading state show
  setTimeout(() => {
    startInitialExtraction(auto)
  }, 100)
}

const startInitialExtraction = async (autoExtract: boolean = true) => {
  if (!file.value) return
  processingDoc.value = true
  uploadError.value = ''

  try {
    const preview = await api.getUploadPreview(file.value, autoExtract)
    sessionId.value = preview.session_id
    Object.assign(uploadMetadata, preview.metadata)

    if (preview.metadata.author) {
      const splitAuthors = preview.metadata.author
        .split(/\s*\|\s*/)
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0)
      authors.value = splitAuthors.length > 0 ? splitAuthors : ['']
    } else {
      authors.value = ['']
    }

    pages.value = preview.pages

    // Fill IMRAD sections
    if (preview.sections) {
      Object.assign(imradSections, preview.sections)
    }

    // Store section→pages mapping for badge display
    sectionPages.value = preview.section_pages || {}


    // Backend already filtered pages to IMRAD-only.
    // Auto-select ALL returned pages — user can deselect manually.
    selectedPages.value = preview.pages.map(p => p.page_num)

    // Smooth transition to step 2 after data is ready
    setTimeout(() => {
      step.value = 2
      processingDoc.value = false
    }, 400)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to parse PDF.'
    processingDoc.value = false
  }
}

const togglePage = (pageNum: number, event: Event) => {
  if ((event.target as HTMLElement).closest('.zoom-trigger')) return
  const index = selectedPages.value.indexOf(pageNum)
  if (index > -1) selectedPages.value.splice(index, 1)
  else selectedPages.value.push(pageNum)
}

const getSectionsForPage = (pageNum: number) => {
  const found: string[] = []
  for (const [section, pNums] of Object.entries(sectionPages.value)) {
    if (pNums.includes(pageNum)) {
      found.push(section)
    }
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

const handleFinalConfirm = async () => {
  if (selectedPages.value.length === 0) {
    uploadError.value = 'Please select at least one page to index.'
    return
  }
  uploadingPaper.value = true
  uploadError.value = ''
  try {
    const finalAuthorString = authors.value.map(a => a.trim()).filter(a => a.length > 0).join(', ')
    await api.confirmUpload({
      session_id: sessionId.value,
      metadata: { ...uploadMetadata, author: finalAuthorString || 'Unknown' },
      selected_pages: selectedPages.value,
      // Pass IMRAD sections
      introduction: imradSections.introduction,
      methods: imradSections.methods,
      results: imradSections.results,
      discussion: imradSections.discussion
    })
    step.value = 3
    setTimeout(() => {
      setSection('repository')
      // Reset upload state
      step.value = 1
      file.value = null
    }, 2000)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to finalize upload.'
  } finally {
    uploadingPaper.value = false
  }
}

const goBackToStep1 = () => {
  step.value = 1
  file.value = null
  showStrategyModal.value = false
}

// ── Recent papers (for dashboard panel) ─────────────────────────
const recentPapers = computed(() => papers.value.slice().sort((a, b) => b.id - a.id).slice(0, 6))

// ── Watchers ─────────────────────────────────────────────────────
watch(activeSection, (newSection) => {
  if (newSection === 'repository') {
    fetchPapers()
  }
  if (newSection === 'users' && users.value.length === 0) {
    fetchUsers()
  }
}, { immediate: true })
</script>

<template>
  <div class="dashboard" :class="{ 'sidebar-is-collapsed': sidebarCollapsed }">

    <!-- ══ Mobile Sidebar Backdrop ══ -->
    <!-- Sits above navbar (z-index 1050) but below the drawer itself (1100).
         Tapping it closes the drawer without triggering the navbar. -->
    <transition name="backdrop-fade">
      <div v-if="mobileSidebarOpen" class="mobile-sidebar-backdrop" @click="closeMobileSidebar" />
    </transition>

    <!-- ══════════════ SIDEBAR ══════════════ -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }">
      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-icon">
          <BookOpen :size="18" color="#ffffff" stroke-width="2.5" />
        </div>
        <div class="brand-text">
          <span class="brand-name">Lumia</span>
          <span class="brand-sub">Dashboard</span>
        </div>
      </div>

      <!-- Nav label -->
      <p class="sidebar-section-label">Management</p>

      <!-- Nav items -->
      <nav class="sidebar-nav">
        <button v-for="item in navItems" :key="item.id" class="sidebar-item"
          :class="{ active: activeSection === item.id }" @click="setSection(item.id)"
          :title="sidebarCollapsed ? item.label : undefined">
          <div class="icon-wrap" :aria-hidden="sidebarCollapsed" :class="{ active: activeSection === item.id }">
            <component :is="item.icon" :size="18" class="sidebar-item-icon" stroke-width="2.2" />
          </div>
          <div class="sidebar-item-text">
            <span class="sidebar-item-label">{{ item.label }}</span>
            <span class="sidebar-item-desc">{{ item.description }}</span>
          </div>
          <ChevronRight v-if="!sidebarCollapsed" :size="13" class="sidebar-item-arrow" />
        </button>
      </nav>

    </aside>

    <!-- ══════════════ MAIN ══════════════ -->
    <div class="dashboard-main">

      <!-- ── Topbar ────────────────────────────────────────────── -->
      <header class="topbar">
        <div class="topbar-left">
          <!-- Hamburger toggle -->
          <button class="sidebar-toggle" @click="toggleSidebar"
            :title="isMobile ? (mobileSidebarOpen ? 'Close menu' : 'Open menu') : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')">
            <template v-if="isMobile">
              <X v-if="mobileSidebarOpen" :size="20" stroke-width="2.2" />
              <Menu v-else :size="20" stroke-width="2.2" />
            </template>
            <template v-else>
              <Menu v-if="!sidebarCollapsed" :size="20" stroke-width="2.2" />
              <SquareArrowRight v-else :size="20" stroke-width="2.2" />
            </template>
          </button>
          <!-- Breadcrumb -->
          <span class="breadcrumb-root">Management</span>
          <ChevronRight :size="13" class="breadcrumb-sep" />
          <span class="breadcrumb-active">{{ activeLabel }}</span>
        </div>

        <!-- Step indicator — only visible on the Upload section -->
        <div v-if="activeSection === 'upload'" class="steps-rail">
          <div class="step-item" :class="{ active: step >= 1, completed: step > 1 }">
            <div class="step-num">
              <Check v-if="step > 1" :size="13" />
              <span v-else>1</span>
              <div v-if="step === 1" class="pulse-ring"></div>
            </div>
            <span class="step-label">Upload</span>
          </div>
          <div class="step-line"></div>
          <div class="step-item" :class="{ active: step >= 2, completed: step > 2 }">
            <div class="step-num">
              <Check v-if="step > 2" :size="13" />
              <span v-else>2</span>
              <div v-if="step === 2" class="pulse-ring"></div>
            </div>
            <span class="step-label">Review</span>
          </div>
          <div class="step-line"></div>
          <div class="step-item" :class="{ active: step >= 3 }">
            <div class="step-num">
              <Check v-if="step > 3" :size="13" />
              <span v-else>3</span>
              <div v-if="step === 3" class="pulse-ring"></div>
            </div>
            <span class="step-label">Done</span>
          </div>
        </div>
      </header>

      <!-- ── Content ───────────────────────────────────────────── -->
      <div class="content">

        <!-- ══ SECTION: DASHBOARD ══════════════════════════════════ -->
        <template v-if="activeSection === 'dashboard'">
          <div class="content-header">
            <div>
              <h1 class="content-title">Management Dashboard</h1>
              <p class="content-sub">Overview of repository.</p>
            </div>
          </div>



          <!-- ══ Dashboard 2-column layout ══ -->
          <div class="dash-grid">

            <!-- LEFT: Recent Uploads -->
            <div class="dash-panel">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <Clock :size="14" />
                  <span>Recent uploaded thesis/research</span>
                </div>
                <button class="dash-panel-link" @click="setSection('repository')">View all →</button>
              </div>
              <div class="dash-panel-body">
                <div v-if="loading" class="dash-loading">
                  <Loader2 :size="16" class="spin" />
                  <span>Loading papers...</span>
                </div>
                <template v-else-if="recentPapers.length > 0">
                  <div v-for="paper in recentPapers" :key="paper.id" class="dash-paper-row">
                    <div class="dash-paper-av" :data-t="paper.project_type === 'Thesis' ? 'blue' : 'orange'">
                      {{paper.title.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')}}
                    </div>
                    <div class="dash-paper-info">
                      <span class="dash-paper-title">{{ paper.title }}</span>
                      <span class="dash-paper-meta">{{ paper.author }} &bull; {{ paper.year }}</span>
                    </div>
                    <span class="dash-type-chip" :class="paper.project_type === 'Thesis' ? 'blue' : 'orange'">
                      {{ paper.project_type === 'Thesis' ? 'TH' : 'CP' }}
                    </span>
                  </div>
                </template>
                <div v-else class="dash-empty">
                  <FolderOpen :size="32" color="#d1d5db" />
                  <p>No papers uploaded yet.</p>
                </div>
              </div>
            </div>

            <!-- RIGHT: Placeholder panel -->
            <div class="dash-panel">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <TrendingUp :size="14" />
                  <span>Quick Overview of the Repository</span>
                </div>
              </div>
              <div class="dash-panel-body">
                <!-- Dashboard Statistics Inline -->
                <div class="dash-panel-stats">
                  <div class="dash-pstat-card">
                    <div class="dash-ov-icon green">
                      <Library :size="16" />
                    </div>
                    <div class="dash-pstat-info">
                      <span class="stat-val">{{ totalPapers }}</span>
                      <span class="stat-lbl">Total Books</span>
                    </div>
                  </div>
                  <div class="dash-pstat-card">
                    <div class="dash-ov-icon blue">
                      <FileText :size="16" />
                    </div>
                    <div class="dash-pstat-info">
                      <div class="pstat-multi">
                        <div><span class="stat-val">{{ thesisCount }}</span><span class="stat-lbl">Thesis</span></div>
                        <div class="stat-divider"></div>
                        <div><span class="stat-val">{{ capstoneCount }}</span><span class="stat-lbl">Capstone</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="dash-pstat-card">
                    <div class="dash-ov-icon purple">
                      <UserCheck :size="16" />
                    </div>
                    <div class="dash-pstat-info">
                      <div class="pstat-multi">
                        <div><span class="stat-val">{{ adminCount + facultyCount }}</span><span
                            class="stat-lbl">Staff</span></div>
                        <div class="stat-divider"></div>
                        <div><span class="stat-val">{{ studentCount }}</span><span class="stat-lbl">Students</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </template>

        <!-- ══ SECTION: UPLOAD ══════════════════════════════════════ -->
        <template v-else-if="activeSection === 'upload'">
          <div class="upload-section">

            <div v-if="step !== 2" class="standard-container">
              <div class="upload-card shadow-lg">
                <div v-if="step === 1">
                  <div class="card-header">
                    <div class="icon-circle">
                      <FileUp :size="24" color="#10b981" />
                    </div>
                    <h1 class="upload-title">Upload Document</h1>
                    <p>Start by uploading your PDF document. Choose method to process your document.</p>
                  </div>

                  <div v-if="uploadError" class="error-banner">
                    <AlertCircle :size="18" /> {{ uploadError }}
                  </div>

                  <div class="drop-zone" @click="fileInput?.click()" :class="{ 'is-processing': processingDoc }">
                    <input type="file" ref="fileInput" @change="handleFileChange" style="display: none"
                      accept="application/pdf" />

                    <div v-if="processingDoc" class="loading-state">
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
                </div>

                <div v-else-if="step === 3" class="success-state">
                  <CheckCircle :size="64" color="#10b981" />
                  <h2>Research Indexed!</h2>
                  <p>Paper and selected vectors have been stored in the repository.</p>
                </div>
              </div>
            </div>

            <div v-else class="review-container">
              <header class="review-header shadow-sm">
                <div class="header-left">
                  <div class="header-icon">
                    <FileText :size="24" color="#10b981" />
                  </div>
                  <div class="header-titles">
                    <h1 class="review-title">Review & Index Document</h1>
                    <p class="header-subtext">Please check the extracted info and select
                      indexable pages.</p>
                  </div>
                </div>
                <div class="header-right">
                  <div class="file-stack">
                    <div class="file-info-row">
                      <span class="file-label">ACTIVE FILE: </span>
                      <span class="file-name">{{ file?.name }}</span>
                    </div>
                    <div class="selection-count">
                      <strong>{{ selectedPages.length }}</strong>/{{ pages.length }} Pages
                    </div>
                  </div>
                  <button @click="handleFinalConfirm" class="confirm-btn primary" :disabled="uploadingPaper">
                    <Loader2 v-if="uploadingPaper" class="spinner" :size="18" />
                    <Check v-else :size="18" />
                    <span>Confirm Indexing</span>
                  </button>
                </div>
              </header>

              <!-- Manuscript / In-Progress Notice -->
              <div v-if="isManuscript" class="manuscript-banner shadow-sm">
                <div class="warning-main">
                  <div class="warning-icon-wrap" style="background:#eff6ff">
                    <AlertCircle :size="20" color="#3b82f6" />
                  </div>
                  <div class="warning-body">
                    <p class="warning-title" style="color:#1e40af">Manuscript / In-Progress Document</p>
                    <p class="warning-desc" style="color:#3b82f6">
                      No IMRAD section headings were detected. This document may be incomplete or still
                      in draft form. The first 10 pages are shown for preview. You can still index it —
                      fill in the sections manually below, or trigger fallback to browse all pages.
                    </p>
                  </div>
                </div>
                <div class="warning-buttons">
                  <button @click="triggerFallback" class="warning-action fallback" style="background:#1d4ed8"
                    title="Load all document pages">
                    <RefreshCw :size="14" />
                    <span>Browse All Pages</span>
                  </button>
                  <button @click="cancelUpload" class="warning-action decline">
                    <span>Decline &amp; Reset</span>
                  </button>
                </div>
              </div>

              <!-- IMRAD Validation Warning -->
              <div v-if="missingSections.length > 0" class="imrad-warning-banner shadow-sm">
                <div class="warning-main">
                  <div class="warning-icon-wrap">
                    <AlertTriangle :size="18" color="#f59e0b" />
                  </div>
                  <div class="warning-body">
                    <p class="warning-title">Incomplete IMRAD structure detected</p>
                    <p class="warning-desc">The following sections could not be found in the document. You may proceed,
                      but search
                      accuracy may be reduced.</p>
                    <div class="missing-sections-list">
                      <span v-for="s in missingSections" :key="s" class="missing-s-badge">
                        <span class="missing-s-dot"></span>
                        {{ s }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="warning-buttons">
                  <button @click="cancelUpload" class="warning-action decline">
                    Cancel Indexing
                  </button>
                </div>
              </div>

              <main class="review-grid">
                <section class="metadata-form shadow-sm">
                  <div class="form-section">
                    <div class="section-banner">
                      <span class="step-badge">1</span>
                      <h4>Verify Metadata</h4>
                    </div>

                    <div class="input-group">
                      <label>Title</label>
                      <textarea v-model="uploadMetadata.title" placeholder="Research Title"></textarea>
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

                    <div class="row">
                      <div class="input-group">
                        <label>Year</label>
                        <input v-model="uploadMetadata.year" type="text" placeholder="e.g., 2025" />
                      </div>
                      <div class="input-group">
                        <label>Type</label>
                        <select v-model="uploadMetadata.project_type">
                          <option>Thesis</option>
                          <option>Capstone Project</option>
                          <option>Technical Report</option>
                        </select>
                      </div>
                    </div>

                    <div class="input-group">
                      <label>Abstract</label>
                      <textarea v-model="uploadMetadata.abstract" class="abstract-area"
                        placeholder="Enter abstract..."></textarea>
                    </div>

                    <div class="input-group">
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
                  </div>
                </section>

                <section class="page-selector shadow-sm">
                  <div class="selector-header">
                    <div class="section-banner">
                      <span class="step-badge">2</span>
                      <div class="banner-title">
                        <h4>Select Pages to Index</h4>
                        <span class="required-badge">Required for AI Search</span>
                      </div>
                    </div>
                    <div class="selector-title-row">
                      <p class="selector-hint">Select and unselect the pages you want to index, IMRAD pages are
                        pre-selected.</p>
                      <div class="selector-actions">
                        <button @click="selectAll" class="text-btn">Select All</button>
                        <span class="dot"></span>
                        <button @click="deselectAll" class="text-btn">Uncheck All</button>
                      </div>
                    </div>
                  </div>

                  <div class="thumbnails-grid">
                    <div v-for="(p, idx) in pages" :key="p.label || p.page_num + '-' + idx" class="page-card"
                      :class="{ 'is-selected': selectedPages.includes(p.page_num) }"
                      @click="togglePage(p.page_num, $event)">
                      <div class="thumbnail-wrapper">
                        <img :src="`data:image/jpeg;base64,${p.thumbnail}`" loading="lazy" class="page-thumb-img" />
                        <div class="page-num">{{ p.label || 'P' + p.page_num }}</div>

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
                    </div>
                  </div>
                </section>
              </main>
            </div>
          </div>
        </template>


        <template v-else-if="activeSection === 'repository'">
          <!-- Page title -->
          <div class="content-header">
            <div>
              <h1 class="content-title">Research Repository</h1>
              <p class="content-sub">Manage and monitor all indexed research papers.</p>
            </div>
          </div>

          <!-- Stats row -->
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-icon green">
                <Library :size="16" />
              </div>
              <div><span class="stat-val">{{ totalPapers }}</span><span class="stat-lbl">Total Papers</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blue">
                <FileText :size="16" />
              </div>
              <div><span class="stat-val">{{ thesisCount }}</span><span class="stat-lbl">Theses</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon orange">
                <Users :size="16" />
              </div>
              <div><span class="stat-val">{{ capstoneCount }}</span><span class="stat-lbl">Capstone</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon purple">
                <Calendar :size="16" />
              </div>
              <div><span class="stat-val">{{ yearSpan }}</span><span class="stat-lbl">Year Span</span></div>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="toolbar">
            <div class="search-wrap">
              <Search :size="14" class="search-ico" />
              <input v-model="searchQuery" type="text" placeholder="Search by title, author, or department…"
                class="search-input" />
            </div>
            <div class="filter-chips">
              <button class="chip" :class="{ active: activeFilter === 'all' }"
                @click="activeFilter = 'all'">All</button>
              <button class="chip" :class="{ active: activeFilter === 'Thesis' }"
                @click="activeFilter = 'Thesis'">Thesis</button>
              <button class="chip" :class="{ active: activeFilter === 'Capstone Project' }"
                @click="activeFilter = 'Capstone Project'">Capstone</button>
            </div>
          </div>

          <!-- Table card -->
          <div class="table-card">
            <div class="table-card-head">
              <span class="table-count">
                {{ filteredPapers.length }} paper{{ filteredPapers.length !== 1 ? 's' : '' }}
                <span v-if="searchQuery || activeFilter !== 'all'" class="count-hint"> · filtered</span>
              </span>
            </div>

            <div class="table-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Research Paper</th>
                    <th>Year</th>
                    <th>Department</th>
                    <th>Type</th>
                    <th class="th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Skeleton -->
                  <template v-if="loading">
                    <tr v-for="i in 5" :key="'sk' + i" class="skel-row">
                      <td>
                        <div class="skel-paper">
                          <div class="skel skel-av"></div>
                          <div>
                            <div class="skel skel-t1"></div>
                            <div class="skel skel-t2"></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="skel skel-chip"></div>
                      </td>
                      <td>
                        <div class="skel skel-dept"></div>
                      </td>
                      <td>
                        <div class="skel skel-type"></div>
                      </td>
                      <td></td>
                    </tr>
                  </template>

                  <!-- Empty -->
                  <tr v-else-if="filteredPapers.length === 0">
                    <td colspan="5">
                      <div class="empty">
                        <FolderOpen :size="44" color="#d1d5db" />
                        <h3>No papers found</h3>
                        <p>{{ searchQuery || activeFilter !== 'all' ? 'Try a different search or filter.' :
                          'Upload the first research paper to get started.' }}</p>
                        <button v-if="!searchQuery && activeFilter === 'all'" @click="setSection('upload')"
                          class="empty-btn">
                          <Plus :size="14" /> Upload Now
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- Rows -->
                  <tr v-for="paper in filteredPapers" :key="paper.id" class="tbl-row">
                    <td class="td-paper">
                      <div class="paper-cell">
                        <div class="paper-av" :data-t="typeColor(paper.project_type)">{{ initials(paper.title) }}</div>
                        <div class="paper-info">
                          <span class="paper-title">{{ paper.title }}</span>
                          <span class="paper-author">{{ paper.author }}</span>
                        </div>
                      </div>
                    </td>
                    <td><span class="year-chip">{{ paper.year }}</span></td>
                    <td><span class="dept-badge">{{ paper.department }}</span></td>
                    <td><span class="type-badge" :class="typeColor(paper.project_type)">{{ paper.project_type }}</span>
                    </td>
                    <td class="td-right">
                      <button @click="openEditModal(paper)" title="Edit" class="edit-btn-row">
                        <Edit3 :size="14" />
                      </button>
                      <button @click="handleDelete(paper.id)" title="Delete" class="del-btn">
                        <Trash2 :size="14" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Announcements tab removed -->

        <!-- ══ SECTION: USER MANAGEMENT ══════════════════════════════ -->
        <template v-else-if="activeSection === 'users'">
          <div class="content-header">
            <div>
              <h1 class="content-title">User Management</h1>
              <p class="content-sub">Monitor accounts and manage role-based access control.</p>
            </div>
          </div>

          <!-- Role Legend -->
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-icon purple">
                <ShieldAlert :size="16" />
              </div>
              <div><span class="stat-val">{{ adminCount }}</span><span class="stat-lbl">Admins</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green">
                <UserCheck :size="16" />
              </div>
              <div><span class="stat-val">{{ facultyCount }}</span><span class="stat-lbl">Faculty</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blue">
                <Users :size="16" />
              </div>
              <div><span class="stat-val">{{ studentCount }}</span><span class="stat-lbl">Students</span></div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingUsers">
                    <tr v-for="i in 3" :key="'u-sk' + i" class="skel-row">
                      <td colspan="3">
                        <div class="skel skel-t1"></div>
                      </td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-for="user in users" :key="user.id" class="tbl-row">
                      <td>
                        <div class="paper-cell">
                          <div class="paper-av" style="background: #e5e7eb; color: #4b5563;">
                            {{ user.username?.[0]?.toUpperCase() || '?' }}</div>
                          <div class="paper-info">
                            <span class="paper-title">{{ user.username }}</span>
                          </div>
                        </div>
                      </td>
                      <td>{{ user.email }}</td>
                      <td><span class="type-badge"
                          :class="user.role === 'Admin' ? 'purple' : (user.role === 'Faculty' ? 'green' : 'blue')">{{
                            user.role }}</span></td>
                    </tr>
                  </template>
                  <tr v-if="!loadingUsers && users.length === 0">
                    <td colspan="3">
                      <div class="empty">
                        <Users :size="44" color="#d1d5db" />
                        <h3>No users found</h3>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>



        <!-- Edit Workspace Overlay -->
        <div v-if="showEditModal" class="workspace-overlay">
          <!-- Workspace Header -->
          <header class="workspace-header">
            <div class="workspace-header-left">
              <button @click="closeEditModal" class="workspace-back-btn">
                <ArrowLeft :size="16" />
              </button>
              <div class="workspace-title-group">
                <div class="workspace-breadcrumb">
                  <span>Management</span>
                  <ChevronRight :size="12" />
                  <span>Repository</span>
                  <ChevronRight :size="12" />
                  <span class="active">Edit Research</span>
                </div>
                <h2 class="workspace-title">{{ editingPaper.title || 'Edit Paper' }}</h2>
              </div>
            </div>
            <div class="workspace-header-right">
              <div class="id-badge">ID: #{{ editingPaper.id }}</div>
              <button @click="closeEditModal" class="workspace-cancel-btn">Cancel</button>
              <button @click="handleUpdate" :disabled="updating" class="workspace-save-btn">
                <Loader2 v-if="updating" :size="14" class="spin" />
                <Save v-else :size="14" />
                {{ updating ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </header>

          <div class="workspace-body">
            <div class="workspace-grid">

              <!-- Centered: Metadata Form -->
              <section class="workspace-form-side">
                <div class="form-header">
                  <div class="form-icon">
                    <Settings :size="18" />
                  </div>
                  <div>
                    <h3>Document Metadata</h3>
                    <p>Update core information for this indexed document.</p>
                  </div>
                </div>

                <form @submit.prevent="handleUpdate" class="actual-form">
                  <div class="form-group">
                    <label>Research Title</label>
                    <textarea v-model="editingPaper.title" required rows="3"
                      placeholder="Enter full research title..."></textarea>
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label>Author / Group</label>
                      <div class="input-with-icon">
                        <Users :size="14" />
                        <input v-model="editingPaper.author" type="text" required placeholder="Main author names..." />
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Publication Year</label>
                      <div class="input-with-icon">
                        <Calendar :size="14" />
                        <input v-model="editingPaper.year" type="text" required placeholder="e.g. 2024" />
                      </div>
                    </div>
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label>Department</label>
                      <input v-model="editingPaper.department" type="text" required
                        placeholder="e.g. Computer Science" />
                    </div>
                    <div class="form-group">
                      <label>Project Type</label>
                      <select v-model="editingPaper.project_type" required>
                        <option value="Thesis">Thesis</option>
                        <option value="Capstone Project">Capstone Project</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Keywords (Comma separated)</label>
                    <div class="input-with-icon">
                      <Hash :size="14" />
                      <input v-model="editingPaper.keywords" type="text" placeholder="AI, Deep Learning, Bert..." />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Abstract / Summary</label>
                    <textarea v-model="editingPaper.abstract" rows="12"
                      placeholder="Enter abstract content..."></textarea>
                  </div>
                </form>
              </section>

            </div>
          </div>
        </div>

        <!-- Footer notice -->
        <p class="notice">
          <ShieldAlert :size="13" /> Note: Only Admin, Faculty, and Librarians can upload or modify papers.
          If an unauthorized user accidentally access this page, please report it to the administrator for bug
          inspection.
        </p>

        <!-- Modals for Upload -->
        <Teleport to="body">
          <div v-if="showStrategyModal" class="modal-overlay">
            <div class="strategy-modal">
              <div class="modal-header">
                <div class="header-icon">
                  <Settings2 :size="24" color="#10b981" />
                </div>
                <div class="header-text">
                  <h3>Upload options</h3>
                  <p><strong>{{ file?.name }}</strong></p>
                </div>
                <button @click="goBackToStep1" class="close-modal">
                  <X :size="20" />
                </button>
              </div>

              <div class="strategy-options">
                <button @click="selectStrategy(true)" class="strategy-card smart">
                  <div class="strategy-icon">
                    <Sparkles :size="28" />
                  </div>
                  <div class="strategy-info">
                    <h4>Automatic Scan</h4>
                    <p>Automatically extract metadata using OCR + IMRAD formatting.</p>
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

          <div v-if="showZoomModal" class="modal-overlay" @click="closeZoom">
            <div class="zoom-modal" @click.stop>
              <button class="modal-close" @click="closeZoom">
                <X :size="24" />
              </button>
              <div class="modal-content">
                <div v-if="zoomedPage?.label" class="zoom-label">{{ zoomedPage?.label }}</div>
                <img :src="`data:image/jpeg;base64,${zoomedPage?.thumbnail}`" class="full-page-img" />
              </div>
            </div>
          </div>
        </Teleport>

      </div><!-- /content -->
    </div><!-- /main -->
  </div><!-- /dashboard -->
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   Layout shell
══════════════════════════════════════════════════════════════ */
.dashboard {
  display: flex;
  min-height: calc(100vh - 64px);
  background: #f5f7fa;
  font-family: 'Inter', -apple-system, sans-serif;
}

/* ══════════════════════════════════════════════════════════════
   Sidebar
══════════════════════════════════════════════════════════════ */
.sidebar {
  width: 210px;
  flex-shrink: 0;
  background: #00a651;
  display: flex;
  flex-direction: column;
  padding: 0;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 1rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  white-space: nowrap;
}

.sidebar.collapsed {
  width: 56px;
}

/* Hide text labels when collapsed */
.sidebar.collapsed .brand-text,
.sidebar.collapsed .sidebar-section-label,
.sidebar.collapsed .sidebar-item-text,
.sidebar.collapsed .sidebar-item-arrow,
.sidebar.collapsed .sidebar-logout span {
  opacity: 0;
  width: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Center icons when collapsed */
.sidebar.collapsed .sidebar-item {
  justify-content: center;
  padding: 0.6rem 0;
  gap: 0;
}

/* When collapsed avoid showing full button backgrounds (prevents small rounded squares)
   and provide a neat circular icon background instead. */
.sidebar.collapsed .sidebar-item {
  border-radius: 0;
  /* remove rounded pill look when narrow */
  background: transparent;
}

.sidebar.collapsed .sidebar-item:hover {
  background: transparent;
  color: #fff;
}

.sidebar.collapsed .icon-wrap {
  width: 34px;
  height: 34px;
  margin-right: 0;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.sidebar.collapsed .sidebar-logout {
  justify-content: center;
  padding: 0.55rem 0;
  gap: 0;
}

.sidebar.collapsed .sidebar-brand {
  justify-content: center;
  padding: 1.5rem 0 1rem;
  gap: 0;
}


/* Sidebar toggle button (hamburger) */
.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  flex-shrink: 0;
  margin-right: 0.5rem;
  transition: background 0.15s, color 0.15s;
}

.sidebar-toggle:hover {
  background: #f3f4f6;
  color: #111;
}

/* ── Dashboard 2-column grid ─────────────────────────────────── */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1.25rem;
}

.dash-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dash-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
}

.dash-panel-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #374151;
}

.dash-panel-link {
  background: none;
  border: none;
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.dash-panel-link:hover {
  color: #059669;
}

.dash-panel-body {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
}

/* Recent papers list */
.dash-paper-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1.25rem;
  border-bottom: 1px solid #f9fafb;
  transition: background 0.1s;
}

.dash-paper-row:last-child {
  border-bottom: none;
}

.dash-paper-row:hover {
  background: #fafff9;
}

.dash-paper-av {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.65rem;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.dash-paper-av[data-t="blue"] {
  background: #eff6ff;
  color: #2563eb;
}

.dash-paper-av[data-t="orange"] {
  background: #fff7ed;
  color: #d97706;
}

.dash-paper-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.dash-paper-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dash-paper-meta {
  font-size: 0.68rem;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dash-type-chip {
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: 99px;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.dash-type-chip.blue {
  background: #eff6ff;
  color: #2563eb;
}

.dash-type-chip.orange {
  background: #fff7ed;
  color: #d97706;
}

/* Quick overview grid */
.dash-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 1rem;
}

.dash-ov-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.5rem;
  border-radius: 12px;
  border: 1px solid #f3f4f6;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
  text-align: center;
}

.dash-ov-card:hover {
  border-color: #10b981;
  background: #f0fdf4;
  transform: translateY(-2px);
}

.dash-ov-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dash-ov-icon.green {
  background: #ecfdf5;
  color: #10b981;
}

.dash-ov-icon.blue {
  background: #eff6ff;
  color: #3b82f6;
}

.dash-ov-icon.orange {
  background: #fff7ed;
  color: #f59e0b;
}

.dash-ov-icon.purple {
  background: #faf5ff;
  color: #8b5cf6;
}

.dash-ov-icon.gray {
  background: #f3f4f6;
  color: #6b7280;
}

.dash-ov-icon.teal {
  background: #f0fdfa;
  color: #0d9488;
}

.dash-ov-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #374151;
  line-height: 1.2;
}

.dash-ov-hint {
  font-size: 0.62rem;
  color: #9ca3af;
}

/* Panel Stats Layout */
.dash-panel-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  background: #fcfcfc;
}

.dash-pstat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
}

.dash-pstat-info {
  flex: 1;
}

.pstat-multi {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

/* Loading & empty states */
.dash-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1.25rem;
  font-size: 0.8rem;
  color: #9ca3af;
}

.dash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: #9ca3af;
  font-size: 0.8rem;
}

/* Responsive: collapse grid on smaller screens */
@media (max-width: 1024px) {
  .dash-grid {
    grid-template-columns: 1fr;
  }

  .dash-overview-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}



.brand-icon {
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.brand-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
}

.brand-sub {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

/* Section label */
.sidebar-section-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  padding: 1.5rem 1.25rem 0.6rem;
  margin: 0;
}

/* Nav items */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0.5rem;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.6rem 0.6rem 0.7rem;
  border-radius: 9px;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: rgba(255, 255, 255, 0.7);
  position: relative;
}

.sidebar-item:hover {
  background: rgba(0, 0, 0, 0.15);
  color: #fff;
}

.sidebar-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.sidebar-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 3px;
  background: #fff;
  border-radius: 0 4px 4px 0;
}

.sidebar-item.active .sidebar-item-icon {
  color: #fff;
}

.sidebar-item-icon {
  flex-shrink: 0;
}

/* Icon wrapper gives a subtle circular surface for icons */
.icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  transition: background 0.18s ease, transform 0.18s ease;
}

.icon-wrap.logout-wrap {
  margin-right: 0.5rem
}

.sidebar-item:hover .icon-wrap {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px)
}

.sidebar-item.active .icon-wrap {
  background: rgba(255, 255, 255, 0.18);
}

.sidebar-item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-item-label {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.2;
}

.sidebar-item-desc {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-item.active .sidebar-item-desc {
  color: rgba(255, 255, 255, 0.65);
}

.sidebar-item-arrow {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.sidebar-item:hover .sidebar-item-arrow,
.sidebar-item.active .sidebar-item-arrow {
  opacity: 1;
}

/* Footer */
.sidebar-footer {
  margin-top: auto;
  padding: 1rem 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.sidebar-logout {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.8rem;
  font-weight: 600;
  width: 100%;
  transition: background 0.15s, color 0.15s;
}

.sidebar-logout:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}

/* ══════════════════════════════════════════════════════════════
   Main
══════════════════════════════════════════════════════════════ */
.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ── Topbar ─────────────────────────────────────────────────── */
.topbar {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 2rem;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 64px;
  z-index: 30;
  gap: 1rem;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.breadcrumb-root {
  font-size: 0.8rem;
  color: #9ca3af;
  font-weight: 500;
}

.breadcrumb-sep {
  color: #d1d5db;
}

.breadcrumb-active {
  font-size: 0.8rem;
  color: #374151;
  font-weight: 700;
}

/* Topbar nav links */
.topbar-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.topbar-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-decoration: none;
  padding: 0.4rem 0.75rem;
  border-radius: 7px;
  transition: background 0.15s, color 0.15s;
}

.topbar-link:hover {
  background: #f3f4f6;
  color: #111;
}

.topbar-cta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
  background: #10b981;
  border: none;
  padding: 0.42rem 0.85rem;
  border-radius: 7px;
  cursor: pointer;
  margin-left: 0.35rem;
  transition: background 0.15s;
}

.topbar-cta:hover {
  background: #059669;
}

/* ── Content ────────────────────────────────────────────────── */
.content {
  padding: 2rem;
  flex: 1;
}

.content-header {
  margin-bottom: 1.5rem;
}

.content-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #111;
  margin: 0 0 0.3rem;
}

.content-sub {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* ── Stats ──────────────────────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.stat-split {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex: 1;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  flex-shrink: 0;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.green {
  background: #ecfdf5;
  color: #10b981;
}

.stat-icon.blue {
  background: #eff6ff;
  color: #3b82f6;
}

.stat-icon.orange {
  background: #fff7ed;
  color: #f59e0b;
}

.stat-icon.purple {
  background: #faf5ff;
  color: #8b5cf6;
}

.stat-val {
  display: block;
  font-size: 1.3rem;
  font-weight: 800;
  color: #111;
  line-height: 1.1;
}

.stat-lbl {
  display: block;
  font-size: 0.68rem;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ── Toolbar ────────────────────────────────────────────────── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-wrap {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  padding: 0.55rem 0.9rem;
  flex: 1;
  min-width: 180px;
  gap: 0.55rem;
  transition: border-color 0.15s;
}

.search-wrap:focus-within {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}

.search-ico {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  border: none;
  outline: none;
  background: none;
  font-size: 0.875rem;
  color: #111;
  width: 100%;
}

.search-input::placeholder {
  color: #c0c7d0;
}

.filter-chips {
  display: flex;
  gap: 0.4rem;
}

.chip {
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  padding: 0.48rem 0.85rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.chip:hover {
  border-color: #10b981;
  color: #10b981;
}

.chip.active {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

/* ── Table Card ─────────────────────────────────────────────── */
.table-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
}

.table-card-head {
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.table-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.count-hint {
  color: #10b981;
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.tbl th {
  background: #fafafa;
  padding: 0.75rem 1.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #f3f4f6;
  white-space: nowrap;
}

.th-right {
  text-align: right;
}

/* Skeleton */
@keyframes shimmer {
  0% {
    background-position: -600px 0;
  }

  100% {
    background-position: 600px 0;
  }
}

.skel {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 5px;
}

.skel-row td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f9fafb;
}

.skel-paper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.skel-av {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  flex-shrink: 0;
}

.skel-t1 {
  height: 12px;
  width: 180px;
  margin-bottom: 5px;
}

.skel-t2 {
  height: 10px;
  width: 110px;
}

.skel-chip {
  height: 20px;
  width: 44px;
  border-radius: 99px;
}

.skel-dept {
  height: 20px;
  width: 100px;
}

.skel-type {
  height: 20px;
  width: 72px;
  border-radius: 99px;
}

/* Rows */
.tbl-row {
  border-bottom: 1px solid #f9fafb;
  transition: background 0.1s;
}

.tbl-row:last-child {
  border-bottom: none;
}

.tbl-row:hover {
  background: #fafff9;
}

.tbl-row td {
  padding: 1rem 1.25rem;
  vertical-align: middle;
}

.td-paper {
  min-width: 260px;
}

.paper-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.paper-av {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.72rem;
  flex-shrink: 0;
  letter-spacing: 0.4px;
}

.paper-av[data-t="blue"] {
  background: #eff6ff;
  color: #2563eb;
}

.paper-av[data-t="orange"] {
  background: #fff7ed;
  color: #d97706;
}

.paper-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.paper-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 340px;
}

.paper-author {
  font-size: 0.75rem;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.year-chip {
  background: #f3f4f6;
  color: #374151;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  white-space: nowrap;
}

.dept-badge {
  background: #f0fdf4;
  color: #059669;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 5px;
  white-space: nowrap;
}

.type-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  white-space: nowrap;
}

.type-badge.blue {
  background: #eff6ff;
  color: #2563eb;
}

.type-badge.orange {
  background: #fff7ed;
  color: #d97706;
}

.td-right {
  text-align: right;
}

/* Edit / Delete buttons */
.edit-btn-row {
  background: white;
  border: 1px solid #e5e7eb;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
  margin-right: 0.4rem;
}

.edit-btn-row:hover {
  border-color: #10b981;
  color: #10b981;
}

.del-btn {
  background: #1f1f1f;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: background 0.15s;
}

.del-btn:hover {
  background: #111;
}

/* Workspace Overlay (Full Screen) */
.workspace-overlay {
  position: fixed;
  inset: 0;
  background: #f8fafc;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  animation: workspaceIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes workspaceIn {
  from {
    opacity: 0;
    transform: scale(1.02);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Workspace Header */
.workspace-header {
  height: 64px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  flex-shrink: 0;
}

.workspace-header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  min-width: 0;
}

.workspace-back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.workspace-back-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.workspace-title-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.workspace-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 0.1rem;
}

.workspace-breadcrumb .active {
  color: #00a651;
}

.workspace-title {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
}

.workspace-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.id-badge {
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  letter-spacing: 0.5px;
}

.workspace-cancel-btn {
  padding: 0.55rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  border-radius: 8px;
}

.workspace-cancel-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.workspace-save-btn {
  padding: 0.55rem 1.25rem;
  background: #00a651;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.2);
}

.workspace-save-btn:hover {
  background: #009247;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 166, 81, 0.3);
}

.workspace-save-btn:disabled {
  opacity: 0.6;
  transform: none;
  cursor: not-allowed;
}

/* Workspace Body */
.workspace-body {
  flex: 1;
  overflow: hidden;
  padding: 1.5rem;
}

.workspace-grid {
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

/* Form Side */
.workspace-form-side {
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.form-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.form-icon {
  width: 40px;
  height: 40px;
  background: #f0fdf4;
  color: #00a651;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.form-header p {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.actual-form {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  width: 100%;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.6px;
  margin: 0;
  padding: 0;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-with-icon svg {
  position: absolute;
  left: 1rem;
  color: #94a3b8;
  pointer-events: none;
  z-index: 5;
}

input,
textarea,
select {
  width: 100%;
  padding: 0.8rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  color: #0f172a;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.input-with-icon input {
  padding-left: 2.8rem;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #00a651;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(0, 166, 81, 0.08);
}

textarea {
  resize: vertical;
  min-height: 90px;
  line-height: 1.6;
  font-family: inherit;
}

/* Insight Side */
.workspace-insight-side {
  height: 100%;
}

.insight-container {
  height: 100%;
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.insight-icon {
  width: 40px;
  height: 40px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.insight-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.insight-header p {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.insight-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.insight-stat-card {
  background: #f8fafc;
  padding: 1.25rem;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}

.stat-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.stat-num {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
}

.stat-trend {
  color: #94a3b8;
}

.stat-trend.highlight {
  color: #f59e0b;
}

.insight-keywords {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 12px;
  min-height: 100px;
}

.cloud-tag {
  background: white;
  color: #00a651;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #dcfce7;
}

.no-tags {
  color: #94a3b8;
  font-size: 0.8rem;
  font-style: italic;
  margin: auto;
}

.insight-alert {
  margin-top: auto;
  background: #fefce8;
  border: 1px solid #fef08a;
  padding: 1.25rem;
  border-radius: 12px;
  display: flex;
  gap: 1rem;
  color: #854d0e;
}

.insight-alert strong {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.insight-alert p {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.5;
  opacity: 0.8;
}

/* Modal styles removed in favor of Workspace */

/* Empty state */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3.5rem 2rem;
  text-align: center;
}

.empty h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #374151;
  margin: 0.75rem 0 0.35rem;
}

.empty p {
  color: #9ca3af;
  font-size: 0.875rem;
  margin: 0;
}

.empty-btn {
  margin-top: 1rem;
  background: #10b981;
  color: white;
  border: none;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

/* ── Footer notice ──────────────────────────────────────────── */
.notice {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #9ca3af;
  font-size: 0.78rem;
  margin-top: 1.25rem;
}

/* ── Status Badges (Borrow / Penalty tables) ─────────────────── */
.status-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.22rem 0.65rem;
  border-radius: 99px;
  text-transform: capitalize;
  white-space: nowrap;
}

.status-badge.borrowed {
  background: #eff6ff;
  color: #2563eb;
}

.status-badge.returned {
  background: #f0fdf4;
  color: #16a34a;
}

.status-badge.overdue {
  background: #fef2f2;
  color: #dc2626;
}

.status-badge.unpaid {
  background: #fff7ed;
  color: #d97706;
}

.status-badge.paid {
  background: #f0fdf4;
  color: #16a34a;
}

.health-badge.error {
  background: #fef2f2;
  color: #dc2626;
}

.action-btn-mini {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn-mini:hover {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

/* ── Search Lab ─────────────────────────────────────────────── */
.lab-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
}

.lab-input-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.lab-controls {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.lab-control-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 200px;
}

.lab-control-item label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
}

.lab-slider {
  width: 200px;
  accent-color: #10b981;
  cursor: pointer;
}

.lab-slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #9ca3af;
  width: 200px;
}

.lab-log {
  background: #0f172a;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.lab-log-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}

.lab-log-icon {
  color: #10b981;
  font-size: 0.65rem;
}

.lab-log-method {
  color: #10b981;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.lab-log-url {
  color: #94a3b8;
  font-size: 0.7rem;
  word-break: break-all;
}

.lab-log-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lab-meta-chip {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.lab-meta-chip.green {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.lab-meta-chip.gray {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.lab-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.lab-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lab-result-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: border-color 0.15s;
}

.lab-result-card:hover {
  border-color: #10b981;
}

.lab-result-rank {
  font-size: 0.85rem;
  font-weight: 800;
  color: #d1d5db;
  min-width: 28px;
  padding-top: 2px;
}

.lab-result-body {
  flex: 1;
  min-width: 0;
}

.lab-result-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.lab-score-badge {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
}

.lab-score-badge.high {
  background: #f0fdf4;
  color: #16a34a;
}

.lab-score-badge.mid {
  background: #fffbeb;
  color: #d97706;
}

.lab-score-badge.low {
  background: #fef2f2;
  color: #dc2626;
}

.lab-result-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 0.2rem;
  line-height: 1.35;
}

.lab-result-meta {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

.lab-result-abstract {
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.55;
  margin-bottom: 0.5rem;
}

.lab-raw-score {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  color: #9ca3af;
}

.lab-raw-score code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  color: #374151;
  font-size: 0.7rem;
}

.lab-intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 2rem;
  color: #9ca3af;
  text-align: center;
  font-size: 0.9rem;
}

.lab-intro strong {
  color: #374151;
}

/* Spin animation for loader */
.spin,
.spinner {
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

/* ── Role Preview ── */
.role-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

/* ── System Health Grid ── */
.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.health-node {
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, border-color 0.2s;
}

.health-node:hover {
  transform: translateY(-2px);
  border-color: #10b981;
}

.node-status {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.node-status[data-status="online"] {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.node-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
}

.node-meta {
  font-size: 0.7rem;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.health-badge {
  margin-left: auto;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #10b981;
  padding: 0.25rem 0.6rem;
  background: #f0fdf4;
  border-radius: 20px;
}

.placeholder-card {
  border-style: dashed;
  background: rgba(255, 255, 255, 0.5);
}

/* ══════════════════════════════════════════════════════════════
   Mobile Sidebar Backdrop
   z-index 1050 → above global navbar drawer (999) but below
   the management sidebar drawer (1100) so taps are isolated.
══════════════════════════════════════════════════════════════ */
.mobile-sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  top: 64px;
  /* sit below the global navbar */
  background: rgba(0, 0, 0, 0.45);
  z-index: 1050;
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.25s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

/* ══════════════════════════════════════════════════════════════
   Responsive — Tablet ≤768px
══════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {

  /* Show the backdrop when sidebar is open */
  .mobile-sidebar-backdrop {
    display: block;
  }

  /* Sidebar becomes a fixed left drawer on mobile.
     It slides in from the left when .mobile-open is applied.
     z-index 1100 keeps it above both the navbar menu (999)
     and the backdrop (1050) with no conflict. */
  .sidebar {
    position: fixed;
    top: 64px;
    left: 0;
    height: calc(100vh - 64px);
    width: 240px !important;
    /* always full width when shown as drawer */
    z-index: 1100;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
      width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    /* Override the sticky positioning from desktop */
    overflow-y: auto;
  }

  /* When the mobile drawer is open */
  .sidebar.mobile-open {
    transform: translateX(0);
  }

  /* Show all text labels inside the mobile drawer regardless of collapsed state */
  .sidebar.mobile-open .brand-text,
  .sidebar.mobile-open .sidebar-section-label,
  .sidebar.mobile-open .sidebar-item-text,
  .sidebar.mobile-open .sidebar-item-arrow,
  .sidebar.mobile-open .sidebar-logout span {
    opacity: 1;
    width: auto;
    overflow: visible;
    pointer-events: auto;
  }

  .sidebar.mobile-open .sidebar-item {
    justify-content: flex-start;
    padding: 0.6rem 0.6rem 0.6rem 0.7rem;
    gap: 0.6rem;
  }

  .sidebar.mobile-open .sidebar-brand {
    justify-content: flex-start;
    padding: 1rem 1rem 0.9rem;
    gap: 0.6rem;
  }

  /* The hamburger in the topbar now controls the mobile drawer */
  .sidebar-toggle {
    display: flex;
  }

  .content {
    padding: 1rem;
  }

  /* Stats: 2 columns on tablet */
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .topbar {
    padding: 0 1rem;
  }

  .topbar-link {
    font-size: 0.75rem;
    padding: 0.35rem 0.55rem;
  }

  .topbar-cta {
    font-size: 0.75rem;
    padding: 0.38rem 0.7rem;
  }

  .paper-title {
    max-width: 180px;
  }

  .paper-author {
    max-width: 160px;
  }

  /* Dashboard grid: single column */
  .dash-grid {
    grid-template-columns: 1fr;
  }

  /* Upload review: stack vertically */
  .review-grid {
    grid-template-columns: 1fr;
  }

  .review-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem 1.25rem;
    gap: 0.75rem;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  /* Step rail — hide labels on mobile to keep topbar compact */
  .step-label {
    display: none;
  }

  .step-line {
    width: 20px;
    margin: 0 0.3rem;
  }

  /* Workspace header: stack on mobile */
  .workspace-header {
    height: auto;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.85rem 1rem;
    gap: 0.75rem;
  }

  .workspace-header-right {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .workspace-title {
    font-size: 0.875rem;
    max-width: 240px;
  }

  .id-badge {
    display: none;
  }

  .workspace-body {
    padding: 0.85rem;
  }

  .form-row-2 {
    grid-template-columns: 1fr;
  }
}

/* ══════════════════════════════════════════════════════════════
   Responsive — Phone ≤480px (Android 360–412px)
══════════════════════════════════════════════════════════════ */
@media (max-width: 480px) {
  .content {
    padding: 0.85rem;
  }

  .content-title {
    font-size: 1.3rem;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
  }

  .stat-card {
    padding: 0.85rem 1rem;
  }

  .stat-val {
    font-size: 1.1rem;
  }

  .topbar {
    padding: 0 0.75rem;
    height: 48px;
  }

  .topbar-link:not(:first-child) {
    display: none;
  }

  .breadcrumb-root {
    display: none;
  }

  .breadcrumb-sep {
    display: none;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-chips {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .tbl th,
  .tbl-row td {
    padding: 0.75rem 0.85rem;
    font-size: 0.8rem;
  }

  .paper-title {
    max-width: 130px;
    font-size: 0.8rem;
  }

  .paper-author {
    max-width: 110px;
  }

  /* Hide department column on very small screens */
  .tbl th:nth-child(3),
  .tbl-row td:nth-child(3) {
    display: none;
  }

  /* Compact upload card on phone */
  .upload-card {
    padding: 1.5rem 1.1rem 1.25rem;
  }

  .upload-title {
    font-size: 1.25rem;
  }

  .drop-zone {
    padding: 2rem 1.25rem;
  }

  /* Steps: slightly smaller circles on phone */
  .step-num {
    width: 24px;
    height: 24px;
    font-size: 0.7rem;
  }

  /* Thumbnails: 2 columns on phone */
  .thumbnails-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
  }

  /* File name truncation */
  .file-name {
    max-width: 140px;
  }

  /* Confirm button full width on smallest screens */
  .confirm-btn {
    width: 100%;
    justify-content: center;
  }

  .header-right {
    flex-direction: column;
    align-items: stretch;
  }

  .file-stack {
    align-items: flex-start;
  }

  /* Warning banner stacks */
  .imrad-warning-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .warning-buttons {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ── Health Enhancements ────────────────────────────────────── */
.health-latency-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #ecfdf5;
  color: #10b981;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  font-size: 0.65rem;
  font-weight: 800;
  margin-top: 0.25rem;
  border: 1px solid rgba(16, 185, 129, 0.2);
  width: fit-content;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

@keyframes pulse-online {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.3);
    opacity: 0.8;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.node-status[data-status="online"] {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  animation: pulse-online 2.5s infinite ease-in-out;
}

.node-status[data-status="offline"] {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

/* ══════════════════════════════════════════════════════════════
   Upload Section
══════════════════════════════════════════════════════════════ */
.upload-section {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Step Indicator — lives in the topbar ────────────────── */
.steps-rail {
  display: flex;
  align-items: center;
  gap: 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #94a3b8;
  flex-shrink: 0;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.78rem;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s;
}

.active .step-num {
  background: #fff;
  border-color: #10b981;
  color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
}

.completed .step-num {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.step-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
  color: #94a3b8;
}

.active .step-label {
  color: #10b981;
}

.completed .step-label {
  color: #374151;
}

/* Horizontal connector line between steps */
.step-line {
  width: 32px;
  height: 2px;
  background: #e2e8f0;
  border-radius: 2px;
  margin: 0 0.5rem;
  flex-shrink: 0;
}

/* Pulse ring on active step */
.pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #10b981;
  animation: pulse-step 2s ease-out infinite;
  opacity: 0;
}

@keyframes pulse-step {
  0% {
    transform: scale(0.85);
    opacity: 0.6;
  }

  100% {
    transform: scale(1.6);
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
  border: 1px solid #eef2f6;
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

.upload-title {
  font-size: 1.75rem;
  margin-bottom: 0.75rem !important;
  color: #0f172a;
  font-weight: 800;
}

.card-header p {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.drop-zone {
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  padding: 4rem 2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.drop-zone:hover:not(.is-processing) {
  border-color: #10b981;
  background: #f0fdf4;
}

.drop-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #64748b;
}

.drop-text strong {
  color: #0f172a;
}

.drop-text span {
  font-size: 0.78rem;
  color: #94a3b8;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
}

.loading-state h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.loading-state p {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.success-state h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
}

.success-state p {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

/* Review UI */
.review-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.25rem 2rem;
  border-radius: 16px;
  border: 1px solid #eef2f6;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.header-icon {
  background: #ecfdf5;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-titles {
  display: flex;
  flex-direction: column;
}

.review-title {
  font-size: 1.5rem;
  margin: 0;
  font-weight: 800;
  color: #0f172a;
}

.header-subtext {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.file-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.file-info-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.file-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.file-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selection-count {
  color: #10b981;
  font-weight: 700;
  font-size: 0.85rem;
}

.review-grid {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 1.5rem;
  flex: 1;
  align-items: start;
}

.metadata-form {
  background: white;
  padding: 1.75rem;
  border-radius: 16px;
  border: 1px solid #eef2f6;
}

.section-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.step-badge {
  background: #0f172a;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.section-banner h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.required-badge {
  background: #fef2f2;
  color: #ef4444;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.input-group {
  margin-bottom: 1.5rem;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.input-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: #4b5563;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.metadata-form textarea,
.metadata-form input,
.metadata-form select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.95rem;
  background: #f9fafb;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
  color: #0f172a;
}

.metadata-form textarea:focus,
.metadata-form input:focus,
.metadata-form select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.metadata-form textarea.abstract-area {
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
  gap: 0.5rem;
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
  flex-shrink: 0;
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

.dot {
  width: 4px;
  height: 4px;
  background: #cbd5e1;
  border-radius: 50%;
}

.page-selector {
  background: white;
  padding: 1.75rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  border: 1px solid #eef2f6;
}

.selector-header {
  margin-bottom: 1rem;
}

.selector-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.selector-hint {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
}

.selector-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.25rem;
  overflow-y: auto;
  padding: 0.25rem;
}

.page-card {
  cursor: pointer;
  border-radius: 10px;
  border: 2px solid #f1f5f9;
  background: #fff;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.thumbnail-wrapper {
  position: relative;
  aspect-ratio: 1 / 1.41;
  overflow: hidden;
  background: #f8fafc;
}

.page-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.4s;
}

.page-card:hover .page-thumb-img {
  transform: scale(1.08);
}

.page-card.is-selected {
  border-color: #10b981;
}

.selection-overlay {
  position: absolute;
  inset: 0;
  background: rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.is-selected .selection-overlay {
  opacity: 1;
}

.check-circle {
  width: 28px;
  height: 28px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.page-num {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(15, 23, 42, 0.8);
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
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
  font-size: 0.6rem;
  font-weight: 800;
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.s-badge.introduction {
  background: #3b82f6;
}

.s-badge.methods {
  background: #10b981;
}

.s-badge.results {
  background: #f59e0b;
}

.s-badge.discussion {
  background: #8b5cf6;
}

.zoom-trigger {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: white;
  color: #0f172a;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  opacity: 0;
  transform: translateY(5px);
  transition: all 0.2s;
  border: none;
  z-index: 10;
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

.confirm-btn {
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  background: #10b981;
  color: white;
  white-space: nowrap;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.confirm-btn.primary {
  background: #10b981;
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 2rem;
}

.drop-zone {
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  padding: 4rem 2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.drop-zone:hover:not(.is-processing) {
  border-color: #10b981;
  background: #f0fdf4;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
}

.loading-state h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.loading-state p {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.page-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  border-radius: 10px;
  border: 2px solid #f1f5f9;
  background: #fff;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.page-preview-text {
  padding: 0.75rem;
  font-size: 0.7rem;
  color: #64748b;
  height: 54px;
  overflow: hidden;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  background: #fcfcfc;
}

.strategy-modal {
  background: white;
  width: 90%;
  max-width: 500px;
  border-radius: 24px;
  padding: 2.5rem 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
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
  flex-shrink: 0;
}

.header-text h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
}

.header-text p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
}

.close-modal {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.close-modal:hover {
  background: #e2e8f0;
  color: #0f172a;
  transform: rotate(90deg);
}

.strategy-options {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.strategy-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  border: 2px solid #f1f5f9;
  border-radius: 18px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
  position: relative;
}

.strategy-card:hover {
  border-color: #10b981;
  background: #f0fdf4;
  transform: translateX(6px);
}

.strategy-icon {
  width: 54px;
  height: 54px;
  background: #f8fafc;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #64748b;
  transition: all 0.3s;
}

.smart .strategy-icon {
  background: #ecfdf5;
  color: #10b981;
}

.manual .strategy-icon {
  background: #eff6ff;
  color: #3b82f6;
}

.strategy-info h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.strategy-info p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.4;
}

.strategy-badge {
  position: absolute;
  top: -12px;
  right: 24px;
  background: #10b981;
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
}

.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Zoom Modal */
.zoom-modal {
  background: white;
  width: 95%;
  max-width: 700px;
  max-height: 90vh;
  border-radius: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalSlide 0.3s ease-out;
}

.modal-content {
  height: 100%;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f1f5f9;
  padding: 1rem;
}

/* Custom Webkit Scrollbar for the zoom modal */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.modal-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  background: white;
  border: 1px solid #e2e8f0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f8fafc;
  color: #ef4444;
}

.full-page-img {
  width: 100%;
  height: auto;
  min-height: 100%;
  object-fit: contain;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  background: white;
}

/* IMRAD Warning Banner */
.imrad-warning-banner {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 4px solid #f59e0b;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  animation: slideDown 0.35s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.warning-main {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  flex: 1;
  min-width: 0;
}

.warning-icon-wrap {
  width: 34px;
  height: 34px;
  background: #fef3c7;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.warning-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.warning-title {
  font-weight: 700;
  color: #78350f;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.3;
}

.warning-desc {
  color: #92400e;
  font-size: 0.78rem;
  margin: 0;
  line-height: 1.5;
}

/* Vertical list of missing section pills */
.missing-sections-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.missing-s-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fef9c3;
  color: #78350f;
  border: 1px solid #fde68a;
  padding: 0.28rem 0.65rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: capitalize;
  width: fit-content;
}

.missing-s-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

.warning-buttons {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  flex-shrink: 0;
  padding-top: 0.1rem;
}

.warning-action {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.warning-action.fallback {
  background: #92400e;
  color: #fff;
  border: none;
}

.warning-action.fallback:hover {
  background: #78350f;
  transform: translateY(-1px);
}

.warning-action.decline {
  background: transparent;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.warning-action.decline:hover {
  background: #fef2f2;
}

/* Responsive adjustments for banner */
@media (max-width: 768px) {
  .imrad-warning-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .warning-buttons {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ── Responsive: tablet 1024px ── */
@media (max-width: 1024px) {
  .review-grid {
    grid-template-columns: 1fr;
  }
}

.zoom-label {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16, 185, 129, 0.9);
  color: white;
  padding: 0.5rem 1.25rem;
  border-radius: 99px;
  font-size: 0.9rem;
  font-weight: 700;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
</style>
