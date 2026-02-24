<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Calendar, User, FileText, Share2, BookOpen, Eye, Award, CheckCircle } from 'lucide-vue-next'
import { api, type Paper, type SearchResult } from '../services/api'

const route = useRoute()
const router = useRouter()
const paper = ref<Paper | null>(null)
const recommendations = ref<SearchResult[]>([])
const loading = ref(true)

// Engagement state
const viewCount = ref(0)
const citationCount = ref(0)
const hasCited = ref(false)
const citeLoading = ref(false)
const isLoggedIn = computed(() => !!localStorage.getItem('token'))

// Document preview toggle
const showFullAbstract = ref(false)
const ABSTRACT_PREVIEW_LIMIT = 400

const loadPaperData = async (id: number) => {
  loading.value = true
  try {
    const details = await api.getPaperDetails(id)
    paper.value = details || null
    recommendations.value = await api.getRecommendations(id)

    if (paper.value) {
      viewCount.value = paper.value.view_count || 0
      citationCount.value = paper.value.citation_count || 0

      // Record view (fire-and-forget)
      api.viewPaper(id).then(res => { viewCount.value = res.view_count }).catch(() => { })

      // Check citation status if logged in
      if (isLoggedIn.value) {
        api.getCiteStatus(id)
          .then(res => {
            hasCited.value = res.has_cited
            citationCount.value = res.citation_count
          })
          .catch(() => { })
      }
    }
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
const viewDetail = (id: number) => router.push({ name: 'detail', params: { id } })

const handleCite = async () => {
  if (!isLoggedIn.value || hasCited.value || citeLoading.value || !paper.value) return
  citeLoading.value = true
  try {
    const res = await api.citePaper(paper.value.id)
    hasCited.value = res.has_cited
    citationCount.value = res.citation_count
  } catch {
    // 409 means already cited (race condition guard), treat as success
    hasCited.value = true
  } finally {
    citeLoading.value = false
  }
}

const abstractPreview = computed(() => {
  if (!paper.value?.abstract) return ''
  return paper.value.abstract.length > ABSTRACT_PREVIEW_LIMIT && !showFullAbstract.value
    ? paper.value.abstract.substring(0, ABSTRACT_PREVIEW_LIMIT) + '...'
    : paper.value.abstract
})
</script>

<template>
  <div class="detail-page" v-if="!loading && paper">
    <nav class="detail-nav">
      <button @click="goBack" class="back-btn">
        <ArrowLeft :size="20" /> Back to Results
      </button>
      <div class="actions">
        <button class="icon-btn">
          <Share2 :size="18" />
        </button>
      </div>
    </nav>

    <div class="detail-layout">
      <main class="paper-main">
        <!-- Header -->
        <header class="paper-header">
          <div class="header-badges">
            <span class="badge badge-dept">{{ paper.department }}</span>
            <span class="badge badge-type">{{ paper.project_type }}</span>
            <span v-if="paper.degree_program !== 'N/A'" class="badge badge-degree">{{ paper.degree_program }}</span>
          </div>
          <h1>{{ paper.title }}</h1>

          <!-- Author & Year -->
          <div class="metadata-grid">
            <div class="meta-item">
              <User :size="15" />
              <span>{{ paper.author }}</span>
            </div>
            <div class="meta-item">
              <Calendar :size="15" />
              <span>{{ paper.year }}</span>
            </div>
          </div>

          <!-- Engagement Stats -->
          <div class="engagement-row">
            <div class="stat-chip">
              <Eye :size="14" />
              <span>{{ viewCount.toLocaleString() }} views</span>
            </div>
            <div class="stat-chip">
              <Award :size="14" />
              <span>{{ citationCount.toLocaleString() }} citations</span>
            </div>

            <!-- Cite Button -->
            <button v-if="isLoggedIn" class="cite-btn" :class="{ cited: hasCited, loading: citeLoading }"
              :disabled="hasCited || citeLoading" @click="handleCite">
              <CheckCircle v-if="hasCited" :size="15" />
              <Award v-else :size="15" />
              {{ hasCited ? 'You Cited This' : citeLoading ? 'Citing...' : 'Cite / Vouch' }}
            </button>
            <span v-else class="cite-hint">Log in to cite this paper</span>
          </div>
        </header>

        <hr class="divider" />

        <!-- Abstract Section -->
        <section class="paper-section">
          <h3>
            <FileText :size="17" /> Abstract
          </h3>
          <p class="body-text">{{ abstractPreview }}</p>
          <button v-if="paper.abstract && paper.abstract.length > ABSTRACT_PREVIEW_LIMIT" class="read-more-btn"
            @click="showFullAbstract = !showFullAbstract">
            {{ showFullAbstract ? 'Show less' : 'Read full abstract' }}
          </button>
        </section>

        <!-- Keywords -->
        <section class="paper-section" v-if="paper.keywords">
          <h3>
            <BookOpen :size="17" /> Keywords
          </h3>
          <div class="tags">
            <span v-for="tag in paper.keywords.split(',')" :key="tag" class="tag">
              {{ tag.trim() }}
            </span>
          </div>
        </section>

        <!-- Document Preview Note -->
        <section class="paper-section preview-notice">
          <p>
            <FileText :size="14" style="display:inline;margin-right:4px;vertical-align:middle" />
            <strong>Preview Only</strong> — This page shows the abstract and keywords as provided by the researchers.
            The full manuscript is available in the institutional repository upon authorized access.
          </p>
        </section>
      </main>

      <!-- Sidebar: Related Studies -->
      <aside class="recommendations-aside">
        <h3>Related Studies</h3>
        <p class="aside-info">Based on semantic similarity of the study you've picked</p>
        <div class="rec-list">
          <div v-for="rec in recommendations" :key="rec.id" class="rec-card" @click="viewDetail(rec.id)">
            <div class="rec-badges">
              <span class="rec-badge">{{ rec.payload.degree_program || '' }}</span>
            </div>
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
  font-family: 'Inter', -apple-system, sans-serif;
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
  font-size: 0.9rem;
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
  min-width: 0;
}

/* Header Badges */
.header-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-dept {
  background: #f0fdf4;
  color: #059669;
}

.badge-type {
  background: #eff6ff;
  color: #2563eb;
}

.badge-degree {
  background: #fff7ed;
  color: #c2410c;
}

.paper-header h1 {
  font-size: 2rem;
  margin: 0 0 1.2rem 0;
  line-height: 1.25;
  color: #111;
  font-weight: 800;
}

.metadata-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  color: #555;
  margin-bottom: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
}

