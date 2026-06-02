<script setup lang="ts">
/**
 * Lumia User Guide & Manual
 * Optimized with inline SVGs for performance and full theme-aware CSS variables.
 */
</script>

<template>
  <div class="guide-wrapper">
    <!-- Hero Header -->
    <div class="header-section">
      <div class="header-overlay"></div>
      <div class="hero__dot-grid" aria-hidden="true"></div>
      <div class="hero-bg-shapes">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
      </div>
      <div class="header-content">
        <div class="badge">Product Documentation</div>
        <h1>Lumia User Guide & Manual</h1>
        <p>Master the Lumia Research Retrieval System: From discovery and analysis to repository management.</p>
      </div>
    </div>

    <main class="content-section">
      <div class="guide-grid">
        <!-- Sidebar Navigation (Sticky) -->
        <aside class="guide-nav">
          <div class="nav-sticky">
            <h3>On this page</h3>
            <ul>
              <li><a href="#introduction">Introduction</a></li>
              <li><a href="#user-roles">User Roles & Access</a></li>
              <li><a href="#discovery">Search & Discovery</a></li>
              <li><a href="#reading-view">Reading & Analysis</a></li>
              <li><a href="#management">Staff Management</a></li>
              <li><a href="#admin-tasks">System Administration</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main Content -->
        <article class="guide-body">
          
          <!-- Introduction -->
          <section id="introduction" class="card-section highlight-card">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              <h2>Introduction to Lumia</h2>
            </div>
            <p>Lumia is a next-generation <strong>Research Retrieval and Management System</strong> specifically engineered for academic institutions. Unlike traditional repositories, Lumia uses advanced Natural Language Processing (NLP) to parse complex thesis and capstone documents into structured <strong>IMRAD</strong> (Introduction, Methodology, Results, and Discussion) sections.</p>
            
            <div class="feature-pills">
              <div class="pill">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-2 10h3l-2 10 7-10h-3l2-10z"/></svg>
                Semantic Search
              </div>
              <div class="pill">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                IMRAD Extraction
              </div>
              <div class="pill">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                AI Summaries
              </div>
              <div class="pill">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                A4 PDF Export
              </div>
            </div>
          </section>

          <!-- User Roles -->
          <section id="user-roles" class="card-section">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <h2>User Roles & Permissions</h2>
            </div>
            <p>Access level determines your available features within the system:</p>
            
            <div class="role-grid">
              <div class="role-card">
                <div class="role-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>Public / Student</span>
                </div>
                <ul>
                  <li>Browse repository</li>
                  <li>Search via Keyword & Context</li>
                  <li>Read extracted sections</li>
                  <li>Generate Citations & PDF</li>
                </ul>
              </div>
              <div class="role-card">
                <div class="role-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  <span>Faculty / Researcher</span>
                </div>
                <ul>
                  <li>All Student privileges</li>
                  <li>Upload new research</li>
                  <li>Verify & Edit extractions</li>
                  <li>Track personal upload logs</li>
                </ul>
              </div>
              <div class="role-card">
                <div class="role-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span>System Admin</span>
                </div>
                <ul>
                  <li>Full repository control</li>
                  <li>User account management</li>
                  <li>Global activity monitoring</li>
                  <li>Database maintenance</li>
                </ul>
              </div>
            </div>
          </section>

          <!-- Search & Discovery -->
          <section id="discovery" class="card-section">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <h2>Advanced Discovery</h2>
            </div>
            <p>Lumia offers two powerful ways to find literature:</p>
            <ol>
              <li><strong>Keyword Search:</strong> Finds exact matches for titles, authors, or specific terms.</li>
              <li><strong>Semantic (Contextual) Search:</strong> Understands the <em>intent</em> behind your query. Typing "Machine learning in rice farming" will find papers about agricultural AI even if they don't use those exact words.</li>
            </ol>
            
            <div class="pro-tip">
              <strong>Pro-Tip:</strong> Use the "Threshold" slider in the Explore page to adjust how strict the semantic matching should be. A lower threshold returns more broad results, while a higher one focuses on direct matches.
            </div>
          </section>

          <!-- Reading View -->
          <section id="reading-view" class="card-section">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <h2>The Reading Experience</h2>
            </div>
            <p>Skip the 100-page PDF scrolling. Lumia provides a structured interface for faster comprehension:</p>
            <ul>
              <li><strong>IMRAD Navigation:</strong> Instantly jump between Introduction, Methodology, and Results.</li>
              <li><strong>AI Summarization:</strong> View concise summaries for each section to grasp key points in seconds.</li>
              <li><strong>Interactive Tables:</strong> Click on figures or tables to zoom in for detailed inspection.</li>
              <li><strong>Citations:</strong> Click "Cite this study" to get APA 6th, 7th, or In-text formats ready to copy.</li>
            </ul>
          </section>

          <!-- Staff Management -->
          <section id="management" class="card-section">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <h2>Document Management (Staff)</h2>
            </div>
            <p>Faculty and authorized staff can grow the repository by following these steps:</p>
            <div class="process-steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-info">
                  <strong>Upload Document</strong>
                  <p>Upload a PDF of the manuscript. The system will automatically begin OCR and NLP processing.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-info">
                  <strong>Review Extraction</strong>
                  <p>Check the extracted text for accuracy. You can manually adjust section boundaries if needed.</p>
                </div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-info">
                  <strong>Index & Publish</strong>
                  <p>Once verified, index the paper. It will now be available for discovery via semantic search.</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Admin Tasks -->
          <section id="admin-tasks" class="card-section">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              <h2>System Administration</h2>
            </div>
            <p>Administrators have exclusive access to the <strong>Management Console</strong>:</p>
            <ul>
              <li><strong>User Management:</strong> Create, disable, or change roles of system users.</li>
              <li><strong>Activity Logs:</strong> Monitor who is uploading, deleting, or editing records for audit purposes.</li>
              <li><strong>Repository Health:</strong> Permanently delete records from the "Trash" or restore accidentally deleted items.</li>
              <li><strong>Pending Requests:</strong> Approve or reject student-submitted documents before they go live.</li>
            </ul>
          </section>

          <!-- FAQ -->
          <section id="faq" class="card-section">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <h2>Frequently Asked Questions</h2>
            </div>
            
            <div class="faq-item">
              <h4>Why is the extraction sometimes incomplete?</h4>
              <p>Lumia depends on the quality of the PDF. Scanned documents without text layers may require cleaner scans for optimal OCR results. Documents with non-standard IMRAD headings might need manual boundary adjustment.</p>
            </div>
            
            <div class="faq-item">
              <h4>Can I export my research?</h4>
              <p>Yes. Every indexed study can be exported as a professional A4-formatted PDF, which includes the extracted IMRAD content in a clean, justified layout.</p>
            </div>

            <div class="faq-item">
              <h4>How do I get an account?</h4>
              <p>Students can register via the Registration page. Faculty accounts must be approved or created by a System Administrator.</p>
            </div>
          </section>

          <footer class="guide-footer">
            <div class="footer-content">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Need further assistance? Contact your department administrator or visit the <a href="https://github.com/marufshidiq/lumia" target="_blank">Lumia Repository <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a></span>
            </div>
          </footer>

        </article>
      </div>
    </main>
  </div>
