<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Loader2, ArrowUpRight,
  User, KeyRound,
  ShieldCheck, BookMarked, FileUp, AlertTriangle, Clock, Trash2, Camera
} from 'lucide-vue-next'
import { api, type Paper, BASE_URL } from '../services/api'
import { useToastStore } from '../stores/toast'

interface UserDetails {
  id: string
  username: string
  role: string
  created_at?: string
  avatar_url?: string
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

const toastStore = useToastStore()
const fileInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)

const avatarSrc = computed(() => {
  if (!user.value?.avatar_url) return ''
  const base = BASE_URL.replace('/api/v1', '')
  return `${base}${user.value.avatar_url}`
})

const onAvatarFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toastStore.addToast({
      title: 'Invalid File Type',
      description: 'Please upload a JPEG, PNG, GIF, or WEBP image.',
      type: 'error'
    })
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toastStore.addToast({
      title: 'File Too Large',
      description: 'Maximum image size is 5MB.',
      type: 'error'
    })
    return
  }

  avatarUploading.value = true
  try {
    const updatedUser = await api.uploadAvatar(file)
    if (user.value) {
      user.value.avatar_url = updatedUser.avatar_url
    }
    toastStore.addToast({
      title: 'Success',
      description: 'Profile picture updated successfully.',
      type: 'success'
    })
    window.dispatchEvent(new CustomEvent('avatar-update'))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to upload image.'
    toastStore.addToast({
      title: 'Upload Failed',
      description: msg,
      type: 'error'
    })
  } finally {
    avatarUploading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

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
  if (r === 'Admin') return { bg: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', border: 'rgba(124, 58, 237, 0.3)' }
  if (r === 'Faculty') return { bg: 'rgba(0, 166, 81, 0.1)', color: '#34d399', border: 'rgba(0, 166, 81, 0.3)' }
  return { bg: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa', border: 'rgba(37, 99, 235, 0.3)' }
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
        <div class="hero-bg-shapes">
          <div class="floating-shape shape-1"></div>
          <div class="floating-shape shape-2"></div>
          <div class="floating-shape shape-3"></div>
        </div>
        
        <div class="hero-inner">
          <div class="hero-avatar-wrap">
            <div class="hero-avatar">
              <img v-if="user.avatar_url" :src="avatarSrc" class="avatar-img-element" alt="User Avatar" />
              <span v-else>{{ avatarInitials }}</span>
              
              <label class="avatar-upload-overlay" title="Upload profile picture">
                <Camera :size="22" class="camera-icon" />
                <input type="file" ref="fileInput" @change="onAvatarFileSelected" accept="image/*" class="avatar-file-input" />
              </label>
            </div>
            <div v-if="avatarUploading" class="avatar-upload-spinner">
              <Loader2 :size="20" class="spin" />
            </div>
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
                  <button class="text-link" @click="setSection('cited')">View all &rarr;</button>
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
                <KeyRound :size="24" class="title-icon animate-pulse-slow" />
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
                :to="{ name: 'detail', params: { id: paper.id } }" class="study-card animate-fade-in"
                :style="{ animationDelay: `${idx * 0.05}s` }">
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
              <BookMarked :size="48" class="empty-icon animate-float" />
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
              <div v-for="(paper, idx) in uploads" :key="paper.id" class="upload-item-card animate-fade-in"
                :style="{ animationDelay: `${idx * 0.05}s` }">
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
              <FileUp :size="48" class="empty-icon animate-float" />
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
          <AlertTriangle :size="48" color="#ef4444" />
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
  --green: var(--accent-primary, #00a651);
  --green-dk: var(--accent-primary, #00a651);
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
  position: relative;
  overflow: hidden;
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
  position: relative;
  z-index: 10;
}

/* ── HERO SECTION ─────────────────────────────────────────────── */
.profile-hero {
  position: relative;
  padding: 120px 2rem 4rem;
  background: linear-gradient(to bottom, rgba(0, 166, 81, 0.03) 0%, transparent 100%);
  border-bottom: 1px solid var(--rule);
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(at 0% 0%, rgba(0, 166, 81, 0.04) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(37, 99, 235, 0.04) 0px, transparent 50%);
  pointer-events: none;
}

/* Background Glowing Shapes */
.hero-bg-shapes {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.floating-shape {
  position: absolute;
  background: linear-gradient(135deg, var(--green) 0%, transparent 80%);
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.04;
  pointer-events: none;
}

.dark .floating-shape {
  opacity: 0.08;
}

.shape-1 {
  width: 400px;
  height: 400px;
  top: -10%;
  left: 5%;
  animation: float-shape-1 12s ease-in-out infinite alternate;
}
.shape-2 {
  width: 350px;
  height: 350px;
  bottom: -10%;
  right: 5%;
  animation: float-shape-2 15s ease-in-out infinite alternate;
}
.shape-3 {
  width: 250px;
  height: 250px;
  top: 30%;
  left: 45%;
  animation: float-shape-3 10s ease-in-out infinite alternate;
}

@keyframes float-shape-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(20px, -20px) scale(1.05); }
}

@keyframes float-shape-2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-15px, 15px) scale(0.95); }
}

