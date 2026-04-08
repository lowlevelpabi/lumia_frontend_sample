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
- [x] **Document Library Management — Delete & Upload History** _(Admin & Faculty only)_ : Successfully implemented `Trash` tab in `manage_win.vue`. Adjustment with backend services is also done for the UI feature implementation
- [x] **Time & Date Bug** (`manage_win.vue`): Fixed the bug where the time and date of the uploaded, deleted, and restored document was not displayed in the correct timezone format. Backend adjustment is also needed for this one to finally resolve.
- [x] **Search Precision**: Evaluate if IMRAD-weighted searching can improve the relevance of top results.
- [x] **Hybrid Search**: Implement hybrid search (keyword + vector) to improve search relevance.
- [x] **Reference Inclusion**: Include in OCR and extraction the references from PDF and display it in UI.
- [x] **UI and Layout**: Revamp the `profile_win.vue` design and layout. Use a sidebar for clear navigation between user dashboard, update credentials, citated study, users who cited your study.
- [x] **Citation Track**: Revamp the `profile_win.vue` design and layout. Include the tracking of what study user citated.
- [x] **Citation Track #2**: A tracker for who citated your study.
- [x] **Issue in Reference**: The university used in citation reference is `Cavite State University, Indang, Cavite.`, the system should detect where campus the thesis was conducted and finished. **SOLVED (Partially)**: Satellite Campus location/place hardcoded name in `citation_gen.py` is removed.

## Possible Implementation

- [ ] **A4 Formatted IMRAD Export**
      Implement a "Download as PDF" feature that generates a professionally formatted document (A4, 12pt Serif, justified text, proper IMRAD structure) matching the approved design.

- [ ] **Realtime System Time**
      Make the system's time or timezone to be local and make sure that the functions that has timer in the system is working if we try to alter the time of the os manually. For example if a thesis is in trash or for deletion within 15 days, if we change the clock of the OS to advance in 3 days, if we came back in the UI and refresh the page, the timer should show 12 days remaining.

- [ ] **Implement Functionality for Oldest, Newest, and Most Cited Filter**
      Implement a functionality for the filtering option of Oldest, Newest and Most Cited Study in `explore_win.vue`.

  **Basis of each filter option:**
  - Newest and Oldest: Query the whole `paper` table in `thesis.db` to rank the oldest to older, newest to newer and return the result in UI search result.
  - Most Cited: Query the `user_citation` table in `thesis.db` to count the number of citations for each paper and rank them accordingly and return the result in UI search result.
  - Rename `Good Match`, `Perfect Match` in Recommendation Panel to `Similar Study` or `Recommended Study` in `explore_win.vue`.

---

### Possible Approaches for Citation

- [ ] **Option A — Citation Context**
      When a user clicks "Cite this study", instead of just incrementing a counter, show a small optional prompt:

  > _"What paper are you writing this for?"_ `[ Title of your paper ]` — a free-text field, optional

  **Store this as a citation_context on the existing UserCitation record. Now we have:**
  - Who cited it (the user, already tracked)
  - What paper they claim to be writing (self-reported, unverified)
  - When they cited it

- [ ] **Option B — Internal Citation Gaph**
      Add a cited_paper_id foreign key to UserCitation. When a student clicks Cite on Paper A, optionally ask:

  > _"Are you citing this in one of the papers already in our repository?"_ `[ Search our repository ]`

  If they pick Paper B from the repository, you now have a real A → B edge in a citation graph. This only works for papers already indexed, but that's still meaningful for your department's internal research lineage.

- [ ] **Option C — Self-Declaration Upload**
      Let students upload a draft or manuscript of their own paper (not for indexing, just for citation verification). The backend runs `_postprocess_references()` on the references section and checks if any extracted entries fuzzy-match papers already in the repository. Matches create verified citation links automatically.

  This is essentially what Semantic Scholar does, just scoped to your repository. It reuses your entire existing IMRAD extraction pipeline.

---
