<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, reactive, nextTick, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Library, Trash2, Edit3,
  Search, Plus, FolderOpen, Loader2,
  FileText, Users, Calendar, ChevronRight,
  Settings, ArrowLeft, Save, BookOpen,
  UserCheck, Menu, X, Clock, Eye,
  FileUp, CheckCircle, AlertCircle, Check,
  AlertTriangle, RefreshCw, SquareArrowRight, ShieldAlert, ShieldCheck, UserCog, UserPlus, ArchiveRestore, GripVertical, Terminal, Activity
} from 'lucide-vue-next'
import { api, BASE_URL, type Paper, type UserResponse, type PartialPaperMetadata, type ActivityLog, type SampleDocument } from '../services/api'
import { useAuth } from '../composables/useAuth'
import BookLoader from '../components/BookLoader.vue'

const router = useRouter()
const { isAdmin, isFaculty } = useAuth()
const canEdit = computed(() => isAdmin.value || isFaculty.value)

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
  if (clockInterval) clearInterval(clockInterval)
})

// ── Realtime System Time ─────────────────────────────────────────
const currentTime = ref(new Date())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clockInterval: any = null

onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

const formattedTime = computed(() => {
  return currentTime.value.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
})

// ── Sidebar ─────────────────────────────────────────────────────
type Section = 'repository' | 'users' | 'upload' | 'logs' | 'trash' | 'console'
const activeSection = ref<Section>('repository')

const baseNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'upload', label: 'Upload Research', icon: FileUp, description: 'Index new PDF documents' },
  { id: 'repository', label: 'Thesis & Research', icon: Library, description: 'Browse & manage indexed works' },
]
const adminNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'users', label: 'User Manager', icon: Users, description: 'Manage students & faculty' },
  { id: 'logs', label: 'Activity Log', icon: Clock, description: 'Track uploads, edits & deletes' },
]
const canEditNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'trash', label: 'Trash', icon: Trash2, description: 'Deleted docs · 15-day window' },
]
const navItems = computed(() => {
  const items = [...baseNavItems]
  if (isAdmin.value) {
    items.push(...adminNavItems)
    items.push({ id: 'console', label: 'System Console', icon: Terminal, description: 'Live terminal & server logs' })
    items.push(...canEditNavItems)
  } else if (canEdit.value) {
    items.push({ id: 'logs' as Section, label: 'Activity Log', icon: Clock, description: 'Track uploads, edits & deletes' })
    items.push(...canEditNavItems)
  }
  return items
})

const activeLabel = computed(() => {
  return navItems.value.find(i => i.id === activeSection.value)?.label ?? 'Repository'
})

