<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, reactive, nextTick, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Library, Trash2, Edit3,
  Search, Plus, FolderOpen, Home, Loader2,
  FileText, Users, Calendar, ChevronRight,
  Settings, ArrowLeft, Save, BookOpen,
  UserCheck, Menu, X, Clock, TrendingUp,
  FileUp, Sparkles, Eye, Settings2, CheckCircle, AlertCircle, Check,
  AlertTriangle, RefreshCw, SquareArrowRight, ShieldAlert, ShieldCheck, UserCog
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
onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('dragover', handleDragOver)
  window.addEventListener('drop', handleDrop)
  window.addEventListener('dragleave', handleDragLeave)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('dragover', handleDragOver)
  window.removeEventListener('drop', handleDrop)
  window.removeEventListener('dragleave', handleDragLeave)
})

// ── Sidebar ─────────────────────────────────────────────────────
type Section = 'dashboard' | 'repository' | 'users' | 'upload'
const activeSection = ref<Section>('dashboard')

const baseNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Overview of repository' },
  { id: 'upload', label: 'Upload Research', icon: FileUp, description: 'Index new PDF documents' },
  { id: 'repository', label: 'Thesis & Research', icon: Library, description: 'Browse & manage indexed works' },
]
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
  if (s === 'users' && !isAdmin.value) return
  activeSection.value = s
  router.push({ query: { ...router.currentRoute.value.query, tab: s } })
  mobileSidebarOpen.value = false
  if (window.innerWidth < 1024 && window.innerWidth > 768) sidebarCollapsed.value = true
}

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
const handleDelete = async (id: string) => {
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

// ── Role Change ───────────────────────────────────────────────────
const roleTarget = ref<UserResponse | null>(null)
const roleNew = ref('')
const roleChanging = ref(false)
const roleError = ref('')

const openRoleModal = (user: UserResponse) => {
  roleTarget.value = user
  roleNew.value = user.role
  roleError.value = ''
}

const closeRoleModal = () => {
  roleTarget.value = null
  roleNew.value = ''
  roleError.value = ''
}

const handleRoleChange = async () => {
  if (!roleTarget.value || !roleNew.value) return
  if (roleNew.value === roleTarget.value.role) { closeRoleModal(); return }
  roleChanging.value = true
  roleError.value = ''
  try {
    await api.changeUserRole(roleTarget.value.id, roleNew.value)
    await fetchUsers()
    closeRoleModal()
  } catch (e) {
    roleError.value = 'Failed to update role. Check your permissions.'
    console.error(e)
  } finally {
    roleChanging.value = false
  }
}

// ── Upload ────────────────────────────────────────────────────────
const step = ref(1)
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
  detected_subheadings: [],
  trim_points: {}
})
const activeImradTab = ref<'introduction' | 'methods' | 'results' | 'discussion'>('introduction')

type ImradKey = 'introduction' | 'methods' | 'results' | 'discussion'
const ALL_IMRAD_TABS: ImradKey[] = ['introduction', 'methods', 'results', 'discussion']

const imradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: ''
})

// Pre-generated summaries from the preview step — passed through to confirmUpload
// so the backend doesn't re-run the summariser on every confirm
const sectionsSummary = reactive<Record<string, string>>({
  introduction: '',
  methods: '',
  results: '',
  discussion: ''
})

// RAD combined detection: results and discussion have identical text
// when the backend stored a single combined RAD section
const isRadCombined = computed(() => {
  const r = imradSections.results
  const d = imradSections.discussion
  return !!(r && d && r.trim() === d.trim())
})

// When combined, user can toggle to inspect them separately
const radSplitMode = ref(false)

// Label strings as computed — avoids Volar misparsing long ternary strings in mustaches
const radModeLabel = computed(() =>
  radSplitMode.value
    ? 'Showing separate Results & Discussion tabs'
    : 'Results & Discussion are combined in this document'
)
const radMergeBtnLabel = computed(() =>
  radSplitMode.value ? '⊞ Merge tabs' : '⊟ Split into separate tabs'
)
const radTabLabel = computed(() =>
  isRadCombined.value && !radSplitMode.value ? 'Results & Discussion' : null
)

// Available tabs — merges R+D into one tab when combined
const availableImradTabs = computed<ImradKey[]>(() => {
  const all = ALL_IMRAD_TABS.filter(t => imradSections[t] || sectionsSummary[t])
  if (isRadCombined.value && !radSplitMode.value) {
    // Replace both 'results' and 'discussion' with a single merged entry
    // We use 'results' as the key since it holds the content
    const merged = all.filter(t => t !== 'discussion')
    return merged
  }
  return all
})

// Auto-resize the raw textarea to fit its content
const imradTextarea = ref<HTMLTextAreaElement | null>(null)
const autoResizeTextarea = (e?: Event) => {
  const el = (e?.target as HTMLTextAreaElement) ?? imradTextarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 600) + 'px'
}
// Re-run resize whenever the active tab switches or content populates
watch(activeImradTab, async () => {
  await nextTick()
  autoResizeTextarea()
})
watch(
  () => imradSections[activeImradTab.value as ImradKey],
  async () => {
    await nextTick()
    autoResizeTextarea()
  }
)

const authors = ref<string[]>([''])
const selectedPages = ref<number[]>([])
const sectionPages = ref<Record<string, number[]>>({})
const isManuscript = ref(false)

const REQUIRED_SECTIONS = ['introduction', 'methods', 'results', 'discussion']
const missingSections = computed(() => {
  const present = Object.keys(uploadMetadata.section_pages || {})
  return REQUIRED_SECTIONS.filter(s => !present.includes(s))
})

const triggerFallback = async () => {
  if (!file.value) return
  processingDoc.value = true
  const prevStep = step.value
  step.value = 1
  try {
    const preview = await api.getUploadPreview(file.value, false)
    sessionId.value = preview.session_id
    Object.assign(uploadMetadata, preview.metadata)
    pages.value = preview.pages
    if (preview.sections) Object.assign(imradSections, preview.sections)
    sectionPages.value = preview.section_pages || {}
    selectedPages.value = preview.pages.map(p => p.page_num)
    isManuscript.value = false
    const firstAvailable = ALL_IMRAD_TABS
      .find(t => imradSections[t] || sectionsSummary[t])
    if (firstAvailable) activeImradTab.value = firstAvailable
    setTimeout(() => { step.value = 2; processingDoc.value = false }, 400)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to trigger fallback.'
    step.value = prevStep
    processingDoc.value = false
  }
}

const cancelUpload = () => {
  step.value = 1; file.value = null; pages.value = []; selectedPages.value = []; uploadMetadata.title = ''
}

const showZoomModal = ref(false)
const zoomedPage = ref<PageData | null>(null)
const openZoom = (page: PageData) => { zoomedPage.value = page; showZoomModal.value = true }
const closeZoom = () => { showZoomModal.value = false; zoomedPage.value = null }

const thumbSrc = (thumbnail: string) => {
  if (!thumbnail) return ''
  if (thumbnail.startsWith('data:')) return thumbnail
  return `data:image/jpeg;base64,${thumbnail}`
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) { file.value = target.files[0]; showStrategyModal.value = true }
}

