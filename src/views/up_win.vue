<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FileUp, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { api } from '../services/api'

const router = useRouter()
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const status = ref<'idle' | 'processing' | 'success' | 'error'>('idle')
const errorMsg = ref('')

const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files[0]) {
        file.value = target.files[0]
    }
}

const handleUpload = async () => {
    if (!file.value) return
    uploading.value = true
    status.value = 'processing'

    try {
        await api.uploadPaper(file.value)
        status.value = 'success'
        setTimeout(() => {
            router.push({ name: 'management' })
        }, 2000)
    } catch (err) {
        status.value = 'error'
        errorMsg.value = (err as Error).message || 'Failed to upload paper.'
    } finally {
        uploading.value = false
    }
}

const goBack = () => router.back()
</script>

<template>
    <div class="upload-page">
        <div class="upload-container">
            <button @click="goBack" class="back-link">
                <ArrowLeft :size="16" /> Back to List
            </button>

            <div class="upload-card">
                <h1>Upload Research</h1>
                <p>A PDF file is required. The system will automatically extract metadata using OCR.</p>

                <div v-if="status === 'idle' || status === 'error'" class="upload-form">
                    <div v-if="status === 'error'" class="error-banner">
                        <AlertCircle :size="18" /> {{ errorMsg }}
                    </div>

                    <div class="drop-zone" @click="fileInput?.click()">
                        <input type="file" ref="fileInput" @change="handleFileChange" style="display: none"
                            accept="application/pdf" />
                        <FileUp :size="48" color="#10b981" />
                        <div class="drop-text" v-if="!file">
                            <strong>Click to upload</strong> or drag and drop
                            <span>PDF files only</span>
                        </div>
                        <div class="file-info" v-else>
                            <strong>{{ file.name }}</strong>
                            <span>{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                        </div>
                    </div>

                    <button @click="handleUpload" class="submit-btn" :disabled="!file || uploading">
                        Start Upload & Processing
                    </button>
                </div>

                <div v-else-if="status === 'processing'" class="processing-state">
                    <Loader2 class="spinner" :size="48" color="#10b981" />
                    <h2>Processing extraction...</h2>
                    <p>This may take a minute while our BERT-OCR parses your research abstract and metadata.</p>
                </div>

                <div v-else-if="status === 'success'" class="success-state">
                    <CheckCircle :size="48" color="#10b981" />
                    <h2>Upload Successful!</h2>
                    <p>Redirecting you back to the management panel...</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.upload-page {
    min-height: 100vh;
    background: #f9fafb;
    display: flex;
    justify-content: center;
    padding: 4rem 2rem;
}

.upload-container {
    width: 100%;
    max-width: 600px;
}

.back-link {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #666;
    font-size: 0.9rem;
    cursor: pointer;
    margin-bottom: 1.5rem;
}

.upload-card {
    background: white;
    padding: 3rem;
    border-radius: 12px;
    border: 1px solid #eee;
    text-align: center;
}

.upload-card h1 {
    margin-bottom: 0.75rem;
}

.upload-card p {
    color: #666;
    font-size: 0.95rem;
    margin-bottom: 2.5rem;
}

.error-banner {
    background: #fef2f2;
    color: #b91c1c;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}

.drop-zone {
    border: 2px dashed #ddd;
    border-radius: 12px;
    padding: 3rem;
    margin-bottom: 2rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.drop-zone:hover {
    border-color: #10b981;
    background: #f0fdf4;
}

.drop-text {
    display: flex;
    flex-direction: column;
}

.drop-text span {
    font-size: 0.8rem;
    color: #888;
    margin-top: 0.25rem;
}

.file-info strong {
    display: block;
    color: #111;
    word-break: break-all;
}

.file-info span {
    font-size: 0.85rem;
    color: #666;
}

.submit-btn {
    width: 100%;
    padding: 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
}

.submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.processing-state,
.success-state {
    padding: 2rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

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
</style>
