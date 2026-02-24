<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
    FileUp, ArrowLeft, Loader2, CheckCircle, AlertCircle,
    FileText, LayoutGrid, Check, Plus, Trash2, X, ZoomIn
} from 'lucide-vue-next'
import { api, type PartialPaperMetadata } from '../services/api'

const router = useRouter()

// --- State Management ---
const step = ref(1) // 1: Select, 2: Review, 3: Success
const uploading = ref(false)
const processing = ref(false)
const errorMsg = ref('')

// File selection
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Preview Data
const sessionId = ref('')
interface PageData {
    page_num: number;
    thumbnail: string;
    preview_text: string;
}

const pages = ref<PageData[]>([])
const metadata = reactive<PartialPaperMetadata>({
    title: '',
    author: '',
    year: '',
    abstract: '',
    department: 'N/A',
    keywords: '',
    project_type: 'Thesis',
    degree_program: 'N/A'
})

const authors = ref<string[]>([''])

// Page Selection
const selectedPages = ref<number[]>([])

// Zoom Modal State
const showZoomModal = ref(false)
const zoomedPage = ref<PageData | null>(null)

// --- Actions ---
const openZoom = (page: PageData) => {
    zoomedPage.value = page
    showZoomModal.value = true
}

const closeZoom = () => {
    showZoomModal.value = false
    zoomedPage.value = null
}

const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files[0]) {
        file.value = target.files[0]
        startInitialExtraction()
    }
}

const startInitialExtraction = async () => {
    if (!file.value) return
    processing.value = true
    errorMsg.value = ''

    try {
        const preview = await api.getUploadPreview(file.value)
        sessionId.value = preview.session_id

        // Fill metadata
        Object.assign(metadata, preview.metadata)

        // Handle authors split
        if (preview.metadata.author) {
            // Split by comma or semicolon and trim
            const splitAuthors = preview.metadata.author
                .split(/[,;]/)
                .map(a => a.trim())
                .filter(a => a.length > 0)

            if (splitAuthors.length > 0) {
                authors.value = splitAuthors
            } else {
                authors.value = ['']
            }
        }

        // Fill pages
        pages.value = preview.pages
        // Auto-select pages that have text (heuristic)
        selectedPages.value = preview.pages
            .filter(p => p.preview_text.length > 10)
            .map(p => p.page_num)

        step.value = 2
    } catch (err) {
        errorMsg.value = (err as Error).message || 'Failed to parse PDF.'
    } finally {
        processing.value = false
    }
}

const togglePage = (pageNum: number, event: Event) => {
    // If clicking a button/icon inside, don't toggle
    if ((event.target as HTMLElement).closest('.zoom-trigger')) return

    const index = selectedPages.value.indexOf(pageNum)
    if (index > -1) {
        selectedPages.value.splice(index, 1)
    } else {
        selectedPages.value.push(pageNum)
    }
}

const selectAll = () => {
    selectedPages.value = pages.value.map(p => p.page_num)
}

const deselectAll = () => {
    selectedPages.value = []
}

const addAuthor = () => {
    authors.value.push('')
}

const removeAuthor = (index: number) => {
    if (authors.value.length > 1) {
        authors.value.splice(index, 1)
    } else {
        authors.value[0] = ''
    }
}

const handleFinalConfirm = async () => {
    if (selectedPages.value.length === 0) {
        errorMsg.value = 'Please select at least one page to index.'
        return
    }

    uploading.value = true
    errorMsg.value = ''

    try {
        // Prepare final author string
        const finalAuthorString = authors.value
            .map(a => a.trim())
            .filter(a => a.length > 0)
            .join(', ')

        await api.confirmUpload({
            session_id: sessionId.value,
            metadata: {
                ...metadata,
                author: finalAuthorString || 'Unknown'
            },
            selected_pages: selectedPages.value
        })
        step.value = 3
        setTimeout(() => {
            router.push({ name: 'management' })
        }, 2000)
    } catch (err) {
        errorMsg.value = (err as Error).message || 'Failed to finalize upload.'
    } finally {
        uploading.value = false
    }
}