const isDragging = ref(false)

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  if (activeSection.value !== 'upload' || step.value !== 1) return
  const dropped = e.dataTransfer?.files?.[0]
  if (dropped && dropped.type === 'application/pdf') {
    file.value = dropped
    showStrategyModal.value = true
  } else if (dropped) {
    uploadError.value = 'Only PDF files are accepted. Please retry.'
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (activeSection.value === 'upload' && step.value === 1) {
    isDragging.value = true
  }
}

const handleDragLeave = (e: DragEvent) => {
  // Only clear when leaving the window entirely
  if (e.relatedTarget === null) isDragging.value = false
}

const selectStrategy = async (auto: boolean) => {
  showStrategyModal.value = false
  setTimeout(() => { startInitialExtraction(auto) }, 100)
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
      const splitAuthors = preview.metadata.author.split(/\s*\|\s*/).map((a: string) => a.trim()).filter((a: string) => a.length > 0)
      authors.value = splitAuthors.length > 0 ? splitAuthors : ['']
    } else { authors.value = [''] }
    pages.value = preview.pages
    if (preview.sections) Object.assign(imradSections, preview.sections)
    if (preview.sections_summary) Object.assign(sectionsSummary, preview.sections_summary)
    sectionPages.value = preview.section_pages || {}
    selectedPages.value = preview.pages.map(p => p.page_num)
    // Set active tab to the first section that actually has content
    const firstAvailable = ALL_IMRAD_TABS
      .find(t => imradSections[t] || sectionsSummary[t])
    if (firstAvailable) activeImradTab.value = firstAvailable
    setTimeout(() => { step.value = 2; processingDoc.value = false }, 400)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to parse PDF.'
    processingDoc.value = false
  }
}

const togglePage = (pageNum: number, event: Event) => {
  // if a zoom-trigger/button or the image itself was clicked, do nothing
  const tgt = (event.target as HTMLElement)
  if (tgt.closest('.zoom-trigger') || tgt.closest('.thumb-img') || tgt.closest('.thumb-hover-hint')) return
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
      introduction: imradSections.introduction,
      methods: imradSections.methods,
      results: imradSections.results,
      discussion: imradSections.discussion,
      sections_summary: { ...sectionsSummary },
    })
    step.value = 3
    setTimeout(() => { setSection('repository'); step.value = 1; file.value = null }, 2000)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to finalize upload.'
  } finally { uploadingPaper.value = false }
}

const goBackToStep1 = () => { step.value = 1; file.value = null; showStrategyModal.value = false }

const recentPapers = computed(() => [...papers.value].sort((a, b) => {
  // Assuming string IDs can be lexicographically sorted if they represent time
  // or falling back to database order.
  return String(b.id).localeCompare(String(a.id))
}).slice(0, 6))

watch(activeSection, (newSection) => {
  if (newSection === 'repository') fetchPapers()
  if (newSection === 'users' && users.value.length === 0) fetchUsers()
}, { immediate: true })
</script>