const setSection = (s: Section) => {
  if (s === 'users' && !isAdmin.value) return

  // Reset navigation-blocking states
  showEditModal.value = false
  showCreateUserModal.value = false
  showPurgeModal.value = false
  roleTarget.value = null
  if (s !== 'upload') step.value = 1

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

// ── Live Terminal Console ─────────────────────────────────────────
const terminalLogs = ref<string[]>([])
const terminalEventSource = ref<EventSource | null>(null)
const consoleScrollRef = ref<HTMLElement | null>(null)

const connectTerminal = () => {
  if (terminalEventSource.value) return
  
  const url = api.getTerminalStreamUrl()
  const es = new EventSource(url)
  terminalEventSource.value = es

  es.onmessage = (e) => {
    terminalLogs.value.push(e.data)
    if (terminalLogs.value.length > 1000) terminalLogs.value.shift()
    
    nextTick(() => {
      if (consoleScrollRef.value) {
        consoleScrollRef.value.scrollTop = consoleScrollRef.value.scrollHeight
      }
    })
  }

  es.onerror = (err) => {
    console.warn('Terminal stream error:', err)
    es.close()
    terminalEventSource.value = null
    // Fallback error message in console
    if (terminalLogs.value[terminalLogs.value.length-1] !== ">> [SYSTEM] Reconnecting to stream...") {
        terminalLogs.value.push(">> [SYSTEM] Reconnecting to stream...")
    }
    setTimeout(connectTerminal, 3000)
  }
}

const disconnectTerminal = () => {
  if (terminalEventSource.value) {
    terminalEventSource.value.close()
    terminalEventSource.value = null
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

// ── Activity Logs ─────────────────────────────────────────────────
const logs = ref<ActivityLog[]>([])
const loadingLogs = ref(false)

const fetchLogs = async () => {
  loadingLogs.value = true
  try {
    logs.value = await api.getLogs()
  } catch (e) {
    console.error('Failed to fetch logs: ', e)
  } finally {
    loadingLogs.value = false
  }
}

const logActionColor = (action: string) => {
  if (action === 'Upload') return 'green'
  if (action === 'Edit') return 'blue'
  if (action === 'Delete') return 'red'
  if (action === 'Restore') return 'green'
  if (action === 'Purge') return 'red'
  return ''
}

const formatLogDate = (iso: string) => {
  // Backend now stores local PC time.
  // Native Date constructor treats ISO strings without 'Z' as Local time.
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

watch(activeSection, (s) => { if (s === 'logs') fetchLogs() })

// ── Trash / Recycle Bin ───────────────────────────────────────────
const trashedPapers = ref<Paper[]>([])
const loadingTrash = ref(false)
const showPurgeModal = ref(false)
const purgeTarget = ref<Paper | null>(null)
const purging = ref(false)

const fetchTrashedPapers = async () => {
  loadingTrash.value = true
  try { trashedPapers.value = await api.getTrashedPapers() }
  catch (e) { console.error('Failed to fetch trash:', e) }
  finally { loadingTrash.value = false }
}

const daysRemaining = (deletedAt: string): number => {
  // Backend naive Local time (no 'Z') is treated as local by the Date constructor
  const deleted = new Date(deletedAt)
  const now = currentTime.value // Uses the reactive system clock
  const diffMs = now.getTime() - deleted.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, 15 - diffDays)
}

const daysBadgeClass = (days: number): string => {
  if (days >= 8) return 'days-green'
  if (days >= 4) return 'days-amber'
  return 'days-red'
}

const handleRestore = async (paper: Paper) => {
  try {
    await api.restorePaper(paper.id)
    await fetchTrashedPapers()
    await fetchPapers()
  } catch {
    alert('Failed to restore paper.')
  }
}

const openPurgeModal = (paper: Paper) => {
  purgeTarget.value = paper
  showPurgeModal.value = true
}

const closePurgeModal = () => {
  showPurgeModal.value = false
  purgeTarget.value = null
}

const handlePurgeConfirm = async () => {
  if (!purgeTarget.value) return
  purging.value = true
  try {
    await api.purgePaper(purgeTarget.value.id)
    await fetchTrashedPapers()
    closePurgeModal()
  } catch {
    alert('Failed to purge paper.')
  } finally {
    purging.value = false
  }
}

watch(activeSection, (s) => { if (s === 'trash') fetchTrashedPapers() })

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

// ── User Creation ────────────────────────────────────────────────
const showCreateUserModal = ref(false)
const creatingUser = ref(false)
const createError = ref('')
const createdPassword = ref('')
const newUser = reactive({
  username: '',
  full_name: '',
  role: 'Faculty'
})

const openCreateUserModal = () => {
  newUser.username = ''
  newUser.full_name = ''
  newUser.role = 'Faculty'
  createdPassword.value = ''
  createError.value = ''
  showCreateUserModal.value = true
}

const closeCreateUserModal = () => {
  showCreateUserModal.value = false
  newUser.username = ''
  newUser.full_name = ''
  newUser.role = 'Faculty'
  createdPassword.value = ''
  createError.value = ''
}

const handleCreateStaff = async () => {
  if (!newUser.username || !newUser.full_name) {
    createError.value = 'Please fill in all fields.'
    return
  }
  creatingUser.value = true
  createError.value = ''
  try {
    const res = await api.createStaffUser(newUser)
    createdPassword.value = res.password
    await fetchUsers()
  } catch (err) {
    createError.value = (err as Error).message || 'Failed to create user.'
  } finally {
    creatingUser.value = false
  }
}

// ── Upload ────────────────────────────────────────────────────────
const step = ref(1) // 1: Upload, 2: Review, 3: Done
const processingDoc = ref(false)
const uploadingPaper = ref(false)
const uploadError = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const sessionId = ref('')
const extractionProgress = ref(0)
const extractionMessage = ref('')
let currentEventSource: EventSource | null = null

// ── Sample Documents (System Evaluation Feature) ──────────────────
// Loaded once per upload-section visit. Hidden automatically when
// the backend returns an empty list (ENABLE_SAMPLE_DOCS=false).
const sampleDocs = ref<SampleDocument[]>([])
const fetchingSampleDocId = ref<string | null>(null)

const loadSampleDocs = async () => {
  try {
    sampleDocs.value = await api.getSampleDocuments()
  } catch {
    sampleDocs.value = [] // Silently degrade — feature may be disabled
  }
}

/**
 * Attach a sample document to the upload flow.
 * Fetches the file blob from the backend and opens the strategy modal.
 * This is used by both drag-and-drop and direct click/tap.
 */
const attachSampleDoc = async (doc: SampleDocument) => {
  if (processingDoc.value || fetchingSampleDocId.value || activeSection.value !== 'upload' || step.value !== 1) {
    return
  }

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

/**
 * Drag-start handler for sample document rows.
 * Synchronously stamps the doc's ID as a custom MIME type into the
 * DataTransfer bag.
 */
const handleSampleDocDragStart = (e: DragEvent, doc: SampleDocument) => {
  if (processingDoc.value || fetchingSampleDocId.value) {
    e.preventDefault()
    return
  }
  e.dataTransfer!.effectAllowed = 'copy'
  // stamp the doc id — picked up by handleDrop on the drop zone
  e.dataTransfer!.setData('application/x-lumia-sample-doc', doc.id)
}

function stopProgressListening() {
  if (currentEventSource) {
    currentEventSource.close()
    currentEventSource = null
  }
}

function listenForProgress(sid: string) {
  stopProgressListening()

  // SSE endpoint for state streaming
  const url = `${BASE_URL}/papers/upload/status/${sid}`
  currentEventSource = new EventSource(url)

  currentEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.progress !== undefined) extractionProgress.value = data.progress
      if (data.message) extractionMessage.value = data.message

      if (data.status === 'completed' || data.status === 'failed') {
        stopProgressListening()
      }
    } catch (err) {
      console.warn('[SSE] Failed to parse message:', err)
    }
  }

  currentEventSource.onerror = (err) => {
    console.warn('[SSE] Connection error:', err)
    stopProgressListening()
  }
}

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
  trim_points: {},
  media: {} as Record<string, string>
})
const activeImradTab = ref<'introduction' | 'methods' | 'results' | 'discussion' | 'references'>('introduction')

// Keep in sync with imrad_service.py METHODOLOGY_SUBHEADINGS labels
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

// Raw sections keep [[TABLE_IMAGE:...]] markers intact so they are saved to DB
const rawImradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: '',
  references: ''
})

// RAD combined detection: results and discussion have identical text
// when the backend stored a single combined RAD section


// Available tabs — merges R+D into one tab
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

// ── References preview helpers ────────────────────────────────────────────────
// Mirrors the logic in detail_win.vue so the upload preview shows the same
// formatted list that students will see on the paper detail page.

const parsedReferencesPreview = computed((): string[] => {
  const raw = imradSections.references?.trim()
  if (!raw) return []

  // Primary: blank-line separation (output of backend _postprocess_references)
  const byBlankLine = raw.split(/\n\n+/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean)
  if (byBlankLine.length > 1) return byBlankLine

  // Fallback A: IEEE-style numeric markers [1] [2] …
  const byIEEE = raw.split(/(?=\[\d+\])/).map(s => s.trim()).filter(Boolean)
  if (byIEEE.length > 1) return byIEEE

  // Fallback B: numbered list "1. " "2. " …
  const byNumbered = raw.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
  if (byNumbered.length > 1) return byNumbered

  // Last resort: one entry
  return [raw]
})

