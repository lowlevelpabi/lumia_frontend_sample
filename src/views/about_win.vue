<template>
  <div class="about-page">

    <!-- ══ HERO ══════════════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero__dot-grid" aria-hidden="true"></div>
      <div class="hero__inner">
        <div class="hero__masthead">
          <span class="masthead-rule"></span>
          <span class="masthead-label">Institutional Repository · Intelligence Layer</span>
          <span class="masthead-rule"></span>
        </div>
        <h1 class="hero__title">
          The Future of <em>Scholarship</em> Discovery.
        </h1>
        <p class="hero__sub">
          Lumia is an intelligent retrieval layer built for institutional research,
          leveraging OCR extraction and BERT-driven semantic vector search.
        </p>
      </div>
    </section>

    <!-- ══ MAIN: BENTO GRID ══════════════════════════════════════════ -->
    <main class="about-main">
      <div class="bento-grid">

        <!-- 01: SYSTEM OVERVIEW -->
        <section class="bento-card bento-card--hero">
          <div class="card-label">01 — System Overview</div>
          <h2 class="card-title">An AI-Enhanced Research Repository</h2>
          <div class="card-prose">
            <p>Lumia goes beyond traditional metadata inquiry. It builds a searchable index from the complete
              full-text of institutional submissions, allowing scholars to surface specific findings deep
              within document archives.</p>
            <p>The system was developed to solve the "dark data" problem in academia — where valuable research
              remains unsearchable because it is trapped within scanned PDFs or unindexed manuscripts.</p>
          </div>
          <div class="card-icon-bg">
            <BookOpen :size="120" />
          </div>
        </section>

        <!-- 02: THE PIPELINE -->
        <section class="bento-group bento-group--pipeline">
          <div class="group-header">
            <div class="card-label">02 — The Processing Pipeline</div>
            <h2 class="card-title">How Lumia Processes Knowledge</h2>
          </div>
          <div class="pipeline-row">
            <div class="step-card">
              <div class="step-num">I</div>
              <div class="step-header">
                <ScanLine :size="20" class="step-icon" />
                <h3>OCR Extraction</h3>
              </div>
              <p>Digital PDF submissions are processed via OCR to extract high-fidelity text layers.</p>
            </div>
            <div class="step-card">
              <div class="step-num">II</div>
              <div class="step-header">
                <Brain :size="20" class="step-icon" />
                <h3>Neural Classification</h3>
              </div>
              <p>Fine-tuned BERT models automatically classify documents by Dept, Degree, and Project Type.</p>
            </div>
            <div class="step-card">
              <div class="step-num">III</div>
              <div class="step-header">
                <FileJson :size="20" class="step-icon" />
                <h3>IMRAD Parsing</h3>
              </div>
              <p>Natural Language Inference (NLI) segments research into structural components for discovery.</p>
            </div>
            <div class="step-card">
              <div class="step-num">IV</div>
              <div class="step-header">
                <Network :size="20" class="step-icon" />
                <h3>Vector Discovery</h3>
              </div>
              <p>Queries are matched against document embeddings to find conceptually related content.</p>
            </div>
          </div>
        </section>

        <!-- 03: DISCOVERY — grid-area set inline to bypass Vue scoped CSS limitation -->
        <section class="bento-card bento-card--cap" style="grid-area: cap1">
          <div class="card-label">03 — Discovery</div>
          <h2 class="card-title">Contextual Alignment</h2>
          <p class="card-text">Results are ranked via Siamese BERT networks, ensuring that the most relevant
            research is always surfaced first, regardless of the specific keywords used.</p>
          <div class="tech-tags">
            <span class="tech-tag">BERT Classification</span>
            <span class="tech-tag">Vector Search</span>
          </div>
        </section>

        <!-- 04: VISIBILITY -->
        <section class="bento-card bento-card--cap" style="grid-area: cap2">
          <div class="card-label">04 — Visibility</div>
          <h2 class="card-title">Structural Highlights</h2>
          <p class="card-text">View AI-generated summaries of specific methodology or findings before
            downloading the full document through automated section highlights.</p>
          <div class="tech-tags">
            <span class="tech-tag">IMRAD Parsing</span>
            <span class="tech-tag">NLI Inference</span>
          </div>
        </section>

        <!-- SIDEBAR / CONTACT -->
        <aside class="bento-card bento-card--sidebar">
          <div class="card-label">Enquiries</div>
          <h2 class="card-title">Technical Correspondence</h2>
          <p class="sb-note">
            For evaluation feedback or institutional access requests, please contact the development team
            directly.
          </p>
          <a href="#" class="btn-primary">Contact the Team</a>
          <div class="sidebar-rule"></div>
          <div class="sb-meta">
            <span>Development Team</span>
            <span>Est. 2024</span>
          </div>
        </aside>

      </div>
    </main>

  </div>
</template>

<script setup lang="ts">
import { BookOpen, ScanLine, Brain, FileJson, Network } from 'lucide-vue-next'
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Source+Sans+3:wght@300;400;500;600&display=swap');