const goBack = () => {
    if (step.value === 2) {
        step.value = 1
        file.value = null
    } else {
        router.back()
    }
}
</script>

<template>
    <div class="upload-page">
        <!-- Step 1 & 3 Container (Standard width) -->
        <div v-if="step !== 2" class="standard-container">
            <button @click="goBack" class="back-link">
                <ArrowLeft :size="16" /> Back
            </button>

            <div class="upload-card shadow-lg">
                <div v-if="step === 1">
                    <h1>Upload Research</h1>
                    <p>New 2-step process: Upload first, then review OCR and pick pages.</p>

                    <div v-if="errorMsg" class="error-banner">
                        <AlertCircle :size="18" /> {{ errorMsg }}
                    </div>

                    <div class="drop-zone" @click="fileInput?.click()" :class="{ 'is-processing': processing }">
                        <input type="file" ref="fileInput" @change="handleFileChange" style="display: none"
                            accept="application/pdf" />

                        <div v-if="processing" class="loading-state">
                            <Loader2 class="spinner" :size="48" color="#10b981" />
                            <h3>Parsing PDF...</h3>
                            <p>Running OCR and generating thumbnails</p>
                        </div>
                        <template v-else>
                            <FileUp :size="48" color="#10b981" />
                            <div class="drop-text">
                                <strong>Click to upload</strong> or drag and drop
                                <span>PDF files only</span>
                            </div>
                        </template>
                    </div>
                </div>

                <div v-else-if="step === 3" class="success-state">
                    <CheckCircle :size="64" color="#10b981" />
                    <h2>Research Indexed!</h2>
                    <p>Paper and selected vectors have been stored in the repository.</p>
                </div>
            </div>
        </div>

        <!-- Step 2: Full Width Review UI -->
        <div v-else class="review-container">
            <header class="review-header">
                <div class="header-left">
                    <button @click="goBack" class="icon-btn">
                        <ArrowLeft :size="20" />
                    </button>
                    <div>
                        <h1>Review & Customize</h1>
                        <span class="file-badge">{{ file?.name }}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="selection-count">
                        <Check :size="16" /> {{ selectedPages.length }} pages selected
                    </div>
                    <button @click="handleFinalConfirm" class="confirm-btn" :disabled="uploading">
                        <Loader2 v-if="uploading" class="spinner" :size="18" />
                        <Check v-else :size="18" />
                        Complete Upload
                    </button>
                </div>
            </header>

            <main class="review-grid">
                <!-- Left: Metadata Form -->
                <section class="metadata-form shadow-sm">
                    <div class="form-section">
                        <h3>
                            <FileText :size="18" /> Document Details
                        </h3>

                        <div class="input-group">
                            <label>Title</label>
                            <textarea v-model="metadata.title" placeholder="Research Title"></textarea>
                        </div>

                        <div class="input-group">
                            <label>Author(s)</label>
                            <div class="authors-list">
                                <div v-for="(author, index) in authors" :key="index" class="author-input-row">
                                    <input v-model="authors[index]" type="text" placeholder="Full Name of Author" />
                                    <button @click="removeAuthor(index)" class="remove-btn" title="Remove Author">
                                        <Trash2 :size="16" />
                                    </button>
                                </div>
                                <button @click="addAuthor" class="add-author-btn">
                                    <Plus :size="14" /> Add Another Author
                                </button>
                            </div>
                        </div>

                        <div class="input-group">
                            <label>Year</label>
                            <input v-model="metadata.year" type="text" placeholder="e.g., 2025" />
                        </div>

                        <div class="input-group">
                            <label>Abstract</label>
                            <textarea v-model="metadata.abstract" class="abstract-area"
                                placeholder="Enter abstract..."></textarea>
                        </div>

                        <div class="row">
                            <div class="input-group">
                                <label>Department</label>
                                <select v-model="metadata.department">
                                    <option>N/A</option>
                                    <option>Department of Computer Science</option>
                                    <option>Department of Information Technology</option>
                                    <option>Department of Information Systems</option>
                                    <option>Department of Computer Engineering</option>
                                    <option>College of Computer Science</option>
                                    <option>College of Engineering</option>
                                    <option>College of Information Technology</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Type</label>
                                <select v-model="metadata.project_type">
                                    <option>Thesis</option>
                                    <option>Capstone Project</option>
                                    <option>Technical Report</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Right: Page Selection Grid -->
                <section class="page-selector">
                    <div class="selector-header">
                        <div class="selector-title-row">
                            <h3>
                                <LayoutGrid :size="18" /> Select Pages for Vectorization
                            </h3>
                            <div class="selector-actions">
                                <button @click="selectAll" class="text-btn">Select All</button>
                                <span class="divider">|</span>
                                <button @click="deselectAll" class="text-btn">Uncheck All</button>
                            </div>
                        </div>
                        <p>Only text from selected pages will be used for Search Relevance.</p>
                    </div>

                    <div class="thumbnails-grid">
                        <div v-for="p in pages" :key="p.page_num" class="page-card"
                            :class="{ 'is-selected': selectedPages.includes(p.page_num) }"
                            @click="togglePage(p.page_num, $event)">
                            <div class="thumbnail-wrapper">
                                <img :src="`data:image/jpeg;base64,${p.thumbnail}`" loading="lazy"
                                    class="page-thumb-img" />
                                <div class="page-num">P{{ p.page_num }}</div>

                                <button class="zoom-trigger" @click.stop="openZoom(p)" title="Enlarge Page">
                                    <ZoomIn :size="20" />
                                </button>

                                <div class="selection-overlay">
                                    <div class="check-circle">
                                        <Check :size="16" />
                                    </div>
                                </div>
                            </div>
                            <div class="page-preview-text">
                                {{ p.preview_text || '(No indexable text)' }}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>

        <!-- Portals -->
        <Teleport to="body">
            <div v-if="showZoomModal" class="modal-overlay" @click="closeZoom">
                <div class="zoom-modal" @click.stop>
                    <button class="modal-close" @click="closeZoom">
                        <X :size="24" />
                    </button>
                    <div class="modal-content">
                        <img :src="`data:image/jpeg;base64,${zoomedPage?.thumbnail}`" class="full-page-img" />
                        <div class="modal-info">
                            <h2>Page {{ zoomedPage?.page_num }}</h2>
                            <p>{{ zoomedPage?.preview_text || 'No text extracted from this page.' }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.upload-page {
    min-height: 100vh;
    background: #f3f4f6;
    padding: 2rem;
}

.standard-container {
    max-width: 600px;
    margin: 4rem auto;
}

.upload-card {
    background: white;
    padding: 3rem;
    border-radius: 16px;
    text-align: center;
}

.shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.shadow-sm {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* Review UI */
.review-container {
    max-width: 1400px;
    margin: 0 auto;
    height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 1.5rem 2rem;
    border-radius: 16px;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.header-left h1 {
    font-size: 1.5rem;
    margin: 0;
}

.file-badge {
    background: #f3f4f6;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    font-size: 0.8rem;
    color: #666;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.selection-count {
    color: #10b981;
    font-weight: 600;
    font-size: 0.9rem;
}

.review-grid {
    display: grid;
    grid-template-columns: 450px 1fr;
    gap: 1.5rem;
    flex: 1;
    overflow: hidden;
}

/* Form Styling */
.metadata-form {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    overflow-y: auto;
}

.form-section h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    color: #111;
    font-weight: 700;
}

.input-group {
    margin-bottom: 1.5rem;
    width: 100%;
    display: flex;
    flex-direction: column;
}

.input-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 0.5rem;
    text-align: left;
}

textarea,
input,
select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    font-size: 0.95rem;
    background: #f9fafb;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
}