<template>
  <div class="mgmt" :class="{ 'sb-collapsed': sidebarCollapsed }">

    <!-- Full page drag overlay -->
    <transition name='fade'>
      <div v-if="isDragging" class="drag-overlay">
        <div class="drag-overlay-inner">
          <FileUp :size="48" color="#00a651" />
          <p>Drop your PDF here</p>
        </div>
      </div>
    </transition>

    <!-- Mobile backdrop -->
    <transition name="fade">
      <div v-if="mobileSidebarOpen" class="sb-backdrop" @click="closeMobileSidebar" />
    </transition>

    <!-- ══ SIDEBAR ════════════════════════════════════════════════ -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, 'mob-open': mobileSidebarOpen }">
      <div class="sb-brand">
        <div class="sb-brand-icon">
          <BookOpen :size="16" color="#fff" stroke-width="2.5" />
        </div>
        <div class="sb-brand-text">
          <span class="sb-name">Lumia</span>
          <span class="sb-sub">Management</span>
        </div>
      </div>

      <p class="sb-group-label">Navigation</p>

      <nav class="sb-nav">
        <button v-for="item in navItems" :key="item.id" class="sb-item" :class="{ active: activeSection === item.id }"
          @click="setSection(item.id)" :title="sidebarCollapsed ? item.label : undefined">
          <div class="sb-icon" :class="{ active: activeSection === item.id }">
            <component :is="item.icon" :size="16" stroke-width="2.2" />
          </div>
          <div class="sb-item-body">
            <span class="sb-item-label">{{ item.label }}</span>
            <span class="sb-item-desc">{{ item.description }}</span>
          </div>
          <ChevronRight v-if="!sidebarCollapsed" :size="12" class="sb-arrow" />
        </button>
      </nav>

      <div class="sb-footer">
        <ShieldAlert :size="12" /><span>Staff access only</span>
      </div>
    </aside>

    <!-- ══ MAIN ═══════════════════════════════════════════════════ -->
    <div class="mgmt-main">

      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="sb-toggle" @click="toggleSidebar">
            <template v-if="isMobile">
              <X v-if="mobileSidebarOpen" :size="19" stroke-width="2.2" />
              <Menu v-else :size="19" stroke-width="2.2" />
            </template>
            <template v-else>
              <Menu v-if="!sidebarCollapsed" :size="19" stroke-width="2.2" />
              <SquareArrowRight v-else :size="19" stroke-width="2.2" />
            </template>
          </button>
          <span class="bc-root">Management</span>
          <ChevronRight :size="12" class="bc-sep" />
          <span class="bc-active">{{ activeLabel }}</span>
        </div>

        <!-- Upload step rail -->
        <div v-if="activeSection === 'upload'" class="steps-rail">
          <div class="step-item" :class="{ active: step >= 1, done: step > 1 }">
            <div class="step-num">
              <Check v-if="step > 1" :size="12" /><span v-else>1</span>
              <div v-if="step === 1" class="pulse-ring" />
            </div>
            <span class="step-label">Upload</span>
          </div>
          <div class="step-line" />
          <div class="step-item" :class="{ active: step >= 2, done: step > 2 }">
            <div class="step-num">
              <Check v-if="step > 2" :size="12" /><span v-else>2</span>
              <div v-if="step === 2" class="pulse-ring" />
            </div>
            <span class="step-label">Review</span>
          </div>
          <div class="step-line" />
          <div class="step-item" :class="{ active: step >= 3 }">
            <div class="step-num">
              <Check v-if="step > 3" :size="12" /><span v-else>3</span>
              <div v-if="step === 3" class="pulse-ring" />
            </div>
            <span class="step-label">Done</span>
          </div>
        </div>
      </header>

      <!-- ── Content ─────────────────────────────────────────── -->
      <div class="content">

        <!-- ══ DASHBOARD ════════════════════════════════════════ -->
        <template v-if="activeSection === 'dashboard'">
          <div class="page-head">
            <h1 class="page-title">Management Dashboard</h1>
            <p class="page-sub">Overview of the Lumia repository.</p>
          </div>

          <div class="dash-grid">
            <div class="panel">
              <div class="panel-head">
                <div class="panel-label">
                  <Clock :size="13" /> Recent Uploads
                </div>
                <button class="panel-link" @click="setSection('repository')">View all →</button>
              </div>
              <div class="panel-body">
                <div v-if="loading" class="panel-loading">
                  <Loader2 :size="15" class="spin" /> Loading…
                </div>
                <template v-else-if="recentPapers.length > 0">
                  <div v-for="paper in recentPapers" :key="paper.id" class="dash-row">
                    <div class="dash-av" :data-t="paper.project_type === 'Thesis' ? 'blue' : 'orange'">
                      {{paper.title.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')}}
                    </div>
                    <div class="dash-info">
                      <span class="dash-title">{{ paper.title }}</span>
                      <span class="dash-meta">{{ paper.author }} · {{ paper.year }}</span>
                    </div>
                    <span class="type-chip" :class="paper.project_type === 'Thesis' ? 'blue' : 'orange'">
                      {{ paper.project_type === 'Thesis' ? 'TH' : 'CP' }}
                    </span>
                  </div>
                </template>
                <div v-else class="panel-empty">
                  <FolderOpen :size="30" />
                  <p>No papers uploaded yet.</p>
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-head">
                <div class="panel-label">
                  <TrendingUp :size="13" /> Repository Overview
                </div>
              </div>
              <div class="panel-body">
                <div class="stat-grid">
                  <div class="stat-tile">
                    <div class="stat-ico green">
                      <Library :size="15" />
                    </div>
                    <div class="stat-data"><span class="stat-val">{{ totalPapers }}</span><span class="stat-lbl">Total
                        Works</span>
                    </div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-ico blue">
                      <FileText :size="15" />
                    </div>
                    <div class="stat-data">
                      <div class="stat-split">
                        <div><span class="stat-val">{{ thesisCount }}</span><span class="stat-lbl">Thesis</span></div>
                        <div class="stat-divider" />
                        <div><span class="stat-val">{{ capstoneCount }}</span><span class="stat-lbl">Capstone</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-ico purple">
                      <UserCheck :size="15" />
                    </div>
                    <div class="stat-data">
                      <div class="stat-split">
                        <div><span class="stat-val">{{ adminCount + facultyCount }}</span><span
                            class="stat-lbl">Staff</span></div>
                        <div class="stat-divider" />
                        <div><span class="stat-val">{{ studentCount }}</span><span class="stat-lbl">Students</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-ico amber">
                      <Calendar :size="15" />
                    </div>
                    <div class="stat-data"><span class="stat-val">{{ yearSpan }}</span><span class="stat-lbl">Year
                        Span</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ══ UPLOAD ════════════════════════════════════════════ -->
        <template v-else-if="activeSection === 'upload'">
          <div class="upload-wrap">
            <div v-if="step !== 2" class="upload-center">
              <div class="upload-card">
                <div v-if="step === 1">
                  <div class="upload-card-head">
                    <div class="upload-card-icon">
                      <FileUp :size="22" color="#00a651" />
                    </div>
                    <h1 class="upload-card-title">Upload Document</h1>
                    <p>Upload a PDF to index into the research repository.</p>
                  </div>
                  <div v-if="uploadError" class="error-banner">
                    <AlertCircle :size="16" /> {{ uploadError }}
                  </div>
                  <div class="drop-zone" @click="fileInput?.click()" @drop="handleDrop" @dragover="handleDragOver"
                    @dragleave="handleDragLeave" :class="{ processing: processingDoc, dragging: isDragging }">
                    <input type="file" ref="fileInput" @change="handleFileChange" style="display:none"
                      accept="application/pdf" />
                    <div v-if="processingDoc" class="drop-loading">
                      <Loader2 :size="40" class="spin" color="#00a651" />
                      <h3>Parsing PDF…</h3>
                      <p>Running OCR and generating thumbnails</p>
                    </div>
                    <template v-else>
                      <FileUp :size="40" color="#00a651" />
                      <div class="drop-text"><strong>Click to upload</strong> or drag and drop<span>PDF files
                          only</span></div>
                    </template>
                  </div>
                </div>
                <div v-else-if="step === 3" class="upload-success">
                  <CheckCircle :size="56" color="#00a651" />
                  <h2>Research Indexed!</h2>
                  <p>Paper and selected vectors have been stored in the repository.</p>
                </div>
              </div>
            </div>

            <!-- Step 2: Review -->
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
                    <span class="file-pill-count"><strong>{{ selectedPages.length }}</strong>/{{ pages.length }}
                      pages</span>
                  </div>
                  <button @click="handleFinalConfirm" class="confirm-btn" :disabled="uploadingPaper">
                    <Loader2 v-if="uploadingPaper" :size="15" class="spin" />
                    <Check v-else :size="15" />
                    Confirm Indexing
                  </button>
                </div>
              </header>

              <div v-if="isManuscript" class="notice-banner blue">
                <div class="notice-icon">
                  <AlertCircle :size="18" color="#3b82f6" />
                </div>
                <div class="notice-body">
                  <p class="notice-title" style="color:#1e40af">Manuscript / In-Progress Document</p>
                  <p class="notice-desc" style="color:#3b82f6">No IMRAD section headings were detected. The first 10
                    pages are shown
                    for preview. Fill in sections manually or browse all pages.</p>
                </div>
                <div class="notice-actions">
                  <button @click="triggerFallback" class="notice-btn" style="background:#1d4ed8">
                    <RefreshCw :size="13" /> Browse All Pages
                  </button>
                  <button @click="cancelUpload" class="notice-btn ghost">Decline &amp; Reset</button>
                </div>
              </div>

              <div v-if="missingSections.length > 0" class="notice-banner amber">
                <div class="notice-icon">
                  <AlertTriangle :size="18" color="#f59e0b" />
                </div>
                <div class="notice-body">
                  <p class="notice-title">Incomplete IMRAD structure detected</p>
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

              <div class="review-grid">
                <section class="meta-panel">
                  <div class="meta-panel-head">
                    <span class="step-badge">1</span>
                    <h4>Verify Metadata</h4>
                  </div>
                  <div class="fg"><label>Title</label><textarea v-model="uploadMetadata.title"
                      placeholder="Research Title" /></div>
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
                        placeholder="e.g., 2025" />
                    </div>
                    <div class="fg">
                      <label>Type</label>
                      <select v-model="uploadMetadata.project_type">
                        <option>Thesis</option>
                        <option>Capstone Project</option>
                        <option>Technical Report</option>
                      </select>
                    </div>
                  </div>
                  <div class="fg"><label>Abstract</label><textarea v-model="uploadMetadata.abstract"
                      class="abstract-area" placeholder="Enter abstract…" /></div>
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
                  <div class="fg">
                    <label>Keywords</label>
                    <input v-model="uploadMetadata.keywords" type="text"
                      placeholder="e.g. machine learning, NLP, deep learning" />
                  </div>
                </section>

                <div class="review-main">
                  <!-- IMRAD Section Analysis -->
                  <section class="imrad-panel">
                    <div class="meta-panel-head" style="margin-bottom: 1.5rem;">
                      <span class="step-badge">2</span>
                      <h4>Refine IMRAD Sections</h4>
                    </div>

                    <div v-if="uploadMetadata.detected_subheadings && uploadMetadata.detected_subheadings.length > 0"
                      class="subheadings-preview">
                      <label class="fg-label">Detected Methodology Components:</label>
                      <div class="sub-tags">
                        <span v-for="sub in uploadMetadata.detected_subheadings" :key="sub" class="sub-tag">
                          <Check :size="12" /> {{ sub }}
                        </span>
                      </div>
                    </div>

                    <div class="imrad-tabs">
                      <button v-for="tab in availableImradTabs" :key="tab" type="button" class="imrad-tab-btn"
                        :class="{ active: activeImradTab === tab }" @click="activeImradTab = tab">
                        <!-- Show merged label when results tab is the combined RAD -->
                        {{ (tab === 'results' && radTabLabel) ? radTabLabel : tab.charAt(0).toUpperCase() + tab.slice(1)
                        }}
                      </button>
                    </div>

                    <!-- RAD split/merge toggle — only shown when relevant -->
                    <div v-if="isRadCombined" class="rad-mode-bar">
                      <span class="rad-mode-label">
                        {{ radModeLabel }}
                      </span>
                      <button type="button" class="rad-mode-btn"
                        @click="radSplitMode = !radSplitMode; activeImradTab = 'results'">
                        {{ radMergeBtnLabel }}
                      </button>
                    </div>

                    <div class="imrad-content">
                      <div v-if="uploadMetadata.trim_points && uploadMetadata.trim_points[activeImradTab]"
                        class="trim-alert">
                        <AlertCircle :size="16" />
                        <span>
                          <strong>Auto-Trimmed:</strong>
                          This section was trimmed at <strong>"{{ uploadMetadata.trim_points[activeImradTab]
                            }}"</strong>
                          to avoid including sub-heading content.
                        </span>
                      </div>

                      <!-- Summary preview (shown when a summary was pre-generated) -->
                      <div v-if="sectionsSummary[activeImradTab]" class="imrad-summary-preview">
                        <div class="imrad-summary-label">
                          <Sparkles :size="13" />
                          <span>AI Summary Preview</span>
                          <span class="imrad-summary-hint">This is what will be shown in IMRAD view</span>
                        </div>
                        <div class="imrad-summary-body">{{ sectionsSummary[activeImradTab] }}</div>
                      </div>

                      <!-- Raw extracted text (always editable) -->
                      <details class="imrad-raw-toggle" :open="!sectionsSummary[activeImradTab]">
                        <summary class="imrad-raw-label">
                          <FileText :size="13" />
                          {{ sectionsSummary[activeImradTab] ? 'Edit raw extracted text' : 'Raw extracted text' }}
                        </summary>
                        <textarea v-model="imradSections[activeImradTab]" class="imrad-textarea"
                          placeholder="No content detected for this section. You can manually paste it here if needed."
                          @input="autoResizeTextarea" ref="imradTextarea"></textarea>
                      </details>
                    </div>
                  </section>

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
                        :class="{ selected: selectedPages.includes(p.page_num) }"
                        @click="togglePage(p.page_num, $event)">
                        <div class="thumb-wrap">
                          <img :src="thumbSrc(p.thumbnail)" loading="lazy" class="thumb-img" @click.stop="openZoom(p)"
                            title="Click to preview" />
                          <div class="thumb-num">{{ p.label || 'P' + p.page_num }}</div>
                          <div class="thumb-sec-badges" v-if="getSectionsForPage(p.page_num).length > 0">
                            <span v-for="sec in getSectionsForPage(p.page_num)" :key="sec" class="sec-badge"
                              :class="sec">{{
                                sec.substring(0, 4) }}</span>
                          </div>
                          <div class="thumb-hover-hint">
                            <Eye :size="14" />
                          </div>
                          <!-- Checkbox now has its own click handler -->
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
          </div>
        </template>

        <!-- ══ REPOSITORY ════════════════════════════════════════ -->
        <template v-else-if="activeSection === 'repository'">
          <div class="page-head">
            <h1 class="page-title">Research Repository</h1>
            <p class="page-sub">Manage and monitor all indexed research papers.</p>
          </div>

          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-ico green">
                <Library :size="15" />
              </div>
              <div><span class="stat-val">{{ totalPapers }}</span><span class="stat-lbl">Total Papers</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-ico blue">
                <FileText :size="15" />
              </div>
              <div><span class="stat-val">{{ thesisCount }}</span><span class="stat-lbl">Theses</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-ico orange">
                <Users :size="15" />
              </div>
              <div><span class="stat-val">{{ capstoneCount }}</span><span class="stat-lbl">Capstone</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-ico purple">
                <Calendar :size="15" />
              </div>
              <div><span class="stat-val">{{ yearSpan }}</span><span class="stat-lbl">Year Span</span></div>
            </div>
          </div>

          <div class="toolbar">
            <div class="search-box">
              <Search :size="13" class="search-ico" />
              <input v-model="searchQuery" type="text" placeholder="Search by title, author, or department…" />
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

          <div class="tbl-card">
            <div class="tbl-card-head">
              <span class="tbl-count">{{ filteredPapers.length }} paper{{ filteredPapers.length !== 1 ? 's' : '' }}<span
                  v-if="searchQuery || activeFilter !== 'all'" class="tbl-hint"> · filtered</span></span>
            </div>
            <div class="tbl-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Research Paper</th>
                    <th>Year</th>
                    <th>Department</th>
                    <th>Type</th>
                    <th class="th-r">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loading">
                    <tr v-for="i in 5" :key="'sk' + i" class="skel-row">
                      <td>
                        <div class="skel-paper">
                          <div class="skel skel-av" />
                          <div>
                            <div class="skel skel-t1" />
                            <div class="skel skel-t2" />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                      <td>
                        <div class="skel skel-dept" />
                      </td>
                      <td>
                        <div class="skel skel-type" />
                      </td>
                      <td />
                    </tr>
                  </template>
                  <tr v-else-if="filteredPapers.length === 0">
                    <td colspan="5">
                      <div class="tbl-empty">
                        <FolderOpen :size="40" />
                        <h3>No papers found</h3>
                        <p>{{ searchQuery || activeFilter !== 'all' ? 'Try a different search or filter.' :
                          'Upload the first researchpaper to get started.' }}</p>
                        <button v-if="!searchQuery && activeFilter === 'all'" @click="setSection('upload')"
                          class="empty-cta">
                          <Plus :size="13" /> Upload Now
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-for="paper in filteredPapers" :key="paper.id" class="tbl-row">
                    <td class="td-paper">
                      <div class="paper-cell">
                        <div class="paper-av" :data-t="typeColor(paper.project_type)">{{ initials(paper.title) }}</div>
                        <div class="paper-info"><span class="paper-name">{{ paper.title }}</span><span
                            class="paper-author">{{
                              paper.author }}</span></div>
                      </div>
                    </td>
                    <td><span class="year-chip">{{ paper.year }}</span></td>
                    <td><span class="dept-chip">{{ paper.department }}</span></td>
                    <td><span class="type-badge" :class="typeColor(paper.project_type)">{{ paper.project_type }}</span>
                    </td>
                    <td class="td-r">
                      <button @click="openEditModal(paper)" class="row-btn" title="Edit">
                        <Edit3 :size="13" />
                      </button>
                      <button @click="handleDelete(paper.id)" class="row-btn danger" title="Delete">
                        <Trash2 :size="13" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- ══ USER MANAGER ══════════════════════════════════════ -->
        <template v-else-if="activeSection === 'users'">
          <div class="page-head">
            <h1 class="page-title">User Management</h1>
            <p class="page-sub">Monitor accounts and manage role-based access control.</p>
          </div>

          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-ico purple">
                <ShieldAlert :size="15" />
              </div>
              <div><span class="stat-val">{{ adminCount }}</span><span class="stat-lbl">Admins</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-ico green">
                <UserCheck :size="15" />
              </div>
              <div><span class="stat-val">{{ facultyCount }}</span><span class="stat-lbl">Faculty</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-ico blue">
                <Users :size="15" />
              </div>
              <div><span class="stat-val">{{ studentCount }}</span><span class="stat-lbl">Students</span></div>
            </div>
          </div>

          <div class="tbl-card">
            <div class="tbl-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th class="th-r">Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingUsers">
                    <tr v-for="i in 4" :key="'u-sk' + i" class="skel-row">
                      <td colspan="4">
                        <div class="skel skel-t1" />
                      </td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-for="user in users" :key="user.id" class="tbl-row">
                      <td>
                        <div class="paper-cell">
                          <div class="user-av">{{ user.username?.[0]?.toUpperCase() || '?' }}</div>
                          <div class="paper-info"><span class="paper-name">{{ user.username }}</span></div>
                        </div>
                      </td>
                      <td class="td-muted">{{ user.email }}</td>
                      <td>
                        <span class="type-badge"
                          :class="user.role === 'Admin' ? 'purple' : user.role === 'Faculty' ? 'green' : 'blue'">{{
                            user.role }}</span>
                      </td>
                      <td class="td-r">
                        <button @click="openRoleModal(user)" class="row-btn" title="Change role">
                          <UserCog :size="13" />
                        </button>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="!loadingUsers && users.length === 0">
                    <td colspan="4">
                      <div class="tbl-empty">
                        <Users :size="40" />
                        <h3>No users found</h3>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- ══ EDIT OVERLAY ══════════════════════════════════════ -->
        <div v-if="showEditModal" class="edit-overlay">
          <header class="edit-header">
            <div class="edit-header-left">
              <button @click="closeEditModal" class="edit-back">
                <ArrowLeft :size="15" />
              </button>
              <div>
                <div class="edit-bc">
                  <span>Management</span>
                  <ChevronRight :size="11" /><span>Repository</span>
                  <ChevronRight :size="11" /><span class="edit-bc-active">Edit Research</span>
                </div>
                <h2 class="edit-title">{{ editingPaper.title || 'Edit Paper' }}</h2>
              </div>
            </div>
            <div class="edit-header-right">
              <span class="id-badge">ID #{{ editingPaper.id }}</span>
              <button @click="closeEditModal" class="ghost-btn">Cancel</button>
              <button @click="handleUpdate" :disabled="updating" class="save-btn">
                <Loader2 v-if="updating" :size="13" class="spin" />
                <Save v-else :size="13" />
                {{ updating ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </header>
          <div class="edit-body">
            <section class="edit-form-wrap">
              <div class="edit-form-head">
                <div class="edit-form-icon">
                  <Settings :size="16" />
                </div>
                <div>
                  <h3>Document Metadata</h3>
                  <p>Update core information for this indexed document.</p>
                </div>
              </div>
              <form @submit.prevent="handleUpdate" class="edit-form">
                <div class="fg"><label>Research Title</label><textarea v-model="editingPaper.title" required rows="3"
                    placeholder="Enter full research title…" /></div>
                <div class="fg-row">
                  <div class="fg"><label>Author / Group</label><input v-model="editingPaper.author" type="text" required
                      placeholder="Main author names…" /></div>
                  <div class="fg"><label>Publication Year</label><input v-model="editingPaper.year" type="text" required
                      placeholder="e.g. 2024" /></div>
                </div>
                <div class="fg-row">
                  <div class="fg"><label>Department</label><input v-model="editingPaper.department" type="text" required
                      placeholder="e.g. Computer Science" /></div>
                  <div class="fg">
                    <label>Project Type</label>
                    <select v-model="editingPaper.project_type" required>
                      <option value="Thesis">Thesis</option>
                      <option value="Capstone Project">Capstone Project</option>
                    </select>
                  </div>
                </div>
                <div class="fg"><label>Keywords (comma separated)</label><input v-model="editingPaper.keywords"
                    type="text" placeholder="AI, Deep Learning, BERT…" /></div>
                <div class="fg"><label>Abstract / Summary</label><textarea v-model="editingPaper.abstract" rows="12"
                    placeholder="Enter abstract content…" /></div>
              </form>
            </section>
          </div>
        </div>

        <p class="foot-notice">
          <ShieldAlert :size="12" /> Only Admin, Faculty, and Librarians can upload or modify papers.
        </p>

        <!-- ══ TELEPORTED MODALS ══════════════════════════════════ -->
        <Teleport to="body">

          <!-- Strategy modal -->
          <div v-if="showStrategyModal" class="modal-overlay">
            <div class="modal-card strategy-modal">
              <div class="modal-head">
                <div class="modal-head-icon">
                  <Settings2 :size="20" color="#00a651" />
                </div>
                <div>
                  <h3>Upload Options</h3>
                  <p>{{ file?.name }}</p>
                </div>
                <button @click="goBackToStep1" class="modal-close">
                  <X :size="18" />
                </button>
              </div>
              <div class="strategy-opts">
                <button @click="selectStrategy(true)" class="strategy-card smart">
                  <div class="strategy-ico">
                    <Sparkles :size="26" />
                  </div>
                  <div class="strategy-info">
                    <h4>Automatic Scan</h4>
                    <p>Extract metadata with OCR + IMRAD detection.</p>
                  </div>
                  <span class="strategy-badge">Recommended</span>
                </button>
                <button @click="selectStrategy(false)" class="strategy-card manual">
                  <div class="strategy-ico">
                    <Eye :size="26" />
                  </div>
                  <div class="strategy-info">
                    <h4>Manual Review</h4>
                    <p>Browse pages and enter metadata yourself.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Zoom modal -->
          <div v-if="showZoomModal" class="modal-overlay" @click="closeZoom">
            <div class="zoom-modal" @click.stop>
              <!-- reuse modal-close styles so the icon sits inside the white box -->
              <button class="modal-close" @click="closeZoom">
                <X :size="22" />
              </button>
              <div v-if="zoomedPage?.label" class="zoom-label">{{ zoomedPage?.label }}</div>
              <img :src="thumbSrc(zoomedPage?.thumbnail ?? '')" class="zoom-img" />
            </div>
          </div>

          <!-- Role change modal -->
          <div v-if="roleTarget" class="modal-overlay" @click.self="closeRoleModal">
            <div class="modal-card role-modal">
              <div class="modal-head">
                <div class="modal-head-icon">
                  <UserCog :size="20" color="#00a651" />
                </div>
                <div>
                  <h3>Change Role</h3>
                  <p>Assign a new role to <strong>{{ roleTarget.username }}</strong></p>
                </div>
                <button @click="closeRoleModal" class="modal-close">
                  <X :size="18" />
                </button>
              </div>
              <div class="role-opts">
                <label class="role-opt" :class="{ selected: roleNew === 'User' }">
                  <input type="radio" v-model="roleNew" value="User" />
                  <div class="role-opt-ico blue">
                    <Users :size="15" />
                  </div>
                  <div class="role-opt-info"><span class="role-opt-name">Student / User</span><span
                      class="role-opt-desc">Can
                      search and view papers only.</span></div>
                  <Check v-if="roleNew === 'User'" :size="13" class="role-check" />
                </label>
                <label class="role-opt" :class="{ selected: roleNew === 'Faculty' }">
                  <input type="radio" v-model="roleNew" value="Faculty" />
                  <div class="role-opt-ico green">
                    <ShieldCheck :size="15" />
                  </div>
                  <div class="role-opt-info"><span class="role-opt-name">Faculty</span><span class="role-opt-desc">Can
                      upload
                      and manage research papers.</span></div>
                  <Check v-if="roleNew === 'Faculty'" :size="13" class="role-check" />
                </label>
                <label class="role-opt" :class="{ selected: roleNew === 'Admin' }">
                  <input type="radio" v-model="roleNew" value="Admin" />
                  <div class="role-opt-ico purple">
                    <ShieldAlert :size="15" />
                  </div>
                  <div class="role-opt-info"><span class="role-opt-name">Admin</span><span class="role-opt-desc">Full
                      access
                      including user management.</span></div>
                  <Check v-if="roleNew === 'Admin'" :size="13" class="role-check" />
                </label>
              </div>
              <p v-if="roleError" class="role-error">{{ roleError }}</p>
              <div class="modal-foot">
                <button @click="closeRoleModal" class="ghost-btn">Cancel</button>
                <button @click="handleRoleChange" :disabled="roleChanging || roleNew === roleTarget.role"
                  class="save-btn">
                  <Loader2 v-if="roleChanging" :size="13" class="spin" />
                  <Check v-else :size="13" />
                  {{ roleChanging ? 'Updating…' : 'Confirm Role Change' }}
                </button>
              </div>
            </div>
          </div>

        </Teleport>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;1,400&family=Source+Sans+3:wght@400;500;600;700&display=swap');

/* ── Design Tokens ───────────────────────────────────────────── */
.mgmt {
  --ink: #181c18;
  --ink-2: #3d4239;
  --ink-3: #7a7f75;
  --rule: #dfe0db;
  --surface: #f5f5f2;
  --paper: #ffffff;
  --green: #00a651;
  --green-dk: #007d3d;
  --green-dim: #e6f4ed;
  --hero: #0d1f12;
  --sb-w: 210px;

  display: flex;
  min-height: calc(100vh - 64px);
  background: var(--surface);
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
}

/* ══ SIDEBAR ════════════════════════════════════════════════════ */
.sidebar {
  width: var(--sb-w);
  flex-shrink: 0;
  background: #00a651;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.2s ease;
  z-index: 999;
}

.sidebar.collapsed {
  width: 56px;
}

.sb-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  white-space: nowrap;
}

.sb-brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sb-name {
  font-family: 'Lora', serif;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  display: block;
}

.sb-sub {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  display: block;
}

.sb-group-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.25);
  padding: 1.2rem 1rem 0.4rem;
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
}

