<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, type Component } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  BookOpen, Library, LogOut, Trash2, Edit3,
  Search, Plus, FolderOpen, Home, Loader2,
  ShieldAlert, FileText, Users, Calendar, ChevronRight,
  Settings, ArrowLeft, Save, Hash, Activity,
  UserCheck, Server, Database, Brain
} from 'lucide-vue-next'
import { api, type Paper, type UserResponse, type SystemHealth, type DashboardStats, type BorrowRecord, type Penalty } from '../services/api'

const router = useRouter()

// ── Sidebar ─────────────────────────────────────────────────────
type Section = 'dashboard' | 'repository' | 'borrowing' | 'penalties' | 'users' | 'system'
const activeSection = ref<Section>('dashboard')

const navItems: { id: Section; label: string; icon: Component; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Overview of repository' },
  { id: 'repository', label: 'Research Books', icon: Library, description: 'Browse & manage indexed works' },
  { id: 'borrowing', label: 'Borrow Records', icon: BookOpen, description: 'Track book loans & returns' },
  { id: 'penalties', label: 'Penalties', icon: ShieldAlert, description: 'Manage fines & violations' },
  { id: 'users', label: 'User Manager', icon: Users, description: 'Manage students & faculty' },
  { id: 'system', label: 'System Health', icon: Activity, description: 'Monitor engine performance' },
]

const activeLabel = computed(() => {
  return navItems.find(i => i.id === activeSection.value)?.label ?? 'Dashboard'
})

const setSection = (s: Section) => {
  activeSection.value = s
  router.push({ query: { ...router.currentRoute.value.query, tab: s } })
}

