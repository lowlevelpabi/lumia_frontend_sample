<script setup lang="ts">
import { BookOpen, Search, ClipboardList } from 'lucide-vue-next'
</script>

<template>
  <div class="guide-wrapper">
    <div class="header-section">
      <div class="header-content">
        <h1>Lumia User Guide & Manual</h1>
        <p>A comprehensive guide on how to navigate the repository, evaluate papers, and manage the system.</p>
      </div>
    </div>

    <main class="content-section">
      <div class="guide-grid">
        <!-- Sidebar Navigation (Sticky) -->
        <aside class="guide-nav">
          <div class="nav-sticky">
            <h3>Contents</h3>
            <ul>
              <li><a href="#getting-started">Getting Started</a></li>
              <li><a href="#testing-reproduction">Testing & Reproduction</a></li>
              <li><a href="#searching">Searching & Exploring</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main Content -->
        <article class="guide-body">
          <section id="getting-started" class="card-section">
            <div class="section-title">
              <BookOpen class="text-green" :size="24" />
              <h2>Getting Started</h2>
            </div>
            <p>Welcome to Lumia, a specialized Research Retrieval System. This platform is designed to effortlessly
              extract structured content (like Introduction, Methods, Results, and Discussion) directly from uploaded
              thesis and capstone documents.</p>
            <ul>
              <li><strong>Students/Guests:</strong> You can upload, search for existing literature, read abstracts, and
                view
                full IMRAD sections of indexed studies.</li>
              <li><strong>Staff/Faculty:</strong> You have the ability to upload new documents and manage the
                repository. Except
                from managing users.</li>
            </ul>
            <ul>
              <li><strong>Admin:</strong> You have the overall control of the system. You can manage users, upload new
                documents, and manage the repository.</li>
            </ul>
          </section>

          <!-- Testing & Reproduction Content -->
          <section id="testing-reproduction" class="card-section highlight-card">
            <div class="section-title">
              <ClipboardList class="text-green" :size="24" />
              <h2>Testing & Reproduction</h2>
            </div>
            <p>This sequence outlines the end-to-end user flow for testing the complete platform lifecycle:</p>
            <ol>
              <li><strong>Create an account:</strong> Register a new student account to simulate public access.</li>
              <li><strong>Upload document:</strong> Use the provided thesis and capstone document from the upload UI.
                (We provided an empty document and non-imrad pages for guard rails)
              </li>
              <li><strong>Review extraction:</strong> Verify the initial OCR/NLP extraction, adjust metadata or
                boundaries if necessary, and index the document.</li>
              <li><strong>Go to Explore:</strong> Navigate to the Home or Explore page to see your newly indexed
                document.</li>
              <li><strong>Test search queries:</strong> Use the search bar to test keyword and semantic search with
                various queries (e.g., document title, topic keywords). Verify results relevance and ranking.</li>
              <li><strong>Select the article:</strong> Click on your uploaded article to open the detailed reading view.
              </li>
              <li><strong>Review IMRAD format:</strong> Ensure the comprehensive IMRAD format correctly renders the
                introduction, methods, results, and discussion alongside text and tables.</li>
              <li><strong>Citate:</strong> Click the "Cite this study" action to ensure citing increments and tracks
                usage accurately.</li>
              <li><strong>Test Download as PDF:</strong> Export the study and verify the A4-formatted, justified,
                standard IMRaD PDF.</li>
              <li><strong>Others:</strong> Test the rest of the remaining UI features such as filter and sorting.</li>
              <li><strong>Answer Evaluation:</strong> Evaluate the system using this <a
                  href="https://forms.gle/D2Ys5qyd7eKJU8Hq6" target="_blank" rel="noopener noreferrer">Google Form
                  Evaluation Link</a>
              </li>
            </ol>
          </section>

          <section id="searching" class="card-section">
            <div class="section-title">
              <Search class="text-green" :size="24" />
              <h2>Searching & Exploring</h2>
            </div>
            <p>Our search engine utilizes advanced Semantic Search alongside traditional Keyword Search to fetch the
              most relevant papers.</p>
            <ol>
              <li>Use the <strong>Search Bar</strong> on the Home or Explore page.</li>
              <li>Type in your context (e.g., "Machine Learning in Agriculture") or exact titles.</li>
              <li>Use the Filters on the Explore page to narrow down by Year, Program, or Degree.</li>
              <li>Click "Read full record" to read the document's structured extraction and view tables/figures.</li>
            </ol>
          </section>

        </article>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Source+Sans+3:wght@400;500;600;700&display=swap');

.guide-wrapper {
  min-height: calc(100vh - 64px);
  background: #f5f5f2;
  font-family: 'Source Sans 3', sans-serif;
  color: #181c18;
}

.header-section {
  background: #0d1f12;
  padding: 4.5rem 2rem;
  border-bottom: 3px solid #00a651;
  text-align: center;
}

.header-content h1 {
  font-family: 'Lora', Georgia, serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1rem;
}

.header-content p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
}

.content-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.guide-grid {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 3rem;
  align-items: start;
}

@media (max-width: 868px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }

  .guide-nav {
    display: none;
  }
}

.nav-sticky {
  position: sticky;
  top: 100px;
}

.nav-sticky h3 {
  font-size: 0.85rem;
  text-transform: uppercase;
  color: #7a7f75;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

.nav-sticky ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-sticky li a {
  display: block;
  padding: 0.5rem 0;
  color: #3d4239;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
  border-left: 2px solid transparent;
}

.nav-sticky li a:hover {
  color: #00a651;
  padding-left: 0.5rem;
  border-left-color: #00a651;
}

.guide-body {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card-section {
  background: #ffffff;
  padding: 2.5rem;
  border-radius: 8px;
  border: 1px solid #dfe0db;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
}

.highlight-card {
  border-top: 4px solid #00a651;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.text-green {
  color: #00a651;
}

.section-title h2 {
  font-family: 'Lora', serif;
  font-size: 1.5rem;
  color: #181c18;
  margin: 0;
}

.card-section p,
.card-section li {
  line-height: 1.6;
  color: #3d4239;
  margin-bottom: 1rem;
}

.card-section ul,
.card-section ol {
  padding-left: 1.5rem;
}

.eval-steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.step-item {
  display: flex;
  gap: 1rem;
  background: #fdfdfc;
  padding: 1.5rem;
  border: 1px solid #dfe0db;
  border-radius: 6px;
}

.step-num {
  background: #00a651;
  color: white;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  flex-shrink: 0;
}

.step-item strong {
  display: block;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #181c18;
}

.step-item p {
  margin: 0;
  font-size: 0.95rem;
}
</style>
