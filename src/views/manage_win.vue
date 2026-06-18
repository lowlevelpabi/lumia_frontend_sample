<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  computed,
  watch,
  reactive,
  nextTick,
  type Component,
} from 'vue'
import { useRouter } from 'vue-router'
import {
  Library,
  Trash2,
  Plus,
  FolderOpen,
  Loader2,
  FileText,
  Users,
  Calendar,
  ChevronRight,
  UserCheck,
  Menu,
  X,
  Clock,
  Eye,
  FileUp,
  CheckCircle,
  AlertCircle,
  Check,
  AlertTriangle,
  RefreshCw,
  PanelLeftOpen,
  PanelLeftClose,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserPlus,
  ArchiveRestore,
  GripVertical,
  Search,
  Edit3,
  Save,
  User,
  Building2,
  GraduationCap,
  Hash,
  History,
  ArrowRight,
  Bookmark,
  Sun,
  Moon,
} from 'lucide-vue-next'
import {
  api,
  type Paper,
  type UserResponse,
  type PartialPaperMetadata,
  type ActivityLog,
  type SampleDocument,
  type RepositoryStats,
} from '../services/api'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import BookLoader from '../components/BookLoader.vue'

const router = useRouter()
const { isAdmin, isFaculty } = useAuth()
const { isDark, toggleTheme } = useTheme()
const canEdit = computed(() => isAdmin.value || isFaculty.value)

const DEPT_ABBR: Record<string, string> = {
  'computer science': 'CS',
  'information technology': 'IT',
  'information systems': 'IS',
  'computer engineering': 'CpE',
  'electrical engineering': 'EE',
  'electronics engineering': 'ECE',
  'civil engineering': 'CE',
  'mechanical engineering': 'ME',
  'industrial engineering': 'IE',
  'mathematics': 'Math',
  'physics': 'Physics',
  'biology': 'Bio',
  'chemistry': 'Chem',
  'nursing': 'Nursing',
  'education': 'Educ',
  'business administration': 'BA',
  'accountancy': 'Acctg',
  'psychology': 'Psych',
  'architecture': 'Arch',
}

const formatDept = (dept?: string) => {
  if (!dept) return '—'
  const cleaned = dept
    .replace(/Department of\s+/i, '')
    .replace(/Dept\.\s+of\s+/i, '')
    .replace(/Department\s+/i, '')
    .trim()
  return DEPT_ABBR[cleaned.toLowerCase()] ?? cleaned
}

// ── Sidebar collapse ────────────────────────────────────────────
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const showApproveModal = ref(false)
const showDetailsModal = ref(false)
const approveTarget = ref<Paper | null>(null)
const detailsTarget = ref<Paper | null>(null)
const showEditModal = ref(false)
const editTarget = ref<Paper | null>(null)
const editForm = reactive({
  title: '',
  authors: [] as string[],
  department: '',
  project_type: '',
  degree_program: '',
  keywords: ''
})

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
const onResize = () => {
  isMobile.value = window.innerWidth <= 768
}
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
    hour12: true,
  })
})

// ── Sidebar ─────────────────────────────────────────────────────
type Section = 'repository' | 'users' | 'upload' | 'logs' | 'trash' | 'pending'
const activeSection = ref<Section>('repository')

const baseNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'upload', label: 'Upload File', icon: FileUp, description: 'Index Document' },
  {
    id: 'repository',
    label: 'Repository',
    icon: Library,
    description: 'Monitor Repository',
  },
]
const adminNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'users', label: 'Users', icon: Users, description: 'Manage users' },
  { id: 'logs', label: 'Activity Log', icon: Clock, description: 'Track System Logs' },
]
const canEditNavItems: { id: Section; label: string; icon: Component; description: string }[] = [
  {
    id: 'pending',
    label: 'Pending Requests',
    icon: Clock,
    description: 'Accept uploads',
  },
  { id: 'trash', label: 'Trash', icon: Trash2, description: 'Erase Document' },
]
const navItems = computed(() => {
  const items = [...baseNavItems]
  if (isAdmin.value) {
    items.push(...adminNavItems)
    items.push(...canEditNavItems)
  } else if (canEdit.value) {
    items.push({
      id: 'logs' as Section,
      label: 'Activity Log',
      icon: Clock,
      description: 'Track uploads, edits & deletes',
    })
    items.push(...canEditNavItems)
  }
  return items
})

const activeLabel = computed(() => {
  return navItems.value.find((i) => i.id === activeSection.value)?.label ?? 'Repository'
})

const setSection = (s: Section) => {
  if (s === 'users' && !isAdmin.value) return

  // Reset navigation-blocking states
  showCreateUserModal.value = false
  showApproveModal.value = false
  showDetailsModal.value = false
  roleTarget.value = null
  approveTarget.value = null
  detailsTarget.value = null
  if (s !== 'upload') step.value = 1
  activeSection.value = s
  if (s === 'pending') {
    activeFilter.value = 'all'
    searchQuery.value = ''
  } else if (s === 'repository') {
    activeFilter.value = 'all'
    searchQuery.value = ''
  }
  router.push({ query: { ...router.currentRoute.value.query, tab: s } })
  mobileSidebarOpen.value = false
  if (window.innerWidth < 1024 && window.innerWidth > 768) sidebarCollapsed.value = true
}

onMounted(() => {
  const tab = router.currentRoute.value.query.tab as Section
  if (tab && navItems.value.map((i) => i.id).includes(tab)) {
    activeSection.value = tab
  }
})
watch(
  () => router.currentRoute.value.query.tab,
  (newTab) => {
    if (newTab && navItems.value.map((i) => i.id).includes(newTab as Section)) {
      activeSection.value = newTab as Section
    }
  },
)

// ── Data ─────────────────────────────────────────────────────────
const papers = ref<Paper[]>([])
const loading = ref(true)
const searchQuery = ref('')
const activeFilter = ref<'all' | 'Thesis' | 'Capstone Project' | 'Pending'>('all')
const repoStats = ref<RepositoryStats | null>(null)
const statsLoading = ref(false)

const statsPercentages = computed(() => {
  const approved = papers.value.filter(p => p.status !== 'Pending')
  const total = approved.length
  if (total === 0) return { thesis: 50, capstone: 50 }

  const tCount = approved.filter(p => p.project_type?.toLowerCase().includes('thesis')).length

  // If we have other types, we normalize to only show Thesis vs Capstone relative to each other
  // or relative to the total if those are the only two types.
  const t = (tCount / total) * 100

  // If they don't add up to 100 (due to other types), we can either show a 3rd color
  // or just stick to the 100-t for simplicity as requested by the UI design.
  return { thesis: t, capstone: 100 - t }
})

const fetchStats = async () => {
  statsLoading.value = true
  try {
    repoStats.value = await api.getRepositoryStats()
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  } finally {
    statsLoading.value = false
  }
}

const fetchPapers = async () => {
  loading.value = true
  try {
    papers.value = await api.listAllPapers('all')
    await fetchStats()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
onMounted(fetchPapers)

const filteredPapers = computed(() => {
  let list = papers.value.filter(p => p.status !== 'Pending')
  if (activeFilter.value !== 'all') {
    list = list.filter((p) => p.project_type === activeFilter.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.department ?? '').toLowerCase().includes(q),
  )
})

const pendingPapers = computed(() => papers.value.filter((p) => p.status === 'Pending'))
const totalPapers = computed(() => papers.value.filter(p => p.status !== 'Pending').length)
const pendingCount = computed(() => pendingPapers.value.length)
const thesisCount = computed(() => papers.value.filter((p) => p.status !== 'Pending' && p.project_type?.toLowerCase().includes('thesis')).length)
const capstoneCount = computed(() => papers.value.filter((p) => p.status !== 'Pending' && p.project_type?.toLowerCase().includes('capstone')).length)
const yearSpan = computed(() => {
  const approvedYears = papers.value.filter(p => p.status !== 'Pending').map(p => p.year)
  return new Set(approvedYears).size
})

// ── Helpers ───────────────────────────────────────────────────────
const initials = (title: string) =>
  title
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

const typeColor = (type: string) => (type === 'Thesis' ? 'blue' : 'orange')

const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const viewDetails = (paper: Paper) => {
  detailsTarget.value = paper
  showDetailsModal.value = true
}

// ── Actions ───────────────────────────────────────────────────────
const handleDelete = (id: string) => {
  selectedRepoIds.value = [id]
  openBulkModal('delete')
}

// ── Bulk Actions for Repository ──────────────────────────────────────
const selectedRepoIds = ref<string[]>([])
const allRepoSelected = computed({
  get: () => filteredPapers.value.length > 0 && selectedRepoIds.value.length === filteredPapers.value.length,
  set: (val) => {
    selectedRepoIds.value = val ? filteredPapers.value.map(p => p.id) : []
  }
})

const toggleRepoSelection = (id: string) => {
  const index = selectedRepoIds.value.indexOf(id)
  if (index > -1) {
    selectedRepoIds.value.splice(index, 1)
  } else {
    selectedRepoIds.value.push(id)
  }
}

const handleBulkDelete = () => {
  if (selectedRepoIds.value.length === 0) return
  openBulkModal('delete')
}

const handleApprove = (paper: Paper) => {
  approveTarget.value = paper
  showApproveModal.value = true
}

const confirmApprove = async () => {
  if (!approveTarget.value) return
  try {
    await api.updatePaper(approveTarget.value.id, { status: 'Approved' })
    showApproveModal.value = false
    approveTarget.value = null
    await fetchPapers()
  } catch {
    alert('Failed to approve paper.')
  }
}

const handleEdit = (paper: Paper) => {
  editTarget.value = paper
  editForm.title = paper.title

  // Split authors by pipe and trim
  const authorStr = paper.author || ''
  editForm.authors = authorStr.split('|').map(a => a.trim()).filter(a => a !== '')
  if (editForm.authors.length === 0) editForm.authors = [''] // Ensure at least one input

  editForm.department = paper.department || ''
  editForm.project_type = paper.project_type || ''
  editForm.degree_program = paper.degree_program || ''
  editForm.keywords = paper.keywords || ''
  showEditModal.value = true
}

const addEditAuthor = () => {
  editForm.authors.push('')
}

const removeEditAuthor = (index: number) => {
  if (editForm.authors.length > 1) {
    editForm.authors.splice(index, 1)
  } else {
    editForm.authors[0] = ''
  }
}

const confirmEdit = async () => {
  if (!editTarget.value) return
  try {
    // Join authors back with pipe
    const authorString = editForm.authors
      .map(a => a.trim())
      .filter(a => a !== '')
      .join(' | ')

    await api.updatePaper(editTarget.value.id, {
      ...editForm,
      author: authorString
    })
    showEditModal.value = false
    editTarget.value = null
    await fetchPapers()
  } catch {
    alert('Failed to update paper metadata.')
  }
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

const adminCount = computed(() => users.value.filter((u) => u.role === 'Admin').length)
const facultyCount = computed(() => users.value.filter((u) => u.role === 'Faculty').length)
const studentCount = computed(() => users.value.filter((u) => u.role === 'Student').length)

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
  if (action === 'Purge') return 'purple'
  return ''
}

const formatLogDate = (iso: string) => {
  // Backend now stores local PC time.
  // Native Date constructor treats ISO strings without 'Z' as Local time.
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

watch(activeSection, (s) => {
  if (s === 'logs') fetchLogs()
})

// ── Trash / Recycle Bin ───────────────────────────────────────────
const trashedPapers = ref<Paper[]>([])
const loadingTrash = ref(false)
const purging = ref(false)
const showBulkModal = ref(false)
const bulkActionType = ref<'delete' | 'purge'>('delete')

const openBulkModal = (type: 'delete' | 'purge') => {
  bulkActionType.value = type
  showBulkModal.value = true
}

const closeBulkModal = () => {
  showBulkModal.value = false
}

const fetchTrashedPapers = async () => {
  loadingTrash.value = true
  try {
    trashedPapers.value = await api.getTrashedPapers()
  } catch (e) {
    console.error('Failed to fetch trash:', e)
  } finally {
    loadingTrash.value = false
  }
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


// ── Bulk Actions for Trash ───────────────────────────────────────────
const selectedTrashIds = ref<string[]>([])
const allTrashSelected = computed({
  get: () => trashedPapers.value.length > 0 && selectedTrashIds.value.length === trashedPapers.value.length,
  set: (val) => {
    selectedTrashIds.value = val ? trashedPapers.value.map(p => p.id) : []
  }
})

const toggleTrashSelection = (id: string) => {
  const index = selectedTrashIds.value.indexOf(id)
  if (index > -1) {
    selectedTrashIds.value.splice(index, 1)
  } else {
    selectedTrashIds.value.push(id)
  }
}

const handleBulkPurge = () => {
  if (selectedTrashIds.value.length === 0) return
  openBulkModal('purge')
}

const handleBulkConfirm = async () => {
  const isPurge = bulkActionType.value === 'purge'
  const ids = isPurge ? selectedTrashIds.value : selectedRepoIds.value
  if (ids.length === 0) return

  purging.value = true
  try {
    if (isPurge) {
      await Promise.all(ids.map(id => api.purgePaper(id)))
      selectedTrashIds.value = []
      await fetchTrashedPapers()
    } else {
      await Promise.all(ids.map(id => api.deletePaper(id)))
      selectedRepoIds.value = []
      await fetchPapers()
    }
    closeBulkModal()
  } catch (e) {
    alert(`Failed to ${isPurge ? 'purge' : 'delete'} some documents.`)
    console.error(e)
  } finally {
    purging.value = false
  }
}

watch(activeSection, (s) => {
  selectedTrashIds.value = [] // Clear selection when switching tabs
  if (s === 'trash') fetchTrashedPapers()
  if (s === 'repository') fetchStats()
})

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
  if (roleNew.value === roleTarget.value.role) {
    closeRoleModal()
    return
  }
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
  role: 'Faculty',
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
const showUploadMessage = ref(false)
const uploadNotification = ref('')
let uploadMsgTimer: number | null = null

const formatUploadMessage = (msg: string) => {
  if (!msg) return ''
  const low = msg.toLowerCase()
  if (low.includes('duplicate') || low.includes('already exists')) return 'Duplicate entry detected. Document already exists in the repository.'
  if (low.includes('missing') && low.includes('imrad')) return `Missing IMRAD sections detected.`
  if (low.includes('empty') || low.includes('no pages') || low.includes('no content')) return 'Empty document or no readable pages detected.'
  return msg
}

watch(uploadError, (val) => {
  if (val) {
    uploadNotification.value = formatUploadMessage(val)
    showUploadMessage.value = true
    if (uploadMsgTimer) clearTimeout(uploadMsgTimer)
    uploadMsgTimer = window.setTimeout(() => {
      showUploadMessage.value = false
      uploadMsgTimer = null
    }, 20000)
  }
})



const closeUploadMessage = () => {
  showUploadMessage.value = false
  if (uploadMsgTimer) {
    clearTimeout(uploadMsgTimer)
    uploadMsgTimer = null
  }
}
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const sessionId = ref('')
const extractionProgress = ref(0)
const extractionMessage = ref('')
let progressTimer: number | null = null

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
  if (
    processingDoc.value ||
    fetchingSampleDocId.value ||
    activeSection.value !== 'upload' ||
    step.value !== 1
  ) {
    return
  }

  fetchingSampleDocId.value = doc.id
  uploadError.value = ''
  try {
    const safeFilename = `${doc.name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_')}.pdf`
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
    }
  }, 2000)
}

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
  media: {} as Record<string, string>,
})
const activeImradTab = ref<'introduction' | 'methods' | 'results' | 'discussion' | 'references'>(
  'introduction',
)

