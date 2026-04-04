# Thesis Development TODO

## Completed Tasks

- [x] **Stepper Animation & UI Revamp**: Replaced pulsing ring with a professional 1.5s rotating ring (75% length) for Step 1-3.
- [x] **Interaction Locking**: Integrated strict `processingDoc` checks to block click/drag/drop during parsing to prevent system disruption.
- [x] **Dedicated Parsing View**: Entirely hide the upload card during processing, showing a clean, ghost-style `BookLoader` state.
- [x] **Animated Loader UI**: Replaced the spinner with an animated 2D circular loader, synchronized with real-time SSE progress.
- [x] **Background Processing**: SSE status streaming implemented to handle long-running extractions without UI blocking.
- [x] **Thumbnail Auto-select**: Fixed the bug in `manage_win.vue` where thumbnails were not automatically checked during review.
- [x] **Recommendation Sidebar Synchronization**: Aligned the "Related Studies" sidebar in `detail_win.vue` with `explore_win.vue`, including a professional empty state.
- [x] **Document View Parity**: Restored the preferred **continuous text flow** (span-based rendering) in both `manage_win` and `detail_win`.
- [x] **High-Fidelity Visual Extraction**: Re-implemented and refined the PyMuPDF-based table and figure extraction pipeline.
- [x] **Single-Source Spatial Analysis**: Switched to a unified `fitz` (PyMuPDF) pipeline for both text and images to ensure coordinate consistency.
- [x] **Precise In-line Positioning**: Resolved the "Media Clumping" bug where multiple tables on a single page are pushed to the end of the section instead of remaining in-line.
- [x] **Table Image Crop Fix** (`imrad_service.py` → `_extract_page_spatially`): Rewrote zone-bounding logic with a three-strategy approach — A: `find_tables()` structural bbox, B: horizontal drawing rule detection, C: conservative heuristic fallback. Tables are now correctly captured and no longer cut off. Minimum clip height raised to 100px.
- [x] **Comma Caption Delimiter Support** (`imrad_service.py`): Added `,` to `TRUE_CAP_RE` so `Table 3,` (author typo using comma instead of period) is recognized as a true caption in both the spatial extractor and the text injection pass.
- [x] **Remove Table Image Border** (`detail_win.vue`): Stripped `border`, `border-radius`, and `box-shadow` from `.journal-figure-img` so extracted table images render cleanly without a visible frame.
- [x] **Table Crop: Description-Above Bleed** (`imrad_service.py`): Resolved by reverting to including the description/caption within the table crop. While descriptions above the table will still show up in the image, this guarantees that no part of the table or caption is clipped (using a safe 10px top buffer). Validated across multiple documents.

## Active Issues & Current Sprint


- [ ] **Search Precision**: Evaluate if IMRAD-weighted searching can improve the relevance of top results.

- [ ] **Document Library Management — Delete & Upload History** _(Admin & Faculty only)_

  A full document lifecycle management feature accessible only to `Admin` and `Faculty` roles via a new **"Library"** tab in `manage_win.vue`.

  **Backend tasks:**
  - [ ] `papers.py` — Add `DELETE /api/v1/papers/{id}` endpoint, guarded by `faculty_or_admin_required`. Must delete from both SQLite (`papers` table) and Qdrant vector store. Log the action to `activity_logs`.
  - [ ] `papers.py` — Add `GET /api/v1/papers/` (list all) endpoint for the management view (title, author, year, uploader, uploaded_at, id).
  - [ ] `logs.py` — Add `GET /api/v1/logs/` endpoint to return all `activity_logs` rows, guarded by `faculty_or_admin_required`. Support optional filters: `action`, `performed_by`, date range.
  - [ ] `api.ts` (frontend service) — Add `deletePaper(id)`, `getAllPapers()`, and `getActivityLogs()` API methods.

  **Frontend tasks (`manage_win.vue`):**
  - [ ] Add a **"Library"** tab — visible only when `userRole` is `Admin` or `Faculty`.
  - [ ] **Documents sub-panel**: Table listing all uploaded papers (title, author, year, uploader, date). Each row has a **Delete** button with a confirmation modal. Bulk-select + delete is a stretch goal.
  - [ ] **Upload History sub-panel**: Table of `activity_logs` rows (action badge, paper title, performed by, timestamp). Filterable by action type (Upload / Delete) and date.
  - [ ] Role guard: hide the tab entirely for `User` (student) role — same pattern as existing `processingDoc` guards.

---