/* ── Design Tokens ───────────────────────────────── */
.about-page {
  --ink:        #181c18;
  --ink-2:      #3d4239;
  --ink-3:      #7a7f75;
  --rule:       #dfe0db;
  --surface:    #f5f5f2;
  --paper:      #ffffff;
  --green:      #00a651;
  --green-dk:   #007d3d;
  --hero-bg:    #0d1f12;

  font-family: 'Source Sans 3', sans-serif;
  background: var(--surface);
  color: var(--ink);
  min-height: 100vh;
}

/* ── Hero ────────────────────────────────────────── */
.hero {
  position: relative;
  background: var(--hero-bg);
  overflow: hidden;
  border-bottom: 3px solid var(--green);
  padding: 80px 24px 72px;
}

.hero__dot-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
}

.hero__inner {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.hero__masthead {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.masthead-rule {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.masthead-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--green);
  white-space: nowrap;
}

.hero__title {
  font-family: 'Lora', serif;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 600;
  line-height: 1.1;
  color: #f0ede6;
  margin: 0 0 24px;
}

.hero__title em {
  font-style: italic;
  color: #fff;
  font-weight: 400;
}

.hero__sub {
  font-size: 1.1rem;
  font-weight: 300;
  color: rgba(240, 237, 230, 0.62);
  max-width: 600px;
  line-height: 1.7;
  margin: 0 auto;
}

/* ── Bento Grid ──────────────────────────────────── */
.about-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 64px 24px 80px;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-areas:
    "hero     hero     hero"
    "pipeline pipeline pipeline"
    "cap1     cap2     sidebar";
  gap: 24px;
}

/* ── Bento Cards ─────────────────────────────────── */
.bento-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 32px;
  position: relative;
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s ease;
}

.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.08);
}

.bento-card--hero {
  grid-area: hero;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 300px;
}

/* cap1 and cap2 are set via inline style on the elements */

.bento-card--sidebar {
  grid-area: sidebar;
  background: var(--surface);
  border-color: var(--ink);
}

.bento-group--pipeline {
  grid-area: pipeline;
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 40px 32px;
}

/* ── Card Content ────────────────────────────────── */
.card-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--green);
  margin-bottom: 16px;
  display: block;
  position: relative;
  z-index: 1;
}

.card-title {
  font-family: 'Lora', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 18px;
  line-height: 1.25;
  position: relative;
  z-index: 1;
}

.card-prose {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--ink-2);
  max-width: 700px;
  position: relative;
  z-index: 1;
}

.card-prose p {
  margin-bottom: 12px;
}

.card-prose p:last-child {
  margin-bottom: 0;
}

.card-text {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--ink-2);
  margin-bottom: 20px;
}

.card-icon-bg {
  position: absolute;
  bottom: -20px;
  right: -20px;
  color: var(--surface);
  z-index: 0;
  pointer-events: none;
  transform: rotate(-15deg);
}

/* ── Pipeline ────────────────────────────────────── */
.group-header {
  margin-bottom: 0;
}

.pipeline-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 32px;
}

.step-card {
  padding: 20px;
  background: var(--surface);
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.3s;
}

.step-card:hover {
  border-color: var(--green);
}

.step-num {
  font-family: 'Lora', serif;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--green);
  margin-bottom: 12px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.step-icon {
  color: var(--ink);
  flex-shrink: 0;
}

.step-card h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  color: var(--ink);
}

.step-card p {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--ink-3);
  margin: 0;
}

/* ── Sidebar ─────────────────────────────────────── */
.sb-note {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--ink-2);
  margin-bottom: 24px;
}

.sidebar-rule {
  height: 1px;
  background: var(--rule);
  margin: 32px 0 20px;
}

.sb-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-3);
}

/* ── Tech Tags ───────────────────────────────────── */
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-3);
  border: 1px solid var(--rule);
  padding: 4px 10px;
  background: var(--paper);
}

/* ── Button ──────────────────────────────────────── */
.btn-primary {
  display: block;
  text-align: center;
  font-family: 'Source Sans 3', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 12px;
  background: var(--ink);
  color: #fff;
  border: 1.5px solid var(--ink);
  transition: background 0.2s, border-color 0.2s;
}

.btn-primary:hover {
  background: var(--green);
  border-color: var(--green);
}

/* ── Responsive ──────────────────────────────────── */
@media (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas:
      "hero     hero"
      "pipeline pipeline"
      "cap1     cap2"
      "sidebar  sidebar";
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 56px 20px 48px;
  }

  .pipeline-row {
    grid-template-columns: 1fr 1fr;
  }

  .bento-grid {
    grid-template-columns: 1fr;
    grid-template-areas: none;
  }

  /* Reset all grid-area assignments at mobile so inline styles don't conflict */
  .bento-card--hero,
  .bento-card--sidebar,
  .bento-group--pipeline {
    grid-area: auto;
  }

  .bento-card--hero {
    min-height: auto;
  }

  /* Override inline styles at mobile */
  .bento-card--cap {
    grid-area: auto !important;
  }
}

@media (max-width: 480px) {
  .about-main {
    padding: 40px 16px 60px;
  }

  .pipeline-row {
    grid-template-columns: 1fr;
  }

  .bento-card,
  .bento-group--pipeline {
    padding: 24px 20px;
  }
}
</style>
