<template>
  <div class="about-page">
    <!-- ══ HERO: Campus Background (mirrors home page style) ══════════════ -->
    <section class="hero-section">
      <!-- Background campus image -->
      <img src="/imus_campus_scaled.jpg" class="hero-bg" alt="Campus Background" />
      <div class="hero-overlay"></div>

      <!-- Floating green blobs -->
      <div class="hero-bg-shapes" aria-hidden="true">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
      </div>

      <!-- Hero Content -->
      <div class="hero-content">
        <!-- Masthead -->
        <div class="hero-masthead">
          <span class="masthead-rule"></span>
          <span class="masthead-label">Lumia · Research Retrieval System</span>
          <span class="masthead-rule"></span>
        </div>

        <h1 class="hero-title">About the System</h1>
        <p class="hero-subtitle">
          Lumia is an intelligent institutional repository that combines<br />
          OCR extraction, IMRAD parsing, and BERT-powered semantic search<br />
          to make academic research accessible, searchable, and discoverable.
        </p>

        <!-- Quick stat pills -->
        <div class="hero-stats">
          <div class="stat-pill">
            <BookOpen :size="14" />
            <span>Research Repository</span>
          </div>
          <div class="stat-pill">
            <Brain :size="14" />
            <span>BERT Semantic Search</span>
          </div>
          <div class="stat-pill">
            <ScanLine :size="14" />
            <span>OCR + IMRAD Engine</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ SYSTEM DETAILS ═══════════════════════════════════════════════════ -->
    <section class="about-section">
      <div class="about-container">
        <!-- Section Header -->
        <div class="section-head">
          <span class="section-eyebrow">What We Built?</span>
          <h2 class="section-title">A Smart AI-driven academic retrieval archive</h2>
          <p class="section-sub">
            Designed to solve the "dark data" problem in DCS — difficulty of accessing public and
            published thesis and manual searching of papers in the department.
          </p>
        </div>

        <!-- Feature Cards (3-column) -->
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feat-icon-wrap green">
              <ScanLine :size="22" />
            </div>
            <h3 class="feat-title">OCR Extraction</h3>
            <p class="feat-body">
              Full-text is extracted from scanned thesis PDFs using high-fidelity Optical Character
              Recognition, making every word in every document searchable.
            </p>
          </div>
          <div class="feature-card">
            <div class="feat-icon-wrap teal">
              <FileJson :size="22" />
            </div>
            <h3 class="feat-title">IMRAD Structuring</h3>
            <p class="feat-body">
              Natural Language Inference (NLI) automatically segments documents into Introduction,
              Methodology, Results, and Discussion sections for structured access.
            </p>
          </div>
          <div class="feature-card">
            <div class="feat-icon-wrap emerald">
              <Network :size="22" />
            </div>
            <h3 class="feat-title">BERT Semantic Search</h3>
            <p class="feat-body">
              Queries are matched against document embeddings via Siamese BERT networks, surfacing
              conceptually relevant research even without exact keyword matches.
            </p>
          </div>
        </div>

        <!-- Processing Pipeline (horizontal steps) -->
        <div class="pipeline-section">
          <div class="section-head" style="text-align: center; margin-bottom: 2.5rem">
            <span class="section-eyebrow">How It Works?</span>
            <h2 class="section-title">The Processing Pipeline</h2>
          </div>
          <div class="pipeline-steps">
            <div class="pipeline-step">
              <div class="p-step-num">I</div>
              <div class="p-step-body">
                <h4>Document Submission</h4>
                <p>
                  Faculty or students upload thesis PDFs through the upload portal with metadata.
                </p>
              </div>
            </div>
            <div class="pipeline-arrow"><ChevronRight :size="18" /></div>
            <div class="pipeline-step">
              <div class="p-step-num">II</div>
              <div class="p-step-body">
                <h4>OCR Processing</h4>
                <p>Full text is extracted from PDFs including scanned pages via the OCR engine.</p>
              </div>
            </div>
            <div class="pipeline-arrow"><ChevronRight :size="18" /></div>
            <div class="pipeline-step">
              <div class="p-step-num">III</div>
              <div class="p-step-body">
                <h4>IMRAD Classification</h4>
                <p>The extracted text is segmented into structured IMRAD components using NLI.</p>
              </div>
            </div>
            <div class="pipeline-arrow"><ChevronRight :size="18" /></div>
            <div class="pipeline-step">
              <div class="p-step-num">IV</div>
              <div class="p-step-body">
                <h4>Vector Indexing</h4>
                <p>BERT embeddings are generated and indexed in the Qdrant vector database.</p>
              </div>
            </div>
            <div class="pipeline-arrow"><ChevronRight :size="18" /></div>
            <div class="pipeline-step">
              <div class="p-step-num">V</div>
              <div class="p-step-body">
                <h4>Semantic Discovery</h4>
                <p>Users query the system and receive ranked, contextually relevant results.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ MEET THE TEAM ════════════════════════════════════════════════════ -->
    <section class="team-section">
      <div class="about-container">
        <div class="section-head" style="text-align: center">
          <span class="section-eyebrow">Who We Are</span>
          <h2 class="section-title">Meet the Developers</h2>
          <p class="section-sub">
            The team behind Lumia — students of the Department of Computer Science.
          </p>
        </div>

        <div class="team-grid">
          <div class="team-card" v-for="dev in developers" :key="dev.name">
            <div class="team-card-img-wrap">
              <img v-if="dev.image" :src="dev.image" :alt="dev.name" class="team-photo" />
              <div v-else class="team-avatar" :style="{ background: dev.color }">
                <span class="avatar-initials">{{ dev.initials }}</span>
              </div>
              <div class="team-card-glow" :style="{ background: dev.color }"></div>
            </div>
            <div class="team-card-body">
              <h3 class="dev-name">{{ dev.name }}</h3>
              <span class="dev-course">{{ dev.course }}</span>
              <blockquote class="dev-quote">"{{ dev.quote }}"</blockquote>
              <div class="dev-role-pill">
                <span>{{ dev.role }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ SYSTEM VERSION & CHANGELOG ═══════════════════════════════════════ -->
    <section class="changelog-section" id="system-info">
      <div class="about-container">
        <div class="section-head" style="text-align: center">
          <span class="section-eyebrow">System Information</span>
          <h2 class="section-title">Version History & Changelog</h2>
          <p class="section-sub" v-if="systemInfo">
            Official Turnover Version: <strong>v{{ systemInfo.version }}</strong> &bull; Released on {{ systemInfo.release_date }} &bull; Department: {{ systemInfo.department }}
          </p>
        </div>

        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <span>Fetching release details from backend...</span>
        </div>

        <div v-else-if="systemInfo && systemInfo.changelog" class="changelog-timeline">
          <div class="timeline-item" v-for="entry in systemInfo.changelog" :key="entry.version">
            <div class="timeline-badge-wrap">
              <div class="timeline-version-badge">v{{ entry.version }}</div>
              <div class="timeline-line"></div>
            </div>
            
            <div class="timeline-content-card">
              <div class="card-header-row">
                <h3 class="changelog-title">{{ entry.title }}</h3>
                <span class="changelog-date">{{ entry.date }}</span>
              </div>
              <ul class="changelog-list">
                <li v-for="(change, idx) in entry.changes" :key="idx">
                  <span class="bullet-dot"></span>
                  <span class="change-text">{{ change }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div v-else class="error-state">
          <p>Failed to connect to the backend metadata service. Dynamic version checking is unavailable.</p>
        </div>
      </div>
    </section>

    <!-- ══ FOOTER CTA ═══════════════════════════════════════════════════════ -->
    <section class="cta-section">
      <div class="cta-inner">
        <h2 class="cta-title">Start Exploring the Archive</h2>
        <p class="cta-sub">
          Discover thousands of theses and research papers from the institution's departments.
        </p>
        <RouterLink :to="{ name: 'explore' }" class="cta-btn">
          <Search :size="16" />
          Browse Research
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  BookOpen,
  ScanLine,
  Brain,
  FileJson,
  Network,
  ChevronRight,
  Search,
} from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { api, type SystemInfo } from "../services/api";

const systemInfo = ref<SystemInfo | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    systemInfo.value = await api.getSystemInfo();
  } catch (error) {
    console.error("Failed to load system version/changelog from backend:", error);
  } finally {
    isLoading.value = false;
  }
});

