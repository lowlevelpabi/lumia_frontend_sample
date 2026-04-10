<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  Loader2, ArrowUpRight, BookOpen, Award,
  User, KeyRound, LogOut, ChevronRight,
  ShieldCheck, Clock, BookMarked, Users
} from 'lucide-vue-next'
import { api, type Paper } from '../services/api'

interface UserDetails {
  id: number
  username: string
  role: string
}

// ── State ─────────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'credentials' | 'cited'
const activeSection = ref<Section>('dashboard')

const user = ref<UserDetails | null>(null)
const citations = ref<Paper[]>([])
const loading = ref(true)
const citLoading = ref(false)
const router = useRouter()

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
    citations.value = await api.getUserCitations()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
    citLoading.value = false
  }
}

const handleLogout = () => { api.logout(); router.push({ name: 'home' }) }

const setSection = (s: Section) => { activeSection.value = s }

const roleColor = computed(() => {
  const r = user.value?.role
  if (r === 'Admin') return { bg: '#f5f3ff', color: '#7c3aed', border: '#ede9fe' }
  if (r === 'Faculty') return { bg: '#e6f4ed', color: '#007d3d', border: '#bbddc9' }
  return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
})

const avatarInitials = computed(() => {
  const u = user.value?.username ?? ''
  return u.slice(0, 2).toUpperCase()
})

onMounted(fetchData)
</script>