</template>

<style scoped>
.guide-wrapper {
  min-height: calc(100vh - 64px);
  background: var(--bg-primary);
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
  line-height: 1.6;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Header Section */
.header-section {
  position: relative;
  background: var(--bg-primary);
  overflow: hidden;
  padding: 100px 2rem 80px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, 
    rgba(0, 166, 81, 0.05) 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    var(--bg-primary) 100%
  );
  z-index: 1;
  pointer-events: none;
  transition: background 0.3s ease;
}

.dark .header-overlay {
  background: linear-gradient(180deg, 
    rgba(0, 200, 83, 0.1) 0%, 
    rgba(10, 10, 10, 0.4) 50%, 
    var(--bg-primary) 100%
  );
}

.hero__dot-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(0, 166, 81, 0.04) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
  z-index: 2;
}

.dark .hero__dot-grid {
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}

/* Translucent floating glowing green shapes behind content */
.hero-bg-shapes {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.floating-shape {
  position: absolute;
  background: linear-gradient(135deg, var(--accent-primary) 0%, transparent 80%);
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.12;
  pointer-events: none;
}

.shape-1 { 
  width: 400px; 
  height: 400px; 
  top: -5%; 
  left: 10%; 
  animation: float-shape-1 9s ease-in-out infinite alternate;
}
.shape-2 { 
  width: 350px; 
  height: 350px; 
  bottom: 5%; 
  right: 10%; 
  opacity: 0.09; 
  animation: float-shape-2 11s ease-in-out infinite alternate;
}
.shape-3 { 
  width: 250px; 
  height: 250px; 
  top: 30%; 
  left: 60%; 
  opacity: 0.05; 
  animation: float-shape-3 8s ease-in-out infinite alternate;
}

@keyframes float-shape-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(20px, -20px) scale(1.05); }
}

@keyframes float-shape-2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-15px, 15px) scale(0.95); }
}

@keyframes float-shape-3 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(15px, 10px) scale(1.06); }
}

.badge {
  position: relative;
  display: inline-block;
  background: rgba(0, 166, 81, 0.08);
  color: var(--accent-primary);
  padding: 4px 12px;
  border-radius: 20px;
  font-family: 'Schibsted Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(0, 166, 81, 0.15);
  z-index: 10;
  text-shadow: 0 0 8px rgba(0, 166, 81, 0.2);
}

