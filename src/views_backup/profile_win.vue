<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Loader2, ArrowUpRight,
  User, KeyRound,
  ShieldCheck, BookMarked, FileUp, AlertTriangle, Clock, Trash2
} from 'lucide-vue-next'
import { api, type Paper } from '../services/api'

interface UserDetails {
  id: string
  username: string
  role: string
  created_at?: string
}

// ── State ─────────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'credentials' | 'cited' | 'uploads'
const activeSection = ref<Section>('dashboard')

const user = ref<UserDetails | null>(null)
const citations = ref<Paper[]>([])
const uploads = ref<Paper[]>([])
const loading = ref(true)
const citLoading = ref(false)
const uploadLoading = ref(false)
const cancelLoading = ref<string | null>(null)
const showCancelModal = ref(false)
const paperToCancel = ref<Paper | null>(null)

// ── Credentials form ──────────────────────────────────────────────────────────
const credForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const credSaving = ref(false)
const credMsg = ref<{ type: 'ok' | 'err'; text: string } | null>(null)

const passwordStrength = computed(() => {
  const p = credForm.value.newPassword
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})
const strengthLabel = computed(() => ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength.value])
const strengthColor = computed(() => ['', '#ef4444', '#f59e0b', '#3b82f6', '#00a651'][passwordStrength.value])

