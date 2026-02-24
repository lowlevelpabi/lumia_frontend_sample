<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, BookOpen, ArrowLeft, Filter, Calendar } from 'lucide-vue-next'
import { api, type SearchResult, type SearchParams } from '../services/api'
const route = useRoute()
const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)

// Advanced Filters
const threshold = ref(0.2)
const minYear = ref<number | undefined>(undefined)
const maxYear = ref<number | undefined>(undefined)
const selectedProjectType = ref('')
const selectedDegree = ref('')

const performSearch = async () => {
  if (!query.value) return
  loading.value = true
  try {
    const params: SearchParams = {
      query: query.value,
      threshold: threshold.value,
      minYear: minYear.value,
      maxYear: maxYear.value,
      projectType: selectedProjectType.value || undefined,
      degreeProgram: selectedDegree.value || undefined
    }
    results.value = await api.searchPapers(params)
  } catch {
    console.error('Search error occurred')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  query.value = (route.query.q as string) || ''
  performSearch()
})

watch([() => route.query.q, threshold, minYear, maxYear, selectedProjectType, selectedDegree], () => {
  query.value = (route.query.q as string) || query.value
  performSearch()
})

const goToHome = () => router.push({ name: 'home' })
const viewDetail = (id: number) => router.push({ name: 'detail', params: { id } })
</script>

<template>
  <div class="results-page">
    <header class="results-header">
      <div class="header-left">
        <button @click="goToHome" class="back-btn">
          <ArrowLeft :size="20" />
        </button>
        <div class="header-search">
          <Search class="search-icon" :size="18" />
          <input v-model="query" @keyup.enter="performSearch" placeholder="Search research..." />
        </div>
      </div>
      <div class="logo-small">
        <BookOpen :size="20" color="#10b981" />
        <span>Lumia</span>
      </div>
    </header>

    <main class="results-layout">
      <aside class="filters-sidebar">
        <h3>
          <Filter :size="16" /> Filters
        </h3>


        <div class="filter-group">
          <label>Project Type</label>
          <div class="filter-options">
            <span class="filter-tag" :class="{ active: selectedProjectType === '' }"
              @click="selectedProjectType = ''">All</span>
            <span v-for="pt in ['Capstone Project', 'Thesis']" :key="pt" class="filter-tag"
              :class="{ active: selectedProjectType === pt }" @click="selectedProjectType = pt">{{ pt }}</span>
          </div>
        </div>

        <div class="filter-group">
          <label>Degree Program</label>
          <div class="filter-options">
            <span class="filter-tag" :class="{ active: selectedDegree === '' }" @click="selectedDegree = ''">All</span>
            <span v-for="deg in ['BSCS', 'BSIT', 'BSIS', 'BSCpE']" :key="deg" class="filter-tag"
              :class="{ active: selectedDegree === deg }" @click="selectedDegree = deg">{{ deg }}</span>
          </div>
        </div>

        <div class="filter-group">
          <label>
            <Calendar :size="14" /> Similarity Threshold
          </label>
          <p class="threshold-info">Adjust the threshold to control the strictness or similarity of the search results.
          </p>
          <div class="range-container">
            <input type="range" v-model.number="threshold" min="0" max="1" step="0.05" class="threshold-slider" />
            <div class="range-labels">
              <span>Loose ({{ threshold }})</span>
              <span>Very Strict</span>
            </div>
          </div>
        </div>

        <div class="filter-group">
          <label>Year Range</label>
          <div class="year-range">
            <select v-model="minYear" class="year-select">
              <option :value="undefined">From</option>
              <option v-for="y in [2024, 2023, 2022, 2021, 2020]" :key="y" :value="y">{{ y }}</option>
            </select>
            <span class="year-to">to</span>
            <select v-model="maxYear" class="year-select">
              <option :value="undefined">To</option>
              <option v-for="y in [2024, 2023, 2022, 2021, 2020]" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>
      </aside>

      <section class="results-list">
        <div v-if="loading" class="loading-state">Searching the archives...</div>
        <div v-else-if="results.length === 0" class="empty-state">
          No matches found for "{{ query }}". Try broader terms.
        </div>

        <div v-for="res in results" :key="res.id" class="result-card" @click="viewDetail(res.id)">
          <div class="result-meta">
            <span class="type-tag">{{ res.payload.project_type }}</span>
            <span v-if="res.payload.degree_program && res.payload.degree_program !== 'N/A'" class="degree-tag">
              {{ res.payload.degree_program }}
            </span>
            <span class="score-tag">Match: {{ (res.score * 100).toFixed(0) }}%</span>
          </div>
          <h2>{{ res.payload.title }}</h2>
          <p class="authors">{{ res.payload.author }} • {{ res.payload.year }}</p>
          <p class="abstract-preview">{{ res.payload.abstract.substring(0, 200) }}...</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.results-page {
  background-color: #fcfcfc;
  min-height: 100vh;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  background: white;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
}

.header-search {
  display: flex;
  align-items: center;
  background: #f3f4f6;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  flex: 0 1 500px;
}

.header-search input {
  background: none;
  border: none;
  outline: none;
  width: 100%;
  padding-left: 0.5rem;
  font-size: 0.95rem;
}

.logo-small {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  color: #222;
}

.results-layout {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  gap: 3rem;
}

.filters-sidebar {
  width: 240px;
  flex-shrink: 0;
}

.filters-sidebar h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

.filter-group {
  margin-bottom: 2rem;
}

.filter-group label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.75rem;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tag {
  background: white;
  border: 1px solid #ddd;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.filter-tag:hover,
.filter-tag.active {
  border-color: #10b981;
  color: white;
  background: #10b981;
}

.range-container {
  padding: 0.5rem 0;
}

.threshold-slider {
  width: 100%;
  accent-color: #10b981;
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #888;
  margin-top: 0.25rem;
}

.threshold-info {
  font-size: 0.8rem;
  color: #888;
}

.year-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 0.9rem;
  cursor: pointer;
}

.year-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.year-to {
  font-size: 0.8rem;
  color: #888;
}

.results-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-card {
  background: white;
  border: 1px solid #eee;
  padding: 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.result-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-color: #10b981;
}

.result-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.dept-tag {
  background: #f0fdf4;
  color: #059669;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.type-tag {
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.degree-tag {
  background: #fff7ed;
  color: #c2410c;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.score-tag {
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.result-card h2 {
  font-size: 1.3rem;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.authors {
  color: #555;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.abstract-preview {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.6;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem;
  color: #888;
}
</style>