const developers = [
  {
    name: "Author 1 Full Name",
    initials: "A1",
    image: "",
    course: "BS Computer Science",
    role: "Documentation · Roadmap Planner",
    quote: "Your quote or motto here.",
    color: "linear-gradient(135deg, #00a651 0%, #007d3d 100%)",
  },
  {
    name: "RYAN ANDREW A. REYES",
    initials: "RR",
    image: "",
    course: "BS Computer Science",
    role: "Lead Developer · UI/UX · Document",
    quote: "Kung di mo kaya, wag mo gawin. Maging irregular ka na lang para welcome to the club!",
    color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  {
    name: "Author 3 Full Name",
    initials: "A3",
    course: "BS Computer Science",
    role: "EWAN, DI KO ALAM",
    quote: "Your quote or motto here.",
    color: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
  },
];
</script>

<style scoped>
/* ── Design Tokens ───────────────────────────────── */
.about-page {
  --ink: var(--text-primary);
  --ink-2: var(--text-secondary);
  --ink-3: var(--text-tertiary);
  --rule: var(--border-color);
  --surface: var(--bg-primary);
  --paper: var(--bg-secondary);
  --green: var(--accent-primary);
  --green-dk: #007d3d;
  --green-dim: rgba(0, 166, 81, 0.1);

  font-family: "Inter", sans-serif;
  background: var(--surface);
  color: var(--ink);
  min-height: 100vh;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

/* ══ HERO SECTION (campus bg, matches home page style) ══════════════ */
.hero-section {
  position: relative;
  width: 100%;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 120px 24px 80px;
  background-color: var(--surface);
  box-sizing: border-box;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 50%;
  width: 115%;
  height: 115%;
  transform: translateX(-50%);
  object-fit: cover;
  object-position: top;
  z-index: 1;
  pointer-events: none;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 166, 81, 0.08) 0%,
    rgba(255, 255, 255, 0.55) 45%,
    var(--bg-primary) 100%
  );
  z-index: 2;
  pointer-events: none;
  transition: background 0.3s ease;
}