.sb-nav {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0 0.5rem;
}

.sb-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  background: none;
  border: none;
  padding: 0.55rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.14s;
  overflow: hidden;
  white-space: nowrap;
}

.sb-item:hover {
  background: rgba(255, 255, 255, 0.07);
}

.sb-item.active {
  background: rgba(255, 255, 255, 0.12);
}

.sb-icon {
  width: 30px;
  height: 30px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.14s, color 0.14s;
}

.sb-icon.active {
  background: var(--green);
  color: #fff;
}

.sb-item-body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.sb-item-label {
  display: block;
  font-size: 0.84rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.sb-item-desc {
  display: block;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-arrow {
  color: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.sb-footer {
  margin-top: auto;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  white-space: nowrap;
}

.sidebar.collapsed .sb-group-label,
.sidebar.collapsed .sb-item-body,
.sidebar.collapsed .sb-arrow,
.sidebar.collapsed .sb-brand-text,
.sidebar.collapsed .sb-footer span {
  opacity: 0;
  pointer-events: none;
}

.sb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1050;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: var(--sb-w) !important;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    z-index: 1100;
  }

  .sidebar.mob-open {
    transform: translateX(0);
  }
}

/* ══ TOPBAR ═════════════════════════════════════════════════════ */
.topbar {
  height: 48px;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 20;
  gap: 1rem;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sb-toggle {
  background: none;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  padding: 0.3rem;
  display: flex;
  align-items: center;
  border-radius: 5px;
  transition: background 0.13s, color 0.13s;
}

.sb-toggle:hover {
  background: var(--surface);
  color: var(--ink);
}

.bc-root {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
}

.bc-sep {
  color: var(--rule);
}

.bc-active {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink);
}

/* Steps rail */
.steps-rail {
  display: flex;
  align-items: center;
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
  border-color: var(--green);
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
}

.pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--green);
  animation: pulse 1.6s ease-out infinite;
  opacity: 0;
}