textarea:focus,
input:focus,
select:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

textarea.abstract-area {
    height: 280px;
    resize: none;
    font-family: inherit;
    line-height: 1.5;
}

.row {
    display: flex;
    gap: 1.5rem;
    width: 100%;
    align-items: flex-start;
}

.row .input-group {
    flex: 1;
}

.authors-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.author-input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.remove-btn {
    background: #fee2e2;
    color: #ef4444;
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.remove-btn:hover {
    background: #fecaca;
    color: #dc2626;
}

.add-author-btn {
    background: #f0fdf4;
    color: #10b981;
    border: 1px dashed #10b981;
    padding: 0.5rem;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    margin-top: 0.25rem;
    transition: all 0.2s;
}

.add-author-btn:hover {
    background: #dcfce7;
}

/* Thumbnail Grid */
.page-selector {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.selector-header {
    margin-bottom: 2rem;
}

.selector-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.selector-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.text-btn {
    background: none;
    border: none;
    color: #10b981;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
}

.text-btn:hover {
    text-decoration: underline;
}

.divider {
    color: #e5e7eb;
    font-size: 0.8rem;
}

.selector-header p {
    font-size: 0.9rem;
    color: #666;
}

.thumbnails-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.5rem;
    overflow-y: auto;
    padding: 0.5rem;
}

.page-card {
    cursor: pointer;
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    background: #f9fafb;
    transition: all 0.2s;
    position: relative;
    display: flex;
    flex-direction: column;
}

.thumbnail-wrapper {
    position: relative;
    aspect-ratio: 1 / 1.4;
    overflow: hidden;
    background: #fff;
    border-bottom: 1px solid #eee;
    cursor: zoom-in;
}

.page-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
}

