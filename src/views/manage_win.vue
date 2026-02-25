<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Trash2, Edit3, BookOpen, AlertTriangle } from 'lucide-vue-next'
import { api, type Paper } from '../services/api'

const router = useRouter()
const papers = ref<Paper[]>([])
const loading = ref(true)

const fetchPapers = async () => {
  loading.value = true
  try {
    papers.value = await api.listAllPapers()
  } catch (err) {
    console.error('Failed to fetch papers:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchPapers)

const handleDelete = async (id: number) => {
  if (!confirm('Are you sure you want to delete this paper? This action cannot be undone.')) return
  try {
    await api.deletePaper(id)
    await fetchPapers()
  } catch {
    alert('Failed to delete paper. Are you logged in as admin?')
  }
}

const goToAdd = () => router.push({ name: 'upload' })
const handleEdit = (id: number) => {
  // Future: Implement edit modal or page
  alert('Edit functionality coming soon for ID: ' + id)
}
const logout = () => {
  api.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="management-page">
    <nav class="management-nav">
      <div class="nav-left">
        <BookOpen :size="20" color="#10b981" />
        <span class="nav-title">Management Dashboard</span>
      </div>
      <div class="nav-right">
        <button @click="logout" class="logout-link">Logout</button>
      </div>
    </nav>

    <main class="management-container">
      <header class="section-header">
        <div class="header-info">
          <h1>Research Repository</h1>
          <p>You have {{ papers.length }} papers in the system.</p>
        </div>
        <button @click="goToAdd" class="add-btn">
          <Plus :size="18" /> Upload New Research
        </button>
      </header>

      <div class="papers-table-wrapper">
        <table class="papers-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Year</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="table-info">Loading research data...</td>
            </tr>
            <tr v-else-if="papers.length === 0">
              <td colspan="5" class="table-info">No papers found. Upload your first one!</td>
            </tr>
            <tr v-for="paper in papers" :key="paper.id">
              <td class="title-cell">{{ paper.title }}</td>
              <td>{{ paper.author }}</td>
              <td>{{ paper.year }}</td>
              <td><span class="dept-badge">{{ paper.department }}</span></td>
              <td class="actions-cell">
                <button @click="handleEdit(paper.id)" title="Edit" class="icon-btn edit">
                  <Edit3 :size="16" />
                </button>
                <button @click="handleDelete(paper.id)" title="Delete" class="icon-btn delete">
                  <Trash2 :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="admin-notice">
        <AlertTriangle :size="16" />
        <span>Only Faculty and Administrators can upload or modify papers.</span>
      </div>
    </main>
  </div>
</template>

<style scoped>
.management-page {
  background-color: #fcfcfc;
  min-height: 100vh;
}

.management-nav {
  background: #111;
  color: white;
  padding: 0.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.logout-link {
  background: none;
  border: none;
  color: #aaa;
  font-size: 0.85rem;
  cursor: pointer;
}

.logout-link:hover {
  color: white;
}

.management-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}

.header-info h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.header-info p {
  color: #666;
}

.add-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.papers-table-wrapper {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
}

.papers-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.papers-table th {
  background: #f9fafb;
  padding: 1rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #444;
  border-bottom: 1px solid #eee;
}

.papers-table td {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.95rem;
  color: #333;
}

.title-cell {
  font-weight: 600;
  max-width: 400px;
}

.dept-badge {
  background: #f3f4f6;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #666;
  font-weight: 600;
}

.actions-cell {
  display: flex;
  gap: 0.75rem;
}

.icon-btn {
  background: none;
  border: 1px solid #eee;
  padding: 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.edit:hover {
  background: #f0fdf4;
  color: #10b981;
  border-color: #10b981;
}

.icon-btn.delete:hover {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #b91c1c;
}

.table-info {
  text-align: center;
  padding: 4rem !important;
  color: #888;
}

.admin-notice {
  margin-top: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #888;
  font-size: 0.85rem;
}

/* ── Tablet (≤768px) ─────────────────────────────────────────── */
@media (max-width: 768px) {
  .management-container {
    padding: 2rem 1.25rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .papers-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .title-cell {
    max-width: 220px;
  }
}

/* ── Phone (≤480px) — Primary Android target 360–412px ───────── */
@media (max-width: 480px) {
  .management-nav {
    padding: 0.65rem 1rem;
  }

  .nav-title {
    font-size: 0.85rem;
  }

  .management-container {
    padding: 1.25rem 0.85rem;
  }

  .header-info h1 {
    font-size: 1.5rem;
  }

  .papers-table th,
  .papers-table td {
    padding: 0.85rem 1rem;
    font-size: 0.85rem;
  }

  .title-cell {
    max-width: 160px;
  }
}
</style>