const handleCredentialUpdate = async () => {
  credMsg.value = null
  if (credForm.value.newPassword !== credForm.value.confirmPassword) {
    credMsg.value = { type: 'err', text: 'New passwords do not match.' }
    return
  }
  credSaving.value = true
  try {
    await api.updatePassword({
      current_password: credForm.value.currentPassword,
      new_password: credForm.value.newPassword,
    })
    credMsg.value = { type: 'ok', text: 'Password updated successfully.' }
    credForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update password.'
    credMsg.value = { type: 'err', text: msg }
  } finally {
    credSaving.value = false
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────
const fetchData = async () => {
  loading.value = true
  try {
    user.value = await api.getUserMe()
    citLoading.value = true
    uploadLoading.value = true

    const [cities, myUploads] = await Promise.all([
      api.getUserCitations(),
      api.getUserUploads()
    ])

    citations.value = cities
    uploads.value = myUploads
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
    citLoading.value = false
    uploadLoading.value = false
  }
}

const canCancel = (paper: Paper) => {
  if (paper.status !== 'Pending') return false
  if (!paper.created_at) return true
  const created = new Date(paper.created_at)
  const now = new Date()
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24)
  return diffDays >= 2
}

const confirmCancel = (paper: Paper) => {
  paperToCancel.value = paper
  showCancelModal.value = true
}

const handleCancelRequest = async () => {
  if (!paperToCancel.value) return
  cancelLoading.value = paperToCancel.value.id
  try {
    await api.deletePaper(paperToCancel.value.id)
    uploads.value = uploads.value.filter(p => p.id !== paperToCancel.value?.id)
    showCancelModal.value = false
    paperToCancel.value = null
  } catch (e) {
    console.error(e)
    alert('Failed to cancel request. Please try again.')
  } finally {
    cancelLoading.value = null
  }
}

const setSection = (s: Section) => { activeSection.value = s }

const roleColor = computed(() => {
  const r = user.value?.role
  if (r === 'Admin') return { bg: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.2)' }
  if (r === 'Faculty') return { bg: 'rgba(0, 166, 81, 0.1)', color: '#00a651', border: 'rgba(0, 166, 81, 0.2)' }
  return { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.2)' }
})

const avatarInitials = computed(() => {
  const u = user.value?.username ?? ''
  return u.slice(0, 2).toUpperCase()
})

const joinedDate = computed(() => {
  if (!user.value?.created_at) return 'January 2024' // Default for legacy users
  const date = new Date(user.value.created_at)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

onMounted(fetchData)
</script>

<template>
  <div class="profile-page">
    <!-- ── Loading ─────────────────────────────────────────────── -->
    <div v-if="loading" class="full-loader">
      <Loader2 :size="24" class="spin" />
      <span>Loading your researcher profile…</span>
    </div>

    <!-- ── Main Layout ─────────────────────────────────────────── -->
    <div v-else-if="user" class="profile-container">

      <!-- ── HERO SECTION ─────────────────────────────────────── -->
      <header class="profile-hero">
        <div class="hero-overlay"></div>
        <div class="hero-inner">
          <div class="hero-avatar-wrap">
            <div class="hero-avatar">{{ avatarInitials }}</div>
            <div class="hero-status-dot"></div>
          </div>

          <div class="hero-body">
            <div class="hero-top-row">
              <h1 class="hero-username">{{ user.username }}</h1>
              <span class="hero-role-tag"
                :style="{ background: roleColor.bg, color: roleColor.color, borderColor: roleColor.border }">
                <ShieldCheck :size="12" />
                {{ user.role }}
              </span>
            </div>
            <div class="hero-meta">
              <span class="hero-id">Researcher ID: <span class="mono">#{{ user.id }}</span></span>
              <span class="hero-sep">·</span>
              <span class="hero-stat"><strong>{{ citations.length }}</strong> Citations</span>
              <span class="hero-sep">·</span>
              <span class="hero-stat"><strong>{{ uploads.length }}</strong> Uploads</span>
            </div>
          </div>
        </div>
      </header>

      <!-- ── HORIZONTAL NAV ───────────────────────────────────── -->
      <nav class="profile-nav-bar">
        <div class="nav-inner">
          <button v-for="tab in [
            { id: 'dashboard', icon: User, label: 'Overview' },
            { id: 'cited', icon: BookMarked, label: 'Studies I Cited', count: citations.length },
            { id: 'uploads', icon: FileUp, label: 'My Uploads', count: uploads.length },
            { id: 'credentials', icon: KeyRound, label: 'Security' }
          ]" :key="tab.id" class="nav-tab" :class="{ active: activeSection === tab.id }"
            @click="setSection(tab.id as Section)">
            <component :is="tab.icon" :size="16" class="nav-tab-icon" />
            <span class="nav-tab-label">{{ tab.label }}</span>
            <span v-if="tab.count !== undefined" class="nav-tab-count">{{ tab.count }}</span>
          </button>
        </div>
      </nav>

      <!-- ── CONTENT AREA ─────────────────────────────────────── -->
      <main class="profile-main-content">

        <!-- ══ Dashboard ════════════════════════════════════════ -->
        <template v-if="activeSection === 'dashboard'">
          <div class="content-grid">
            <!-- Stats -->
            <section class="dashboard-stats">
              <div class="stat-card">
                <div class="stat-icon-box green">
                  <BookMarked :size="20" />
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total Citations</span>
                  <span class="stat-value">{{ citations.length }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon-box blue">
                  <FileUp :size="20" />
                </div>
                <div class="stat-info">
                  <span class="stat-label">Indexed Papers</span>
                  <span class="stat-value">{{ uploads.length }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon-box purple">
                  <Clock :size="20" />
                </div>
                <div class="stat-info">
                  <span class="stat-label">Pending Reviews</span>
                  <span class="stat-value">{{uploads.filter(p => p.status === 'Pending').length}}</span>
                </div>
              </div>
            </section>

            <!-- Main Panel -->
            <div class="dashboard-main-panel">
              <div class="panel-card">
                <div class="panel-card-header">
                  <h3>Account Information</h3>
                </div>
                <div class="panel-card-body">
                  <div class="info-grid">
                    <div class="info-item">
                      <label>Username</label>
                      <p>{{ user.username }}</p>
                    </div>
                    <div class="info-item">
                      <label>Assigned Role</label>
                      <p>{{ user.role }}</p>
                    </div>
                    <div class="info-item">
                      <label>Account ID</label>
                      <p class="mono">#{{ user.id }}</p>
                    </div>
                    <div class="info-item">
                      <label>Registration Date</label>
                      <p>Member since {{ joinedDate }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Recent activity -->
              <div class="panel-card mt-6">
                <div class="panel-card-header">
                  <h3>Recently Cited</h3>
                  <button class="text-link" @click="setSection('cited')">View all →</button>
                </div>
                <div class="panel-card-body p-0">
                  <div v-if="citations.length > 0" class="activity-list">
                    <RouterLink v-for="paper in citations.slice(0, 3)" :key="paper.id"
                      :to="{ name: 'detail', params: { id: paper.id } }" class="activity-item">
                      <div class="activity-icon">
                        <BookMarked :size="14" />
                      </div>
                      <div class="activity-text">
                        <span class="activity-title">{{ paper.title }}</span>
                        <span class="activity-meta">{{ paper.author }}</span>
                      </div>
                      <ArrowUpRight :size="14" class="activity-arrow" />
                    </RouterLink>
                  </div>
                  <div v-else class="empty-mini">
                    <p>No recent activity found.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ══ Credentials ═══════════════════════════════════════ -->
        <template v-else-if="activeSection === 'credentials'">
          <div class="centered-content">
            <div class="security-card">
              <div class="card-title-group">
                <KeyRound :size="24" class="title-icon" />
                <div>
                  <h3>Update Credentials</h3>
                  <p>Keep your account secure by using a strong password.</p>
                </div>
              </div>

              <div v-if="credMsg" class="cred-alert" :class="credMsg.type">
                {{ credMsg.text }}
              </div>

              <div class="form-group">
                <label>Current Password</label>
                <input v-model="credForm.currentPassword" type="password" placeholder="••••••••"
                  autocomplete="current-password" />
              </div>

              <div class="form-group">
                <label>New Password</label>
                <input v-model="credForm.newPassword" type="password" placeholder="At least 8 characters"
                  autocomplete="new-password" />

                <div v-if="credForm.newPassword" class="strength-indicator">
                  <div class="strength-labels">
                    <span>Password Strength:</span>
                    <strong :style="{ color: strengthColor }">{{ strengthLabel }}</strong>
                  </div>
                  <div class="strength-meter">
                    <div v-for="i in 4" :key="i" class="strength-segment"
                      :style="{ background: i <= passwordStrength ? strengthColor : 'var(--border-color)' }" />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Confirm New Password</label>
                <input v-model="credForm.confirmPassword" type="password" placeholder="Repeat new password"
                  autocomplete="new-password" />
              </div>

              <button class="primary-btn full-width" @click="handleCredentialUpdate" :disabled="credSaving">
                <Loader2 v-if="credSaving" :size="16" class="spin" />
                <span>{{ credSaving ? 'Updating...' : 'Update Password' }}</span>
              </button>
            </div>
          </div>
        </template>

        <!-- ══ Cited Studies ══════════════════════════════════════ -->
        <template v-else-if="activeSection === 'cited'">
          <div class="section-container">
            <div v-if="citLoading" class="section-loader">
              <Loader2 :size="20" class="spin" /> Loading your citations...
            </div>

            <div v-else-if="citations.length > 0" class="studies-list">
              <RouterLink v-for="(paper, idx) in citations" :key="paper.id"
                :to="{ name: 'detail', params: { id: paper.id } }" class="study-card">
                <div class="study-index">{{ String(idx + 1).padStart(2, '0') }}</div>
                <div class="study-content">
                  <h4 class="study-title">{{ paper.title }}</h4>
                  <div class="study-meta">
                    <span class="study-author">{{ paper.author }}</span>
                    <span class="meta-dot"></span>
                    <span class="study-year">{{ paper.year }}</span>
                  </div>
                  <div class="study-tags">
                    <span v-if="paper.department && paper.department !== 'N/A'" class="tag">{{ paper.department
                    }}</span>
                    <span v-if="paper.project_type" class="tag type-tag">{{ paper.project_type }}</span>
                  </div>
                </div>
                <div class="study-action">
                  <ArrowUpRight :size="16" />
                </div>
              </RouterLink>
            </div>

            <div v-else class="empty-state-full">
              <BookMarked :size="48" class="empty-icon" />
              <h3>No citations yet</h3>
              <p>Research papers you cite will appear here. Start exploring the repository to build your list.</p>
              <RouterLink :to="{ name: 'home' }" class="empty-cta-btn">Browse Repository</RouterLink>
            </div>
          </div>
        </template>

        <!-- ══ My Uploads ════════════════════════════════════════ -->
        <template v-else-if="activeSection === 'uploads'">
          <div class="section-container">
            <div v-if="uploadLoading" class="section-loader">
              <Loader2 :size="20" class="spin" /> Loading your uploads...
            </div>

            <div v-else-if="uploads.length > 0" class="uploads-grid">
              <div v-for="paper in uploads" :key="paper.id" class="upload-item-card">
                <div class="upload-main">
                  <h4 class="upload-title">{{ paper.title }}</h4>
                  <p class="upload-author">{{ paper.author }} · {{ paper.year }}</p>

                  <div class="upload-status-row">
                    <div class="status-pill" :class="paper.status?.toLowerCase()">
                      <Clock v-if="paper.status === 'Pending'" :size="12" />
                      <ShieldCheck v-else :size="12" />
                      {{ paper.status }}
                    </div>
                    <span v-if="paper.status === 'Pending'" class="status-text">
                      {{ canCancel(paper) ? 'Request pending > 2 days. Eligible for cancellation.' :
                        'Awaiting Faculty verification.' }}
                    </span>
                  </div>
                </div>

                <div class="upload-actions">
                  <button v-if="paper.status === 'Pending' && canCancel(paper)" class="btn-outline-danger"
                    @click="confirmCancel(paper)" :disabled="cancelLoading === paper.id">
                    <Trash2 v-if="cancelLoading !== paper.id" :size="14" />
                    <Loader2 v-else :size="14" class="spin" />
                    Cancel Indexing
                  </button>
                  <RouterLink v-if="paper.status === 'Approved'" :to="{ name: 'detail', params: { id: paper.id } }"
                    class="btn-primary-sm">
                    View Paper
                    <ArrowUpRight :size="14" />
                  </RouterLink>
                  <div v-if="paper.status === 'Pending' && !canCancel(paper)" class="action-lock">
                    <Clock :size="12" /> Cancellation locked
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="empty-state-full">
              <FileUp :size="48" class="empty-icon" />
              <h3>No papers indexed</h3>
              <p>Once you upload and index a paper, it will appear here for tracking and management.</p>
              <RouterLink :to="{ name: 'upload' }" class="empty-cta-btn">Index Your First Paper</RouterLink>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>

  <!-- Cancel Confirmation Modal -->
  <Teleport to="body">
    <div v-if="showCancelModal" class="zoom-overlay" @click="showCancelModal = false">
      <div class="zoom-modal cancel-modal" @click.stop>
        <div class="cancel-icon">
          <AlertTriangle :size="48" color="var(--red-dk)" />
        </div>
        <h2 class="cancel-title">Cancel Indexing Request?</h2>
        <p class="cancel-desc">
          Are you sure you want to cancel the indexing request for:
          <strong>{{ paperToCancel?.title }}</strong>?
        </p>
        <p class="cancel-hint">This action cannot be undone.</p>
        <div class="cancel-footer">
          <button class="modal-btn-secondary" @click="showCancelModal = false">Keep Request</button>
          <button class="modal-btn-danger" @click="handleCancelRequest" :disabled="!!cancelLoading">
            <Loader2 v-if="cancelLoading" :size="14" class="spin" />
            {{ cancelLoading ? 'Canceling...' : 'Confirm Cancellation' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Tokens & Base ────────────────────────────────────────────── */
.profile-page {
  --green: var(--accent-primary);
  --green-dk: var(--accent-primary);
  --green-dim: rgba(0, 166, 81, 0.08);
  --ink: var(--text-primary);
  --ink-2: var(--text-secondary);
  --ink-3: var(--text-tertiary);
  --rule: var(--border-color);
  --surface: var(--bg-primary);
  --paper: var(--bg-secondary);

  min-height: 100vh;
  background: var(--surface);
  padding-bottom: 5rem;
  color: var(--ink);
  font-family: 'Source Sans 3', sans-serif;
}

.full-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 80vh;
  color: var(--ink-3);
  font-size: 0.95rem;
}

.profile-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* ── HERO SECTION ─────────────────────────────────────────────── */
.profile-hero {
  position: relative;
  padding: 120px 2rem 4rem;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(at 0% 0%, rgba(0, 166, 81, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(37, 99, 235, 0.05) 0px, transparent 50%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 2.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

.hero-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.hero-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-family: 'Lora', serif;
  font-size: 2.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px -5px rgba(0, 166, 81, 0.3);
  border: 4px solid var(--paper);
}

.hero-status-dot {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: #10b981;
  border: 4px solid var(--paper);
  border-radius: 50%;
}

.hero-body {
  flex: 1;
}

.hero-top-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.hero-username {
  font-family: 'Lora', serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.hero-role-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1px solid;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: var(--ink-2);
}

.hero-sep {
  opacity: 0.3;
}

.hero-stat strong {
  color: var(--ink);
}

.hero-logout-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--surface);
  border: 1px solid var(--rule);
  color: var(--ink-2);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.hero-logout-btn:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

/* ── NAVIGATION BAR ───────────────────────────────────────────── */
.profile-nav-bar {
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 72px;
  z-index: 100;
  padding: 0 2rem;
}

.nav-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  gap: 2rem;
}

.nav-tab {
  background: none;
  border: none;
  padding: 1.25rem 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
  transition: color 0.2s;
}

.nav-tab:hover {
  color: var(--ink);
}

.nav-tab.active {
  color: var(--green-dk);
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--green);
}

.nav-tab-count {
  font-size: 0.7rem;
  background: var(--green-dim);
  color: var(--green-dk);
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  font-weight: 700;
}

/* ── MAIN CONTENT AREA ────────────────────────────────────────── */
.profile-main-content {
  padding: 3rem 2rem;
  max-width: 1040px;
  margin: 0 auto;
}

/* ══ DASHBOARD ══════════════════════════════════════════════════ */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.stat-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-box.green {
  background: #ecfdf5;
  color: #059669;
}

.stat-icon-box.blue {
  background: #eff6ff;
  color: #2563eb;
}

.stat-icon-box.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1;
}

.panel-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  overflow: hidden;
}

.panel-card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-card-header h3 {
  font-family: 'Lora', serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.panel-card-body {
  padding: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.info-item label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 0.4rem;
}

.info-item p {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--rule);
  text-decoration: none;
  transition: background 0.2s;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background: var(--surface);
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--green-dim);
  color: var(--green-dk);
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-text {
  flex: 1;
  min-width: 0;
}

.activity-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-meta {
  font-size: 0.75rem;
  color: var(--ink-3);
}

.activity-arrow {
  color: var(--rule);
  opacity: 0;
  transition: all 0.2s;
}

.activity-item:hover .activity-arrow {
  opacity: 1;
  transform: translate(2px, -2px);
}

/* ══ SECURITY ═══════════════════════════════════════════════════ */
.centered-content {
  max-width: 500px;
  margin: 0 auto;
}

.security-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 2.5rem;
}

.card-title-group {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.card-title-group h3 {
  font-size: 1.25rem;
  margin: 0 0 0.25rem;
}

.card-title-group p {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1.5px solid var(--rule);
  border-radius: 8px;
  background: var(--surface);
  font-size: 0.95rem;
  outline: none;
}

.form-group input:focus {
  border-color: var(--green);
}

.primary-btn {
  background: var(--green);
  color: #fff;
  border: none;
  padding: 0.85rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.full-width {
  width: 100%;
}

/* ══ STUDIES & UPLOADS ══════════════════════════════════════════ */
.studies-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.study-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 1.25rem 1.75rem;
  text-decoration: none;
  transition: all 0.2s;
}

.study-card:hover {
  border-color: var(--green);
  box-shadow: 0 4px 20px rgba(0, 166, 81, 0.06);
}

.study-index {
  font-family: 'Lora', serif;
  font-size: 1.2rem;
  color: var(--rule);
  font-weight: 700;
}

.study-content {
  flex: 1;
}

.study-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.25rem;
}

.study-meta {
  font-size: 0.85rem;
  color: var(--ink-3);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-dot {
  width: 3px;
  height: 3px;
  background: var(--rule);
  border-radius: 50%;
}

.study-tags {
  display: flex;
  gap: 0.5rem;
}

.tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-3);
  border: 1px solid var(--rule);
}

.type-tag {
  background: var(--green-dim);
  color: var(--green-dk);
  border-color: var(--green);
}

.uploads-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-item-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.upload-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.upload-author {
  font-size: 0.85rem;
  color: var(--ink-3);
  margin: 0 0 1rem;
}

.upload-status-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

.status-pill.pending {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.status-pill.approved {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.status-text {
  font-size: 0.75rem;
  color: var(--ink-3);
  font-style: italic;
}

.btn-outline-danger {
  background: none;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-outline-danger:hover {
  background: #fef2f2;
}

.btn-primary-sm {
  background: var(--green);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ── Generic Utils ────────────────────────────────────────────── */
.mono {
  font-family: 'JetBrains Mono', monospace;
}

.mt-6 {
  margin-top: 1.5rem;
}

.p-0 {
  padding: 0;
}

.text-link {
  background: none;
  border: none;
  color: var(--green-dk);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0);
  }

  to {
    transform: rotate(360deg);
  }
}

.empty-state-full {
  padding: 5rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  opacity: 0.2;
  margin-bottom: 0.5rem;
}

.empty-state-full h3 {
  font-family: 'Lora', serif;
  font-size: 1.5rem;
  margin: 0;
}

.empty-state-full p {
  font-size: 0.95rem;
  color: var(--ink-3);
  max-width: 400px;
  margin: 0;
}

.empty-cta-btn {
  margin-top: 1rem;
  background: var(--green);
  color: #fff;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
}

/* ── Responsive ───────────────────────────────────────────────── */
@media (max-width: 768px) {
  .hero-inner {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }

  .hero-top-row {
    justify-content: center;
    flex-direction: column;
  }

  .hero-meta {
    flex-direction: column;
    gap: 0.4rem;
  }

  .hero-sep {
    display: none;
  }

  .nav-inner {
    gap: 1rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }

  .nav-tab {
    white-space: nowrap;
  }

  .dashboard-stats {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .upload-item-card {
    flex-direction: column;
    gap: 1.5rem;
  }

  .upload-actions {
    width: 100%;
  }

  .upload-actions button,
  .upload-actions a {
    width: 100%;
    justify-content: center;
  }
}
</style>
