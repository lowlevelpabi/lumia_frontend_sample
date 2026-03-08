<script setup lang="ts">
import { BookOpen, Github, Mail, Shield } from 'lucide-vue-next'
</script>

<template>
    <footer class="site-footer">
        <div class="footer-container">
            <div class="footer-grid">
                <!-- Brand & About -->
                <div class="footer-brand">
                    <RouterLink to="/" class="footer-logo">
                        <div class="logo-icon">
                            <BookOpen :size="20" color="#fff" stroke-width="2.5" />
                        </div>
                        <span class="logo-text">LUMIA</span>
                    </RouterLink>
                    <p class="brand-desc">
                        An advanced thesis and research repository leveraging BERT-NLP for semantic retrieval and
                        IMRAD-aware deep indexing.
                    </p>
                    <div class="social-links">
                        <a href="#" class="social-link">
                            <Github :size="18" />
                        </a>
                        <a href="#" class="social-link">
                            <Mail :size="18" />
                        </a>
                    </div>
                </div>

                <!-- Links: Research -->
                <div class="footer-links-group">
                    <h4 class="footer-title">Research</h4>
                    <ul class="footer-links">
                        <li>
                            <RouterLink :to="{ name: 'results', query: { q: '' } }">Browse All</RouterLink>
                        </li>
                        <li>
                            <RouterLink :to="{ name: 'results', query: { q: 'Thesis' } }">Theses</RouterLink>
                        </li>
                        <li>
                            <RouterLink :to="{ name: 'results', query: { q: 'Capstone' } }">Capstone Projects
                            </RouterLink>
                        </li>
                        <li>
                            <RouterLink :to="{ name: 'results', query: { q: '' } }">Latest Uploads</RouterLink>
                        </li>
                    </ul>
                </div>

                <!-- Links: Support -->
                <div class="footer-links-group">
                    <h4 class="footer-title">Resources</h4>
                    <ul class="footer-links">
                        <li><a href="#">About Lumia</a></li>
                        <li><a href="#">Help Center</a></li>
                        <li><a href="#">Terms & Conditions</a></li>
                        <li><a href="#">Privacy Policy</a></li>
                    </ul>
                </div>

                <!-- Links: Institutional -->
                <div class="footer-links-group">
                    <h4 class="footer-title">Institutional</h4>
                    <ul class="footer-links">
                        <li><a href="https://cvsu.edu.ph" target="_blank" rel="noopener">Cavite State University</a>
                        </li>
                        <li><a href="#">Department of Computer Science</a></li>
                        <li><a href="#">University Library</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom">
                <div class="legal-info">
                    <span>&copy; {{ new Date().getFullYear() }} Lumia Research Repository. All rights reserved.</span>
                    <span class="divider">|</span>
                    <span class="compliance">
                        <Shield :size="12" class="inline-icon" />
                        Academic Integrity Compliant
                    </span>
                </div>
                <div class="footer-power">
                    Powered by <strong>BERT-NLP</strong>
                </div>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.site-footer {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 5rem 0 2rem;
    border-top: 1px solid #1e293b;
    margin-top: auto;
}

.footer-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
}

.footer-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
    gap: 4rem;
    margin-bottom: 4rem;
}

.footer-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    margin-bottom: 1.5rem;
}

.logo-icon {
    background: #00a651;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-text {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #fff;
}

.brand-desc {
    font-size: 0.9rem;
    color: #94a3b8;
    line-height: 1.6;
    margin-bottom: 2rem;
    max-width: 320px;
}

.social-links {
    display: flex;
    gap: 1rem;
}

.social-link {
    color: #94a3b8;
    transition: color 0.2s;
}

.social-link:hover {
    color: #00a651;
}

.footer-title {
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #fff;
    margin-bottom: 1.5rem;
}

.footer-links {
    list-style: none;
    padding: 0;
    margin: 0;
}

.footer-links li {
    margin-bottom: 0.75rem;
}

.footer-links a {
    color: #94a3b8;
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.footer-links a:hover {
    color: #00a651;
    padding-left: 4px;
}

.footer-bottom {
    padding-top: 2rem;
    border-top: 1px solid #1e293b;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: #64748b;
}

.legal-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.divider {
    color: #334155;
}

.compliance {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.inline-icon {
    opacity: 0.6;
}

.footer-power strong {
    color: #00a651;
}

@media (max-width: 1024px) {
    .footer-grid {
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
    }
}

@media (max-width: 640px) {
    .footer-grid {
        grid-template-columns: 1fr;
        gap: 2.5rem;
    }

    .footer-bottom {
        flex-direction: column;
        gap: 1.5rem;
        text-align: center;
    }

    .legal-info {
        flex-direction: column;
        gap: 0.5rem;
    }

    .divider {
        display: none;
    }
}
</style>
