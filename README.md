# LUMIA: Smart Research Frontend

### (Vue 3 + TypeScript + Vite)

This is the frontend application for **LUMIA — Smart Research**, an AI-powered web-based research paper retrieval and recommendation system. It connects to the BERT-NLP backend API to provide semantic search, paper discovery, and an intelligent upload flow.

---

## 🚀 Core Features

- **Semantic Search UI**: Real-time query input with BERT-powered result ranking.
- **Advanced Filter Sidebar**: Filter by Year Range, Department, Degree Program, and Project Type.
- **3-Step Upload Flow**: Guided upload with Smart Extract (OCR) or Manual Review strategy selection.
- **PDF Page Thumbnails**: Live page previews with zoom modal and extracted text side-by-side.
- **Page-Level Vectorization Control**: Users choose which pages to include in the AI index.
- **Role-Based Views**: Admin, Faculty, and User experiences — each with tailored UI.
- **Paper Detail View**: Full metadata, abstract, citations, recommendations, and download access.
- **Dark Mode Support**: Theme-aware design with accent-consistent dark mode.
- **Mobile Responsiveness**: Adaptive layout across desktop and mobile viewports.

---

## 🛠 Tech Stack

- **Framework**: Vue 3 (Composition API + `<script setup>`)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Icons**: Lucide Vue Next
- **HTTP Client**: Fetch API (via `src/services/api.ts`)
- **Styling**: Vanilla CSS (component-scoped)

---

## ⚙️ Setup & Running

### 1. Install Dependencies

```sh
npm install
```

### 2. Start Development Server

```sh
npm run dev
```

The app will be available at `http://localhost:5173`.
Make sure the backend is running at `http://127.0.0.1:8000` (or update `src/services/api.ts`).

### 3. Build for Production

```sh
npm run build
```

### 4. Lint

```sh
npm run lint
```

---

## 📁 Project Structure

- `src/views/` — Page-level Vue components (search, upload, admin, detail, etc.)
- `src/components/` — Reusable UI components
- `src/services/api.ts` — Centralized API service layer
- `src/router/` — Vue Router configuration
- `src/assets/` — Static assets and global styles

---

## 📋 Sprint History

> Full sprint details are documented in the backend repository:
> **[`Thesis Backend/history/sprint_history.txt`](../Thesis%20Backend/history/sprint_history.txt)**

---

## 📜 Changelog

### Sprint 2 – Week C *(2026-02-25)*
*OCR Result Display & Upload UX Polish*

- **Author Split Fix**: Changed author delimiter from `,` to ` | ` so Filipino-format names (`SURNAME, FIRSTNAME M.I.`) display correctly in individual input boxes.
- **Vertical Step Navigation**: Upload step indicator moved from top header to a fixed right-side vertical rail.
- **Pulse Effect**: Active step displays a pulsing animation ring for clear visual feedback.
- **Header Layout Fix**: Long research paper filenames now truncate with ellipsis instead of overlapping UI elements.
- **Author & Abstract Fallbacks**: Both fields now display descriptive instructional messages when data cannot be auto-detected.

---

### Sprint 2 – Week B
*Upload Flow UX Overhaul*

- **Strategy Modal**: Users choose between Smart Auto-Scan (OCR) and Manual Review before upload.
- **PDF Page Thumbnails**: Cover page and inner pages rendered as clickable thumbnails.
- **Zoom Modal**: Click any thumbnail to see a full-page zoom with extracted text preview.
- **Page Selection Grid**: Multi-select which pages to vectorize for AI indexing.
- **Step Indicator**: 3-step progress indicator across the upload flow.
- **Review Form**: Editable metadata fields (Title, Author(s), Year, Abstract, Department, etc.).
- **Author Multi-Input**: Dynamic author input rows with add/remove controls.

---

### Sprint 2 – Week A
*Advanced Filtering & Role-Based UI*

- **Advanced Filter Sidebar**: Year range pickers, department dropdown, degree program tags.
- **Project Type Filter**: Toggle between Capstone Project and Thesis result sets.
- **Result Tags**: Color-coded degree and project type badges on search result cards.
- **Admin Dashboard**: Full paper management, user management, and global control views.
- **Faculty Upload**: Faculty-only upload button with role-gated access.
- **Citation & View Metrics**: Papers display citation counts and view statistics.

---

### Sprint 1 – Foundational MVP

- **Search Interface**: Basic semantic query input and result display.
- **Paper Detail View**: Metadata, abstract, and related paper recommendations.
- **Login / Auth Flow**: JWT-based authentication with role-aware redirect.
- **Core Routing**: Vue Router setup for all primary views.

---

## 📝 License

Proprietary Prototype for Undergrad Thesis research.