@keyframes float-shape-3 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(15px, 10px) scale(1.06); }
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
  position: relative;
  overflow: hidden;
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
  box-shadow: 0 10px 30px -5px rgba(0, 166, 81, 0.4);
  border: 4px solid var(--surface);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.avatar-img-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.25s ease-in-out;
  backdrop-filter: blur(2px);
}

.hero-avatar:hover .avatar-upload-overlay {
  opacity: 1;
}

.avatar-file-input {
  display: none;
}

.avatar-upload-spinner {
  position: absolute;
  inset: 0;
  background: rgba(15, 15, 15, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.hero-avatar-wrap:hover .hero-avatar {
  transform: scale(1.03);
  box-shadow: 0 12px 35px -5px rgba(0, 166, 81, 0.5);
}

.hero-status-dot {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: #10b981;
  border: 4px solid var(--surface);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.9); opacity: 0.8; }
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
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.dark .hero-username {
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
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
  backdrop-filter: blur(10px);
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

/* ── NAVIGATION BAR ───────────────────────────────────────────── */
.profile-nav-bar {
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0 2rem;
  transition: all 0.3s ease;
}

.dark .profile-nav-bar {
  background: rgba(15, 15, 15, 0.75);
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
  transition: color 0.2s, transform 0.2s;
}

.nav-tab:hover {
  color: var(--ink);
}

.nav-tab.active {
  color: var(--green-dk);
}

.nav-tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--green);
  transform: scaleX(0);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-tab.active::after {
  transform: scaleX(1);
}

.nav-tab-count {
  font-size: 0.7rem;
  background: var(--green-dim);
  color: var(--green-dk);
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  font-weight: 700;
  transition: background 0.2s, color 0.2s;
}

.nav-tab:hover .nav-tab-count {
  background: rgba(0, 166, 81, 0.15);
  color: var(--green);
}

/* ── MAIN CONTENT AREA ────────────────────────────────────────── */
.profile-main-content {
  padding: 3rem 2rem;
  max-width: 1040px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* ══ DASHBOARD ══════════════════════════════════════════════════ */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.stat-card {
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.55);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(0, 166, 81, 0.15);
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.02);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s, box-shadow 0.3s;
}

.dark .stat-card {
  background: rgba(30, 30, 30, 0.45);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--green);
  box-shadow: 0 10px 25px -10px rgba(0, 166, 81, 0.15);
}

.dark .stat-card:hover {
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
}

.stat-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-icon-box {
  transform: scale(1.08) rotate(3deg);
}

.stat-icon-box.green {
  background: rgba(0, 166, 81, 0.1);
  color: #10b981;
}

.stat-icon-box.blue {
  background: rgba(37, 99, 235, 0.1);
  color: #3b82f6;
}

.stat-icon-box.purple {
  background: rgba(124, 58, 237, 0.1);
  color: #a78bfa;
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
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--rule);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.03);
  transition: border-color 0.3s, box-shadow 0.3s;
}

.dark .panel-card {
  background: rgba(22, 22, 22, 0.45);
  border-color: rgba(255, 255, 255, 0.06);
}

.panel-card:hover {
  border-color: rgba(0, 166, 81, 0.2);
  box-shadow: 0 8px 30px -5px rgba(0, 166, 81, 0.05);
}

.panel-card-header {
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.3);
}

.dark .panel-card-header {
  border-bottom-color: rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
}

.panel-card-header h3 {
  font-family: 'Lora', serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
}

.panel-card-body {
  padding: 1.75rem;
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
  letter-spacing: 0.05em;
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
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--rule);
  text-decoration: none;
  transition: all 0.2s ease;
}

.dark .activity-item {
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background: rgba(0, 166, 81, 0.03);
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
  transition: transform 0.2s ease;
}

.activity-item:hover .activity-icon {
  transform: scale(1.1);
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
  color: var(--green-dk);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}

.activity-item:hover .activity-arrow {
  opacity: 1;
  transform: translate(0, 0);
}

/* ══ SECURITY ═══════════════════════════════════════════════════ */
.centered-content {
  max-width: 500px;
  margin: 0 auto;
}

.security-card {
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--rule);
  border-radius: 14px;
  padding: 2.5rem;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
}

.dark .security-card {
  background: rgba(22, 22, 22, 0.45);
  border-color: rgba(255, 255, 255, 0.06);
}

