<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Calendar, User, FileText, Share2, Bookmark } from 'lucide-vue-next'
import { api, type Paper, type SearchResult } from '../services/api'

const route = useRoute()
const router = useRouter()
const paper = ref<Paper | null>(null)
const recommendations = ref<SearchResult[]>([])
const loading = ref(true)

const loadPaperData = async (id: number) => {
  loading.value = true
  try {
    const details = await api.getPaperDetails(id)
    paper.value = details || null
    recommendations.value = await api.getRecommendations(id)
  } catch (error) {
    console.error('Error fetching details:', error)
  } finally {
    loading.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

onMounted(() => {
  loadPaperData(Number(route.params.id))
})

watch(() => route.params.id, (newId) => {
  if (newId) loadPaperData(Number(newId))
})

const goBack = () => router.back()
const viewDetail = (id: number) => {
  router.push({ name: 'detail', params: { id } })
}
</script>

<template>
  <div class="detail-page" v-if="!loading && paper">
    <nav class="detail-nav">
      <button @click="goBack" class="back-btn">
        <ArrowLeft :size="20" /> Back to Results
      </button>
      <div class="actions">
        <button class="icon-btn">
          <Bookmark :size="18" />
        </button>
        <button class="icon-btn">
          <Share2 :size="18" />
        </button>
      </div>
    </nav>

    <div class="detail-layout">
      <main class="paper-main">
        <header class="paper-header">
          <span class="dept-label">SPECIFIC DOMAIN: {{ paper.department }}</span>
          <h1>{{ paper.title }}</h1>
          <div class="metadata-grid">
            <div class="meta-item">
              <User :size="16" />
              <span>Author(s): {{ paper.author }}</span>
            </div>
            <div class="meta-item">
              <Calendar :size="16" />
              <span>Date of publication: {{ paper.year }}</span>
            </div>
            <div class="meta-item">
              <Calendar :size="16" />
              <span>Date uploaded: NA</span> <!-- Fixed date. No function yet. Lagyan na lang during sprint 3 @prince -->
            </div>
          </div>
        </header>

        <section class="abstract-section">
          <h3>
            <FileText :size="18" /> Abstract
          </h3>
          <p>{{ paper.abstract }}</p>
        </section>

        <section class="keywords-section" v-if="paper.keywords">
          <h3>Keywords</h3>
          <div class="tags">
            <span v-for="tag in paper.keywords.split(',')" :key="tag" class="tag">
              {{ tag.trim() }}
            </span>
          </div>
        </section>
      </main>

      <aside class="recommendations-aside">
        <h3>Related Studies</h3>
        <p class="aside-info">Based on semantic similarity of the study you've picked</p>
        <div class="rec-list">
          <div v-for="rec in recommendations" :key="rec.id" class="rec-card" @click="viewDetail(rec.id)">
            <h4>{{ rec.payload.title }}</h4>
            <p>{{ rec.payload.author }} ({{ rec.payload.year }})</p>
            <div class="score">Match: {{ (rec.score * 100).toFixed(0) }}%</div>
          </div>
          <div v-if="recommendations.length === 0" class="no-recs">
            No related studies found yet.
          </div>
        </div>
      </aside>
    </div>
  </div>
  <div v-else-if="loading" class="loading-full">
    Loading paper details...
  </div>
</template>

<style scoped>
.detail-page {
  background: #f9fafb;
  min-height: 100vh;
}

.detail-nav {
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-weight: 500;
  cursor: pointer;
}

.icon-btn {
  background: none;
  border: 1px solid #eee;
  padding: 0.5rem;
  border-radius: 6px;
  margin-left: 0.5rem;
  cursor: pointer;
  color: #666;
}

.detail-layout {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
  gap: 4rem;
}

.paper-main {
  flex: 1;
}

.dept-label {
  color: #10b981;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.paper-header h1 {
  font-size: 2.25rem;
  margin: 1rem 0 1.5rem 0;
  line-height: 1.2;
  color: #111;
}

.metadata-grid {
  display: flex;
  gap: 2rem;
  color: #666;
  margin-bottom: 3rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.abstract-section h3,
.keywords-section h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  margin-bottom: 1.25rem;
  color: #333;
}

.abstract-section p {
  line-height: 1.8;
  color: #444;
  font-size: 1.05rem;
  margin-bottom: 3rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #fff;
  border: 1px solid #ddd;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #555;
}

.recommendations-aside {
  width: 300px;
  flex-shrink: 0;
}

.recommendations-aside h3 {
  margin-bottom: 0.25rem;
}

.aside-info {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 1.5rem;
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rec-card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #eee;
  cursor: pointer;
}

.rec-card:hover {
  border-color: #10b981;
}

.rec-card h4 {
  font-size: 0.95rem;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.rec-card p {
  font-size: 0.8rem;
  color: #777;
  margin-bottom: 0.75rem;
}

.score {
  font-size: 0.7rem;
  font-weight: 700;
  color: #059669;
}

.loading-full {
  display: flex;
  height: 50vh;
  align-items: center;
  justify-content: center;
  color: #888;
}

.no-recs {
  font-size: 0.85rem;
  color: #999;
  text-align: center;
  padding: 2rem;
}
</style>
