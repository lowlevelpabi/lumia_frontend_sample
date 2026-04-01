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

### [X] Visual Table Deprecation (The Purge)
- [x] **Text-Only Enforcement**: Completely deactivated the Targeted OCR and table cropping logic to ensure 100% backend stability and high-speed processing.
- [x] **Media Cleanup**: Metadata now defaults to `{}` to prevent frontend rendering errors on missing table snippets.

## Current Sprint / Up Next

- [ ] **Mobile Responsive Pass**: Ensure the management sidebar and IMRAD document flow collapse gracefully on mobile devices.
- [ ] **High-Fidelity Text Review**: Refine the `manage_win.vue` review step to better display auto-trimmed text sections without table placeholders.
- [ ] **Search Precision**: Evaluate if IMRAD-weighted searching can improve the relevance of top results.

## Future Roadmap (Strategic Enhancements)

- [ ] **Hybrid Search (Sparse + Dense Retrieval)**: Combine BERT-based semantic search with traditional BM25 keyword matching to improve exact-match precision (e.g., finding specific algorithm names).
- [ ] **Cross-Encoder Reranking**: Use a second-pass model to re-score the top 10 search results for maximum accuracy.
- [ ] **Section-Aware KeyBERT**: Extract keywords separately from Abstract, Methodology, and Discussion using a sliding window for better coverage.

---