.card-title-group {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.card-title-group .title-icon {
  color: var(--green);
  flex-shrink: 0;
}

.card-title-group h3 {
  font-size: 1.25rem;
  font-family: 'Lora', serif;
  margin: 0 0 0.25rem;
  color: var(--ink);
}

.card-title-group p {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--ink-2);
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1.5px solid var(--rule);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 0.95rem;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.form-group input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(0, 166, 81, 0.15);
}

.cred-alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.cred-alert.ok {
  background: rgba(0, 166, 81, 0.1);
  color: #10b981;
  border: 1px solid rgba(0, 166, 81, 0.2);
}

.cred-alert.err {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.strength-indicator {
  margin-top: 0.75rem;
}

.strength-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--ink-3);
  margin-bottom: 0.35rem;
}

.strength-meter {
  display: flex;
  gap: 0.25rem;
  height: 4px;
}

.strength-segment {
  flex: 1;
  height: 100%;
  border-radius: 99px;
  transition: background 0.3s ease;
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
  font-family: 'Source Sans 3', sans-serif;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
}

.primary-btn:hover:not(:disabled) {
  background: #008f44;
  box-shadow: 0 4px 15px rgba(0, 166, 81, 0.3);
}

.primary-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.full-width {
  width: 100%;
}

/* ── STUDIES & UPLOADS ══════════════════════════════════════════ */
.studies-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

.study-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.5);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid var(--rule);
  border-radius: 14px;
  padding: 1.25rem 1.75rem;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .study-card {
  background: rgba(22, 22, 22, 0.45);
  border-color: rgba(255, 255, 255, 0.06);
}

.study-card:hover {
  border-color: var(--green);
  box-shadow: 0 8px 30px rgba(0, 166, 81, 0.08);
  transform: translateY(-2px);
}

.study-index {
  font-family: 'Lora', serif;
  font-size: 1.2rem;
  color: var(--green-dk);
  opacity: 0.6;
  font-weight: 700;
}

.study-content {
  flex: 1;
}

.study-title {
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.25rem;
  line-height: 1.4;
  font-family: 'Lora', serif;
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
  flex-wrap: wrap;
}

.tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.6);
  color: var(--ink-2);
  border: 1px solid var(--rule);
}

.dark .tag {
  background: rgba(30, 30, 30, 0.6);
  border-color: rgba(255, 255, 255, 0.08);
}

.type-tag {
  background: var(--green-dim);
  color: var(--green-dk);
  border-color: rgba(0, 166, 81, 0.3);
}

.study-action {
  color: var(--green-dk);
  opacity: 0.5;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}

.study-card:hover .study-action {
  opacity: 1;
  transform: translate(2px, -2px);
}

.uploads-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.upload-item-card {
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.5);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid var(--rule);
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  transition: all 0.3s ease;
}

.dark .upload-item-card {
  background: rgba(22, 22, 22, 0.45);
  border-color: rgba(255, 255, 255, 0.06);
}

.upload-item-card:hover {
  border-color: rgba(0, 166, 81, 0.2);
  box-shadow: 0 8px 35px rgba(0, 0, 0, 0.02);
}

.upload-main {
  flex: 1;
}

.upload-title {
  font-size: 1.08rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  font-family: 'Lora', serif;
  color: var(--ink);
  line-height: 1.4;
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
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.status-pill.pending {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-pill.approved {
  background: var(--green-dim);
  color: var(--green-dk);
  border: 1px solid rgba(0, 166, 81, 0.2);
}

.status-text {
  font-size: 0.75rem;
  color: var(--ink-3);
  font-style: italic;
}

.upload-actions {
  flex-shrink: 0;
}

.btn-outline-danger {
  background: none;
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Source Sans 3', sans-serif;
  transition: all 0.2s ease;
}

.btn-outline-danger:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
}

.btn-outline-danger:active {
  transform: scale(0.98);
}

.btn-primary-sm {
  background: var(--green);
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
}

.btn-primary-sm:hover {
  background: #008f44;
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.2);
}

.action-lock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--ink-3);
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.5);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--rule);
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
  transition: opacity 0.2s;
}

.text-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
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
  color: var(--green-dk);
}

.empty-state-full h3 {
  font-family: 'Lora', serif;
  font-size: 1.5rem;
  margin: 0;
  color: var(--ink);
}

.empty-state-full p {
  font-size: 0.95rem;
  color: var(--ink-3);
  max-width: 400px;
  margin: 0;
  line-height: 1.5;
}

.empty-cta-btn {
  margin-top: 1rem;
  background: var(--green);
  color: #fff;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  transition: background 0.2s, box-shadow 0.2s;
}

.empty-cta-btn:hover {
  background: #008f44;
  box-shadow: 0 4px 15px rgba(0, 166, 81, 0.3);
}

/* ── Animation classes ── */
.animate-fade-in {
  animation: fadeIn 0.4s ease-out both;
}

.animate-pulse-slow {
  animation: pulse-slow 3s infinite;
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
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
    align-items: flex-start;
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