.dark .hero-overlay {
  background: linear-gradient(
    180deg,
    rgba(0, 200, 83, 0.15) 0%,
    rgba(10, 10, 10, 0.55) 50%,
    var(--bg-primary) 100%
  );
}

.hero-bg-shapes {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.floating-shape {
  position: absolute;
  background: linear-gradient(135deg, var(--green) 0%, transparent 80%);
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.14;
  pointer-events: none;
}

.shape-1 {
  width: 450px;
  height: 450px;
  top: -10%;
  left: -5%;
  animation: float-s1 9s ease-in-out infinite alternate;
}
.shape-2 {
  width: 380px;
  height: 380px;
  bottom: 10%;
  right: -5%;
  opacity: 0.1;
  animation: float-s2 11s ease-in-out infinite alternate;
}
.shape-3 {
  width: 280px;
  height: 280px;
  top: 30%;
  left: 55%;
  opacity: 0.07;
  animation: float-s3 8s ease-in-out infinite alternate;
}

@keyframes float-s1 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(20px, -20px) scale(1.06);
  }
}
@keyframes float-s2 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(-15px, 15px) scale(0.94);
  }
}
@keyframes float-s3 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(15px, 12px) scale(1.08);
  }
}

/* Hero Content */
.hero-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 820px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-masthead {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  width: 100%;
  justify-content: center;
  opacity: 0;
  animation: fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.1s;
}

.masthead-rule {
  flex: 1;
  max-width: 55px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--green), transparent);
}

.masthead-label {
  font-family: "Schibsted Grotesk", sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--green);
  text-shadow: 0 0 8px rgba(0, 166, 81, 0.2);
}

.hero-title {
  font-family: "Lora", Georgia, serif;
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  font-weight: 700;
  line-height: 1.2;
  color: var(--ink);
  margin: 0 0 1.25rem;
  opacity: 0;
  animation: fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.3s;
}

.dark .hero-title {
  color: #ffffff;
}

.hero-subtitle {
  font-family: "Source Sans 3", sans-serif;
  font-size: 1.05rem;
  line-height: 1.75;
  color: var(--ink-2);
  margin: 0 0 2rem;
  max-width: 640px;
  opacity: 0;
  animation: fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.45s;
}