// Keep in sync with imrad_service.py METHODOLOGY_SUBHEADINGS labels
const METHODOLOGY_SUBHEADING_LABELS = [
  'Research Design', 'Research Approach', 'Research Settings', 'Business Process',
  'Participants of the Study', 'Sampling Technique', 'Research Instruments',
  'Data Collection, Instrument, and Procedure', 'Sources of Data', 'Data to be Gathered',
  'Statistical Treatment of Data', 'Data Analysis', 'Ethical Considerations',
  'Development Model', 'Analysis and Quick Design', 'Prototype Cycles',
  'Testing', 'Implementation', 'Requirement Analysis', 'System Development', 'System Evaluation'
]

const INTRODUCTION_SUBHEADING_LABELS = [
  'Background of the Study', 'Statement of the Problem', 'Research Objectives',
  'Objectives of the Study', 'Significance of the Study', 'Scope and Delimitation',
  'Scope and Limitation', 'Definition of Terms', 'Conceptual Framework', 'Theoretical Framework'
]

const SECTION_KEY_MAP = {
  Introduction: 'introduction',
  Methodology: 'methods',
  Results: 'results',
  Discussion: 'discussion',
} as const

const REQUIRED_SECTIONS = Object.keys(SECTION_KEY_MAP) as (keyof typeof SECTION_KEY_MAP)[]

type ImradKey = 'introduction' | 'methods' | 'results' | 'discussion' | 'references'
const ALL_IMRAD_TABS: ImradKey[] = [
  'introduction',
  'methods',
  'results',
  'discussion',
  'references',
]

const imradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: '',
  references: '',
})

// Raw sections keep [[TABLE_IMAGE:...]] markers intact so they are saved to DB
const rawImradSections = reactive({
  introduction: '',
  methods: '',
  results: '',
  discussion: '',
  references: '',
})

// RAD combined detection: results and discussion have identical text
// when the backend stored a single combined RAD section