<template>
  <div class="profile-page">

    <!-- ── Loading ─────────────────────────────────────────────── -->
    <div v-if="loading" class="full-loader">
      <Loader2 :size="22" class="spin" />
      <span>Loading your profile…</span>
    </div>

    <!-- ── Main Layout ─────────────────────────────────────────── -->
    <div v-else-if="user" class="profile-layout">

      <!-- Sidebar -->
      <aside class="profile-sidebar">

        <!-- Avatar card -->
        <div class="sb-identity">
          <div class="sb-avatar">{{ avatarInitials }}</div>
          <div class="sb-id-info">
            <span class="sb-username">{{ user.username }}</span>
            <span class="sb-role-badge"
              :style="{ background: roleColor.bg, color: roleColor.color, borderColor: roleColor.border }">
              <ShieldCheck :size="10" />
              {{ user.role }}
            </span>
          </div>
        </div>

        <!-- Nav -->
        <nav class="sb-nav">
          <p class="sb-nav-label">Account</p>
          <button v-for="item in [
            { id: 'dashboard', icon: User, label: 'My Profile' },
            { id: 'credentials', icon: KeyRound, label: 'Update Credentials' },
          ]" :key="item.id" class="sb-item" :class="{ active: activeSection === item.id }"
            @click="setSection(item.id as Section)">
            <component :is="item.icon" :size="15" class="sb-item-icon" />
            <span>{{ item.label }}</span>
            <ChevronRight :size="12" class="sb-item-arrow" />
          </button>

          <p class="sb-nav-label" style="margin-top: 1.25rem">Research Activity</p>
          <button v-for="item in [
            { id: 'cited', icon: BookMarked, label: 'Studies I Cited', count: citations.length }
          ]" :key="item.id" class="sb-item" :class="{ active: activeSection === item.id }"
            @click="setSection(item.id as Section)">
            <component :is="item.icon" :size="15" class="sb-item-icon" />
            <span>{{ item.label }}</span>
            <span v-if="item.count !== undefined" class="sb-count">{{ item.count }}</span>
            <ChevronRight v-else :size="12" class="sb-item-arrow" />
          </button>
        </nav>

        <!-- Logout -->
        <button class="sb-logout" @click="handleLogout">
          <LogOut :size="14" />
          <span>Sign out</span>
        </button>
      </aside>

      <!-- ── Content area ───────────────────────────────────────── -->
      <main class="profile-main">

        <!-- ══ Dashboard ════════════════════════════════════════ -->
        <template v-if="activeSection === 'dashboard'">
          <div class="section-head">
            <h2 class="section-title">My Profile</h2>
            <p class="section-sub">Your account information and activity summary.</p>
          </div>

          <!-- Stat tiles -->
          <div class="stat-tiles">
            <div class="stat-tile">
              <div class="stat-tile-ico green">
                <BookMarked :size="16" />
              </div>
              <div>
                <span class="stat-tile-val">{{ citations.length }}</span>
                <span class="stat-tile-lbl">Studies Cited</span>
              </div>
            </div>
            <div class="stat-tile">
              <div class="stat-tile-ico purple">
                <BookOpen :size="16" />
              </div>
              <div>
                <span class="stat-tile-val">—</span>
                <span class="stat-tile-lbl">Papers Viewed</span>
              </div>
            </div>
          </div>

          <!-- Account details card -->
          <div class="info-card">
            <div class="info-card-head">Account Details</div>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-label">User ID</span>
                <span class="info-value mono">#{{ user.id }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Username</span>
                <span class="info-value">{{ user.username }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Role</span>
                <span class="info-role-badge"
                  :style="{ background: roleColor.bg, color: roleColor.color, borderColor: roleColor.border }">{{
                    user.role }}</span>
              </div>
            </div>
          </div>

          <!-- Recent citations preview -->
          <div v-if="citations.length > 0" class="info-card" style="margin-top: 1.25rem">
            <div class="info-card-head" style="display:flex;justify-content:space-between;align-items:center">
              <span>Recently Cited</span>
              <button class="card-link" @click="setSection('cited')">View all →</button>
            </div>
            <div class="recent-cite-list">
              <RouterLink v-for="paper in citations.slice(0, 3)" :key="paper.id"
                :to="{ name: 'detail', params: { id: paper.id } }" class="recent-cite-row">
                <div class="recent-cite-dot" />
                <div class="recent-cite-info">
                  <span class="recent-cite-title">{{ paper.title }}</span>
                  <span class="recent-cite-author">{{ paper.author }}</span>
                </div>
                <ArrowUpRight :size="13" class="recent-cite-arrow" />
              </RouterLink>
            </div>
          </div>
        </template>

        <!-- ══ Credentials ═══════════════════════════════════════ -->
        <template v-else-if="activeSection === 'credentials'">
          <div class="section-head">
            <h2 class="section-title">Update Credentials</h2>
            <p class="section-sub">Change your password to keep your account secure.</p>
          </div>

          <div class="cred-card">
            <div v-if="credMsg" class="cred-msg" :class="credMsg.type">{{ credMsg.text }}</div>

            <div class="fg">
              <label class="fg-label">Current Password</label>
              <input v-model="credForm.currentPassword" type="password" class="fg-input"
                placeholder="Enter current password" autocomplete="current-password" />
            </div>

            <div class="fg">
              <label class="fg-label">New Password</label>
              <input v-model="credForm.newPassword" type="password" class="fg-input" placeholder="Enter new password"
                autocomplete="new-password" />
              <!-- Strength meter -->
              <div v-if="credForm.newPassword" class="strength-wrap">
                <div class="strength-bars">
                  <div v-for="i in 4" :key="i" class="strength-bar"
                    :style="{ background: i <= passwordStrength ? strengthColor : '#e5e7eb' }" />
                </div>
                <span class="strength-label" :style="{ color: strengthColor }">{{ strengthLabel }}</span>
              </div>
            </div>

            <div class="fg">
              <label class="fg-label">Confirm New Password</label>
              <input v-model="credForm.confirmPassword" type="password" class="fg-input"
                placeholder="Repeat new password" autocomplete="new-password" />
              <p v-if="credForm.confirmPassword && credForm.newPassword !== credForm.confirmPassword" class="fg-error">
                Passwords do not match.</p>
            </div>

            <button class="save-btn" @click="handleCredentialUpdate" :disabled="credSaving">
              <Loader2 v-if="credSaving" :size="14" class="spin" />
              <span>{{ credSaving ? 'Saving…' : 'Update Password' }}</span>
            </button>
          </div>
        </template>

        <!-- ══ Cited Studies ══════════════════════════════════════ -->
        <template v-else-if="activeSection === 'cited'">
          <div class="section-head">
            <h2 class="section-title">Studies I Cited</h2>
            <p class="section-sub">
              Research papers you have cited through the repository.
            </p>
          </div>

          <div v-if="citLoading" class="inline-loader">
            <Loader2 :size="16" class="spin" /> Loading citations…
          </div>

          <div v-else-if="citations.length > 0" class="cite-list">
            <RouterLink v-for="(paper, idx) in citations" :key="paper.id"
              :to="{ name: 'detail', params: { id: paper.id } }" class="cite-card">
              <div class="cite-card-num">{{ String(idx + 1).padStart(2, '0') }}</div>
              <div class="cite-card-body">
                <span class="cite-card-title">{{ paper.title }}</span>
                <span class="cite-card-meta">
                  {{ paper.author }}
                  <span v-if="paper.year" class="cite-card-dot">·</span>
                  {{ paper.year }}
                </span>
                <div class="cite-card-tags">
                  <span v-if="paper.department && paper.department !== 'N/A'" class="cite-tag">{{ paper.department
                  }}</span>
                  <span v-if="paper.project_type" class="cite-tag cite-tag-type">{{ paper.project_type }}</span>
                </div>
              </div>
              <ArrowUpRight :size="14" class="cite-card-arrow" />
            </RouterLink>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">
              <BookMarked :size="28" />
            </div>
            <p class="empty-title">No citations yet</p>
            <p class="empty-sub">Papers you cite will appear here. Browse the repository and hit "Cite this study" to
              get started.</p>
            <RouterLink :to="{ name: 'home' }" class="empty-cta">Browse Repository</RouterLink>
          </div>
        </template>


      </main>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@400;500;600;700&display=swap');

/* ── Tokens ───────────────────────────────────────────────────── */
.profile-page {
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
  padding: 80px 1.5rem 4rem;
  font-family: 'Source Sans 3', sans-serif;
  color: var(--ink);
}

/* ── Full loader ──────────────────────────────────────────────── */
.full-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 60vh;
  color: var(--ink-3);
  font-size: 0.88rem;
}