.dark .hero-subtitle {
  color: rgba(255, 255, 255, 0.75);
}

/* Hero stat pills */
.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  opacity: 0;
  animation: fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.6s;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  border-radius: 100px;
  background: rgba(0, 166, 81, 0.08);
  border: 1px solid rgba(0, 166, 81, 0.18);
  color: var(--green-dk);
  font-family: "Inter", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.dark .stat-pill {
  background: rgba(0, 200, 83, 0.1);
  border-color: rgba(0, 200, 83, 0.2);
  color: #00c853;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ══ SHARED SECTION LAYOUT ════════════════════════════════════ */
.about-section {
  padding: 5rem 0;
  background: var(--surface);
}

.about-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2.5rem;
}

.section-head {
  margin-bottom: 3rem;
}

.section-eyebrow {
  display: inline-block;
  font-family: "Inter", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--green);
  margin-bottom: 0.6rem;
}

.section-title {
  font-family: "Lora", Georgia, serif;
  font-size: clamp(1.65rem, 3vw, 2.15rem);
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.75rem;
  line-height: 1.25;
}

.section-sub {
  font-family: "Source Sans 3", sans-serif;
  font-size: 1rem;
  color: var(--ink-2);
  line-height: 1.7;
  max-width: 600px;
  margin: 0 auto;
}

/* ── Feature Cards (3-column grid) ────────────────────────── */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 4rem;
}

.feature-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 18px;
  padding: 2rem 1.75rem;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgba(0, 166, 81, 0.07);
  border-color: rgba(0, 166, 81, 0.25);
}

.dark .feature-card {
  background: rgba(18, 18, 18, 0.7);
  border-color: rgba(255, 255, 255, 0.06);
}

.feat-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.feat-icon-wrap.green {
  background: rgba(0, 166, 81, 0.1);
  color: #00a651;
}
.feat-icon-wrap.teal {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.feat-icon-wrap.emerald {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.feat-title {
  font-family: "Lora", Georgia, serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.65rem;
}

.feat-body {
  font-family: "Source Sans 3", sans-serif;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--ink-2);
  margin: 0;
}

/* ── Processing Pipeline ───────────────────────────────────── */
.pipeline-section {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 20px;
  padding: 3rem 2.5rem;
}

.dark .pipeline-section {
  background: rgba(18, 18, 18, 0.5);
  border-color: rgba(255, 255, 255, 0.06);
}

.pipeline-steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
  flex-wrap: wrap;
  row-gap: 1.5rem;
}

.pipeline-step {
  flex: 1;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 0 1rem;
}

.p-step-num {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--green-dim);
  border: 2px solid rgba(0, 166, 81, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Lora", serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--green);
  flex-shrink: 0;
}

.p-step-body h4 {
  font-family: "Inter", sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.3rem;
}

.p-step-body p {
  font-family: "Source Sans 3", sans-serif;
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--ink-3);
  margin: 0;
}

.pipeline-arrow {
  color: var(--green);
  opacity: 0.5;
  display: flex;
  align-items: center;
  padding-top: 0.9rem;
  flex-shrink: 0;
}

/* ══ MEET THE TEAM ════════════════════════════════════════════ */
.team-section {
  padding: 5rem 0;
  background: var(--paper);
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}

.dark .team-section {
  background: rgba(10, 10, 10, 0.4);
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.75rem;
  margin-top: 3rem;
}

.team-card {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.team-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 45px rgba(0, 166, 81, 0.09);
  border-color: rgba(0, 166, 81, 0.2);
}

.dark .team-card {
  background: rgba(18, 18, 18, 0.8);
  border-color: rgba(255, 255, 255, 0.06);
}

/* Avatar header area */
.team-card-img-wrap {
  position: relative;
  height: 260px; /* ← increased from 200px */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  overflow: hidden;
}

.team-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top; /* ← keeps face visible */
  z-index: 2;
}

.dark .team-card-img-wrap {
  background: rgba(25, 25, 25, 0.9);
}

.team-card-glow {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  pointer-events: none;
}

.team-avatar {
  position: relative;
  z-index: 2;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  border: 3px solid rgba(255, 255, 255, 0.25);
}

