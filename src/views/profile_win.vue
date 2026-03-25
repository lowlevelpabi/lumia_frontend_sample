<template>
  <div class="profile-page">
    <div class="profile-container">
      <h1 class="page-title">Profile</h1>

      <div v-if="loading" class="loading-state">
        <Loader2 class="animate-spin" :size="24" />
        <span>Loading account details...</span>
      </div>

      <div v-else-if="user" class="profile-content">
        <!-- Identity Section -->
        <div class="profile-section">
          <div class="user-header">
            <div class="avatar-wrap">
              <img src="/avatar.png" alt="Profile" />
            </div>
            <div class="user-meta">
              <h2 class="username">{{ user.username }}</h2>
              <p class="email">{{ user.email }}</p>
            </div>
          </div>
        </div>

        <!-- Account Data Section -->
        <div class="profile-section">
          <h3 class="section-title">Account Detail</h3>
          <div class="info-list">
            <div class="info-row">
              <span class="label">User ID</span>
              <span class="value">#{{ user.id }}</span>
            </div>
            <div class="info-row">
              <span class="label">Role</span>
              <span class="value">{{ user.role }}</span>
            </div>
          </div>
        </div>

        <!-- Cited Studies Section -->
        <div class="profile-section">
          <h3 class="section-title">Cited Studies</h3>
          <div v-if="citationsLoading" class="loading-inline">
            <Loader2 class="animate-spin" :size="16" />
            <span>Fetching citations...</span>
          </div>
          <div v-else-if="citations.length > 0" class="citations-list">
            <RouterLink v-for="paper in citations" :key="paper.id" :to="{ name: 'detail', params: { id: paper.id } }"
              class="citation-item">
              <div class="citation-meta">
                <span class="c-title">{{ paper.title }}</span>
                <span class="c-authors">{{ paper.author }}</span>
              </div>
              <ArrowRight :size="14" class="arrow-icon" />
            </RouterLink>
          </div>
          <p v-else class="empty-msg">You haven't cited any studies yet.</p>
        </div>

        <!-- Actions Section -->
        <div class="profile-section actions">
          <button @click="handleLogout" class="btn-logout">Log out</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Loader2, ArrowRight } from 'lucide-vue-next'
import { api, type Paper } from '../services/api'

interface UserDetails {
  id: number
  username: string
  email: string
  role: string
}

const user = ref<UserDetails | null>(null)
const citations = ref<Paper[]>([])
const loading = ref(true)
const citationsLoading = ref(true)
const router = useRouter()

const fetchData = async () => {
  try {
    const userData = await api.getUserMe()
    user.value = userData

    // Fetch citations after user is loaded
    const citationData = await api.getUserCitations()
    citations.value = citationData
  } catch (error) {
    console.error('Failed to fetch profile data:', error)
  } finally {
    loading.value = false
    citationsLoading.value = false
  }
}

const handleLogout = () => {
  api.logout()
  router.push({ name: 'home' })
}

onMounted(fetchData)
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #fcfcfc;
  padding: 120px 24px 80px;
  color: #1a1a1a;
  font-family: 'Source Sans 3', sans-serif;
}

.profile-container {
  max-width: 500px;
  margin: 0 auto;
}

.page-title {
  font-family: 'Lora', serif;
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 40px;
  text-align: center;
}

.loading-state,
.loading-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 0.95rem;
}

.loading-state {
  flex-direction: column;
  padding: 60px 0;
}

.loading-inline {
  padding: 8px 0;
}

.animate-spin {
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

.profile-content {
  background: #ffffff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
}

/* ── Citations List ──────────────────────────────── */
.citations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.citation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #fcfcfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.citation-item:hover {
  border-color: #00a651;
  background: #f0faf4;
}

.citation-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.c-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.c-authors {
  font-size: 0.8rem;
  color: #666;
}

.arrow-icon {
  color: #ccc;
  transition: transform 0.2s, color 0.2s;
  flex-shrink: 0;
}

.citation-item:hover .arrow-icon {
  transform: translateX(4px);
  color: #00a651;
}

.empty-msg {
  font-size: 0.9rem;
  color: #999;
  font-style: italic;
  margin: 0;
}

.profile-section {
  margin-bottom: 32px;
}

.profile-section:last-child {
  margin-bottom: 0;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #ddd;
}

.avatar-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.username {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.email {
  font-size: 0.95rem;
  color: #666;
  margin: 0;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
}

.label {
  color: #666;
}

.value {
  font-weight: 600;
}

.actions {
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}

.btn-logout {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #dc2626;
}
</style>