@keyframes pulse {
  0% {
    opacity: .7;
    transform: scale(1)
  }

  100% {
    opacity: 0;
    transform: scale(1.6)
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
}

/* ══ CONTENT ════════════════════════════════════════════════════ */
.mgmt-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding: 2rem 2rem 4rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.page-head {
  margin-bottom: 1.75rem;
}

.page-title {
  font-family: 'Lora', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.25rem;
}

.page-sub {
  font-size: 0.84rem;
  color: var(--ink-3);
  margin: 0;
}

/* Stats */
.stats-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.stat-card {
  flex: 1;
  min-width: 130px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-ico {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-ico.green {
  background: var(--green-dim);
  color: var(--green-dk);
}

.stat-ico.blue {
  background: #eff6ff;
  color: #2563eb;
}

.stat-ico.orange {
  background: #fff7ed;
  color: #c2410c;
}

.stat-ico.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.stat-ico.amber {
  background: #fffbeb;
  color: #b45309;
}

.stat-val {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
}

.stat-lbl {
  display: block;
  font-size: 0.7rem;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.search-box {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 6px;
  padding: 0 0.75rem;
}

.search-box:focus-within {
  border-color: var(--green);
}

.search-ico {
  color: var(--ink-3);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.88rem;
  color: var(--ink);
  padding: 0.55rem 0;
  background: transparent;
}

.filter-chips {
  display: flex;
  gap: 0.35rem;
}

.chip {
  border: 1.5px solid var(--rule);
  background: var(--paper);
  color: var(--ink-3);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.13s;
}

.chip:hover {
  border-color: var(--green);
  color: var(--green-dk);
}

.chip.active {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}

/* Table */
.tbl-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}

.tbl-card-head {
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--rule);
}

.tbl-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-3);
}