/* ── Two-column layout ────────────────────────────────────────── */
.profile-layout {
  display: flex;
  gap: 1.75rem;
  max-width: 1100px;
  margin: 0 auto;
  align-items: flex-start;
}

/* ══ SIDEBAR ════════════════════════════════════════════════════ */
.profile-sidebar {
  width: 250px;
  flex-shrink: 0;
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* Avatar block */
.sb-identity {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.25rem 1.1rem;
  background: var(--hero);
  position: relative;
  overflow: hidden;
}

.sb-identity::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
}

.sb-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-family: 'Lora', serif;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.15);
  position: relative;
  z-index: 1;
}

.sb-id-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.sb-username {
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-email {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  border: 1px solid;
  width: fit-content;
  margin-top: 0.15rem;
}

/* Nav */
.sb-nav {
  padding: 0.85rem 0.6rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
}

.sb-nav-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-3);
  padding: 0 0.5rem;
  margin: 0 0 0.3rem;
}

.sb-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  background: none;
  border: none;
  padding: 0.55rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--ink-2);
  text-align: left;
  transition: background 0.13s, color 0.13s;
}

.sb-item:hover {
  background: var(--surface);
  color: var(--ink);
}

.sb-item.active {
  background: var(--green-dim);
  color: var(--green-dk);
  font-weight: 700;
}

.sb-item-icon {
  flex-shrink: 0;
  opacity: 0.65;
}

.sb-item.active .sb-item-icon {
  opacity: 1;
}

.sb-item-arrow {
  margin-left: auto;
  color: var(--rule);
  flex-shrink: 0;
}

.sb-item.active .sb-item-arrow {
  color: var(--green);
}

.sb-count {
  margin-left: auto;
  background: var(--green-dim);
  color: var(--green-dk);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.sb-item.active .sb-count {
  background: var(--green);
  color: #fff;
}

/* Logout */
.sb-logout {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  background: none;
  border: none;
  border-top: 1px solid var(--rule);
  padding: 0.85rem 1.1rem;
  cursor: pointer;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-3);
  transition: color 0.14s, background 0.14s;
}

.sb-logout:hover {
  color: #dc2626;
  background: #fef2f2;
}

/* ══ MAIN CONTENT ════════════════════════════════════════════════ */
.profile-main {
  flex: 1;
  min-width: 0;
}

/* Section header */
.section-head {
  margin-bottom: 1.5rem;
}

.section-title {
  font-family: 'Lora', serif;
  font-size: 1.45rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.3rem;
}

.section-sub {
  font-size: 0.85rem;
  color: var(--ink-3);
  margin: 0;
}

/* ── Dashboard stat tiles ─────────────────────────────────────── */
.stat-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.stat-tile {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.stat-tile-ico {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-tile-ico.green {
  background: var(--green-dim);
  color: var(--green-dk);
}

.stat-tile-ico.blue {
  background: #eff6ff;
  color: #2563eb;
}

.stat-tile-ico.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.stat-tile-val {
  display: block;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
}

.stat-tile-lbl {
  display: block;
  font-size: 0.7rem;
  color: var(--ink-3);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Info card ────────────────────────────────────────────────── */
.info-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}

.info-card-head {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--ink-3);
  padding: 0.7rem 1.1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
}

.card-link {
  background: none;
  border: none;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--green-dk);
  cursor: pointer;
  padding: 0;
}

.card-link:hover {
  text-decoration: underline;
}

.info-rows {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.1rem;
  border-bottom: 1px solid var(--rule);
  font-size: 0.88rem;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--ink-3);
  font-weight: 500;
}

.info-value {
  font-weight: 600;
  color: var(--ink);
}

.info-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
  color: var(--ink-2);
}

.info-role-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.55rem;
  border-radius: 3px;
  border: 1px solid;
}

/* ── Recent citations in dashboard ───────────────────────────── */
.recent-cite-list {
  display: flex;
  flex-direction: column;
}

.recent-cite-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1.1rem;
  border-bottom: 1px solid var(--rule);
  text-decoration: none;
  transition: background 0.13s;
}