.dark .badge {
  background: rgba(0, 200, 83, 0.12);
  border-color: rgba(0, 200, 83, 0.2);
}

.header-content {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  z-index: 10;
}

.header-content h1 {
  font-family: 'Lora', serif;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1rem;
  letter-spacing: -0.01em;
}

.header-content p {
  font-family: 'Inter', sans-serif;
  color: var(--text-secondary);
  font-size: 1.15rem;
  max-width: 700px;
  margin: 0 auto;
  opacity: 0.85;
}

/* Main Layout */
.content-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 2rem 4rem;
}

.guide-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 4rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
  .guide-nav {
    display: none;
  }
}

/* Navigation */
.nav-sticky {
  position: sticky;
  top: 100px;
}

.nav-sticky h3 {
  font-family: 'Schibsted Grotesk', sans-serif;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-tertiary);
  letter-spacing: 0.15em;
  margin-bottom: 1.5rem;
  font-weight: 700;
}

.nav-sticky ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-sticky li a {
  display: block;
  padding: 0.6rem 0 0.6rem 1.2rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-family: 'Schibsted Grotesk', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  border-left: 2px solid var(--border-color);
}

.nav-sticky li a:hover {
  color: var(--accent-primary);
  border-left-color: var(--accent-primary);
  background: rgba(0, 166, 81, 0.04);
  padding-left: 1.4rem;
}

/* Content Cards */
.guide-body {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.card-section {
  scroll-margin-top: 100px;
}

.highlight-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 2.5rem;
  border-radius: 16px;
  border: 1px solid rgba(0, 166, 81, 0.12);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
}

.dark .highlight-card {
  background: rgba(10, 10, 10, 0.65);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.highlight-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 15px 35px rgba(0, 166, 81, 0.06);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-title h2 {
  font-family: 'Lora', serif;
  font-size: 1.8rem;
  color: var(--text-primary);
  margin: 0;
  font-weight: 600;
}

.text-green {
  color: var(--accent-primary);
}

/* Feature Pills */
.feature-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 166, 81, 0.04);
  color: var(--accent-primary);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: 'Schibsted Grotesk', sans-serif;
  font-weight: 600;
  border: 1px solid rgba(0, 166, 81, 0.12);
  transition: all 0.2s ease;
}

.pill:hover {
  background: rgba(0, 166, 81, 0.08);
  transform: scale(1.02);
}

/* Role Grid */
.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.role-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 166, 81, 0.1);
  transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1), border-color 0.3s, box-shadow 0.3s;
}

.dark .role-card {
  background: rgba(10, 10, 10, 0.5);
  border-color: rgba(255, 255, 255, 0.06);
}

.role-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent-primary);
  box-shadow: 0 12px 24px -10px rgba(0, 166, 81, 0.15);
}

.role-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  color: var(--accent-primary);
  font-family: 'Schibsted Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
}

.role-card ul {
  padding-left: 1.25rem;
  margin: 0;
}

.role-card li {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

/* Pro-Tip Box */
.pro-tip {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-left: 4px solid #f59e0b;
  padding: 1.25rem;
  border-radius: 8px;
  margin-top: 1.5rem;
  font-size: 0.95rem;
  color: var(--amber-dk);
}

.dark .pro-tip {
  background: rgba(245, 158, 11, 0.03);
  color: #fbbf24;
  border-left-color: #fbbf24;
}

.pro-tip strong {
  color: #d97706;
  display: block;
  margin-bottom: 0.25rem;
}

.dark .pro-tip strong {
  color: #fbbf24;
}

/* Process Steps */
.process-steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
}

.step {
  display: flex;
  gap: 1.5rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 166, 81, 0.1);
  transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1), border-color 0.3s, box-shadow 0.3s;
}

.dark .step {
  background: rgba(10, 10, 10, 0.5);
  border-color: rgba(255, 255, 255, 0.06);
}

.step:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  box-shadow: 0 10px 20px -10px rgba(0, 166, 81, 0.12);
}

.step-num {
  background: var(--accent-primary);
  color: white;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-family: 'Lora', serif;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 166, 81, 0.2);
}

.step-info strong {
  display: block;
  font-family: 'Schibsted Grotesk', sans-serif;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.step-info p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

/* FAQ */
.faq-item {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s;
}

.faq-item h4 {
  font-family: 'Schibsted Grotesk', sans-serif;
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.faq-item p {
  margin: 0;
  color: var(--text-secondary);
}

/* Footer */
.guide-footer {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.footer-content a {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.footer-content a:hover {
  text-decoration: underline;
}
</style>