.tbl-hint {
  color: var(--ink-3);
  font-weight: 400;
}

.tbl-scroll {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  min-width: 580px;
}

.tbl thead th {
  padding: 0.65rem 1rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
  border-bottom: 1px solid var(--rule);
  text-align: left;
  background: var(--surface);
}

.th-r {
  text-align: right;
}

.tbl-row td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--rule);
  font-size: 0.84rem;
  color: var(--ink-2);
  vertical-align: middle;
}

.tbl-row:last-child td {
  border-bottom: none;
}

.tbl-row:hover td {
  background: #fafaf8;
}

.td-muted {
  color: var(--ink-3);
}

.td-paper {
  min-width: 260px;
}

.td-r {
  text-align: right;
}

.paper-cell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.paper-av {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.paper-av[data-t="blue"] {
  background: #eff6ff;
  color: #2563eb;
}

.paper-av[data-t="orange"] {
  background: #fff7ed;
  color: #c2410c;
}

.user-av {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--rule);
  color: var(--ink-2);
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.paper-name {
  display: block;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.35;
}

.paper-author {
  display: block;
  font-size: 0.74rem;
  color: var(--ink-3);
}

.year-chip {
  background: var(--surface);
  border: 1px solid var(--rule);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 4px;
}

.dept-chip {
  font-size: 0.74rem;
  color: var(--ink-3);
}

.type-badge {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
}

.type-badge.blue {
  background: #eff6ff;
  color: #2563eb;
}

.type-badge.orange {
  background: #fff7ed;
  color: #c2410c;
}

.type-badge.green {
  background: var(--green-dim);
  color: var(--green-dk);
}

.type-badge.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.row-btn {
  background: none;
  border: 1px solid var(--rule);
  color: var(--ink-3);
  cursor: pointer;
  border-radius: 5px;
  padding: 0.3rem 0.45rem;
  margin-left: 0.25rem;
  display: inline-flex;
  align-items: center;
  transition: all 0.13s;
}

.row-btn:hover {
  border-color: var(--green);
  color: var(--green-dk);
  background: var(--green-dim);
}

.row-btn.danger:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

.tbl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--rule);
  text-align: center;
}