.recent-cite-row:last-child {
  border-bottom: none;
}

.recent-cite-row:hover {
  background: var(--surface);
}

.recent-cite-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  flex-shrink: 0;
}

.recent-cite-info {
  flex: 1;
  min-width: 0;
}

.recent-cite-title {
  display: block;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-cite-author {
  display: block;
  font-size: 0.74rem;
  color: var(--ink-3);
}

.recent-cite-arrow {
  color: var(--rule);
  flex-shrink: 0;
  transition: color 0.13s, transform 0.13s;
}

.recent-cite-row:hover .recent-cite-arrow {
  color: var(--green);
  transform: translate(2px, -2px);
}

/* ── Credentials card ─────────────────────────────────────────── */
.cred-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1.75rem;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.cred-msg {
  padding: 0.7rem 0.9rem;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 600;
}

.cred-msg.ok {
  background: var(--green-dim);
  color: var(--green-dk);
}

.cred-msg.err {
  background: #fef2f2;
  color: #b91c1c;
}

.fg {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.fg-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-3);
}

.fg-input {
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--rule);
  border-radius: 6px;
  background: var(--paper);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.fg-input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px var(--green-dim);
}

.fg-error {
  font-size: 0.74rem;
  color: #b91c1c;
  margin: 0;
}

/* Strength meter */
.strength-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

.strength-bars {
  display: flex;
  gap: 3px;
  flex: 1;
}

.strength-bar {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  transition: background 0.2s;
}

.strength-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 40px;
  transition: color 0.2s;
}

.save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.25rem;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s;
  align-self: flex-start;
}

.save-btn:hover:not(:disabled) {
  background: var(--green-dk);
}

.save-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

/* ── Cited studies list ───────────────────────────────────────── */
.cite-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cite-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1rem 1.1rem;
  text-decoration: none;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.cite-card:hover {
  border-color: var(--green);
  box-shadow: 0 2px 10px rgba(0, 166, 81, 0.1);
}

.cite-card-num {
  font-family: 'Lora', serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--rule);
  flex-shrink: 0;
  min-width: 28px;
  line-height: 1.4;
  transition: color 0.14s;
}

.cite-card:hover .cite-card-num {
  color: var(--green);
}

.cite-card-body {
  flex: 1;
  min-width: 0;
}

.cite-card-title {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.4;
  margin-bottom: 0.2rem;
}

.cite-card-meta {
  display: block;
  font-size: 0.76rem;
  color: var(--ink-3);
  margin-bottom: 0.5rem;
}

.cite-card-dot {
  margin: 0 0.3rem;
}

.cite-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.cite-tag {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  background: var(--surface);
  color: var(--ink-3);
  border: 1px solid var(--rule);
}

.cite-tag-type {
  background: var(--green-dim);
  color: var(--green-dk);
  border-color: #b3d9c4;
}

.cite-card-arrow {
  color: var(--rule);
  flex-shrink: 0;
  margin-top: 3px;
  transition: color 0.14s, transform 0.14s;
}

.cite-card:hover .cite-card-arrow {
  color: var(--green);
  transform: translate(2px, -2px);
}

/* ── Empty state ──────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 2rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
  gap: 0.5rem;
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.empty-sub {
  font-size: 0.84rem;
  color: var(--ink-3);
  max-width: 360px;
  line-height: 1.55;
  margin: 0;
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
  background: var(--green);
  color: #fff;
  border-radius: 6px;
  padding: 0.5rem 1.1rem;
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.14s;
}

.empty-cta:hover {
  background: var(--green-dk);
}

/* ── Coming soon card ─────────────────────────────────────────── */
.coming-soon-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  max-width: 480px;
}

.cs-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--ink-3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.cs-title {
  font-family: 'Lora', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.cs-body {
  font-size: 0.86rem;
  color: var(--ink-3);
  line-height: 1.65;
  margin: 0;
  max-width: 380px;
}

.cs-pill {
  display: inline-block;
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  margin-top: 0.25rem;
}

/* ── Inline loader ────────────────────────────────────────────── */
.inline-loader {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink-3);
  font-size: 0.85rem;
  padding: 2rem;
}

/* ── Spin ─────────────────────────────────────────────────────── */
.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Responsive ───────────────────────────────────────────────── */
@media (max-width: 860px) {
  .profile-layout {
    flex-direction: column;
  }

  .profile-sidebar {
    width: 100%;
    position: static;
  }

  .sb-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
  }

  .sb-nav-label {
    grid-column: 1 / -1;
  }

  .stat-tiles {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .profile-page {
    padding: 72px 1rem 3rem;
  }

  .stat-tiles {
    grid-template-columns: 1fr;
  }

  .sb-nav {
    grid-template-columns: 1fr;
  }
}
</style>