/**
 * formatReferenceEntry (upload preview version)
 * -----------------------------------------------
 * APA parser: bold authors, italic title, live DOI/URL links.
 */
const linkifyReferences = (raw: string): string => {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const linkify = (s: string): string => {
    let out = s.replace(
      /https?:\/\/[^\s,)\]&]+/g,
      url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="ref-link-preview">${url}</a>`
    )
    out = out.replace(
      /(?<!href=")(?:doi:\s*)(10\.[^\s,)\]&]+)/gi,
      (_, doi) =>
        `doi: <a href="https://doi.org/${doi}" target="_blank" rel="noopener noreferrer" class="ref-link-preview">${doi}</a>`
    )
    return out
  }

  const escapedRaw = esc(raw)

  // APA: "Authors. (Year). Title. Source."
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
      titleHtml = `<em class="ref-title-preview">${titleText}.</em> `
      sourceHtml = linkify(sourceText)
    } else {
      titleHtml = `<em class="ref-title-preview">${linkify(remainder)}</em>`
    }
    return (
      `<span class="ref-authors-preview">${esc(authorBlock)}.</span> ` +
      `<span class="ref-year-preview">(${year}).</span> ` +
      titleHtml +
      sourceHtml
    )
  }

  // IEEE [1]
  const ieeeMatch = escapedRaw.match(/^(\[\d+\])\s+(.*)$/s)
  if (ieeeMatch) {
    return `<span class="ref-num-preview">${ieeeMatch[1] ?? ''}</span> ` + linkify(ieeeMatch[2] ?? '')
  }

  // Numbered 1.
  const numMatch = escapedRaw.match(/^(\d+\.)\s+(.*)$/s)
  if (numMatch) {
    return `<span class="ref-num-preview">${numMatch[1] ?? ''}</span> ` + linkify(numMatch[2] ?? '')
  }

  return linkify(escapedRaw)
}

const authors = ref<string[]>([''])
const selectedPages = ref<number[]>([])
const sectionPages = ref<Record<string, number[]>>({})
const isManuscript = ref(false)

const missingSections = computed(() => {
  const present = Object.keys(uploadMetadata.section_pages || {})
  return REQUIRED_SECTIONS.filter((s) => !present.includes(SECTION_KEY_MAP[s]))
})



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
      // Store raw (with markers) for DB submission
      Object.assign(rawImradSections, preview.sections as Record<string, string>)
      // Strip markers for clean display
      const cleaned = { ...preview.sections as Record<string, string> }
      for (const k of ALL_IMRAD_TABS) {
        if (cleaned[k]) cleaned[k] = cleaned[k].replace(/\[\[(?:TABLE|FIGURE)_IMAGE:.*?\]\]/g, '')
      }
      Object.assign(imradSections, cleaned)
    }
    // Capture media so it is passed to confirmUpload
    if (preview.media) uploadMetadata.media = preview.media
    // Capture references
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
  if (processingDoc.value) return
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file.value = target.files[0]
    startInitialExtraction(true)
  }
}

const isDragging = ref(false)

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  if (processingDoc.value || activeSection.value !== 'upload' || step.value !== 1) return

  // ── Sample document drag (custom MIME type set by handleSampleDocDragStart) ──
  const sampleDocId = e.dataTransfer?.getData('application/x-lumia-sample-doc')
  if (sampleDocId) {
    const doc = sampleDocs.value.find(d => d.id === sampleDocId)
    if (doc) attachSampleDoc(doc)
    return
  }

  // ── Normal OS file drop ──
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
  if (!processingDoc.value && activeSection.value === 'upload' && step.value === 1) {
    isDragging.value = true
  }
}

const handleDragLeave = (e: DragEvent) => {
  // Only clear when leaving the window entirely
  if (e.relatedTarget === null) isDragging.value = false
}


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
      // Store raw (with markers) for DB submission
      Object.assign(rawImradSections, preview.sections as Record<string, string>)
      // Strip markers for clean display
      const cleaned = { ...preview.sections as Record<string, string> }
      for (const k of ALL_IMRAD_TABS) {
        if (cleaned[k]) cleaned[k] = cleaned[k].replace(/\[\[(?:TABLE|FIGURE)_IMAGE:.*?\]\]/g, '')
      }
      Object.assign(imradSections, cleaned)
    }
    // Capture media so it is passed to confirmUpload
    if (preview.media) uploadMetadata.media = preview.media
    // Capture references
    if (preview.references) {
      imradSections.references = preview.references
      rawImradSections.references = preview.references
    }

    // Set active tab to the first section that actually has content
    const firstAvailable = ALL_IMRAD_TABS.find(t => imradSections[t])
    if (firstAvailable) activeImradTab.value = firstAvailable === 'discussion' ? 'results' : firstAvailable
    setTimeout(() => { step.value = 2; processingDoc.value = false }, 400)
  } catch (err: unknown) {
    stopProgressListening()
    processingDoc.value = false
    // Check for structured Termination Report
    const errorData = err as { error_type?: string; report?: string }
    if (errorData && errorData.error_type === 'TERMINATION_REPORT') {
      uploadError.value = `Upload Terminated: ${errorData.report}`
    } else {
      uploadError.value = (err as Error).message || 'Failed to parse PDF.'
    }
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
      // Send RAW sections (with markers) so backend can match images correctly
      introduction: rawImradSections.introduction || imradSections.introduction,
      methods: rawImradSections.methods || imradSections.methods,
      results: rawImradSections.results || imradSections.results,
      discussion: rawImradSections.results || imradSections.results, // Combined RAD
      references: rawImradSections.references || imradSections.references,
      media: uploadMetadata.media,
    })
    step.value = 3
    setTimeout(async () => {
      await fetchPapers()
      setSection('repository')
      step.value = 1
      file.value = null
    }, 200)
  } catch (err) {
    uploadError.value = (err as Error).message || 'Failed to finalize upload.'
  } finally { uploadingPaper.value = false }
}


watch(activeSection, (newSection) => {
  if (newSection === 'repository') fetchPapers()
  if (newSection === 'users' && users.value.length === 0) fetchUsers()
  if (newSection === 'upload' && sampleDocs.value.length === 0) loadSampleDocs()
  if (newSection === 'console') connectTerminal()
  else disconnectTerminal()
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
              <div v-if="step === 1" class="step-spinner" />
            </div>
            <span class="step-label">Upload</span>
          </div>
          <div class="step-line" />
          <div class="step-item" :class="{ active: step >= 2, done: step > 2 }">
            <div class="step-num">
              <Check v-if="step > 2" :size="12" /><span v-else>2</span>
              <div v-if="step === 2" class="step-spinner" />
            </div>
            <span class="step-label">Review</span>
          </div>
          <div class="step-line" />
          <div class="step-item" :class="{ active: step >= 3 }">
            <div class="step-num">
              <Check v-if="step > 3" :size="12" /><span v-else>3</span>
              <div v-if="step === 3" class="step-spinner" />
            </div>
            <span class="step-label">Done</span>
          </div>
        </div>

        <div class="topbar-right">
          <div class="live-clock">
            <Clock :size="13" stroke-width="2.5" />
            <span>{{ formattedTime }}</span>
          </div>
        </div>
      </header>

      <!-- ── Content ─────────────────────────────────────────── -->
      <div class="content">


        <!-- ══ UPLOAD ════════════════════════════════════════════ -->
        <template v-if="activeSection === 'upload'">
          <div class="upload-wrap">
            <!--
            <div v-if="sampleDocs.length > 0 && step === 1"
              class="notice-banner green flat-notice sample-ethics-notice-top">
              <div class="notice-icon">
                <ShieldCheck :size="20" color="#00a651" />
              </div>
              <div class="notice-body">
                <p class="notice-title">BASAHIN</p>
                <p class="notice-desc">
                  To maintain document integrity and ensure the researchers privacy such as (Biographical Data,
                  Signatories, Biolerplate Texts, Contribution No., etc.), borrowed thesis/capstone papers are
                  pre-stored in the server. This eliminates the need for manual file dissemination to
                  evaluators and prevents
                  local downloads, keeping sensitive academic data protected.
                </p>
              </div>
            </div>
            -->

            <div v-if="step !== 2" class="upload-center">

              <!-- Clean Processing View (Visible only during parsing) -->
              <div v-if="processingDoc" class="processing-container">
                <BookLoader :progress="extractionProgress" :message="extractionMessage" />
              </div>

              <!-- Initial Upload State -->
              <div v-else-if="step === 1" class="upload-card">

                <div class="upload-card-head">
                  <div class="upload-card-icon">
                    <FileUp :size="22" color="#00a651" />
                  </div>
                  <h1 class="upload-card-title">Upload Document</h1>
                  <p>Upload a PDF to index into the research repository.</p>
                </div>
                <div v-if="uploadError" class="error-banner"
                  :class="{ 'terminal-error': uploadError.includes('Upload Terminated') }">
                  <ShieldAlert v-if="uploadError.includes('Upload Terminated')" :size="24" />
                  <AlertCircle v-else :size="16" />
                  <div class="error-content">
                    <strong>{{ uploadError.includes('Upload Terminated') ? 'Upload Rejected' : 'Error Detected'
                    }}</strong>
                    <p>{{ uploadError }}</p>
                  </div>
                </div>
                <div class="drop-zone" @click="!processingDoc && fileInput?.click()" @drop="handleDrop"
                  @dragover="handleDragOver" @dragleave="handleDragLeave"
                  :class="{ processing: processingDoc, dragging: isDragging }">
                  <input type="file" ref="fileInput" @change="handleFileChange" style="display:none"
                    accept="application/pdf" :disabled="processingDoc" />
                  <FileUp :size="40" color="#00a651" />
                  <div class="drop-text">
                    <strong>Click to upload</strong> or drag and drop
                    <span>PDF files only</span>
                  </div>
                </div>

                <!-- ── Sample Documents Panel ─────────────────────────── -->
                <!-- Visible only when backend returns docs (ENABLE_SAMPLE_DOCS=true) -->
                <div v-if="sampleDocs.length > 0" class="sample-docs-panel">
                  <div class="sample-docs-header">
                    <div class="sample-docs-header-left">
                      <div class="sample-docs-icon-wrap">
                        <FileText :size="13" color="#00a651" />
                      </div>
                      <div>
                        <p class="sample-docs-title">Sample Documents</p>
                        <p class="sample-docs-subtitle">Click/Tap or drag any document below into the upload area above
                          to process it.</p>
                      </div>
                    </div>
                  </div>

                  <ul class="sample-docs-list">
                    <li v-for="doc in sampleDocs" :key="doc.id" class="sample-doc-row"
                      :class="{ 'is-loading': fetchingSampleDocId === doc.id }" draggable="true"
                      :aria-label="`Drag or click ${doc.name} to upload`"
                      @dragstart="handleSampleDocDragStart($event, doc)" @click="attachSampleDoc(doc)">
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
                        <GripVertical :size="13" class="sample-doc-grip" />
                      </div>
                    </li>
                  </ul>
                </div>
                <!-- ──────────────────────────────────────────────────── -->

              </div>

              <!-- Success State -->
              <div v-else-if="step === 3" class="upload-card">
                <div class="upload-success">
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
                  <p class="notice-title">Document uploaded has incomplete IMRAD structure.</p>
                  <p class="notice-desc">The following sections could not be found. Search accuracy may be reduced.
                    Canceling the indexing is recommended.
                  </p>
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
                      <div v-if="uploadMetadata.trim_points && uploadMetadata.trim_points[activeImradTab]"
                        class="trim-alert">
                        <AlertCircle :size="16" />
                        <span>
                          <strong>Auto-Trimmed:</strong> This section was trimmed at
                          <strong>"{{ uploadMetadata.trim_points[activeImradTab] }}"</strong>
                        </span>
                      </div>

                      <!-- References tab: formatted preview + raw editor side by side -->
                      <template v-if="activeImradTab === 'references'">
                        <div class="ref-split-wrap">
                          <!-- Left: formatted list preview -->
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
                            <div v-else class="ref-preview-empty">
                              <span>No references extracted yet.</span>
                            </div>
                          </div>
                          <!-- Right: raw editable textarea -->
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

                      <!-- All other tabs: single editable textarea -->
                      <textarea v-else ref="imradTextarea" v-model="imradSections[activeImradTab]"
                        class="imrad-textarea maximized" @input="autoResizeTextarea"
                        placeholder="No text extracted for this section…"></textarea>
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
              <div><span class="stat-val">{{ thesisCount }}</span><span class="stat-lbl">Thesis</span></div>
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
                    <th>Uploaded By</th>
                    <th>Role</th>
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
                        <div class="skel skel-chip" />
                      </td>
                      <td>
                        <div class="skel skel-dept" />
                      </td>
                      <td>
                        <div class="skel skel-type" />
                      </td>
                      <td>
                        <div class="skel skel-dept" />
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                      <td />
                    </tr>
                  </template>
                  <tr v-else-if="filteredPapers.length === 0">
                    <td colspan="7">
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
                    <td><span class="uploader-chip">{{ paper.uploaded_by ?? '—' }}</span></td>
                    <td>
                      <span class="type-badge"
                        :class="paper.uploader_role === 'Admin' ? 'purple' : paper.uploader_role === 'Faculty' ? 'green' : 'blue'">
                        {{ paper.uploader_role ?? '—' }}
                      </span>
                    </td>
                    <td class="td-r">
                      <button v-if="canEdit" @click="openEditModal(paper)" class="row-btn" title="Edit">
                        <Edit3 :size="13" />
                      </button>
                      <button v-if="isAdmin || isFaculty" @click="handleDelete(paper.id)" class="row-btn danger"
                        title="Delete">
                        <Trash2 :size="13" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- ══ SYSTEM CONSOLE ════════════════════════════════════ -->
        <template v-else-if="activeSection === 'console'">
          <div class="console-wrap">
            <div class="console-card">
              <div class="console-header">
                <div class="console-header-left">
                  <div class="console-dot-pulsate" v-if="terminalEventSource" />
                  <Terminal :size="16" />
                  <strong>Lumia Server Terminal</strong>
                  <span class="console-status" v-if="terminalEventSource">Live Connection</span>
                  <span class="console-status disconnected" v-else>Connecting...</span>
                </div>
                <div class="console-header-right">
                  <button class="console-clear" @click="terminalLogs = []">Clear View</button>
                </div>
              </div>
              
              <div class="console-body" ref="consoleScrollRef">
                <div class="console-lines">
                  <div v-for="(line, idx) in terminalLogs" :key="idx" class="console-line">
                    <span class="line-idx">{{ idx + 1 }}</span>
                    <span class="line-text" v-html="line"></span>
                  </div>
                  <div v-if="terminalLogs.length === 0" class="console-empty">
                    Initializing terminal stream...
                  </div>
                </div>
              </div>
              
              <div class="console-footer">
                <Activity :size="14" />
                <span>Monitoring: system_logs.txt</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ══ USER MANAGER ══════════════════════════════════════ -->
        <template v-else-if="activeSection === 'users'">
          <div class="page-head">
            <div>
              <h1 class="page-title">User Management</h1>
              <p class="page-sub">Monitor accounts and manage role-based access control.</p>
            </div>
            <button v-if="isAdmin" @click="openCreateUserModal" class="add-btn">
              <UserPlus :size="16" />
              <span>Create Staff Account</span>
            </button>
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

        <!-- ══ ACTIVITY LOG ════════════════════════════════════════ -->
        <template v-else-if="activeSection === 'logs'">
          <div class="page-head">
            <h1 class="page-title">Activity Log</h1>
            <p class="page-sub">Track who uploaded, edited, or deleted research papers.</p>
          </div>

          <div class="tbl-card">
            <div class="tbl-card-head">
              <span class="tbl-count">{{ logs.length }} event{{ logs.length !== 1 ? 's' : '' }}</span>
              <button @click="fetchLogs" class="ghost-btn" title="Refresh">
                <RefreshCw :size="13" />
              </button>
            </div>
            <div class="tbl-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Research Paper</th>
                    <th>Performed By</th>
                    <th>Role</th>
                    <th>Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingLogs">
                    <tr v-for="i in 6" :key="'lsk' + i" class="skel-row">
                      <td>
                        <div class="skel skel-type" />
                      </td>
                      <td>
                        <div class="skel skel-t1" />
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                      <td>
                        <div class="skel skel-dept" />
                      </td>
                    </tr>
                  </template>
                  <tr v-else-if="logs.length === 0">
                    <td colspan="5">
                      <div class="tbl-empty">
                        <Clock :size="40" />
                        <h3>No activity yet</h3>
                        <p>Uploads, edits, and deletes will appear here.</p>
                      </div>
                    </td>
                  </tr>
                  <tr v-else v-for="log in logs" :key="log.id" class="tbl-row">
                    <td>
                      <span class="log-badge" :class="logActionColor(log.action)">
                        {{ log.action }}
                      </span>
                    </td>
                    <td class="td-paper">
                      <span class="paper-name">{{ log.paper_title }}</span>
                    </td>
                    <td>
                      <span class="uploader-chip">{{ log.performed_by }}</span>
                    </td>
                    <td>
                      <span class="type-badge"
                        :class="log.performed_by_role === 'Admin' ? 'purple' : log.performed_by_role === 'Faculty' ? 'green' : 'blue'">
                        {{ log.performed_by_role ?? '—' }}
                      </span>
                    </td>
                    <td>
                      <span class="log-date">{{ formatLogDate(log.performed_at) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- ══ TRASH ══════════════════════════════════════════════ -->
        <template v-else-if="activeSection === 'trash'">
          <div class="page-head">
            <div>
              <h1 class="page-title">Trash</h1>
              <p class="page-sub">Deleted documents are automatically purged after 15 days. Restore them anytime before
                the deadline.</p>
            </div>
          </div>

          <div class="tbl-card">
            <div class="tbl-card-head" style="display:flex;align-items:center;justify-content:space-between">
              <span class="tbl-count">{{ trashedPapers.length }} document{{ trashedPapers.length !== 1 ? 's' : '' }} in
                Trash</span>
              <div style="display:flex;align-items:center;gap:0.75rem">
                <span v-if="loadingTrash" class="sync-text">
                  <RefreshCw :size="11" class="spin" /> Syncing with system clock...
                </span>
                <button @click="fetchTrashedPapers" class="ghost-btn" title="Refresh" :disabled="loadingTrash">
                  <RefreshCw :size="13" :class="{ spin: loadingTrash }" />
                </button>
              </div>
            </div>
            <div class="tbl-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Research Paper</th>
                    <th>Year</th>
                    <th>Type</th>
                    <th>Deleted By</th>
                    <th>Days Remaining</th>
                    <th class="th-r">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingTrash">
                    <tr v-for="i in 4" :key="'tr-sk' + i" class="skel-row">
                      <td>
                        <div class="skel skel-t1" />
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                      <td>
                        <div class="skel skel-type" />
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                      <td>
                        <div class="skel skel-chip" />
                      </td>
                    </tr>
                  </template>
                  <tr v-else-if="trashedPapers.length === 0">
                    <td colspan="6">
                      <div class="tbl-empty">
                        <Trash2 :size="40" />
                        <h3>Trash is empty</h3>
                        <p>Deleted documents will appear here for 15 days before being permanently removed.</p>
                      </div>
                    </td>
                  </tr>
                  <tr v-else v-for="paper in trashedPapers" :key="paper.id" class="tbl-row">
                    <td class="td-paper">
                      <div class="paper-cell">
                        <div class="paper-av" :data-t="typeColor(paper.project_type)">{{ initials(paper.title) }}</div>
                        <div class="paper-info">
                          <span class="paper-name">{{ paper.title }}</span>
                          <span class="paper-author">{{ paper.author }}</span>
                        </div>
                      </div>
                    </td>
                    <td><span class="year-chip">{{ paper.year }}</span></td>
                    <td><span class="type-badge" :class="typeColor(paper.project_type)">{{ paper.project_type }}</span>
                    </td>
                    <td><span class="uploader-chip">{{ paper.deleted_by ?? '—' }}</span></td>
                    <td>
                      <span class="days-badge" :class="daysBadgeClass(daysRemaining(paper.deleted_at!))">
                        {{ daysRemaining(paper.deleted_at!) }}d left
                      </span>
                    </td>
                    <td class="td-r">
                      <button @click="handleRestore(paper)" class="row-btn restore-btn" title="Restore">
                        <ArchiveRestore :size="13" />
                      </button>
                      <button v-if="isAdmin" @click="openPurgeModal(paper)" class="row-btn danger"
                        title="Purge permanently">
                        <Trash2 :size="13" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <p class="foot-notice">
          <ShieldAlert :size="12" /> Only Admin, Faculty, and Librarians can upload or modify papers.
        </p>

        <!-- ══ TELEPORTED MODALS ══════════════════════════════════ -->
        <Teleport to="body">


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

          <!-- ── CREATE USER MODAL ─────────────────────────────────── -->
          <div v-if="showCreateUserModal" class="modal-overlay" @click.self="closeCreateUserModal">
            <div class="modal-card creation-modal">
              <div class="modal-head">
                <div class="modal-head-icon purple">
                  <UserPlus :size="20" />
                </div>
                <div>
                  <h3>Create Staff Account</h3>
                  <p>Generate a new Admin or Faculty account.</p>
                </div>
                <button @click="closeCreateUserModal" class="modal-close">
                  <X :size="18" />
                </button>
              </div>

              <div class="modal-body">
                <template v-if="!createdPassword">
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-lbl">Username</label>
                      <input v-model="newUser.username" type="text" class="form-input" placeholder="e.g. maruf" />
                    </div>
                    <div class="form-group">
                      <label class="form-lbl">Full Name</label>
                      <input v-model="newUser.full_name" type="text" class="form-input" placeholder="e.g. Yna Maruf" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-lbl">Create user with role</label>
                    <div class="role-opts">
                      <label class="role-opt" :class="{ selected: newUser.role === 'Faculty' }">
                        <input type="radio" v-model="newUser.role" value="Faculty" />
                        <div class="role-opt-ico green">
                          <ShieldCheck :size="15" />
                        </div>
                        <div class="role-opt-info"><span class="role-opt-name">Faculty</span></div>
                        <Check v-if="newUser.role === 'Faculty'" :size="13" class="role-check" />
                      </label>
                      <label class="role-opt" :class="{ selected: newUser.role === 'Admin' }">
                        <input type="radio" v-model="newUser.role" value="Admin" />
                        <div class="role-opt-ico purple">
                          <ShieldAlert :size="15" />
                        </div>
                        <div class="role-opt-info"><span class="role-opt-name">Admin</span></div>
                        <Check v-if="newUser.role === 'Admin'" :size="13" class="role-check" />
                      </label>
                    </div>
                  </div>
                  <div v-if="createError" class="role-error" style="margin-top: 1rem">
                    <AlertCircle :size="14" />
                    <span>{{ createError }}</span>
                  </div>
                </template>

                <template v-else>
                  <div class="success-box">
                    <div class="success-ico-wrap">
                      <CheckCircle :size="32" class="success-ico" />
                    </div>
                    <h4 class="success-title">Account Created!</h4>
                    <p class="success-msg">Please save the auto-generated password below. It will not be shown again.
                    </p>
                    <div class="pw-box">
                      <span class="pw-lbl">Password</span>
                      <code class="pw-val">{{ createdPassword }}</code>
                    </div>
                  </div>
                </template>
              </div>

              <div class="modal-foot">
                <button @click="closeCreateUserModal" class="ghost-btn">
                  {{ createdPassword ? 'Close' : 'Cancel' }}
                </button>
                <button v-if="!createdPassword" @click="handleCreateStaff" class="save-btn" :disabled="creatingUser">
                  <Loader2 v-if="creatingUser" :size="16" class="spin" />
                  <span v-else>Generate Account</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── PURGE CONFIRM MODAL ──────────────────────────────── -->
          <div v-if="showPurgeModal" class="modal-overlay" @click.self="closePurgeModal">
            <div class="modal-card purge-modal">
              <div class="modal-head">
                <div class="modal-head-icon red">
                  <Trash2 :size="20" />
                </div>
                <div>
                  <h3>Permanently Delete</h3>
                  <p>This action cannot be undone.</p>
                </div>
                <button @click="closePurgeModal" class="modal-close">
                  <X :size="18" />
                </button>
              </div>
              <div class="modal-body purge-body">
                <p class="purge-warning">You are about to permanently remove this document from the system. All vectors
                  and the
                  original PDF will be deleted.</p>
                <div class="purge-paper-box">
                  <div class="paper-av" :data-t="typeColor(purgeTarget?.project_type ?? '')">{{
                    initials(purgeTarget?.title ??
                      '') }}</div>
                  <div>
                    <span class="paper-name">{{ purgeTarget?.title }}</span>
                    <span class="paper-author">{{ purgeTarget?.author }} · {{ purgeTarget?.year }}</span>
                  </div>
                </div>
              </div>
              <div class="modal-foot">
                <button @click="closePurgeModal" class="ghost-btn">Cancel</button>
                <button @click="handlePurgeConfirm" class="purge-confirm-btn" :disabled="purging">
                  <Loader2 v-if="purging" :size="13" class="spin" />
                  <Trash2 v-else :size="13" />
                  {{ purging ? 'Purging…' : 'Delete Permanently' }}
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

/* Center icons perfectly when sidebar is collapsed to 56px */
.sidebar.collapsed .sb-item {
  justify-content: center;
  padding: 0.55rem 0;
}

/* Also center the brand icon and footer icon */
.sidebar.collapsed .sb-brand {
  justify-content: center;
  padding: 1rem 0;
}

.sidebar.collapsed .sb-footer {
  justify-content: center;
  padding: 1rem 0;
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

.topbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 180px;
}

.live-clock {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--surface);
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--rule);
  color: var(--ink-2);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.live-clock span {
  font-variant-numeric: tabular-nums;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-text {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--green);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  animation: pulse-op 1.5s ease-in-out infinite;
}

@keyframes pulse-op {

  0%,
  100% {
    opacity: 0.7;
  }

  50% {
    opacity: 1;
  }
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
  border-color: var(--rule);
  /* Remove stationary green border */
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

.step-spinner {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--green);
  border-right-color: var(--green);
  animation: spin 1.5s linear infinite;
  pointer-events: none;
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
  padding: 2rem 2.5rem 5rem;
  max-width: 1440px;
  /* Expanded for widescreen */
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

.drop-zone.processing {
  cursor: wait;
  opacity: 0.6;
  pointer-events: none;
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

/* ── Sample Documents Panel (Evaluation Feature) ────────────────── */
.sample-ethics-notice-top {
  margin-bottom: 2rem;
  width: 100%;
}

.sample-docs-panel {
  margin-top: 1rem;
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
  cursor: grab;
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

.sample-doc-row:active:not(.is-loading) {
  cursor: grabbing;
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

.sample-doc-grip {
  color: var(--ink-3);
  opacity: 0.35;
  flex-shrink: 0;
  transition: opacity 0.12s;
}

.sample-doc-row:hover .sample-doc-grip {
  opacity: 0.7;
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
  .sample-doc-row {
    cursor: pointer;
  }

  .sample-doc-grip {
    display: none;
  }

  .attach-btn-mobile {
    display: flex;
  }
}

.sample-docs-notice {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--rule);
  background: var(--surface);
  font-size: 0.68rem;
  color: var(--ink-3);
  font-style: italic;
}

/* ─────────────────────────────────────────────────────────────── */

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

.notice-banner.green {
  background: var(--green-dim);
  border-color: #d1fae5;
}

.notice-banner.flat-notice {
  align-items: center;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background: var(--green-dim);
  gap: 1rem;
  box-shadow: none;
  border: 1px solid #d1fae5;
}

.notice-banner.flat-notice .notice-icon {
  background: transparent;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
}

.notice-banner.flat-notice .notice-title {
  margin-bottom: 0px;
  font-size: 0.9rem;
  color: var(--green-dk);
}

.notice-banner.flat-notice .notice-desc {
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--green-dk) !important;
  opacity: 0.8;
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

.fg-label {
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

  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-body {
  padding: 1.25rem
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

/* ── Creation Modal ─────────────────────────────────────────── */
.creation-modal {
  max-width: 480px !important;
}

.creation-modal .role-opts {
  padding: 0;
}



.modal-head-icon.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-lbl {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  background: var(--paper);
  border: 1.5px solid var(--rule);
  border-radius: 3px;
  font-size: 0.9rem;
  color: var(--ink);
  font-family: 'Source Sans 3', sans-serif;
  box-sizing: border-box;
  transition: border-color 0.13s;
}

.form-input::placeholder {
  color: var(--ink-3);
  opacity: 0.5;
}

.form-input:focus {
  outline: none;
  border-color: var(--green);
}

/* Success display */
.success-box {
  padding: 0.5rem 0;
}

.success-ico-wrap {
  width: 56px;
  height: 56px;
  background: var(--green-dim);
  color: var(--green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
}

.success-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
  margin-bottom: 0.5rem;
}

.success-msg {
  font-size: 0.88rem;
  color: var(--ink-3);
  text-align: center;
  margin-bottom: 1.75rem;
  line-height: 1.5;
}

.pw-box {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.03);
}

.pw-lbl {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--ink-3);
  letter-spacing: 0.08em;
}

.pw-val {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--green-dk);
  letter-spacing: 0.05em;
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

.role-error,
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #991b1b;
  background: #fef2f2;
  border: 1.5px solid #f87171;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  box-shadow: 0 2px 8px rgba(153, 27, 27, 0.08);
  animation: shake 0.4s cubic-bezier(.36, .07, .19, .97) both;
}

@keyframes shake {

  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
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
  margin-bottom: 1rem;
  font-size: 0.82rem;
  line-height: 1.4;
}

.trim-alert strong {
  color: #78350f;
}

.imrad-textarea {
  width: 100%;
  min-height: 480px;
  /* Taller for better text review */
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

/* ══ TRASH TAB ══════════════════════════════════════════════════ */

/* Days-remaining countdown badges */
.days-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  letter-spacing: 0.03em;
}

.days-badge.days-green {
  background: var(--green-dim);
  color: var(--green-dk);
}

.days-badge.days-amber {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.days-badge.days-red {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  animation: pulse-red 1.8s ease-in-out infinite;
}

@keyframes pulse-red {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

/* Restore button — green hover */
.row-btn.restore-btn:hover {
  border-color: var(--green);
  color: var(--green-dk);
  background: var(--green-dim);
}

/* Red modal head icon */
.modal-head-icon.red {
  background: #fef2f2;
  color: #b91c1c;
}

/* Purge modal */
.purge-modal {
  max-width: 460px;
}

.purge-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.purge-warning {
  font-size: 0.86rem;
  color: var(--ink-2);
  line-height: 1.5;
  margin: 0;
}

.purge-paper-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 0.85rem 1rem;
}

.purge-confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.1rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;
}

.purge-confirm-btn:hover:not(:disabled) {
  background: #b91c1c;
}

/* ══ REFERENCES SPLIT PANE (upload preview) ═══════════════════════════════ */
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
  gap: 0;
}

.ref-preview-entry {
  font-size: 0.82rem;
  line-height: 1.7;
  color: #2a2a2a;
  /* APA hanging indent */
  padding: 0.65rem 0 0.65rem 1.75rem;
  text-indent: -1.75rem;
  border-bottom: 1px solid var(--rule);
  text-align: left;
  word-break: break-word;
}

/* Bold author block */
.ref-authors-preview {
  font-weight: 700;
  color: #1a1a1a;
}

/* Year — slightly muted */
.ref-year-preview {
  font-weight: 600;
  color: #444;
}

/* Title in italics */
.ref-title-preview {
  font-style: italic;
  font-weight: 400;
  color: #222;
}

/* IEEE / numbered marker */
.ref-num-preview {
  font-weight: 700;
  color: var(--green-dk);
  margin-right: 0.2rem;
}

.ref-preview-entry:last-child {
  border-bottom: none;
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

/* Stack vertically on narrow screens */
@media (max-width: 900px) {
  .ref-split-wrap {
    grid-template-columns: 1fr;
  }

  .ref-textarea {
    min-height: 300px;
    max-height: 400px;
  }

  .terminal-error {
    background: #fff1f2 !important;
    border-color: #e11d48 !important;
    color: #9f1239 !important;
    padding: 1.5rem !important;
  }

  .error-content {
    flex: 1;
    text-align: left;
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
}

/* ── TERMINATION REPORT ───────────────────────────────────────── */
.termination-modal {
  max-width: 700px;
}

.termination-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.termination-reason {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
}

.termination-grid {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 1.5rem;
}

@media (max-width: 600px) {
  .termination-grid {
    grid-template-columns: 1fr;
  }
}

.report-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 0.5rem;
  display: block;
}

.report-text {
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin-bottom: 1.5rem;
}

.tips-box {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1rem;
}

.tips-title {
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--ink);
}

.tips-box ul {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.78rem;
  color: var(--ink-3);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.termination-proof {
  flex-shrink: 0;
}

.proof-card {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--rule);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  aspect-ratio: 3/4;
}

.proof-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
}

.proof-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.proof-overlay span {
  background: rgba(220, 38, 38, 0.9);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 3px;
  letter-spacing: 0.1em;
  transform: rotate(-15deg);
}

/* ── SYSTEM CONSOLE ──────────────────────────────────────────── */
.console-wrap {
  height: calc(100vh - 120px);
  padding: 1.5rem;
  display: flex;
}

.console-card {
  flex: 1;
  background: #0d1117; /* GitHub Dark style */
  border-radius: 12px;
  border: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.console-header {
  background: #161b22;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.console-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #c9d1d9;
  font-size: 0.85rem;
}

.console-dot-pulsate {
  width: 8px;
  height: 8px;
  background: #238636;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(35, 134, 54, 0.7);
  animation: pulsate 1.5s infinite cubic-bezier(0.66, 0, 0, 1);
}

@keyframes pulsate {
  to { box-shadow: 0 0 0 10px rgba(35, 134, 54, 0); }
}

.console-status {
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #238636;
  background: rgba(35, 134, 54, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.console-status.disconnected {
  color: #d1242f;
  background: rgba(209, 36, 47, 0.1);
}

.console-clear {
  background: rgba(255,255,255,0.05);
  border: 1px solid #30363d;
  color: #8b949e;
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.console-clear:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.console-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.console-body::-webkit-scrollbar { width: 8px; }
.console-body::-webkit-scrollbar-thumb { background: #30363d; border-radius: 10px; }

.console-lines {
  display: flex;
  flex-direction: column;
}

.console-line {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.02);
  padding: 0.1rem 0;
}

.line-idx {
  min-width: 2rem;
  text-align: right;
  color: #484f58;
  font-size: 0.75rem;
  user-select: none;
}

.line-text {
  color: #e6edf3;
  word-break: break-all;
  white-space: pre-wrap;
}

.console-empty {
  color: #8b949e;
  font-style: italic;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.console-footer {
  background: #161b22;
  padding: 0.5rem 1rem;
  border-top: 1px solid #30363d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #8b949e;
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .console-wrap {
    height: calc(100vh - 80px);
    padding: 0.75rem;
  }
}
</style>