// Browser History Sync
onMounted(() => {
  const tab = router.currentRoute.value.query.tab as Section
  if (tab && navItems.map(i => i.id).includes(tab)) {
    activeSection.value = tab
  }
})
watch(() => router.currentRoute.value.query.tab, (newTab) => {
  if (newTab && navItems.map(i => i.id).includes(newTab as Section)) {
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

const logout = () => { api.logout(); router.push({ name: 'login' }) }

// ── System Health ──────────────────────────────────────────────
const healthData = ref<SystemHealth | null>(null)
const loadingHealth = ref(false)
let healthInterval: ReturnType<typeof setInterval> | null = null

const fetchHealth = async (showLoading = true) => {
  if (showLoading) loadingHealth.value = true
  try {
    healthData.value = await api.getSystemHealth()
  } catch (e) {
    console.error('Failed to fetch system health:', e)
  } finally {
    loadingHealth.value = false
  }
}

// ── Dashboard Stats ──────────────────────────────────────────────
const dashboardStats = ref<DashboardStats | null>(null)
const loadingStats = ref(false)

const fetchDashboardStats = async () => {
  loadingStats.value = true
  try {
    dashboardStats.value = await api.getDashboardStats()
  } catch (e) {
    console.error('Failed to fetch dashboard stats:', e)
  } finally {
    loadingStats.value = false
  }
}

// ── Borrowing ────────────────────────────────────────────────────
const borrowRecords = ref<BorrowRecord[]>([])
const loadingBorrows = ref(false)

const fetchBorrows = async () => {
  loadingBorrows.value = true
  try {
    borrowRecords.value = await api.listBorrowRecords()
  } catch (e) {
    console.error('Failed to fetch borrow records:', e)
  } finally {
    loadingBorrows.value = false
  }
}

const handleReturn = async (id: number) => {
  try {
    await api.returnBook(id)
    fetchBorrows()
    fetchDashboardStats()
  } catch {
    alert('Failed to process return')
  }
}

// ── Penalties ────────────────────────────────────────────────────
const penalties = ref<Penalty[]>([])
const loadingPenalties = ref(false)

const fetchPenalties = async () => {
  loadingPenalties.value = true
  try {
    penalties.value = await api.listPenalties()
  } catch (e) {
    console.error('Failed to fetch penalties:', e)
  } finally {
    loadingPenalties.value = false
  }
}

const handlePayPenalty = async (id: number) => {
  try {
    await api.payPenalty(id)
    fetchPenalties()
    fetchDashboardStats()
  } catch {
    alert('Failed to process payment')
  }
}

const startHealthPolling = () => {
  if (healthInterval) clearInterval(healthInterval)
  fetchHealth()
  healthInterval = setInterval(() => fetchHealth(false), 5000)
}

const stopHealthPolling = () => {
  if (healthInterval) {
    clearInterval(healthInterval)
    healthInterval = null
  }
}

onUnmounted(stopHealthPolling)

// ── Watchers ─────────────────────────────────────────────────────
watch(activeSection, (newSection) => {
  if (newSection === 'dashboard') {
    fetchDashboardStats()
  }
  if (newSection === 'repository') {
    fetchPapers()
  }
  if (newSection === 'borrowing') {
    fetchBorrows()
  }
  if (newSection === 'penalties') {
    fetchPenalties()
  }
  if (newSection === 'users' && users.value.length === 0) {
    fetchUsers()
  }
  if (newSection === 'system') {
    startHealthPolling()
  } else {
    stopHealthPolling()
  }
}, { immediate: true })
</script>

<template>
  <div class="dashboard">

    <!-- ══════════════ SIDEBAR ══════════════ -->
    <aside class="sidebar">
      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-icon">
          <BookOpen :size="16" color="#10b981" />
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
          :class="{ active: activeSection === item.id }" @click="setSection(item.id)">
          <component :is="item.icon" :size="16" class="sidebar-item-icon" />
          <div class="sidebar-item-text">
            <span class="sidebar-item-label">{{ item.label }}</span>
            <span class="sidebar-item-desc">{{ item.description }}</span>
          </div>
          <ChevronRight :size="13" class="sidebar-item-arrow" />
        </button>
      </nav>

      <!-- Sidebar footer -->
      <div class="sidebar-footer">
        <button class="sidebar-logout" @click="logout">
          <LogOut :size="14" />
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- ══════════════ MAIN ══════════════ -->
    <div class="dashboard-main">

      <!-- ── Topbar ────────────────────────────────────────────── -->
      <header class="topbar">
        <div class="topbar-left">
          <!-- Breadcrumb -->
          <span class="breadcrumb-root">Management</span>
          <ChevronRight :size="13" class="breadcrumb-sep" />
          <span class="breadcrumb-active">{{ activeLabel }}</span>
        </div>
        <!-- Nav links -->
        <nav class="topbar-nav">
          <RouterLink :to="{ name: 'home' }" class="topbar-link">
            <Home :size="14" /> Home
          </RouterLink>
          <RouterLink :to="{ name: 'results', query: { q: '' } }" class="topbar-link">
            <Search :size="14" /> Search
          </RouterLink>
          <button @click="router.push({ name: 'upload' })" class="topbar-cta">
            <Plus :size="14" /> Add Thesis Book
          </button>
        </nav>
      </header>

      <!-- ── Content ───────────────────────────────────────────── -->
      <div class="content">

        <!-- ══ SECTION: DASHBOARD ══════════════════════════════════ -->
        <template v-if="activeSection === 'dashboard'">
          <div class="content-header">
            <div>
              <h1 class="content-title">Management Dashboard</h1>
              <p class="content-sub">Real-time overview of repository and library activity.</p>
            </div>
          </div>

          <div class="stats-row" v-if="dashboardStats">
            <div class="stat-card">
              <div class="stat-icon green">
                <Library :size="16" />
              </div>
              <div><span class="stat-val">{{ dashboardStats.total_papers }}</span><span class="stat-lbl">Total
                  Books</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blue">
                <FileText :size="16" />
              </div>
              <div><span class="stat-val">{{ dashboardStats.total_theses }}</span><span class="stat-lbl">Theses</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon orange">
                <BookOpen :size="16" />
              </div>
              <div><span class="stat-val">{{ dashboardStats.active_borrows }}</span><span class="stat-lbl">Active
                  Borrows</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon red">
                <ShieldAlert :size="16" />
              </div>
              <div><span class="stat-val">{{ dashboardStats.total_penalties }}</span><span class="stat-lbl">Unpaid
                  Fines</span></div>
            </div>
          </div>
          <div v-else-if="loadingStats" class="loading-stats">
            <Loader2 class="animate-spin" /> Fetching stats...
          </div>
        </template>

        <!-- ══ SECTION: BORROW RECORDS ══════════════════════════════ -->
        <template v-else-if="activeSection === 'borrowing'">
          <div class="content-header">
            <div>
              <h1 class="content-title">Borrow Records</h1>
              <p class="content-sub">Monitor book loans and manage returns.</p>
            </div>
          </div>

          <div class="table-card">
            <div class="table-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Loan ID</th>
                    <th>Book Title</th>
                    <th>Borrow Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th class="th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingBorrows">
                    <tr v-for="i in 3" :key="'b-sk' + i" class="skel-row">
                      <td colspan="6">
                        <div class="skel skel-t1"></div>
                      </td>
                    </tr>
                  </template>
                  <tr v-else v-for="record in borrowRecords" :key="record.id" class="tbl-row">
                    <td>#{{ record.id }}</td>
                    <td>{{ record.paper_id }}</td> <!-- Replace with title if available -->
                    <td>{{ record.borrow_date }}</td>
                    <td>{{ record.due_date }}</td>
                    <td>
                      <span class="status-badge" :class="record.status.toLowerCase()">
                        {{ record.status }}
                      </span>
                    </td>
                    <td class="td-right">
                      <button v-if="record.status === 'Borrowed' || record.status === 'Overdue'"
                        @click="handleReturn(record.id)" class="action-btn-mini">
                        Mark Returned
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!loadingBorrows && borrowRecords.length === 0">
                    <td colspan="6" class="empty-td">No active borrow records found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- ══ SECTION: PENALTIES ═══════════════════════════════════ -->
        <template v-else-if="activeSection === 'penalties'">
          <div class="content-header">
            <div>
              <h1 class="content-title">Penalty Management</h1>
              <p class="content-sub">Manage fines for overdue or damaged books.</p>
            </div>
          </div>

          <div class="table-card">
            <div class="table-scroll">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Penalty ID</th>
                    <th>Reason</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th class="th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingPenalties">
                    <tr v-for="i in 3" :key="'p-sk' + i" class="skel-row">
                      <td colspan="6">
                        <div class="skel skel-t1"></div>
                      </td>
                    </tr>
                  </template>
                  <tr v-else v-for="penalty in penalties" :key="penalty.id" class="tbl-row">
                    <td>#{{ penalty.id }}</td>
                    <td>{{ penalty.reason }}</td>
                    <td>₱{{ penalty.amount.toFixed(2) }}</td>
                    <td>{{ penalty.created_at }}</td>
                    <td>
                      <span class="status-badge" :class="penalty.status.toLowerCase()">
                        {{ penalty.status }}
                      </span>
                    </td>
                    <td class="td-right">
                      <button v-if="penalty.status === 'Unpaid'" @click="handlePayPenalty(penalty.id)"
                        class="action-btn-mini">
                        Pay Penalty
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!loadingPenalties && penalties.length === 0">
                    <td colspan="6" class="empty-td">No penalty records found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
        <template v-if="activeSection === 'repository'">
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
                        <button v-if="!searchQuery && activeFilter === 'all'" @click="router.push({ name: 'upload' })"
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

        <!-- ══ SECTION: SYSTEM HEALTH ════════════════════════════════ -->
        <template v-else-if="activeSection === 'system'">
          <div class="content-header">
            <div>
              <h1 class="content-title">System Health</h1>
              <p class="content-sub">Monitor the status of LUMIA AI engines and databases.</p>
            </div>
          </div>

          <div class="system-grid">
            <!-- BERT NLP -->
            <div class="stat-card health-node">
              <div class="node-status" :data-status="healthData?.bert?.status || 'offline'"></div>
              <div class="stat-icon green">
                <Brain :size="18" />
              </div>
              <div class="node-info">
                <span class="node-name">BERT NLP Engine</span>
                <span class="node-meta">Model: {{ healthData?.bert?.details?.model ||
                  'multi-qa-MiniLM-L6-cos-v1' }}</span>
                <div v-if="healthData?.bert?.details?.latency_ms" class="health-latency-pill">
                  <Activity :size="10" />
                  <span>{{ healthData.bert.details.latency_ms }}ms</span>
                </div>
              </div>
              <span class="health-badge" :class="healthData?.bert?.status === 'online' ? '' : 'error'">
                {{ healthData?.bert?.details?.message || (loadingHealth ? 'Checking...' : 'Offline') }}
              </span>
            </div>

            <!-- Qdrant -->
            <div class="stat-card health-node">
              <div class="node-status" :data-status="healthData?.qdrant?.status || 'offline'"></div>
              <div class="stat-icon blue">
                <Database :size="18" />
              </div>
              <div class="node-info">
                <span class="node-name">Qdrant Vector DB</span>
                <span class="node-meta">Collection: {{ healthData?.qdrant?.details?.collection || 'Local Storage Mode'
                  }}</span>
                <span v-if="healthData?.qdrant?.details?.points_count !== undefined" class="node-meta"
                  style="font-size: 0.6rem;">
                  Entries: {{ healthData.qdrant.details.points_count }} indexed points
                </span>
              </div>
              <span class="health-badge" :class="healthData?.qdrant?.status === 'online' ? '' : 'error'">
                {{ healthData?.qdrant?.details?.message || (loadingHealth ? 'Checking...' : 'Disconnected') }}
              </span>
            </div>

            <!-- OCR -->
            <div class="stat-card health-node">
              <div class="node-status" :data-status="healthData?.ocr?.status || 'offline'"></div>
              <div class="stat-icon purple">
                <Server :size="18" />
              </div>
              <div class="node-info">
                <span class="node-name">OCR Service</span>
                <span class="node-meta">{{ healthData?.ocr?.details?.engine || 'Tesseract + Poppler' }}</span>
              </div>
              <span class="health-badge" :class="healthData?.ocr?.status === 'online' ? '' : 'error'">
                {{ healthData?.ocr?.details?.message || (loadingHealth ? 'Checking...' : 'Missing') }}
              </span>
            </div>
          </div>

          <div class="table-card placeholder-card" style="margin-top: 1rem;">
            <div class="empty">
              <Activity :size="44" color="#d1d5db" />
              <h3>Real-time Monitoring</h3>
              <p>Performance metrics and engine latency logs will appear here once the connection is established.</p>
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
          <ShieldAlert :size="13" /> Only Faculty and Administrators can upload or modify papers.
        </p>

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
  min-height: 100vh;
  background: #f5f7fa;
  font-family: 'Inter', -apple-system, sans-serif;
}

/* ══════════════════════════════════════════════════════════════
   Sidebar
══════════════════════════════════════════════════════════════ */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #00a651;
  display: flex;
  flex-direction: column;
  padding: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

/* Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 1.25rem 1.1rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.brand-icon {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Section label */
.sidebar-section-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255, 255, 255, 0.55);
  padding: 1.1rem 1.1rem 0.4rem;
  margin: 0;
}

/* Nav items */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0.6rem;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.15s;
  color: rgba(255, 255, 255, 0.75);
}

.sidebar-item:hover {
  background: rgba(0, 0, 0, 0.15);
  color: #fff;
}

.sidebar-item.active {
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}

.sidebar-item.active .sidebar-item-icon {
  color: #fff;
}

.sidebar-item-icon {
  flex-shrink: 0;
}

.sidebar-item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-item-label {
  font-size: 0.82rem;
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
  top: 0;
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
   Responsive — Tablet ≤768px
══════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .sidebar {
    display: none;
    /* collapsed on tablet — use topbar-only nav */
  }

  .content {
    padding: 1.25rem;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
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
</style>