/* Engagement Row */
.engagement-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #f3f4f6;
  color: #555;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
}

.cite-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #10b981;
  color: white;
  border: none;
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.cite-btn:hover:not(:disabled) {
  background: #059669;
}

.cite-btn.cited {
  background: #d1fae5;
  color: #065f46;
  cursor: default;
}

.cite-btn.loading {
  opacity: 0.6;
  cursor: wait;
}

.cite-hint {
  font-size: 0.8rem;
  color: #999;
}

.divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0 0 2rem 0;
}

/* Paper Sections */
.paper-section {
  margin-bottom: 2rem;
}

.paper-section h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  color: #1a3a6c;
  margin-bottom: 0.85rem;
  font-weight: 700;
}

.body-text {
  line-height: 1.85;
  color: #444;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.read-more-btn {
  background: none;
  border: none;
  color: #10b981;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-top: 0.25rem;
}

.read-more-btn:hover {
  text-decoration: underline;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #fff;
  border: 1px solid #ddd;
  padding: 0.35rem 0.7rem;
  border-radius: 4px;
  font-size: 0.82rem;
  color: #555;
}

.preview-notice {
  background: #fafafa;
  border: 1px dashed #ddd;
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.preview-notice p {
  font-size: 0.88rem;
  color: #777;
  margin: 0;
}

/* Recommendations Sidebar */
.recommendations-aside {
  width: 280px;
  flex-shrink: 0;
}

.recommendations-aside h3 {
  margin-bottom: 0.25rem;
  font-size: 1rem;
  color: #111;
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
  transition: border-color 0.15s;
}

.rec-card:hover {
  border-color: #10b981;
}

.rec-badges {
  margin-bottom: 0.4rem;
}

.rec-badge {
  background: #fff7ed;
  color: #c2410c;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  text-transform: uppercase;
}

.rec-card h4 {
  font-size: 0.88rem;
  margin: 0 0 0.4rem 0;
  line-height: 1.4;
  color: #222;
}

.rec-card p {
  font-size: 0.78rem;
  color: #777;
  margin-bottom: 0.6rem;
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
