<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next'
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">

      <div class="footer-grid">

        <!-- Brand -->
        <div class="footer-brand">
          <RouterLink to="/" class="footer-logo">
            <div class="logo-icon">
              <BookOpen :size="17" color="#fff" stroke-width="2.5" />
            </div>
            <span class="logo-text">LUMIA</span>
          </RouterLink>
          <p class="brand-desc">
            An institutional research repository with full-text retrieval,
            BERT-NLP semantic search, and IMRAD-aware deep indexing.
          </p>
        </div>

        <!-- Collection -->
        <div class="footer-col">
          <h4 class="col-title">Collection</h4>
          <ul class="col-links">
            <li>
              <RouterLink :to="{ name: 'results', query: { q: '' } }">Browse All</RouterLink>
            </li>
            <li>
              <RouterLink :to="{ name: 'results', query: { q: 'Thesis' } }">Theses</RouterLink>
            </li>
            <li>
              <RouterLink :to="{ name: 'results', query: { q: 'Capstone' } }">Capstone Projects</RouterLink>
            </li>
          </ul>
        </div>

        <!-- Institutional section || Optional - can be uncommented and customized as needed -->
        <!--
        <div class="footer-col">
          <h4 class="col-title">Institution</h4>
          <ul class="col-links">
            <li><a href="https://cvsu.edu.ph" target="_blank" rel="noopener">Cavite State University</a></li>
            <li><a href="#">Department of Computer Science</a></li>
            <li><a href="#">University Library</a></li>
          </ul>
        </div>
         -->

      </div>

      <!-- Bottom bar -->
      <div class="footer-bottom">
        <span class="copyright">
          &copy; {{ new Date().getFullYear() }} Lumia · Institutional Research Repository
        </span>
        <span class="powered">
          Powered by <em>BERT-NLP</em>
        </span>
      </div>

    </div>
  </footer>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;1,600&family=Source+Sans+3:wght@400;600;700&display=swap');

.site-footer {
  background: #0d1f12;
  border-top: 3px solid #00a651;
  padding: 3.5rem 2rem 2rem;
  margin-top: auto;
  font-family: 'Source Sans 3', sans-serif;
  position: relative;
}

/* Subtle dot-grid — matches hero */
.site-footer::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.footer-inner {
  max-width: 1080px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Grid */
.footer-grid {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr;
  gap: 3rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1.75rem;
}

/* Brand col */
.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  margin-bottom: 1.1rem;
}

.logo-icon {
  background: #00a651;
  width: 32px;
  height: 32px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #fff;
}

.brand-desc {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.7;
  margin: 0;
  max-width: 300px;
}

/* Link columns */
.col-title {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.col-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.col-links a {
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.48);
  text-decoration: none;
  transition: color 0.14s, padding-left 0.14s;
  display: block;
  padding: 0.1rem 0;
}

.col-links a:hover {
  color: #fff;
  padding-left: 4px;
}

/* Bottom bar */
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.copyright {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.25);
}

.powered {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.22);
}

.powered em {
  font-style: italic;
  font-family: 'Lora', Georgia, serif;
  color: rgba(0, 166, 81, 0.7);
}

/* Responsive */
@media (max-width: 860px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }

  .brand-desc {
    max-width: 100%;
  }
}

@media (max-width: 560px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }

  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }
}
</style>