.zoom-trigger {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.2s;
    z-index: 10;
    color: #4b5563;
    cursor: pointer;
}

.page-card:hover .zoom-trigger {
    opacity: 1;
    transform: translateY(0);
}

.zoom-trigger:hover {
    background: #10b981;
    color: white;
}

.page-num {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
}

.selection-overlay {
    position: absolute;
    inset: 0;
    background: rgba(16, 185, 129, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
}

.check-circle {
    background: white;
    color: #10b981;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.page-preview-text {
    padding: 0.75rem;
    font-size: 0.75rem;
    color: #666;
    height: 60px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
}

.page-card:hover {
    border-color: #10b981;
    transform: translateY(-2px);
}

.page-card:hover img {
    transform: scale(1.05);
}

.page-card.is-selected {
    border-color: #10b981;
}

.page-card.is-selected .selection-overlay {
    opacity: 1;
}

/* Buttons */
.back-link {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #666;
    cursor: pointer;
    margin-bottom: 1.5rem;
}

.confirm-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}

.confirm-btn:hover {
    background: #059669;
}

.confirm-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.icon-btn {
    background: #f3f4f6;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

/* Animations */
.spinner {
    animation: spin 2s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.drop-zone {
    border: 2px dashed #ddd;
    border-radius: 12px;
    padding: 3rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.drop-zone:hover:not(.is-processing) {
    border-color: #10b981;
    background: #f0fdf4;
}

.is-processing {
    cursor: default;
}

.error-banner {
    background: #fef2f2;
    color: #b91c1c;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(8px);
    padding: 2rem;
}

.zoom-modal {
    background: white;
    width: 100%;
    max-width: 1000px;
    max-height: 90vh;
    border-radius: 24px;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: modalSlide 0.3s ease-out;
}

@keyframes modalSlide {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.modal-close {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: white;
    border: 1px solid #eee;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 20;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
}

.modal-close:hover {
    background: #f9fafb;
    transform: rotate(90deg);
    color: #ef4444;
}

.modal-content {
    display: grid;
    grid-template-columns: 1fr 350px;
    height: 100%;
    overflow: hidden;
}

.full-page-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #f3f4f6;
}

.modal-info {
    padding: 3rem 2rem;
    background: white;
    border-left: 1px solid #eee;
    overflow-y: auto;
}

.modal-info h2 {
    color: #111;
    margin-bottom: 1.5rem;
    font-size: 1.75rem;
}

.modal-info p {
    color: #4b5563;
    line-height: 1.7;
    font-size: 1.1rem;
}

@media (max-width: 900px) {
    .modal-content {
        grid-template-columns: 1fr;
    }

    .modal-info {
        display: none;
    }
}
</style>
