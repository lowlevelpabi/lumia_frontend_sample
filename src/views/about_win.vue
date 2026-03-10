<template>
  <div class="about-page">

    <!-- HERO -->
    <section class="hero">
      <div class="hero__dot-grid" aria-hidden="true" />
      <div class="hero__inner">
        <div class="hero__masthead-rule" />
        <p class="hero__overline">About</p>
        <h1 class="hero__title">
          Lumia<br />
          <span class="hero__title--accent">Retrieval System.</span>
        </h1>
        <p class="hero__sub">
          Full-text retrieval across thesis, capstone projects, and research
          from the institution's indexed collection.
        </p>
      </div>
    </section>

    <!-- MAIN -->
    <main class="about-main">
      <div class="about-grid">

        <!-- LEFT BODY -->
        <div class="about-body">

          <!-- 01 -->
          <section class="es">
            <header class="es__header"><span class="es__label">01 — System Overview</span></header>
            <h2 class="es__title">Purpose and Scope</h2>
            <div class="es__prose">
              <p>Lumia is a full-text retrieval system built for institutional academic collections. It provides a unified search interface for thesis submissions, capstone projects, and research outputs deposited within the institution's repository.</p>
              <p>The system was developed to address gaps in existing retrieval tools — specifically, the inability to search across document full-text and return results ranked by contextual relevance rather than metadata alone.</p>
            </div>
          </section>

          <div class="h-rule" />

          <!-- 02 -->
          <section class="es">
            <header class="es__header"><span class="es__label">02 — Design Principles</span></header>
            <h2 class="es__title">Guiding Criteria</h2>
            <ol class="principles">
              <li class="principles__item">
                <span class="principles__idx">I</span>
                <div class="principles__body">
                  <h3 class="principles__heading">Precision over volume</h3>
                  <p class="principles__text">Results are ranked and filtered for contextual relevance, not quantity. The system surfaces fewer, more appropriate results rather than exhaustive matches.</p>
                </div>
              </li>
              <li class="principles__item">
                <span class="principles__idx">II</span>
                <div class="principles__body">
                  <h3 class="principles__heading">Contextual integrity</h3>
                  <p class="principles__text">Each result includes full document metadata — author, programme, year, and access status — so that source authority can be assessed without leaving the interface.</p>
                </div>
              </li>
              <li class="principles__item">
                <span class="principles__idx">III</span>
                <div class="principles__body">
                  <h3 class="principles__heading">Transparency</h3>
                  <p class="principles__text">No personalisation or recommendation mechanisms are applied. Ranking is deterministic and based solely on documented relevance criteria.</p>
                </div>
              </li>
              <li class="principles__item">
                <span class="principles__idx">IV</span>
                <div class="principles__body">
                  <h3 class="principles__heading">Institutional access</h3>
                  <p class="principles__text">The system indexes only materials deposited within the institution's collection. Access status is displayed clearly for each document in the result set.</p>
                </div>
              </li>
            </ol>
          </section>

          <div class="h-rule" />

          <!-- 03 -->
          <section class="es">
            <header class="es__header"><span class="es__label">03 — Technical Architecture</span></header>
            <h2 class="es__title">Retrieval Methodology</h2>
            <div class="es__prose">
              <p>The retrieval engine uses a hybrid approach — full-text keyword indexing combined with semantic vector search — allowing the system to match both exact terms and conceptually related content within a single query.</p>
              <p>Results are ranked by relevance score, recency, and document type. The index updates on a rolling basis as new submissions are deposited into the institutional repository.</p>
            </div>
            <div class="tech-tags">
              <span class="tech-tag">Full-Text Indexing</span>
              <span class="tech-tag">Semantic Search</span>
              <span class="tech-tag">Relevance Ranking</span>
              <span class="tech-tag">Institutional Repository</span>
              <span class="tech-tag">Vue 3 + TypeScript</span>
            </div>
          </section>

          <div class="h-rule" />

          <!-- 04 -->
          <section class="es">
            <header class="es__header"><span class="es__label">04 — Development Team</span></header>
            <h2 class="es__title">Institutional Background</h2>
            <div class="es__prose">
              <p>Lumia was developed by a student research team as part of a capstone project in partial fulfilment of degree requirements, under faculty supervision and evaluated against institutional repository access needs.</p>
              <p>The project is submitted for formal system evaluation by the faculty panel. All source code, documentation, and test data are available for review upon request.</p>
            </div>
          </section>

        </div>

        <!-- SIDEBAR -->
        <aside class="sidebar">
          <div class="sb-block">
            <div class="sb-block__rule" />
            <span class="sb-block__label">Enquiries</span>
            <p class="sb-note">
              For evaluation feedback, institutional access requests, or technical
              correspondence regarding this system, please contact the development
              team directly.
            </p>
            <a href="#" class="btn-primary">Contact the Team</a>
          </div>
        </aside>

      </div>
    </main>

    <!-- FOOTER -->
    <footer class="about-footer">
      <div class="about-footer__inner">
        <div class="about-footer__top-rule" />
        <p class="about-footer__wordmark">Lumia</p>
        <p class="about-footer__desc">
          Lumia is an institutional research retrieval system developed to support
          full-text discovery across thesis, capstone, and research submissions
          within the university's indexed collection. Built for academic evaluation,
          designed for clarity, and committed to surfacing relevant scholarship
          without friction.
        </p>
        <p class="about-footer__copy">
          © {{ new Date().getFullYear() }} Lumia Research Systems.&ensp;Developed for academic use.
        </p>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