.tbl-empty h3 {
  font-size: 1rem;
  color: var(--ink-3);
  margin: 0;
}

.tbl-empty p {
  font-size: 0.84rem;
  color: var(--ink-3);
  margin: 0;
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.45rem 1rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
}

/* Skeleton */
.skel {
  background: linear-gradient(90deg, #f0f0ec 25%, #e8e8e4 50%, #f0f0ec 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0
  }

  100% {
    background-position: -200% 0
  }
}

.skel-paper {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.skel-av {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  flex-shrink: 0;
}

.skel-t1 {
  width: 180px;
  height: 13px;
  margin-bottom: 5px;
}

.skel-t2 {
  width: 100px;
  height: 10px;
}

.skel-chip {
  width: 44px;
  height: 22px;
}

.skel-dept {
  width: 110px;
  height: 13px;
}

.skel-type {
  width: 70px;
  height: 20px;
}

/* ══ DASHBOARD ═════════════════════════════════════════════════ */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.panel {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--rule);
}

.panel-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
}

.panel-link {
  background: none;
  border: none;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.78rem;
  color: var(--green-dk);
  cursor: pointer;
  font-weight: 600;
  padding: 0;
}

.panel-link:hover {
  text-decoration: underline;
}

.panel-body {
  padding: 0.25rem 0;
}

.panel-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  color: var(--ink-3);
  font-size: 0.84rem;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem;
  color: var(--rule);
}

.panel-empty p {
  font-size: 0.84rem;
  color: var(--ink-3);
  margin: 0;
}

.dash-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--rule);
}

.dash-row:last-child {
  border-bottom: none;
}

.dash-av {
  width: 32px;
  height: 32px;
  border-radius: 5px;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dash-av[data-t="blue"] {
  background: #eff6ff;
  color: #2563eb;
}

.dash-av[data-t="orange"] {
  background: #fff7ed;
  color: #c2410c;
}

.dash-info {
  flex: 1;
  min-width: 0;
}

.dash-title {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dash-meta {
  display: block;
  font-size: 0.7rem;
  color: var(--ink-3);
}

.type-chip {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  flex-shrink: 0;
}

.type-chip.blue {
  background: #eff6ff;
  color: #2563eb;
}

.type-chip.orange {
  background: #fff7ed;
  color: #c2410c;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.stat-tile {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 1rem;
  border-bottom: 1px solid var(--rule);
  border-right: 1px solid var(--rule);
}

.stat-tile:nth-child(even) {
  border-right: none;
}

.stat-tile:nth-last-child(-n+2) {
  border-bottom: none;
}

.stat-data {
  flex: 1;
}

.stat-split {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: var(--rule);
}

/* ══ UPLOAD ════════════════════════════════════════════════════ */

.upload-center {
  display: flex;
  justify-content: center;
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

.drop-zone.dragging {
  border-color: #00a651;
  background: var(--green-dim);
}

.drop-zone:hover:not(.processing) {
  border-color: var(--green);
  background: var(--green-dim);
}

.drop-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.drop-loading h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--ink);
}

.drop-loading p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-3);
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

/* Review */
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

/* Form groups (shared between upload and edit) */
.fg {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.9rem;
}

.fg label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-3);
}

.fg input,
.fg select,
.fg textarea {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 5px;
  padding: 0.5rem 0.7rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.88rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.13s;
  width: 100%;
  box-sizing: border-box;
}