.avatar-initials {
  font-family: "Lora", serif;
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Card body */
.team-card-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.dev-name {
  font-family: "Lora", Georgia, serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.dev-course {
  font-family: "Inter", sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dev-quote {
  font-family: "Lora", Georgia, serif;
  font-size: 0.88rem;
  font-style: italic;
  line-height: 1.6;
  color: var(--ink-2);
  margin: 0.5rem 0;
  padding-left: 1rem;
  border-left: 2px solid rgba(0, 166, 81, 0.3);
}

.dev-role-pill {
  margin-top: auto;
  padding-top: 0.75rem;
}

.dev-role-pill span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: "Inter", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-3);
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 0.3rem 0.7rem;
  border-radius: 100px;
}

.dark .dev-role-pill span {
  background: rgba(25, 25, 25, 0.8);
}

/* ══ FOOTER CTA ═══════════════════════════════════════════════ */
.cta-section {
  padding: 5rem 2.5rem;
  text-align: center;
  background: var(--surface);
}

.cta-inner {
  max-width: 580px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.cta-title {
  font-family: "Lora", Georgia, serif;
  font-size: clamp(1.65rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--ink);
  margin: 0;
  line-height: 1.25;
}

.cta-sub {
  font-family: "Source Sans 3", sans-serif;
  font-size: 1rem;
  color: var(--ink-2);
  line-height: 1.7;
  margin: 0;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.8rem 2rem;
  background: var(--green);
  color: #ffffff;
  border-radius: 100px;
  text-decoration: none;
  font-family: "Inter", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 6px 20px rgba(0, 166, 81, 0.25);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0, 166, 81, 0.35);
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 1024px) {
  .feature-grid,
  .team-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .feature-grid,
  .team-grid {
    grid-template-columns: 1fr;
  }

  .pipeline-steps {
    flex-direction: column;
    align-items: stretch;
  }

  .pipeline-step {
    align-items: flex-start;
    text-align: left;
    flex-direction: row;
    padding: 0;
  }

  .pipeline-arrow {
    display: none;
  }

  .hero-section {
    padding: 100px 20px 60px;
  }

  .about-container {
    padding: 0 1.25rem;
  }
}

@media (max-width: 480px) {
  .hero-stats {
    flex-direction: column;
    align-items: center;
  }
}

/* ── Changelog Section ────────────────────────────────────── */
.changelog-section {
  padding: 5rem 0;
  background: var(--surface);
  border-top: 1px solid var(--rule);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  color: var(--ink-2);
  font-family: "Inter", sans-serif;
  font-size: 0.95rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--rule);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.changelog-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 2rem;
  align-items: stretch;
}

.timeline-badge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 70px;
  flex-shrink: 0;
}

.timeline-version-badge {
  font-family: "Schibsted Grotesk", sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--green);
  background: rgba(0, 166, 81, 0.08);
  border: 1px solid rgba(0, 166, 81, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 100px;
  text-align: center;
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.05);
}

.dark .timeline-version-badge {
  background: rgba(0, 200, 83, 0.12);
  border-color: rgba(0, 200, 83, 0.25);
  color: #00c853;
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: var(--rule);
  margin-top: 0.75rem;
  border-radius: 2px;
}

.timeline-item:last-child .timeline-line {
  display: none;
}

.timeline-content-card {
  flex: 1;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.dark .timeline-content-card {
  background: rgba(18, 18, 18, 0.7);
  border-color: rgba(255, 255, 255, 0.05);
}

.timeline-content-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 166, 81, 0.2);
  box-shadow: 0 8px 24px rgba(0, 166, 81, 0.05);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.changelog-title {
  font-family: "Lora", Georgia, serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.changelog-date {
  font-family: "Inter", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-3);
}

.changelog-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.changelog-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.bullet-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
  margin-top: 0.55rem;
  flex-shrink: 0;
}

.change-text {
  font-family: "Source Sans 3", sans-serif;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--ink-2);
}

@media (max-width: 768px) {
  .timeline-item {
    flex-direction: column;
    gap: 0.75rem;
  }
  .timeline-badge-wrap {
    flex-direction: row;
    width: auto;
    align-items: center;
    gap: 1rem;
  }
  .timeline-line {
    display: none !important;
  }
}
</style>