// Static About page — no props or reactive state required.
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Source+Sans+3:wght@300;400;600&display=swap');

.about-page {
  --ink:      #181c18; --ink-2: #3d4239; --ink-3: #7a7f75;
  --rule:     #dfe0db; --surface: #f5f5f2; --paper: #ffffff;
  --green:    #00a651; --green-dk: #007d3d;
  --hero-bg:  #0d1f12;
  font-family: 'Source Sans 3', sans-serif;
  background: var(--surface);
  color: var(--ink);
  min-height: 100vh;
}

.hero { position: relative; background: var(--hero-bg); overflow: hidden; border-bottom: 3px solid var(--green); }
.hero__dot-grid { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 22px 22px; pointer-events: none; }
.hero__inner { position: relative; max-width: 1100px; margin: 0 auto; padding: 56px 48px 52px; }
.hero__masthead-rule { width: 100%; height: 1px; background: rgba(255,255,255,0.15); margin-bottom: 36px; }
.hero__overline { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--green); margin: 0 0 14px; }
.hero__title { font-family: 'Lora', serif; font-size: clamp(1.9rem, 3.5vw, 2.75rem); font-weight: 600; line-height: 1.2; color: #f0ede6; margin: 0 0 22px; }
.hero__title--accent { font-style: italic; color: #f0ede6; }
.hero__sub { font-size: 1rem; font-weight: 300; color: rgba(240,237,230,0.62); max-width: 580px; line-height: 1.7; margin: 0; }

.about-main { max-width: 1100px; margin: 0 auto; padding: 56px 48px 72px; }
.about-grid { display: grid; grid-template-columns: 1fr 240px; gap: 64px; align-items: start; }

.es__header { border-top: 2px solid var(--ink); padding-top: 20px; margin-bottom: 14px; }
.es__label { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-3); }
.es__title { font-family: 'Lora', serif; font-size: 1.2rem; font-weight: 600; color: var(--ink); margin: 0 0 12px; line-height: 1.3; }
.es__prose { font-size: 0.95rem; line-height: 1.75; color: var(--ink-2); }
.es__prose p { margin: 0 0 10px; }
.es__prose p:last-child { margin-bottom: 0; }

.h-rule { height: 1px; background: var(--rule); margin: 36px 0; }

.principles { list-style: none; margin: 4px 0 0; padding: 0; }
.principles__item { display: flex; gap: 18px; padding: 16px 0; border-bottom: 1px solid var(--rule); }
.principles__item:first-child { border-top: 1px solid var(--rule); }
.principles__idx { font-family: 'Lora', serif; font-size: 0.75rem; font-style: italic; color: var(--green); min-width: 24px; padding-top: 2px; }
.principles__heading { font-family: 'Lora', serif; font-size: 0.97rem; font-weight: 600; color: var(--ink); margin: 0 0 4px; }
.principles__text { font-size: 0.9rem; line-height: 1.65; color: var(--ink-2); margin: 0; }

.tech-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.tech-tag { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-2); border: 1.5px solid var(--rule); padding: 4px 10px; background: var(--paper); }

.sidebar { position: sticky; top: 32px; display: flex; flex-direction: column; gap: 28px; }
.sb-block__rule { height: 2px; background: var(--ink); margin-bottom: 14px; }
.sb-block__label { display: block; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 12px; }
.sb-note { font-size: 0.85rem; line-height: 1.65; color: var(--ink-3); margin: 0 0 16px; }

.btn-primary { display: inline-block; font-family: 'Source Sans 3', sans-serif; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; text-decoration: none; padding: 9px 18px; background: var(--green); color: #fff; border: 1.5px solid var(--green); cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.btn-primary:hover { background: var(--green-dk); border-color: var(--green-dk); }

.about-footer { background: var(--hero-bg); border-top: 3px solid var(--green); }
.about-footer__inner { max-width: 1100px; margin: 0 auto; padding: 48px 48px 44px; }
.about-footer__top-rule { width: 100%; height: 1px; background: rgba(255,255,255,0.10); margin-bottom: 32px; }
.about-footer__wordmark { font-family: 'Lora', serif; font-size: 1.1rem; font-weight: 600; font-style: italic; color: var(--green); margin: 0 0 14px; letter-spacing: 0.04em; }
.about-footer__desc { font-size: 0.9rem; font-weight: 300; line-height: 1.8; color: rgba(240,237,230,0.58); max-width: 680px; margin: 0 0 22px; }
.about-footer__copy { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.28); margin: 0; }

@media (max-width: 820px) {
  .about-grid { grid-template-columns: 1fr; gap: 48px; }
  .sidebar { position: static; }
  .hero__inner, .about-main, .about-footer__inner { padding-left: 24px; padding-right: 24px; }
}
</style>