.fg input:focus,
.fg select:focus,
.fg textarea:focus {
  border-color: var(--green);
  background: var(--paper);
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

.meta-panel {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1.25rem;
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

.page-panel {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1.25rem;
}

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

.req-badge {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--green-dim);
  color: var(--green-dk);
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
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

.rad-mode-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.75rem;
  background: #f0faf5;
  border: 1px solid #b2dfc6;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  font-size: 0.78rem;
}

.rad-mode-label {
  color: #2d6a4f;
  flex: 1;
}

.rad-mode-btn {
  font-size: 0.73rem;
  padding: 0.2rem 0.55rem;
  background: #fff;
  color: #007d3d;
  border: 1px solid #00a651;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
}

.rad-mode-btn:hover {
  background: #00a651;
  color: #fff;
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

/* Remove zoom-trigger styles, add this instead: */
.thumb-img {
  width: 100%;
  display: block;
  cursor: zoom-in;
  transition: filter 0.15s;
}

.thumb-wrap:hover .thumb-img {
  filter: brightness(0.88);
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
  /* allow clicks to pass through to card/image */
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

/* ══ EDIT OVERLAY ══════════════════════════════════════════════ */
.edit-overlay {
  position: fixed;
  inset: 0;
  background: var(--surface);
  z-index: 500;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.edit-header {
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.edit-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.edit-back {
  background: none;
  border: 1px solid var(--rule);
  color: var(--ink-3);
  border-radius: 5px;
  padding: 0.35rem 0.45rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.13s;
}

.edit-back:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.edit-bc {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: var(--ink-3);
  margin-bottom: 0.15rem;
}

.edit-bc-active {
  color: var(--ink);
  font-weight: 600;
}

.edit-title {
  font-family: 'Lora', serif;
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  color: var(--ink);
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.id-badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--ink-3);
  background: var(--surface);
  border: 1px solid var(--rule);
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
}

.ghost-btn {
  background: none;
  border: 1.5px solid var(--rule);
  color: var(--ink-3);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem 0.85rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.13s;
}

.ghost-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #1a3020;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.45rem 1rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;
}

.save-btn:hover:not(:disabled) {
  background: #00a651;
  color: #fff;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.edit-body {
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.edit-form-wrap {
  width: 100%;
  max-width: 680px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1.75rem;
}

.edit-form-head {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--rule);
}

.edit-form-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  flex-shrink: 0;
}

.edit-form-head h3 {
  margin: 0 0 0.15rem;
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--ink);
}

.edit-form-head p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-3);
}

.edit-form .fg:last-child textarea {
  min-height: 240px;
}

.foot-notice {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.74rem;
  color: var(--ink-3);
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--rule);
}

/* ══ MODALS ════════════════════════════════════════════════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  background: #ffffff;
  border-radius: 10px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  opacity: 1;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.modal-head-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-head h3 {
  margin: 0 0 0.15rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
}

.modal-head p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-3);
}

.modal-close {
  background: none;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.modal-close:hover {
  color: var(--ink);
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.strategy-modal {
  max-width: 420px;
}

.strategy-opts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
}

.strategy-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: var(--surface);
  border: 2px solid var(--rule);
  border-radius: 8px;
  padding: 1rem 1.1rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.14s, background 0.14s;
  position: relative;
}

.strategy-card.smart:hover {
  border-color: var(--green);
  background: var(--green-dim);
}

.strategy-card.manual:hover {
  border-color: var(--ink-3);
}

.strategy-ico {
  color: var(--green);
  flex-shrink: 0;
}

.strategy-card.manual .strategy-ico {
  color: var(--ink-3);
}

.strategy-info h4 {
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}

.strategy-info p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-3);
}

.strategy-badge {
  position: absolute;
  top: 0.6rem;
  right: 0.7rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--green);
  color: #fff;
  padding: 0.12rem 0.45rem;
  border-radius: 3px;
}

.zoom-modal {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: var(--paper);
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

/* zoom-close class is no longer used; icon now uses .modal-close which is already styled
   to appear inside the modal with proper offset and z‑index. */

.zoom-label {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  text-align: center;
  border-radius: 4px 4px 0 0;
}

.zoom-img {
  display: block;
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 0 0 6px 6px;
}

/* Role modal */
.role-opts {
  display: flex;
  flex-direction: column;
  padding: 1rem 1.25rem;
  background: #ffffff;
  gap: 0.5rem;
}

.role-opt {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 0.85rem;
  border-radius: 7px;
  cursor: pointer;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  transition: background 0.13s, border-color 0.13s;
}

.role-opt input {
  display: none;
}

.role-opt:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.role-opt.selected {
  border-color: var(--green);
  background: var(--green-dim);
}

.role-opt-ico {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.role-opt-ico.blue {
  background: #eff6ff;
  color: #2563eb;
}

.role-opt-ico.green {
  background: var(--green-dim);
  color: var(--green-dk);
}

.role-opt-ico.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.role-opt-info {
  flex: 1;
}

.role-opt-name {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ink);
}

.role-opt-desc {
  display: block;
  font-size: 0.75rem;
  color: var(--ink-3);
}

.role-check {
  color: var(--green-dk);
  flex-shrink: 0;
}

.role-error {
  font-size: 0.8rem;
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 5px;
  padding: 0.6rem 0.75rem;
  margin: 0.25rem 1.25rem 0.75rem;
}

/* ══ SPINNER ═══════════════════════════════════════════════════ */
.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ══ TRANSITIONS ══════════════════════════════════════════════ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ══ RESPONSIVE ════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .review-grid {
    grid-template-columns: 320px 1fr;
  }

  .dash-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .review-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    min-width: calc(50% - 0.5rem);
  }
}

@media (max-width: 768px) {
  .content {
    padding: 1.25rem 1rem 3rem;
  }

  .topbar {
    padding: 0 1rem;
  }

  .edit-header {
    padding: 0.75rem 1rem;
  }

  .edit-body {
    padding: 1rem;
  }

  .upload-card {
    padding: 1.5rem;
  }

  .edit-form-wrap {
    padding: 1.25rem;
  }
}

@media (max-width: 480px) {
  .content {
    padding: 1rem 0.75rem 2.5rem;
  }

  .stats-row .stat-card {
    min-width: 100%;
  }

  .fg-row {
    grid-template-columns: 1fr;
  }

  .review-bar-right {
    width: 100%;
  }

  .file-pill-name {
    max-width: 100px;
  }

  .edit-title {
    max-width: 180px;
    font-size: 0.9rem;
  }

  .tbl {
    min-width: 460px;
  }

  .thumbs-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }
}

/* ══ IMRAD PANEL ═══════════════════════════════════════════════ */
.imrad-panel {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1.5rem;
}

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

.imrad-tabs {
  display: flex;
  gap: 0.25rem;
  background: var(--surface);
  padding: 0.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
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
  margin-bottom: 1rem;
  font-size: 0.82rem;
  line-height: 1.4;
}

.trim-alert strong {
  color: #78350f;
}

.imrad-textarea {
  width: 100%;
  min-height: 300px;
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

/* ── IMRAD summary preview (Step 2) ──────────────────────── */
.imrad-summary-preview {
  background: var(--green-dim);
  border: 1.5px solid rgba(0, 166, 81, 0.3);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
}

.imrad-summary-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--green-dk);
  margin-bottom: 0.65rem;
}

.imrad-summary-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ink-3);
  font-size: 0.71rem;
  margin-left: 0.25rem;
}

.imrad-summary-body {
  font-size: 0.9rem;
  line-height: 1.75;
  color: var(--ink-2);
  white-space: pre-wrap;
}

/* collapsible raw text toggle */
.imrad-raw-toggle {
  margin-top: 0.25rem;
}

.imrad-raw-toggle[open]>.imrad-raw-label {
  margin-bottom: 0.5rem;
}

.imrad-raw-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  user-select: none;
  list-style: none;
  padding: 0.3rem 0;
}

.imrad-raw-label::-webkit-details-marker {
  display: none;
}

.imrad-raw-label:hover {
  color: var(--ink);
}
</style>
