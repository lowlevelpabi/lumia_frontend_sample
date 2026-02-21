<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Search, BookOpen, User, ArrowRight, Settings } from 'lucide-vue-next'

const router = useRouter()
const searchQuery = ref('')
const isLoggedIn = ref(false)

onMounted(() => {
  isLoggedIn.value = !!localStorage.getItem('token')
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'results', query: { q: searchQuery.value } })
  }
}
</script>

<template>
  <div class="home-page">
    <!-- Simple Navbar -->
    <nav class="navbar">
      <div class="logo">
        <BookOpen :size="24" color="#10b981" />
        <span>Lumia BERT Research Retrieval</span>
      </div>
      <div class="nav-links">
        <a href="#" class="nav-link">Explore</a>
        <a href="#" class="nav-link">About</a>
        <RouterLink v-if="!isLoggedIn" :to="{ name: 'login' }" class="login-btn">
          <User :size="18" />Login
        </RouterLink>
        <RouterLink v-else :to="{ name: 'management' }" class="login-btn manage">
          <Settings :size="18" />Manage
        </RouterLink>
      </div>
    </nav>

    <!-- Main Hero -->
    <main class="hero">
      <div class="hero-content">
        <h1>Advanced Research Archiving</h1>
        <p>Access digitalized thesis books on the go with Lumia-BERT!</p>

        <div class="search-container">
          <div class="search-bar">
            <Search :size="20" class="search-icon" />
            <input v-model="searchQuery" type="text" placeholder="Try searching using context, title, topics..."
              class="search-input" @keyup.enter="handleSearch" />
            <button class="search-btn" @click="handleSearch">
              <ArrowRight :size="20" />
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Stats Section
    <section class="stats">
      <div class="stat-card">
        <h3>1.2M+</h3>
        <p>Papers indexed</p>
      </div>
      <div class="stat-card">
        <h3>50k+</h3>
        <p>Active authors</p>
      </div>
      <div class="stat-card">
        <h3>200+</h3>
        <p>Departments</p>
      </div>
    </section>
     -->
  </div>
</template>

<style scoped>
.home-page {
  font-family: 'Inter', -apple-system, sans-serif;
  color: #1a1a1a;
  background-color: #fff;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 800;
  font-size: 1.25rem;
  color: #111;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: #666;
  font-weight: 600;
  font-size: 0.9rem;
}

.nav-link:hover {
  color: #10b981;
}

.login-btn {
  background-color: #f3f4f6;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #374151;
  text-decoration: none;
}

.login-btn.manage {
  background-color: #ecfdf5;
  color: #047857;
}

.login-btn:hover {
  background-color: #e5e7eb;
}

.hero {
  padding: 8rem 2rem;
  text-align: center;
}

.hero-content h1 {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.02rem;
  margin-bottom: 1rem;
}

.hero-content p {
  font-size: 1.25rem;
  color: #666;
  max-width: 600px;
  margin: 0 auto 3rem;
}

.search-container {
  display: flex;
  justify-content: center;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 23px;
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  width: 100%;
  max-width: 700px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s;
}

.search-bar:focus-within {
  border-color: #10b981;
}

.search-icon {
  color: #999;
}

.search-input {
  border: none;
  padding: 0.75rem 1rem;
  flex: 1;
  font-size: 1.1rem;
  outline: none;
}

.search-btn {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 9999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}

.search-btn:active {
  transform: scale(0.95);
}

.stats {
  display: flex;
  justify-content: center;
  gap: 4rem;
  padding: 4rem 2rem;
  border-top: 1px solid #eee;
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card h3 {
  font-size: 2rem;
  font-weight: 800;
  color: #111;
}

.stat-card p {
  color: #666;
  font-weight: 600;
}
</style>