// Available tabs — merges R+D into one tab
const availableImradTabs = computed<ImradKey[]>(() => {
  const all = ALL_IMRAD_TABS.filter((t) => imradSections[t])
  const hasResults = all.includes('results')
  const hasDiscussion = all.includes('discussion')
  if (hasResults || hasDiscussion) {
    const merged: ImradKey[] = all.filter((t) => t !== 'results' && t !== 'discussion' && t !== 'references')
    merged.push('results')
    if (all.includes('references')) merged.push('references')
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
  },
)

// ── References preview helpers ────────────────────────────────────────────────
// Mirrors the logic in detail_win.vue so the upload preview shows the same
// formatted list that students will see on the paper detail page.

const parsedReferencesPreview = computed((): string[] => {
  const raw = imradSections.references?.trim()
  if (!raw) return []

  // Primary: blank-line separation (output of backend _postprocess_references)
  const byBlankLine = raw
    .split(/\n\n+/)
    .map((s) => s.replace(/\n/g, ' ').trim())
    .filter(Boolean)
  if (byBlankLine.length > 1) return byBlankLine

  // Fallback A: IEEE-style numeric markers [1] [2] …
  const byIEEE = raw
    .split(/(?=\[\d+\])/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (byIEEE.length > 1) return byIEEE

  // Fallback B: numbered list "1. " "2. " …
  const byNumbered = raw
    .split(/(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean)
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
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const linkify = (s: string): string => {
    let out = s.replace(
      /https?:\/\/[^\s,)\]&]+/g,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="ref-link-preview">${url}</a>`,
    )
    out = out.replace(
      /(?<!href=")(?:doi:\s*)(10\.[^\s,)\]&]+)/gi,
      (_, doi) =>
        `doi: <a href="https://doi.org/${doi}" target="_blank" rel="noopener noreferrer" class="ref-link-preview">${doi}</a>`,
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
    return (
      `<span class="ref-num-preview">${ieeeMatch[1] ?? ''}</span> ` + linkify(ieeeMatch[2] ?? '')
    )
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

// Show missingSections via floating notification
watch(missingSections, (list) => {
  if (list && list.length > 0) {
    uploadNotification.value = `Missing IMRAD sections: ${list.join(', ')}`
    showUploadMessage.value = true
    if (uploadMsgTimer) clearTimeout(uploadMsgTimer)
    uploadMsgTimer = window.setTimeout(() => {
      showUploadMessage.value = false
      uploadMsgTimer = null
    }, 5000)
  }
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
      const cleaned = { ...(preview.sections as Record<string, string>) }
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
    selectedPages.value = preview.pages.map((p) => p.page_num)
    isManuscript.value = false
    const firstAvailable = ALL_IMRAD_TABS.find((t) => imradSections[t])
    if (firstAvailable)
      activeImradTab.value = firstAvailable === 'discussion' ? 'results' : firstAvailable
    setTimeout(() => {
      step.value = 2
      processingDoc.value = false
    }, 400)
  } catch (err) {
    stopProgressListening()
    uploadError.value = (err as Error).message || 'Failed to trigger fallback.'
    step.value = prevStep
    processingDoc.value = false
  }
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
    const doc = sampleDocs.value.find((d) => d.id === sampleDocId)
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
      const splitAuthors = preview.metadata.author
        .split(/\s*\|\s*/)
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0)
      authors.value = splitAuthors.length > 0 ? splitAuthors : ['']
    } else {
      authors.value = ['']
    }

    pages.value = preview.pages
    selectedPages.value = preview.pages.map((p: PageData) => p.page_num)
    if (preview.sections) {
      // Store raw (with markers) for DB submission
      Object.assign(rawImradSections, preview.sections as Record<string, string>)
      // Strip markers for clean display
      const cleaned = { ...(preview.sections as Record<string, string>) }
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
    isManuscript.value = preview.metadata.is_manuscript || false

    // Set active tab to the first section that actually has content
    const firstAvailable = ALL_IMRAD_TABS.find((t) => imradSections[t])
    if (firstAvailable)
      activeImradTab.value = firstAvailable === 'discussion' ? 'results' : firstAvailable
    setTimeout(() => {
      step.value = 2
      processingDoc.value = false
    }, 400)
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

const handleCancelParsing = () => {
  stopProgressListening()
  processingDoc.value = false
  step.value = 1
  file.value = null
  sessionId.value = ''
  extractionProgress.value = 0
  extractionMessage.value = ''
  uploadError.value = ''
  // Reset input so the same file can be re-selected
  if (fileInput.value) fileInput.value.value = ''
}

const togglePage = (pageNum: number, event: Event) => {
  // if a zoom-trigger/button or the image itself was clicked, do nothing
  const tgt = event.target as HTMLElement
  if (tgt.closest('.zoom-trigger') || tgt.closest('.thumb-img') || tgt.closest('.thumb-hover-hint'))
    return
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

const selectAll = () => {
  selectedPages.value = pages.value.map((p) => p.page_num)
}
const deselectAll = () => {
  selectedPages.value = []
}
const addAuthor = () => {
  authors.value.push('')
}
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
    const finalAuthorString = authors.value
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
      .join(' | ')
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
      discussion: rawImradSections.discussion || imradSections.discussion,
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
  } finally {
    uploadingPaper.value = false
  }
}

watch(
  activeSection,
  (newSection) => {
    if (newSection === 'repository') fetchPapers()
    if (newSection === 'users' && users.value.length === 0) fetchUsers()
    if (newSection === 'upload' && sampleDocs.value.length === 0) loadSampleDocs()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mgmt" :class="{ 'sb-collapsed': sidebarCollapsed }">
    <!-- Full page drag overlay -->
    <transition name="fade">
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
          <img src="/lumia_logo.ico" style="width: 18px; height: 18px; object-fit: contain" />
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
            <div v-if="item.id === 'pending' && pendingCount > 0" class="sb-badge">
              {{ pendingCount }}
            </div>
          </div>
          <div class="sb-item-body">
            <span class="sb-item-label">{{ item.label }}</span>
            <span class="sb-item-desc">{{ item.description }}</span>
          </div>
          <ChevronRight v-if="!sidebarCollapsed" :size="12" class="sb-arrow" />
        </button>
      </nav>

      <div class="sb-footer">
        <button class="sb-theme-btn" @click="toggleTheme" :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
          <Sun v-if="isDark" :size="14" />
          <Moon v-else :size="14" />
          <span>{{ isDark ? 'Light' : 'Dark' }} Mode</span>
        </button>
        <div class="sb-footer-badge">
          <ShieldAlert :size="12" />
          <span>Staff access only</span>
        </div>
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
              <PanelLeftClose v-if="!sidebarCollapsed" :size="19" stroke-width="2.2" />
              <PanelLeftOpen v-else :size="19" stroke-width="2.2" />
            </template>
          </button>
          <span class="bc-root">Management</span>
          <ChevronRight :size="12" class="bc-sep" />
          <span class="bc-active">{{ activeLabel }}</span>
        </div>
        <div class="topbar-right">
          <!-- Upload step rail -->
          <div v-if="activeSection === 'upload'" class="steps-rail inside-navbar">
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
                <Check v-if="step > 3" :size="12" /><span v-else>3</span>
              </div>
              <span class="step-label">Done</span>
            </div>
            <button v-if="step === 2" class="cancel-btn" @click="handleCancelParsing" :disabled="uploadingPaper"
              style="margin-left: 1.5rem;">
              <X :size="14" />
              <span>Cancel</span>
            </button>
          </div>
          <div v-else-if="!isMobile" class="live-clock">
            <Clock :size="13" stroke-width="2.5" />
            <span>{{ formattedTime }}</span>
          </div>
        </div>
      </header>

      <!-- ── Content ─────────────────────────────────────────── -->
      <div class="content">
        <!-- Floating upload notification (appears above upload area) -->
        <div class="upload-notification-wrap">
          <div class="upload-notification" :class="{ show: showUploadMessage }">
            <div class="notif-ico">
              <ShieldAlert v-if="uploadNotification.includes('Upload Terminated')" :size="18" />
              <AlertCircle v-else :size="16" />
            </div>
            <div class="notif-body">
              <strong>{{ uploadNotification.includes('Upload Terminated') ? 'Upload Rejected' : 'Error Detected'
              }}</strong>
              <p>{{ uploadNotification }}</p>
            </div>
            <button class="notif-close" @click="closeUploadMessage">
              <X :size="16" />
            </button>
          </div>
        </div>
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
                <div class="notice-banner amber" style="margin-bottom: 1rem">
                  <div class="notice-icon">
                    <AlertTriangle :size="18" color="#f59e0b" />
                  </div>
                  <div class="notice-body">
                    <p class="notice-title">Upload Guidance</p>
                    <p class="notice-desc">
                      Scanned PDFs with heavy visual noise (handwritten marks, low contrast, skewed or blurry
                      pages, curves) may fail extraction. For best results, upload clear, well-scanned pages or
                      a born-PDF document.
                    </p>
                  </div>
                </div>
                <!-- Inline upload error banner removed — using floating notification instead -->
                <div class="drop-zone" @click="!processingDoc && fileInput?.click()" @drop="handleDrop"
                  @dragover="handleDragOver" @dragleave="handleDragLeave"
                  :class="{ processing: processingDoc, dragging: isDragging }">
                  <input type="file" ref="fileInput" @change="handleFileChange" style="display: none"
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
                        <p class="sample-docs-subtitle">
                          Click/Tap or drag any document below into the upload area above to process
                          it.
                        </p>
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
                        {{
                          doc.size_bytes >= 1_048_576
                            ? (doc.size_bytes / 1_048_576).toFixed(1) + ' MB'
                            : Math.round(doc.size_bytes / 1024) + ' KB'
                        }}
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
                  <AlertCircle :size="18" class="notice-icon-svg" />
                </div>
                <div class="notice-body">
                  <p class="notice-title">
                    Manuscript / In-Progress Document
                  </p>
                  <p class="notice-desc">
                    No IMRAD section headings were detected. The first 10 pages are shown for
                    preview. Fill in sections manually or browse all pages.
                  </p>
                </div>
                <div class="notice-actions">
                  <button @click="triggerFallback" class="notice-btn primary-btn">
                    <RefreshCw :size="13" /> Browse All Pages
                  </button>
                </div>
              </div>

              <!-- Inline missing sections banner removed — missing sections are shown via floating notification -->

              <div class="review-grid">
                <section class="meta-panel">
                  <div class="meta-panel-head">
                    <span class="step-badge">1</span>
                    <h4>Verify Metadata</h4>
                  </div>
                  <div class="fg">
                    <label>Title</label><textarea v-model="uploadMetadata.title" placeholder="Research Title" />
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
                    <div class="fg">
                      <label>Year</label><input v-model="uploadMetadata.year" type="text" placeholder="e.g., 2025" />
                    </div>
                    <div class="fg">
                      <label>Type</label>
                      <select v-model="uploadMetadata.project_type">
                        <option>Thesis</option>
                        <option>Capstone Project</option>
                      </select>
                    </div>
                  </div>
                  <!-- Abstract moved to IMRAD panel to keep metadata compact -->
                  <div class="fg">
                    <label>Department</label>
                    <select v-model="uploadMetadata.department">
                      <option>N/A</option>
                      <option>Department of Computer Science</option>
                      <option>Department of Information Technology</option>
                    </select>
                  </div>
                  <div class="fg">
                    <label>Degree Program</label>
                    <select v-model="uploadMetadata.degree_program">
                      <option>N/A</option>
                      <option>BSCS</option>
                      <option>BSIT</option>
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
                    <div class="meta-panel-head" style="margin-bottom: 1.5rem">
                      <span class="step-badge">2</span>
                      <h4>Refine IMRAD Sections</h4>
                    </div>

                    <div v-if="
                      uploadMetadata.detected_subheadings &&
                      uploadMetadata.detected_subheadings.length > 0
                    " class="subheadings-preview">
                      <!-- Abstract moved here from Verify Metadata -->
                      <div class="fg" style="margin-bottom:0.85rem">
                        <label>Abstract</label>
                        <textarea v-model="uploadMetadata.abstract" class="abstract-area"
                          placeholder="Enter abstract…" />
                      </div>
                      <template v-if="
                        uploadMetadata.detected_subheadings.some((s) =>
                          INTRODUCTION_SUBHEADING_LABELS.includes(s),
                        )
                      ">
                        <label class="fg-label">Detected Introduction Components:</label>
                        <div class="sub-tags" style="margin-bottom: 0.75rem">
                          <span v-for="sub in uploadMetadata.detected_subheadings.filter((s) =>
                            INTRODUCTION_SUBHEADING_LABELS.includes(s),
                          )" :key="sub" class="sub-tag sub-tag-intro">
                            <Check :size="12" /> {{ sub }}
                          </span>
                        </div>
                      </template>

                      <template v-if="
                        uploadMetadata.detected_subheadings.some((s) =>
                          METHODOLOGY_SUBHEADING_LABELS.includes(s),
                        )
                      ">
                        <label class="fg-label">Detected Methodology Components:</label>
                        <div class="sub-tags" style="margin-bottom: 0.75rem">
                          <span v-for="sub in uploadMetadata.detected_subheadings.filter((s) =>
                            METHODOLOGY_SUBHEADING_LABELS.includes(s),
                          )" :key="sub" class="sub-tag">
                            <Check :size="12" /> {{ sub }}
                          </span>
                        </div>
                      </template>

                      <template v-if="
                        uploadMetadata.detected_subheadings.some(
                          (s) => !METHODOLOGY_SUBHEADING_LABELS.includes(s) && !INTRODUCTION_SUBHEADING_LABELS.includes(s),
                        )
                      ">
                        <label class="fg-label">Detected Results Components:</label>
                        <div class="sub-tags">
                          <span v-for="sub in uploadMetadata.detected_subheadings.filter(
                            (s) => !METHODOLOGY_SUBHEADING_LABELS.includes(s) && !INTRODUCTION_SUBHEADING_LABELS.includes(s),
                          )" :key="sub" class="sub-tag sub-tag-results">
                            <Check :size="12" /> {{ sub }}
                          </span>
                        </div>
                      </template>
                    </div>
                    <div class="imrad-tabs">
                      <button v-for="tab in availableImradTabs" :key="tab" type="button" class="imrad-tab-btn"
                        :class="{ active: activeImradTab === tab }" @click="activeImradTab = tab as ImradKey">
                        {{
                          tab === 'results'
                            ? 'Results and Discussion'
                            : tab === 'methods'
                            ? 'Methodology'
                            : tab.charAt(0).toUpperCase() + tab.slice(1)
                        }}
                      </button>
                    </div>

                    <div class="imrad-content">
                      <div v-if="
                        uploadMetadata.trim_points && uploadMetadata.trim_points[activeImradTab]
                      " class="trim-alert">
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
                                parsedReferencesPreview.length === 1 ? 'y' : 'ies'
                              }}
                                detected</span>
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
                                sec === 'references' ? 'Ref.' : sec.substring(0, 4) }}</span>
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
              <div>
                <span class="stat-val">{{ totalPapers }}</span><span class="stat-lbl">Total Papers</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-ico blue">
                <FileText :size="15" />
              </div>
              <div>
                <span class="stat-val">{{ thesisCount }}</span><span class="stat-lbl">Thesis</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-ico orange">
                <Users :size="15" />
              </div>
              <div>
                <span class="stat-val">{{ capstoneCount }}</span><span class="stat-lbl">Capstone</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-ico purple">
                <Calendar :size="15" />
              </div>
              <div>
                <span class="stat-val">{{ yearSpan }}</span><span class="stat-lbl">Year Span</span>
              </div>
            </div>
            <div class="stat-card" @click="setSection('pending')" style="cursor: pointer;">
              <div class="stat-ico amber">
                <Clock :size="15" />
              </div>
              <div>
                <span class="stat-val">{{ pendingCount }}</span><span class="stat-lbl">Pending Request</span>
              </div>
            </div>
          </div>

          <!-- Creative Analytics Section -->
          <div v-if="repoStats" class="analytics-grid">
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">Document Composition</span>
                <span class="chart-desc">Thesis vs. Capstone Projects</span>
              </div>
              <div class="pie-container">
                <div class="pie-chart" :style="{
                  background: `conic-gradient(var(--blue) 0% ${statsPercentages.thesis}%, var(--orange) ${statsPercentages.thesis}% 100%)`,
                }">
                  <div class="pie-center">
                    <span class="pie-total">{{ totalPapers }}</span>
                    <span class="pie-label">Approved</span>
                  </div>
                </div>
                <div class="pie-legend">
                  <div class="legend-item">
                    <span class="dot blue"></span>
                    <span class="label">Thesis</span>
                    <span class="value">{{ Math.round(statsPercentages.thesis) }}%</span>
                  </div>
                  <div class="legend-item">
                    <span class="dot orange"></span>
                    <span class="label">Capstone</span>
                    <span class="value">{{ Math.round(statsPercentages.capstone) }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">Distribution by Program</span>
                <span class="chart-desc">Total uploads per degree program</span>
              </div>
              <div class="prog-list">
                <div v-for="(count, prog) in repoStats.by_program" :key="prog" class="prog-row">
                  <div class="prog-meta">
                    <span class="prog-name">{{ prog }}</span>
                    <span class="prog-count">{{ count }}</span>
                  </div>
                  <div class="prog-track">
                    <div class="prog-fill" :style="{ width: (count / repoStats.total_papers) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="toolbar">
            <div class="search-box">
              <Search :size="13" class="search-ico" />
              <input v-model="searchQuery" type="text" placeholder="Search by title, author, or department…" />
            </div>
            <button class="repo-upload-btn" @click="setSection('upload')">
              <Plus :size="14" />
              Upload Document
            </button>
            <div class="filter-chips">
              <button class="chip" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
                All
              </button>
              <button class="chip" :class="{ active: activeFilter === 'Thesis' }" @click="activeFilter = 'Thesis'">
                Thesis
              </button>
              <button class="chip" :class="{ active: activeFilter === 'Capstone Project' }"
                @click="activeFilter = 'Capstone Project'">
                Capstone
              </button>
            </div>
          </div>

          <!-- Bulk Action Bar -->
          <div v-if="selectedRepoIds.length > 0" class="bulk-action-bar">
            <span class="selection-count">
              <strong>{{ selectedRepoIds.length }}</strong> selected
            </span>
            <div class="bulk-btns">
              <button @click="handleBulkDelete" class="bulk-btn delete" :disabled="loading">
                <Trash2 :size="13" /> Move to Trash
              </button>
              <button @click="selectedRepoIds = []" class="bulk-btn cancel">Cancel</button>
            </div>
          </div>

          <div class="tbl-card-head">
            <span class="tbl-count">Overall record: {{ filteredPapers.length }} paper{{
              filteredPapers.length !== 1 ? 's' : ''
              }}<span v-if="searchQuery || activeFilter !== 'all'" class="tbl-hint">
                · filtered</span></span>
          </div>
          <div class="tbl-scroll">
            <table class="tbl">
              <thead>
                <tr>
                  <th class="trash-check-col">
                    <label class="custom-check">
                      <input type="checkbox" v-model="allRepoSelected" />
                      <span class="check-box"></span>
                    </label>
                  </th>
                  <th style="width: 38%">Research Paper</th>
                  <th style="width: 80px; text-align: center;">Status</th>
                  <th style="width: 15%; text-align: center;">Department</th>
                  <th style="width: 80px; text-align: center;">Type</th>
                  <th style="width: 110px">Uploaded By</th>
                  <th style="width: 90px">Upload Date</th>
                  <th style="width: 64px; text-align: center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="loading">
                  <tr v-for="i in 5" :key="'sk' + i" class="skel-row">
                    <td></td>
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
                  <td colspan="8">
                    <div class="tbl-empty">
                      <FolderOpen :size="40" />
                      <h3>No papers found</h3>
                      <p>
                        {{
                          searchQuery || activeFilter !== 'all'
                            ? 'Try a different search or filter.'
                            : 'Upload the first researchpaper to get started.'
                        }}
                      </p>
                      <button v-if="!searchQuery && activeFilter === 'all'" @click="setSection('upload')"
                        class="empty-cta">
                        <Plus :size="13" /> Upload Now
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-for="paper in filteredPapers" :key="paper.id" class="tbl-row"
                  :class="{ 'row-selected': selectedRepoIds.includes(paper.id) }"
                  @click="toggleRepoSelection(paper.id)">
                  <td class="trash-check-col">
                    <label class="custom-check" @click.stop>
                      <input type="checkbox" :value="paper.id" v-model="selectedRepoIds" />
                      <span class="check-box"></span>
                    </label>
                  </td>
                  <td class="td-paper">
                    <div class="paper-cell">
                      <div class="paper-av" :data-t="typeColor(paper.project_type)">
                        {{ initials(paper.title) }}
                      </div>
                      <div class="paper-info">
                        <span class="paper-name clickable" @click.stop="viewDetails(paper)" :title="paper.title">{{
                          paper.title }}</span>
                        <span class="paper-author">{{ (paper.author || '').replace(/\|/g, ', ') }}</span>
                      </div>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <span class="type-badge" :class="paper.status === 'Approved' ? 'green' : 'amber'">
                      {{ paper.status ?? 'Approved' }}
                    </span>
                  </td>
                  <td class="dept-td">
                    <span class="dept-chip" :title="paper.department">{{ formatDept(paper.department) }}</span>
                  </td>
                  <td style="text-align: center;">
                    <span class="type-badge" :class="typeColor(paper.project_type)">{{
                      paper.project_type
                      }}</span>
                  </td>
                  <td>
                    <div class="uploader-cell">
                      <span class="uploader-name">{{ paper.uploaded_by ?? '—' }}</span>
                      <span class="uploader-role-tag" :class="paper.uploader_role?.toLowerCase()">{{
                        paper.uploader_role }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="upload-time-mini">{{ formatRelativeTime(paper.created_at) }}</span>
                  </td>
                  <td style="text-align: center;">
                    <div class="action-group">
                      <button @click.stop="handleEdit(paper)" class="row-btn" title="Edit Metadata">
                        <Edit3 :size="13" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- ══ PENDING APPROVALS ═════════════════════════════════ -->
        <template v-else-if="activeSection === 'pending'">
          <div class="page-head">
            <h1 class="page-title">Pending Requests</h1>
            <p class="page-sub">Verify and approve new thesis submissions before they become public.</p>
          </div>

          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-ico amber">
                <Clock :size="15" />
              </div>
              <div>
                <span class="stat-val">{{ pendingCount }}</span><span class="stat-lbl">Waiting for Review</span>
              </div>
            </div>
          </div>

          <div class="toolbar">
            <div class="search-box">
              <Search :size="13" class="search-ico" />
              <input v-model="searchQuery" type="text" placeholder="Filter pending by title or author…" />
            </div>
          </div>

          <div class="tbl-card">
            <div class="tbl-card-head">
              <span class="tbl-count">Queue: {{ pendingPapers.length }} paper{{
                pendingPapers.length !== 1 ? 's' : ''
              }} awaiting approval</span>
            </div>
            <div class="tbl-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th style="width: 38%">Research Paper</th>
                    <th style="width: 80px; text-align: center;">Status</th>
                    <th style="width: 15%; text-align: center;">Department</th>
                    <th style="width: 80px; text-align: center;">Type</th>
                    <th style="width: 110px">Uploaded By</th>
                    <th style="width: 90px">Upload Date</th>
                    <th style="width: 160px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loading">
                    <tr v-for="i in 3" :key="'psk' + i" class="skel-row">
                      <td colspan="6">
                        <div class="skel skel-t1" />
                      </td>
                    </tr>
                  </template>
                  <tr v-else-if="pendingPapers.length === 0">
                    <td colspan="7">
                      <div class="tbl-empty">
                        <CheckCircle :size="40" />
                        <h3>All caught up!</h3>
                        <p>No papers currently awaiting approval.</p>
                      </div>
                    </td>
                  </tr>
                  <tr v-for="paper in pendingPapers" :key="paper.id" class="tbl-row pending-row">
                    <td class="td-paper">
                      <div class="paper-cell">
                        <div class="paper-av" :data-t="typeColor(paper.project_type)">
                          {{ initials(paper.title) }}
                        </div>
                        <div class="paper-info">
                          <span class="paper-name clickable" @click="viewDetails(paper)" :title="paper.title">{{
                            paper.title }}</span>
                          <span class="paper-author">{{ (paper.author || '').replace(/\|/g, ', ') }}</span>
                        </div>
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <span class="type-badge amber">Pending</span>
                    </td>
                    <td class="dept-td">
                      <span class="dept-text" :title="paper.department">{{ formatDept(paper.department) }}</span>
                    </td>
                    <td style="text-align: center;">
                      <span class="type-badge" :class="typeColor(paper.project_type)">{{
                        paper.project_type
                        }}</span>
                    </td>
                    <td>
                      <div class="uploader-cell">
                        <span class="uploader-name">{{ paper.uploaded_by ?? '—' }}</span>
                        <span class="uploader-role-tag" :class="paper.uploader_role?.toLowerCase()">{{
                          paper.uploader_role }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="upload-time-mini">{{ formatRelativeTime(paper.created_at) }}</span>
                    </td>
                    <td style="text-align: center;">
                      <div class="action-group">
                        <button @click="handleApprove(paper)" class="approve-pill" title="Approve submission">
                          <Check :size="14" />
                          <span>Approve</span>
                        </button>
                        <div class="action-sep" />
                        <button v-if="isAdmin || isFaculty" @click="handleDelete(paper.id)"
                          class="icon-action-btn danger" title="Reject/Delete">
                          <Trash2 :size="14" />
                        </button>
                      </div>
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
              <div>
                <span class="stat-val">{{ adminCount }}</span><span class="stat-lbl">Admins</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-ico green">
                <UserCheck :size="15" />
              </div>
              <div>
                <span class="stat-val">{{ facultyCount }}</span><span class="stat-lbl">Faculty</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-ico blue">
                <Users :size="15" />
              </div>
              <div>
                <span class="stat-val">{{ studentCount }}</span><span class="stat-lbl">Students</span>
              </div>
            </div>
          </div>

          <div class="tbl-card">
            <div class="tbl-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Academic Member</th>
                    <th>Role</th>
                    <th style="text-align: center; width: 120px;">Change Role</th>
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
                          <div class="paper-info">
                            <span class="paper-name">{{ user.username }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="type-badge" :class="user.role === 'Admin'
                          ? 'purple'
                          : user.role === 'Faculty'
                            ? 'green'
                            : 'blue'
                          ">{{ user.role }}</span>
                      </td>
                      <td style="text-align: center;">
                        <div class="action-group">
                          <button @click="openRoleModal(user)" class="row-btn" title="Change role">
                            <UserCog :size="13" />
                          </button>
                        </div>
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

        <!-- ══ ACTIVITY LOG ════════════════════════════════════════ -->
        <template v-else-if="activeSection === 'logs'">
          <div class="page-head">
            <h1 class="page-title">Activity Log</h1>
            <p class="page-sub">Track who uploaded, edited, or deleted research papers.</p>
          </div>

          <div class="tbl-card">
            <div class="tbl-card-head logs-header">
              <span class="tbl-count">{{ logs.length }} events tracked</span>
              <button @click="fetchLogs" class="refresh-btn" :disabled="loadingLogs" title="Refresh Logs">
                <RefreshCw :size="14" :class="{ spin: loadingLogs }" />
                <span>Refresh</span>
              </button>
            </div>

            <div class="logs-legend">
              <div class="legend-item">
                <span class="log-badge green">
                  <FileUp :size="12" />
                </span>
                <span class="legend-lbl">Upload: New paper indexed</span>
              </div>
              <div class="legend-item">
                <span class="log-badge blue">
                  <Edit3 :size="12" />
                </span>
                <span class="legend-lbl">Edit: Metadata updated</span>
              </div>
              <div class="legend-item">
                <span class="log-badge red">
                  <Trash2 :size="12" />
                </span>
                <span class="legend-lbl">Trash: Moved to trash bin</span>
              </div>
              <div class="legend-item">
                <span class="log-badge green">
                  <ArchiveRestore :size="12" />
                </span>
                <span class="legend-lbl">Restore: Recovered from trash</span>
              </div>
              <div class="legend-item">
                <span class="log-badge purple">
                  <Trash2 :size="12" />
                </span>
                <span class="legend-lbl">Erase: Permanently removed from the repository</span>
              </div>
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
                    <td colspan="6">
                      <div class="tbl-empty">
                        <Clock :size="40" />
                        <h3>No activity yet</h3>
                        <p>Uploads, edits, and deletes will appear here.</p>
                      </div>
                    </td>
                  </tr>
                  <tr v-else v-for="log in logs" :key="log.id" class="tbl-row">
                    <td>
                      <div class="log-action-cell">
                        <div class="log-badge" :class="logActionColor(log.action)">
                          <FileUp v-if="log.action === 'Upload'" :size="12" />
                          <Edit3 v-else-if="log.action === 'Edit'" :size="12" />
                          <Trash2 v-else-if="log.action === 'Delete' || log.action === 'Purge'" :size="12" />
                          <ArchiveRestore v-else-if="log.action === 'Restore'" :size="12" />
                          {{
                            log.action === 'Purge'
                              ? 'Erase'
                              : log.action === 'Delete'
                                ? 'Trash'
                                : log.action
                          }}
                        </div>
                      </div>
                    </td>
                    <td class="td-paper">
                      <span class="paper-name">{{ log.paper_title }}</span>
                    </td>
                    <td>
                      <span class="uploader-chip">{{ log.performed_by }}</span>
                    </td>
                    <td>
                      <span class="type-badge" :class="log.performed_by_role === 'Admin'
                        ? 'purple'
                        : log.performed_by_role === 'Faculty'
                          ? 'green'
                          : 'blue'
                        ">
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
              <p class="page-sub">
                Deleted documents are automatically purged after 15 days. Restore them anytime
                before the deadline.
              </p>
            </div>
          </div>

          <!-- Bulk Action Bar -->
          <div v-if="selectedTrashIds.length > 0" class="bulk-action-bar">
            <span class="selection-count">
              <strong>{{ selectedTrashIds.length }}</strong> selected
            </span>
            <div class="bulk-btns">
              <button @click="handleBulkPurge" class="bulk-btn delete" :disabled="purging">
                <Trash2 :size="13" /> Erase Selected
              </button>
              <button @click="selectedTrashIds = []" class="bulk-btn cancel">Cancel</button>
            </div>
          </div>

          <div class="tbl-card-head" style="display: flex; align-items: center; justify-content: space-between">
            <span class="tbl-count">{{ trashedPapers.length }} document{{ trashedPapers.length !== 1 ? 's' : '' }} in
              Trash</span>
            <div style="display: flex; align-items: center; gap: 0.75rem">
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
                  <th class="trash-check-col">
                    <label class="custom-check">
                      <input type="checkbox" v-model="allTrashSelected" />
                      <span class="check-box"></span>
                    </label>
                  </th>
                  <th style="width: 38%">Research Paper</th>
                  <th style="width: 15%; text-align: center;">Department</th>
                  <th style="width: 80px; text-align: center;">Type</th>
                  <th style="width: 110px">Deleted By</th>
                  <th style="width: 100px; text-align: center;">Days Remaining</th>
                  <th style="width: 64px; text-align: center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="loadingTrash">
                  <tr v-for="i in 4" :key="'tr-sk' + i" class="skel-row">
                    <td></td>
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
                  <td colspan="7">
                    <div class="tbl-empty">
                      <Trash2 :size="40" />
                      <h3>Trash is empty</h3>
                      <p>
                        Deleted documents will appear here for 15 days before being permanently
                        removed.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr v-else v-for="paper in trashedPapers" :key="paper.id" class="tbl-row"
                  :class="{ 'row-selected': selectedTrashIds.includes(paper.id) }"
                  @click="toggleTrashSelection(paper.id)">
                  <td class="trash-check-col">
                    <label class="custom-check" @click.stop>
                      <input type="checkbox" :value="paper.id" v-model="selectedTrashIds" />
                      <span class="check-box"></span>
                    </label>
                  </td>
                  <td class="td-paper">
                    <div class="paper-cell">
                      <div class="paper-av" :data-t="typeColor(paper.project_type)">
                        {{ initials(paper.title) }}
                      </div>
                      <div class="paper-info">
                        <span class="paper-name">{{ paper.title }}</span>
                        <span class="paper-author">{{ (paper.author || '').replace(/\|/g, ', ') }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="dept-td">
                    <span class="dept-text" :title="paper.department">{{ formatDept(paper.department) }}</span>
                  </td>
                  <td style="text-align: center;">
                    <span class="type-badge" :class="typeColor(paper.project_type)">{{
                      paper.project_type
                      }}</span>
                  </td>
                  <td>
                    <span class="uploader-chip">{{ paper.deleted_by ?? '—' }}</span>
                  </td>
                  <td style="text-align: center;">
                    <span class="days-badge" :class="daysBadgeClass(daysRemaining(paper.deleted_at!))">
                      {{ daysRemaining(paper.deleted_at!) }}d left
                    </span>
                  </td>
                  <td style="text-align: center;">
                    <div class="action-group">
                      <button @click.stop="handleRestore(paper)" class="row-btn restore-btn" title="Restore paper">
                        <ArchiveRestore :size="13" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

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
                <div class="modal-head-icon green">
                  <UserCog :size="20" />
                </div>
                <div>
                  <h3>Change Role</h3>
                  <p>
                    Assign a new role to <strong>{{ roleTarget.username }}</strong>
                  </p>
                </div>
                <button @click="closeRoleModal" class="modal-close">
                  <X :size="18" />
                </button>
              </div>
              <div class="modal-body">
                <div class="role-opts">
                  <label class="role-opt student" :class="{ selected: roleNew === 'Student' }">
                    <input type="radio" v-model="roleNew" value="Student" />
                    <div class="role-opt-ico blue">
                      <Users :size="15" />
                    </div>
                    <div class="role-opt-info">
                      <span class="role-opt-name">Student</span>
                      <span class="role-opt-desc">Can search and view papers only.</span>
                    </div>
                    <Check v-if="roleNew === 'Student'" :size="13" class="role-check" />
                  </label>
                  <label class="role-opt faculty" :class="{ selected: roleNew === 'Faculty' }">
                    <input type="radio" v-model="roleNew" value="Faculty" />
                    <div class="role-opt-ico green">
                      <ShieldCheck :size="15" />
                    </div>
                    <div class="role-opt-info">
                      <span class="role-opt-name">Faculty</span>
                      <span class="role-opt-desc">Can upload and manage research papers.</span>
                    </div>
                    <Check v-if="roleNew === 'Faculty'" :size="13" class="role-check" />
                  </label>
                  <label class="role-opt admin" :class="{ selected: roleNew === 'Admin' }">
                    <input type="radio" v-model="roleNew" value="Admin" />
                    <div class="role-opt-ico purple">
                      <ShieldAlert :size="15" />
                    </div>
                    <div class="role-opt-info">
                      <span class="role-opt-name">Admin</span>
                      <span class="role-opt-desc">Full access including user management.</span>
                    </div>
                    <Check v-if="roleNew === 'Admin'" :size="13" class="role-check" />
                  </label>
                </div>
                <p v-if="roleError" class="role-error">{{ roleError }}</p>
              </div>
              <div class="modal-foot">
                <button @click="closeRoleModal" class="ghost-btn">Cancel</button>
                <button @click="handleRoleChange" :disabled="roleChanging || roleNew === roleTarget.role"
                  class="save-btn" :class="roleNew === 'Student' ? 'blue' : roleNew === 'Admin' ? 'purple' : 'green'">
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
                    <p class="success-msg">
                      Please save the auto-generated password below. It will not be shown again.
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
          <!-- ── BULK ACTION MODAL ────────────────────────────────── -->
          <div v-if="showBulkModal" class="modal-overlay" @click.self="closeBulkModal">
            <div class="modal-card purge-modal">
              <div class="modal-head">
                <div class="modal-head-icon" :class="bulkActionType === 'purge' ? 'red' : 'orange'">
                  <Trash2 :size="20" />
                </div>
                <div>
                  <h3>{{ bulkActionType === 'purge' ? 'Permanent Erase' : 'Move to Trash' }}</h3>
                  <p>{{ bulkActionType === 'purge' ? 'Documents will be removed forever.' : 'Selected items will be moved to recycle bin.' }}</p>
                </div>
                <button @click="closeBulkModal" class="modal-close">
                  <X :size="18" />
                </button>
              </div>
              <div class="modal-body purge-body">
                <div class="bulk-confirm-msg">
                  You are about to {{ bulkActionType === 'purge' ? 'permanently erase' : 'move to trash' }}
                  <strong>{{ bulkActionType === 'purge' ? selectedTrashIds.length : selectedRepoIds.length }}</strong>
                  document{{ (bulkActionType === 'purge' ? selectedTrashIds.length : selectedRepoIds.length) !== 1 ? 's'
                  : ''
                  }}.
                </div>
                <p v-if="bulkActionType === 'purge'" class="purge-warning"
                  style="margin-top: 1rem; font-size: 0.85rem; color: #ef4444; background: rgba(239, 68, 68, 0.05); padding: 0.75rem; border-radius: 6px; border-left: 3px solid #ef4444;">
                  <AlertCircle :size="14" style="display: inline; margin-right: 4px; vertical-align: text-bottom;" />
                  This action is irreversible. All associated data and files will be wiped from the system.
                </p>
              </div>
              <div class="modal-foot">
                <button @click="closeBulkModal" class="ghost-btn" :disabled="purging">Cancel</button>
                <button @click="handleBulkConfirm" class="purge-confirm-btn" :class="{ delete: bulkActionType === 'delete' }" :disabled="purging">
                  <Loader2 v-if="purging" :size="13" class="spin" />
                  <Trash2 v-else :size="13" />
                  {{ purging ? 'Processing...' : (bulkActionType === 'purge' ? 'Confirm Erase' : 'Confirm Delete') }}
                </button>
              </div>
            </div>
          </div>

        </Teleport>
      </div>

      <!-- ══ APPROVE MODAL (Minimal) ════════════════════════════ -->
      <Teleport to="body">
        <div v-if="showApproveModal && approveTarget" class="modal-overlay" @click.self="showApproveModal = false">
          <div class="modal-card mini">
            <div class="modal-head">
              <div>
                <h3>Confirm Approval</h3>
                <p>Make this research public?</p>
              </div>
              <button @click="showApproveModal = false" class="modal-close">
                <X :size="18" />
              </button>
            </div>
            <div class="modal-body">
              <h4 class="approve-q">Do you want to approve this research?</h4>
              <div class="approve-title-card">
                {{ approveTarget.title }}
              </div>
              <p class="approve-final-msg">
                Once confirmed, it will become searchable by all users in the system.
              </p>
            </div>
            <div class="modal-foot">
              <button @click="showApproveModal = false" class="ghost-btn">Cancel</button>
              <button @click="confirmApprove" class="save-btn success">
                <Check :size="14" />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ══ EDIT METADATA MODAL ══════════════════════════════════ -->
      <Teleport to="body">
        <div v-if="showEditModal && editTarget" class="modal-overlay" @click.self="showEditModal = false">
          <div class="modal-card edit-modal">
            <div class="modal-head">
              <div class="modal-head-icon green">
                <Edit3 :size="20" />
              </div>
              <div>
                <h3>Edit Metadata</h3>
                <p>Update research details</p>
              </div>
              <button @click="showEditModal = false" class="modal-close">
                <X :size="18" />
              </button>
            </div>
            <div class="modal-body">
              <div class="edit-form-grid">
                <div class="input-field full">
                  <label>Research Title</label>
                  <textarea v-model="editForm.title" rows="3" placeholder="Enter full title..."></textarea>
                </div>
                <div class="input-field full">
                  <label>Authors & Contributors</label>
                  <div class="authors-list">
                    <div v-for="(author, index) in editForm.authors" :key="index" class="author-input-row">
                      <div class="row-index">{{ index + 1 }}</div>
                      <input v-model="editForm.authors[index]" type="text" placeholder="Full Name" />
                      <button @click="removeEditAuthor(index)" class="remove-author-btn" title="Remove Author">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                  <button @click="addEditAuthor" class="add-author-btn">
                    <Plus :size="13" />
                    <span>Add Another Author</span>
                  </button>
                </div>
                <div class="input-field">
                  <label>Department</label>
                  <input v-model="editForm.department" type="text" />
                </div>
                <div class="input-field">
                  <label>Degree Program</label>
                  <input v-model="editForm.degree_program" type="text" />
                </div>
                <div class="input-field">
                  <label>Project Type</label>
                  <select v-model="editForm.project_type">
                    <option value="Thesis">Thesis</option>
                    <option value="Capstone Project">Capstone Project</option>
                  </select>
                </div>
                <div class="input-field">
                  <label>Keywords (Comma separated)</label>
                  <input v-model="editForm.keywords" type="text" />
                </div>
              </div>
            </div>
            <div class="modal-foot">
              <button @click="showEditModal = false" class="ghost-btn">Discard</button>
              <button @click="confirmEdit" class="save-btn green">
                <Save :size="14" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ══ DETAILS MODAL (Premium Redesign) ════════════════════════ -->
      <Teleport to="body">
        <div v-if="showDetailsModal && detailsTarget" class="modal-overlay" @click.self="showDetailsModal = false">
          <div class="modal-card details-modal-v2">
            <div class="modal-head">
              <div class="modal-head-icon blue">
                <FileText :size="22" />
              </div>
              <div class="modal-head-txt">
                <h3>Research Insight</h3>
                <p>Advanced Metadata Overview</p>
              </div>
              <button @click="showDetailsModal = false" class="modal-close">
                <X :size="18" />
              </button>
            </div>

            <div class="modal-body p-0">
              <!-- Hero Header -->
              <div class="details-hero">
                <div class="hero-label">Research Title</div>
                <h2 class="hero-title">{{ detailsTarget.title }}</h2>
                <div class="hero-authors">
                  <User :size="14" />
                  <span>{{ (detailsTarget.author || '').replace(/\|/g, ', ') }}</span>
                </div>
              </div>

              <div class="details-content-wrap">
                <!-- Status Row -->
                <div class="status-ribbon">
                  <div class="ribbon-item">
                    <label>Verification Status</label>
                    <span class="type-badge" :class="detailsTarget.status === 'Approved' ? 'green' : 'amber'">
                      <CheckCircle v-if="detailsTarget.status === 'Approved'" :size="12" />
                      <Clock v-else :size="12" />
                      {{ detailsTarget.status }}
                    </span>
                  </div>
                  <div class="ribbon-item">
                    <label>Project Classification</label>
                    <span class="type-badge" :class="typeColor(detailsTarget.project_type)">
                      <Bookmark :size="12" />
                      {{ detailsTarget.project_type }}
                    </span>
                  </div>
                </div>

                <!-- Main Info Grid -->
                <div class="info-grid-v2">
                  <div class="info-card">
                    <div class="ic-head">
                      <Building2 :size="14" /><span>Department</span>
                    </div>
                    <div class="ic-body">{{ detailsTarget.department }}</div>
                  </div>
                  <div class="info-card">
                    <div class="ic-head">
                      <GraduationCap :size="14" /><span>Program</span>
                    </div>
                    <div class="ic-body">{{ detailsTarget.degree_program || '—' }}</div>
                  </div>
                  <div class="info-card">
                    <div class="ic-head">
                      <Hash :size="14" /><span>Keywords</span>
                    </div>
                    <div class="ic-body">
                      <div v-if="detailsTarget.keywords" class="kw-flex">
                        <span v-for="kw in detailsTarget.keywords.split(',')" :key="kw" class="kw-pill-v2">{{ kw.trim()
                          }}</span>
                      </div>
                      <span v-else class="val-empty">No keywords defined</span>
                    </div>
                  </div>
                </div>

                <!-- Audit Trail Section -->
                <div class="audit-trail-v2">
                  <div class="audit-head">
                    <History :size="14" />
                    <span>Audit Trail & Lifecycle</span>
                  </div>
                  <div class="audit-grid">
                    <div class="audit-node">
                      <div class="node-label">Uploaded By</div>
                      <div class="node-card">
                        <div class="node-avatar">{{ initials(detailsTarget.uploaded_by || '') }}</div>
                        <div class="node-info">
                          <span class="node-name">{{ detailsTarget.uploaded_by }}</span>
                          <span class="node-role" :class="detailsTarget.uploader_role?.toLowerCase()">{{
                            detailsTarget.uploader_role }}</span>
                        </div>
                      </div>
                      <div class="node-time">{{ formatLogDate(detailsTarget.created_at || '') }}</div>
                    </div>

                    <div class="audit-sep">
                      <ArrowRight :size="16" />
                    </div>

                    <div class="audit-node">
                      <div class="node-label">Approved By</div>
                      <div v-if="detailsTarget.approved_by" class="node-card success">
                        <div class="node-avatar">{{ initials(detailsTarget.approved_by) }}</div>
                        <div class="node-info">
                          <span class="node-name">{{ detailsTarget.approved_by }}</span>
                          <span class="node-role admin">Approver</span>
                        </div>
                      </div>
                      <div v-else class="node-card empty">
                        <span class="node-placeholder">Auto-approved / System</span>
                      </div>
                      <div class="node-time" v-if="detailsTarget.approved_at">{{
                        formatLogDate(detailsTarget.approved_at) }}
                      </div>
                      <div class="node-time" v-else>—</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-foot">
              <button @click="showDetailsModal = false" class="btn-pri-v2">
                <span>Dismiss Overview</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>
      <!-- ══ EDIT MODAL (Simplified) ════════════════════════════ -->
      <!-- ══ EDIT MODAL REMOVED ════════════════════════════ -->
    </div>
    <!-- Close mgmt-main -->
  </div>
  <!-- Close mgmt -->
</template>

<style scoped>

/* ── Modern Layout & Design System ── */
.mgmt {
  --blue: #3b82f6;
  --blue-dim: rgba(59, 130, 246, 0.1);
  --orange: #f97316;
  --orange-dim: rgba(249, 115, 22, 0.1);
  --purple: #8b5cf6;
  --purple-dim: rgba(139, 92, 246, 0.1);
  --green: #00a651;
  --green-dim: rgba(0, 166, 81, 0.15);
  --amber: #f59e0b;
  --amber-dim: rgba(245, 158, 11, 0.1);
  --red: #ef4444;
  --red-dim: rgba(239, 68, 68, 0.1);
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --border-color: rgba(0, 166, 81, 0.12);
  --border-hover: rgba(0, 166, 81, 0.25);
  --card-bg: rgba(255, 255, 255, 0.7);
  --sidebar-bg: rgba(255, 255, 255, 0.85);
  --topbar-bg: rgba(255, 255, 255, 0.8);
  --shadow-sm: 0 2px 8px -1px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 10px 25px -5px rgba(0, 166, 81, 0.04), 0 8px 16px -6px rgba(0, 0, 0, 0.02);
  --shadow-lg: 0 20px 40px -10px rgba(0, 0, 0, 0.08);
  
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  height: calc(100vh - 64px);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
  overflow: hidden;
  font-size: 0.88rem;
}

.dark .mgmt {
  --blue: #60a5fa;
  --blue-dim: rgba(96, 165, 250, 0.15);
  --orange: #fb923c;
  --orange-dim: rgba(251, 146, 60, 0.15);
  --purple: #a78bfa;
  --purple-dim: rgba(167, 139, 250, 0.15);
  --green: #00c853;
  --green-dim: rgba(0, 200, 83, 0.15);
  --amber: #fbbf24;
  --amber-dim: rgba(251, 191, 36, 0.15);
  --red: #f87171;
  --red-dim: rgba(248, 113, 113, 0.15);
  
  --bg-primary: #0a0a0a;
  --bg-secondary: #121212;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --border-color: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(0, 200, 83, 0.2);
  --card-bg: rgba(18, 18, 18, 0.7);
  --sidebar-bg: rgba(10, 10, 10, 0.85);
  --topbar-bg: rgba(10, 10, 10, 0.8);
  --shadow-sm: 0 2px 8px -1px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 10px 25px -5px rgba(0, 200, 83, 0.03), 0 8px 16px -6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
}

/* ── Floating Backdrop Vignettes ── */
.mgmt-main::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 500px;
  background: radial-gradient(circle at 10% 10%, rgba(0, 166, 81, 0.05) 0%, transparent 60%);
  z-index: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.dark .mgmt-main::before {
  background: radial-gradient(circle at 10% 10%, rgba(0, 200, 83, 0.07) 0%, transparent 60%);
}

/* ── Sidebar Layout & Collapsed State ── */
.sidebar {
  width: 260px;
  background: var(--sidebar-bg);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  position: sticky;
  top: 0;
  z-index: 100;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}

.sidebar::-webkit-scrollbar {
  display: none;
}

.sidebar.collapsed {
  width: 72px;
}

.sb-brand {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
  overflow: hidden;
  white-space: nowrap;
}

.sb-brand-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--green-dim);
  border-radius: 8px;
  flex-shrink: 0;
}

.sb-brand-text {
  display: flex;
  flex-direction: column;
  transition: opacity 0.2s ease;
}
.sidebar.collapsed .sb-brand-text {
  opacity: 0;
  pointer-events: none;
  display: none;
}

.sb-name {
  font-family: 'Lora', serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-primary);
  line-height: 1.2;
}

.sb-sub {
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--green);
  font-weight: 700;
}

.sb-group-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  font-weight: 700;
  margin: 16px 20px 8px;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.sidebar.collapsed .sb-group-label {
  opacity: 0;
  display: none;
}

.sb-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
  flex: 1;
}

.sb-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  width: 100%;
}

.sb-item:hover {
  background: var(--green-dim);
  color: var(--green);
  border-color: rgba(0, 166, 81, 0.08);
}

.sb-item.active {
  background: var(--green);
  color: #ffffff;
  box-shadow: 0 4px 15px -3px rgba(0, 166, 81, 0.25);
  border-color: transparent;
}

.sb-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.sb-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--red);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 5px;
  min-width: 16px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--bg-primary);
}

.sb-item-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  transition: opacity 0.25s ease;
}
.sidebar.collapsed .sb-item-body {
  opacity: 0;
  pointer-events: none;
  display: none;
}

.sb-item-label {
  font-size: 0.8rem;
  font-weight: 600;
}

.sb-item-desc {
  font-size: 0.68rem;
  color: var(--text-tertiary);
  margin-top: 1px;
}
.sb-item.active .sb-item-desc {
  color: rgba(255, 255, 255, 0.75);
}

.sb-arrow {
  color: var(--text-tertiary);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.sb-item:hover .sb-arrow {
  color: var(--green);
  transform: translateX(2px);
}
.sb-item.active .sb-arrow {
  color: rgba(255, 255, 255, 0.8);
}

.sb-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.sb-theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.5);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}
.dark .sb-theme-btn {
  background: rgba(10, 10, 10, 0.5);
}

.sb-theme-btn:hover {
  background: var(--green-dim);
  color: var(--green);
  border-color: var(--green);
}

.sb-footer-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.05);
  color: var(--red);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.sidebar.collapsed .sb-footer-badge span {
  display: none;
}

/* ── Main Canvas Layout ── */
.mgmt-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  /* Bound height to viewport so sidebar stays sticky — content scrolls internally */
  height: calc(100vh - 64px);
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Topbar Header Row ── */
.topbar {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--topbar-bg);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 90;
  transition: background-color 0.3s;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sb-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.sb-toggle:hover {
  color: var(--green);
  border-color: var(--green);
  background: var(--green-dim);
}

.bc-root {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  font-weight: 500;
}

.bc-sep {
  color: var(--text-tertiary);
  opacity: 0.5;
}

.bc-active {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.live-clock {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  letter-spacing: 0.02em;
}

/* Steps Rail inside Navbar */
.steps-rail.inside-navbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.4;
  transition: opacity 0.3s;
}

.step-item.active {
  opacity: 1;
}

.step-item.done {
  opacity: 0.85;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  transition: all 0.3s;
}
.step-item.active .step-num {
  background: var(--green-dim);
  border-color: var(--green);
  color: var(--green);
}
.step-item.done .step-num {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.step-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.step-item.active .step-label {
  color: var(--text-primary);
  font-weight: 700;
}

.step-line {
  width: 32px;
  height: 2px;
  background: var(--border-color);
  border-radius: 1px;
}
.step-line.loading {
  background: linear-gradient(90deg, var(--border-color) 0%, var(--green) 50%, var(--border-color) 100%);
  background-size: 200% 100%;
  animation: move-gradient 1.5s linear infinite;
}

@keyframes move-gradient {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Content Area & Headings ── */
.content {
  padding: 32px 28px;
  position: relative;
  z-index: 5;
  width: 100%;
  flex: 1;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
  gap: 16px;
}

.page-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.page-sub {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* ── Bento-Style Stats counters ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--card-bg);
  backdrop-filter: blur(15px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.stat-ico {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-ico.green { background: var(--green-dim); color: var(--green); }
.stat-ico.blue { background: var(--blue-dim); color: var(--blue); }
.stat-ico.orange { background: var(--orange-dim); color: var(--orange); }
.stat-ico.purple { background: var(--purple-dim); color: var(--purple); }
.stat-ico.amber { background: var(--amber-dim); color: var(--amber); }

.stat-val {
  display: block;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.stat-lbl {
  display: block;
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

/* ── Analytics & Charts ── */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.chart-card {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.chart-header {
  margin-bottom: 20px;
}

.chart-title {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.chart-desc {
  display: block;
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 3px;
}

/* Pie Chart using pure CSS conic gradient */
.pie-container {
  display: flex;
  align-items: center;
  gap: 32px;
  justify-content: center;
  padding: 10px 0;
}

.pie-chart {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.pie-center {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
}

.pie-total {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.pie-label {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  margin-top: 2px;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.legend-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-item .dot.blue { background: var(--blue); }
.legend-item .dot.orange { background: var(--orange); }

.legend-item .label {
  color: var(--text-secondary);
  font-weight: 500;
  width: 70px;
}

.legend-item .value {
  color: var(--text-primary);
  font-weight: 700;
}

/* Distribution Bars List */
.prog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prog-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prog-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
}

.prog-name {
  color: var(--text-primary);
}

.prog-count {
  color: var(--text-secondary);
}

.prog-track {
  height: 8px;
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.prog-fill {
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--green) 0%, #34d399 100%);
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Toolbars & Search Controls ── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.search-box input {
  width: 100%;
  height: 42px;
  padding: 0 16px 0 40px;
  border-radius: 24px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 0.88rem;
  outline: none;
  transition: all 0.25s ease;
}

.search-box input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px var(--green-dim);
}

.filter-chips {
  display: flex;
  gap: 8px;
}

.chip {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  border-color: var(--green);
  color: var(--green);
}

.chip.active {
  background: var(--green);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.15);
}

.repo-upload-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 42px;
  border-radius: 24px;
  border: none;
  background: var(--green);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 15px rgba(0, 166, 81, 0.2);
}

.repo-upload-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 166, 81, 0.3);
}

/* ── Bulk Actions Bar ── */
.bulk-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--red-dim);
  border: 1px solid var(--red);
  border-radius: 12px;
  margin-bottom: 20px;
  width: 100%;
  animation: slide-down 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-down {
  0% { transform: translateY(-10px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

.selection-count {
  font-size: 0.88rem;
  color: var(--text-primary);
}

.bulk-btns {
  display: flex;
  gap: 10px;
}

.bulk-btn {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn.delete {
  background: var(--red);
  color: #fff;
  border: none;
}
.bulk-btn.delete:hover {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.bulk-btn.cancel {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.bulk-btn.cancel:hover {
  background: var(--bg-secondary);
}

/* ── Advanced Data Grids & Tables ── */
.tbl-card {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.tbl-card-head {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.2);
}
.dark .tbl-card-head {
  background: rgba(10, 10, 10, 0.2);
}

.tbl-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.tbl-hint {
  color: var(--green);
  margin-left: 6px;
}

.tbl-scroll {
  overflow-x: auto;
  width: 100%;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  table-layout: auto;
}

.tbl th {
  padding: 8px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.tbl td {
  padding: 8px 10px;
  font-size: 0.78rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.tbl-row {
  transition: background-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}

.tbl-row:hover {
  background-color: rgba(0, 166, 81, 0.04);
}
.dark .tbl-row:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.tbl-row.row-selected {
  background-color: var(--green-dim);
  box-shadow: inset 3px 0 0 var(--green);
}

.tbl-row.row-selected:hover {
  background-color: var(--green-dim);
}

/* Custom checkbox */
.custom-check {
  display: inline-flex;
  position: relative;
  cursor: pointer;
  user-select: none;
}

.custom-check input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.check-box {
  height: 18px;
  width: 18px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.custom-check:hover input ~ .check-box {
  border-color: var(--green);
}

.custom-check input:checked ~ .check-box {
  background: var(--green);
  border-color: var(--green);
}

.check-box::after {
  content: "";
  display: none;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.custom-check input:checked ~ .check-box::after {
  display: block;
}

.trash-check-col {
  width: 40px;
  text-align: center;
  padding: 14px 10px 14px 20px !important;
}

.td-paper {
  min-width: 250px;
}

.paper-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.paper-av {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--green-dim);
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
  text-transform: uppercase;
}

.paper-av[data-t="blue"] { background: var(--blue-dim); color: var(--blue); }
.paper-av[data-t="orange"] { background: var(--orange-dim); color: var(--orange); }

.paper-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.paper-name {
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paper-name.clickable {
  cursor: pointer;
}
.paper-name.clickable:hover {
  color: var(--green);
  text-decoration: underline;
}

.paper-author {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.type-badge.green { background: var(--green-dim); color: var(--green); }
.type-badge.blue { background: var(--blue-dim); color: var(--blue); }
.type-badge.orange { background: var(--orange-dim); color: var(--orange); }
.type-badge.purple { background: var(--purple-dim); color: var(--purple); }
.type-badge.amber { background: var(--amber-dim); color: var(--amber); }

.dept-td {
  max-width: 0;
  overflow: hidden;
  text-align: center;
}

.dept-chip {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.dept-text {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.uploader-cell {
  display: flex;
  flex-direction: column;
}

.uploader-name {
  font-size: 0.82rem;
  font-weight: 600;
}

.uploader-role-tag {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-top: 2px;
}
.uploader-role-tag.admin { color: var(--purple); }
.uploader-role-tag.faculty { color: var(--green); }
.uploader-role-tag.student { color: var(--blue); }

.upload-time-mini {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.action-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.row-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.row-btn:hover {
  color: var(--green);
  border-color: var(--green);
  background: var(--green-dim);
}

.row-btn.restore-btn:hover {
  color: var(--blue);
  border-color: var(--blue);
  background: var(--blue-dim);
}

/* User Management styles */
.user-av {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--green-dim);
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
}

.th-r, .td-r {
  text-align: right !important;
}

/* Refresh logs */
.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  color: var(--green);
  border-color: var(--green);
}

.logs-legend {
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.15);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.dark .logs-legend {
  background: rgba(10, 10, 10, 0.15);
}

.log-action-cell {
  display: flex;
}

.log-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}
.log-badge.green { background: var(--green-dim); color: var(--green); }
.log-badge.blue { background: var(--blue-dim); color: var(--blue); }
.log-badge.purple { background: var(--purple-dim); color: var(--purple); }
.log-badge.red { background: var(--red-dim); color: var(--red); }

.legend-lbl {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.sync-text {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.ghost-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.ghost-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.modal-foot .ghost-btn {
  width: auto;
  height: 36px;
  padding: 0 16px;
  border-radius: 18px;
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.days-badge {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
}
.days-badge.green { background: var(--green-dim); color: var(--green); }
.days-badge.amber { background: var(--amber-dim); color: var(--amber); }
.days-badge.red { background: var(--red-dim); color: var(--red); }

/* Table Skeletons */
.skel-row td {
  padding: 18px 20px;
}

.skel {
  background: linear-gradient(90deg, var(--border-color) 25%, var(--bg-secondary) 50%, var(--border-color) 75%);
  background-size: 200% 100%;
  animation: shine 1.5s infinite;
  border-radius: 4px;
}

.skel-paper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skel-av {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
}

.skel-t1 {
  width: 180px;
  height: 12px;
  margin-bottom: 6px;
}

.skel-t2 {
  width: 100px;
  height: 8px;
}

.skel-chip {
  width: 60px;
  height: 16px;
  border-radius: 20px;
}

.skel-dept {
  width: 110px;
  height: 10px;
}

.skel-type {
  width: 70px;
  height: 10px;
}

@keyframes shine {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.tbl-empty {
  padding: 48px;
  text-align: center;
  color: var(--text-tertiary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.tbl-empty h3 {
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-weight: 700;
  margin-top: 8px;
}

.tbl-empty p {
  font-size: 0.82rem;
  color: var(--text-tertiary);
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--green);
  color: #fff;
  border: none;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
}

/* Approve queue buttons */
.approve-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--green);
  color: #fff;
  border: none;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.approve-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.2);
}

.icon-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-action-btn.danger {
  color: var(--red);
}
.icon-action-btn.danger:hover {
  border-color: var(--red);
  background: var(--red-dim);
}

.action-sep {
  width: 1px;
  height: 16px;
  background: var(--border-color);
}

.pending-row {
  background: rgba(245, 158, 11, 0.015);
}

/* ── Uploader Portal Embedded Styling ── */
.upload-wrap {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-center {
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
}

.processing-container {
  padding: 48px;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  text-align: center;
  box-shadow: var(--shadow-md);
}

.upload-card {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  box-shadow: var(--shadow-md);
}

.upload-card-head {
  text-align: center;
  margin-bottom: 24px;
}

.upload-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.upload-card-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.upload-card-head p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Notice Banners */
.notice-banner {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  margin-bottom: 20px;
}

.notice-banner.amber {
  background: rgba(245, 158, 11, 0.05);
  border-left: 4px solid var(--amber);
  color: var(--text-secondary);
}

.notice-banner.blue {
  background: rgba(59, 130, 246, 0.05);
  border-left: 4px solid var(--blue);
  color: var(--text-secondary);
  align-items: center;
  justify-content: space-between;
}

.notice-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.notice-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notice-title {
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

.notice-desc {
  line-height: 1.4;
}

/* Drop Zone */
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: 14px;
  padding: 40px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.dark .drop-zone {
  background: rgba(10, 10, 10, 0.1);
}

.drop-zone:hover, .drop-zone.dragging {
  border-color: var(--green);
  background: var(--green-dim);
}

.drop-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drop-text strong {
  color: var(--text-primary);
  font-weight: 700;
}

.drop-text span {
  font-size: 0.72rem;
  color: var(--text-tertiary);
}

/* Sample Docs Panel */
.sample-docs-panel {
  margin-top: 24px;
  border-top: 1px solid var(--border-color);
  padding-top: 20px;
}

.sample-docs-header {
  margin-bottom: 12px;
}

.sample-docs-header-left {
  display: flex;
  gap: 10px;
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
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}

.sample-docs-subtitle {
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

.sample-docs-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sample-doc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.sample-doc-row:hover {
  border-color: var(--green);
  background: var(--green-dim);
}

.sample-doc-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sample-doc-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.sample-doc-size {
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

.sample-doc-grip {
  color: var(--text-tertiary);
  opacity: 0.5;
}

.sample-doc-row:hover .sample-doc-grip {
  color: var(--green);
  opacity: 1;
}

.attach-btn-mobile {
  display: none;
}

/* Success Card */
.upload-success {
  text-align: center;
  padding: 24px;
}

.upload-success h2 {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-top: 16px;
}

.upload-success p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Step 2 Review workspace */
.review-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
  gap: 16px;
}

.review-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-bar-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
}

.review-bar-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.review-bar-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 1px;
}

.review-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  font-size: 0.75rem;
}

.file-pill-label {
  font-weight: 700;
  color: var(--green);
}

.file-pill-name {
  color: var(--text-primary);
  font-weight: 600;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-pill-count {
  color: var(--text-secondary);
  border-left: 1px solid var(--border-color);
  padding-left: 6px;
}

.confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 32px;
  border-radius: 16px;
  border: none;
  background: var(--green);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.25);
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.cancel-btn:hover {
  color: var(--red);
  border-color: var(--red);
}

.review-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  align-items: start;
}

.meta-panel {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.step-badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meta-panel-head h4 {
  font-size: 0.88rem;
  font-weight: 750;
  color: var(--text-primary);
}

.fg {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.fg-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.fg label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.01em;
}

.fg input, .fg select, .fg textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s;
}

.fg textarea {
  resize: vertical;
  height: 60px;
  font-family: inherit;
}

.fg input:focus, .fg select:focus, .fg textarea:focus {
  border-color: var(--green);
}

.authors-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.author-row {
  display: flex;
  gap: 6px;
}

.icon-btn.red {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--red);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.icon-btn.red:hover {
  border-color: var(--red);
  background: var(--red-dim);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--green);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.add-btn:hover {
  border-color: var(--green);
  background: var(--green-dim);
}

.page-head .add-btn {
  width: auto;
  border: 1px solid var(--green);
  background: var(--green);
  color: #ffffff;
}

.page-head .add-btn:hover {
  background: var(--green);
  border-color: var(--green);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.2);
}

.review-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.imrad-panel {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
}

.subheadings-preview {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 16px;
}
.dark .subheadings-preview {
  background: rgba(10, 10, 10, 0.2);
}

.fg-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 6px;
}

.sub-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sub-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  background: var(--green-dim);
  color: var(--green);
  font-size: 0.7rem;
  font-weight: 700;
}

.sub-tag-intro {
  background: var(--purple-dim);
  color: var(--purple);
}

.sub-tag-results {
  background: var(--blue-dim);
  color: var(--blue);
}

.imrad-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  gap: 4px;
  margin-bottom: 16px;
  overflow-x: auto;
  white-space: nowrap;
}

.imrad-tab-btn {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.imrad-tab-btn:hover {
  color: var(--green);
}

.imrad-tab-btn.active {
  color: var(--green);
  border-bottom-color: var(--green);
}

.imrad-content {
  display: flex;
  flex-direction: column;
}

.trim-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.03);
  border: 1px solid var(--amber);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 12px;
}

.imrad-textarea {
  width: 100%;
  min-height: 220px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 16px 20px;
  font-size: 0.85rem;
  line-height: 1.6;
  outline: none;
  font-family: 'Lora', Georgia, serif;
  resize: vertical;
  letter-spacing: 0.01em;
  text-align: justify;
}

.imrad-textarea:focus {
  border-color: var(--green);
}

.imrad-textarea.maximized {
  min-height: 280px;
}

.fg textarea.abstract-area {
  min-height: 100px;
  font-family: 'Lora', Georgia, serif;
  font-size: 0.85rem;
  line-height: 1.6;
  letter-spacing: 0.01em;
  padding: 16px 20px;
  text-align: justify;
}

/* Reference split preview */
.ref-split-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 380px;
}

.ref-preview-pane, .ref-editor-pane {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.dark .ref-preview-pane, .dark .ref-editor-pane {
  background: rgba(10, 10, 10, 0.1);
}

.ref-pane-label {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dark .ref-pane-label {
  background: rgba(10, 10, 10, 0.3);
}

.ref-count-badge {
  background: var(--green-dim);
  color: var(--green);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.65rem;
}

.ref-preview-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ref-preview-entry {
  font-family: 'Lora', Georgia, serif;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-primary);
  border-left: 2px solid var(--green);
  padding-left: 8px;
  letter-spacing: 0.01em;
}

.ref-preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 0.78rem;
}

.ref-pane-hint {
  font-weight: 500;
  font-style: italic;
  color: var(--text-tertiary);
}

.ref-textarea {
  flex: 1;
  border: none;
  border-radius: 0;
  background: transparent;
  resize: none;
  min-height: auto;
}

/* Page indexer panel */
.page-panel {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
}

.page-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-panel-title h4 {
  font-size: 0.88rem;
  font-weight: 750;
  color: var(--text-primary);
}

.page-panel-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selector-hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.selector-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--green);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.text-btn:hover {
  text-decoration: underline;
}

.dot-sep {
  width: 3px;
  height: 3px;
  background: var(--border-color);
  border-radius: 50%;
}

.thumbs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 6px;
}

.thumb-card {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  aspect-ratio: 3/4;
}

.thumb-card:hover {
  border-color: var(--green);
}

.thumb-card.selected {
  border-color: var(--green);
  box-shadow: 0 0 0 2px var(--green-dim);
}

.thumb-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.75;
  transition: opacity 0.2s, transform 0.2s;
}
.thumb-card:hover .thumb-img {
  opacity: 0.9;
  transform: scale(1.02);
}
.thumb-card.selected .thumb-img {
  opacity: 1;
}

.thumb-num {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.thumb-sec-badges {
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sec-badge {
  font-size: 0.55rem;
  font-weight: 750;
  padding: 1px 4px;
  border-radius: 3px;
  color: #fff;
  text-transform: uppercase;
}
.sec-badge.introduction { background: var(--blue); }
.sec-badge.methodology,
.sec-badge.methods { background: var(--purple); }
.sec-badge.results,
.sec-badge.discussion { background: var(--orange); }
.sec-badge.references { background: var(--red); }

.thumb-hover-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  opacity: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.thumb-card:hover .thumb-hover-hint {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 166, 81, 0.08);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.thumb-card.selected .thumb-overlay {
  opacity: 1;
}

.thumb-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

/* Floating Upload notification */
.upload-notification-wrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 500;
  pointer-events: none;
}

.upload-notification {
  display: flex;
  align-items: start;
  gap: 12px;
  background: var(--card-bg);
  backdrop-filter: blur(25px);
  border: 1px solid var(--red);
  border-radius: 12px;
  padding: 16px;
  width: 320px;
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  transform: translateY(20px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.upload-notification.show {
  transform: translateY(0);
  opacity: 1;
}

.notif-ico {
  color: var(--red);
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-body {
  flex: 1;
}

.notif-body strong {
  font-size: 0.85rem;
  font-weight: 750;
  color: var(--text-primary);
  display: block;
}

.notif-body p {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1.4;
}

.notif-close {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 4px;
}
.notif-close:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

/* ── Modals & Overlays ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;

  /* Theme variables for teleported elements */
  --blue: #3b82f6;
  --blue-dim: rgba(59, 130, 246, 0.1);
  --orange: #f97316;
  --orange-dim: rgba(249, 115, 22, 0.1);
  --purple: #8b5cf6;
  --purple-dim: rgba(139, 92, 246, 0.1);
  --green: #00a651;
  --green-dim: rgba(0, 166, 81, 0.15);
  --amber: #f59e0b;
  --amber-dim: rgba(245, 158, 11, 0.1);
  --red: #ef4444;
  --red-dim: rgba(239, 68, 68, 0.1);
}

.dark .modal-overlay {
  --blue: #60a5fa;
  --blue-dim: rgba(96, 165, 250, 0.15);
  --orange: #fb923c;
  --orange-dim: rgba(251, 146, 60, 0.15);
  --purple: #a78bfa;
  --purple-dim: rgba(167, 139, 250, 0.15);
  --green: #00c853;
  --green-dim: rgba(0, 200, 83, 0.15);
  --amber: #fbbf24;
  --amber-dim: rgba(251, 191, 36, 0.15);
  --red: #f87171;
  --red-dim: rgba(248, 113, 113, 0.15);
}

.modal-card {
  background: var(--card-bg);
  backdrop-filter: blur(25px);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  width: 100%;
  max-width: 580px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-enter {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.modal-head {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 14px;
  align-items: start;
  position: relative;
}

.modal-head-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.modal-head-icon.green { background: var(--green-dim); color: var(--green); }
.modal-head-icon.blue { background: var(--blue-dim); color: var(--blue); }
.modal-head-icon.purple { background: var(--purple-dim); color: var(--purple); }
.modal-head-icon.red { background: var(--red-dim); color: var(--red); }

.modal-head h3 {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.modal-head p {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 1px;
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s;
}
.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 120px);
}

.modal-foot {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.dark .modal-foot {
  background: rgba(10, 10, 10, 0.2);
}

.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 36px;
  border-radius: 18px;
  border: none;
  background: var(--green);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.25);
}

.save-btn:disabled {
  opacity: 0.6;
  pointer-events: none;
}

.save-btn.green {
  background: var(--green);
}
.save-btn.blue {
  background: var(--blue);
}
.save-btn.blue:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}
.save-btn.purple {
  background: var(--purple);
}
.save-btn.purple:hover {
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
}

/* Role modal styling */
.role-modal {
  max-width: 460px;
}

.role-opts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-opt {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  position: relative;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.role-opt input {
  position: absolute;
  opacity: 0;
}

.role-opt:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

/* Student (Blue) Option */
.role-opt.student:hover,
.role-opt.student.selected {
  border-color: var(--blue);
}
.role-opt.student.selected {
  background: var(--blue-dim);
}
.role-opt.student .role-check {
  color: var(--blue);
}

/* Faculty (Green) Option */
.role-opt.faculty:hover,
.role-opt.faculty.selected {
  border-color: var(--green);
}
.role-opt.faculty.selected {
  background: var(--green-dim);
}
.role-opt.faculty .role-check {
  color: var(--green);
}

/* Admin (Purple) Option */
.role-opt.admin:hover,
.role-opt.admin.selected {
  border-color: var(--purple);
}
.role-opt.admin.selected {
  background: var(--purple-dim);
}
.role-opt.admin .role-check {
  color: var(--purple);
}

.role-opt-ico {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.role-opt-ico.blue { background: var(--blue-dim); color: var(--blue); }
.role-opt-ico.green { background: var(--green-dim); color: var(--green); }
.role-opt-ico.purple { background: var(--purple-dim); color: var(--purple); }

.role-opt-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.role-opt-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.role-opt-desc {
  font-size: 0.74rem;
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1.3;
}

.role-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--red);
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 12px;
}

/* User creation modal form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-lbl {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
}

.form-input:focus {
  border-color: var(--green);
}

.success-box {
  text-align: center;
  padding: 10px 0;
}

.success-ico-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--green-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.success-ico {
  color: var(--green);
}

.success-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
}

.success-msg {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 6px;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.pw-box {
  background: var(--bg-secondary);
  border: 1px dashed var(--green);
  border-radius: 8px;
  padding: 12px;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.pw-lbl {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.pw-val {
  font-size: 1.2rem;
  font-weight: 750;
  font-family: monospace;
  color: var(--text-primary);
  letter-spacing: 0.05em;
}

/* Purge bulk action modal styling */
.purge-body {
  padding-bottom: 8px;
}

.bulk-confirm-msg {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.purge-warning {
  margin-top: 14px;
  font-size: 0.78rem;
  color: var(--red);
  background: rgba(239, 68, 68, 0.04);
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 3px solid var(--red);
  line-height: 1.4;
}

.modal-card.purge-modal {
  max-width: 440px;
}

.modal-head-icon.orange { background: var(--orange-dim); color: var(--orange); }

.purge-confirm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 36px;
  border-radius: 18px;
  border: none;
  background: var(--red);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.purge-confirm-btn:hover {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.purge-confirm-btn.delete {
  background: var(--orange);
}

.purge-confirm-btn.delete:hover {
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
}

/* Mini / Approve Modal */
.modal-card.mini {
  max-width: 440px;
}

.approve-q {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.approve-title-card {
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.approve-final-msg {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.save-btn.success {
  background: var(--green);
}

/* Edit Metadata form modal */
.modal-card.edit-modal {
  max-width: 680px;
}

.edit-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-field.full {
  grid-column: 1 / -1;
}

.input-field label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.input-field input, .input-field textarea, .input-field select {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
}

.input-field input:focus, .input-field textarea:focus, .input-field select:focus {
  border-color: var(--green);
}

.input-field textarea {
  font-family: inherit;
  resize: vertical;
}

.authors-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.author-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-index {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  width: 18px;
  text-align: center;
}

.remove-author-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--red);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-author-btn:hover {
  border-color: var(--red);
  background: var(--red-dim);
}

.add-author-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--green);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  width: 200px;
}

.add-author-btn:hover {
  border-color: var(--green);
  background: var(--green-dim);
}

/* Advanced details modal v2 */
.modal-card.details-modal-v2 {
  max-width: 680px;
}

.details-hero {
  padding: 28px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.details-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 90% 90%, var(--green-dim) 0%, transparent 60%);
  pointer-events: none;
}

.hero-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hero-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.3;
  margin-top: 6px;
  letter-spacing: -0.015em;
  position: relative;
  z-index: 2;
}

.hero-authors {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 10px;
  font-weight: 600;
  position: relative;
  z-index: 2;
}

.details-content-wrap {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-ribbon {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 16px;
}

.ribbon-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ribbon-item label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.info-grid-v2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.info-card {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dark .info-card {
  background: rgba(10, 10, 10, 0.1);
}

.ic-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 750;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.ic-body {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.kw-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.kw-pill-v2 {
  padding: 2px 6px;
  background: var(--green-dim);
  color: var(--green);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
}

.val-empty {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

/* Audit Trail Flowchart */
.audit-trail-v2 {
  border-top: 1px solid var(--border-color);
  padding-top: 20px;
}

.audit-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
}

.audit-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  border: 1px solid var(--border-color);
  padding: 16px;
  flex-wrap: wrap;
}
.dark .audit-grid {
  background: rgba(10, 10, 10, 0.1);
}

.audit-node {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 180px;
}

.node-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.node-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.node-card.success {
  border-color: var(--green);
  background: var(--green-dim);
}

.node-card.empty {
  border-style: dashed;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-placeholder {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.node-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.node-info {
  display: flex;
  flex-direction: column;
}

.node-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
}

.node-role {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
}
.node-role.admin { color: var(--purple); }
.node-role.faculty { color: var(--green); }
.node-role.student { color: var(--blue); }

.node-time {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.audit-sep {
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-pri-v2 {
  padding: 0 20px;
  height: 38px;
  border-radius: 20px;
  border: none;
  background: var(--green);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.2);
}

.btn-pri-v2:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 166, 81, 0.3);
}

/* Image Zoom modal styles */
.zoom-modal {
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-lg);
  animation: modal-enter 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.zoom-img {
  max-width: 100%;
  max-height: calc(85vh - 40px);
  object-fit: contain;
  border-radius: 6px;
}

.zoom-label {
  font-size: 0.88rem;
  font-weight: 750;
  color: var(--text-primary);
}

/* Spin animation for icons */
.spin {
  animation: rotation 1.2s linear infinite;
}

@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ── Responsive media breakpoints ── */
@media (max-width: 1024px) {
  .review-grid {
    grid-template-columns: 1fr;
  }
  .meta-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
    width: 260px;
  }
  
  .sidebar.mob-open {
    transform: translateX(0);
  }
  
  .sb-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 99;
  }
  
  .content {
    padding: 24px 16px;
  }
  
  .stats-row {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
  
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  
  .pie-container {
    flex-direction: column;
    gap: 20px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .filter-chips {
    justify-content: space-between;
  }
  
  .ref-split-wrap {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .ref-preview-pane, .ref-editor-pane {
    height: 240px;
  }
  
  .audit-grid {
    flex-direction: column;
    align-items: stretch;
  }
  
  .audit-sep {
    transform: rotate(90deg);
    margin: 8px 0;
  }
}
</style>

<style>
/* Global override for management view layout to prevent outer body scrolling */
body:has(.mgmt) {
  overflow: hidden !important;
}

body:has(.mgmt) .main-content {
  margin-top: 0 !important;
  padding-top: 64px !important;
  height: 100vh !important;
  overflow: hidden !important;
}
</style>\n