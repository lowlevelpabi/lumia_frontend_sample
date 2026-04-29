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
- [x] **A4 Formatted IMRAD Export**
      Implement a "Download as PDF" feature that generates a professionally formatted document (A4, 12pt Serif, justified text, proper IMRAD structure) matching the approved design.

- [x] **Realtime System Time**
      Make the system's time or timezone to be local and make sure that the functions that has timer in the system is working if we try to alter the time of the os manually. For example if a thesis is in trash or for deletion within 15 days, if we change the clock of the OS to advance in 3 days, if we came back in the UI and refresh the page, the timer should show 12 days remaining.

- [x] **Implement Functionality for Oldest, Newest, and Most Cited Filter**
      Implement a functionality for the filtering option of Oldest, Newest and Most Cited Study in `explore_win.vue`.

  **Basis of each filter option:**
  - [x] Newest and Oldest: Query the whole `paper` table in `thesis.db` to rank the oldest to older, newest to newer and return the result in UI search result.
  - [x] Most Cited: Query the `user_citation` table in `thesis.db` to count the number of citations for each paper and rank them accordingly and return the result in UI search result.
  - [x] Rename `Good Match`, `Perfect Match` in Recommendation Panel to `Similar Study` or `Recommended Study` in `explore_win.vue`.

- [x] **Body Text Bug with the Table**
      Fix the current bug during extraction, cleaning, and displaying of the body text in UI wherein the table's content such as `FUNCTIONALITY`, `MEAN`, `STANDARD DEVIATION`, `INTERPRETATION` are being displayed as a body text instead it should be filtered during uploading and extraction so it when the backend send it to UI, the UI won't need to display it either. (Give at least 1-2 screenshot of the sample table to see what is the content of the table being extracted also and flagged as body text).

- [x] **Downloadable PDF Bug** - The downloadable pdf imrad format of the study producing a bug where the text is being gray out (used gray font color) and some part is still bright black color. (Give at least 1-3 sample image of the bug). Also the page number in the downloadable pdf is like doubled or duplicated or something? (Give at least 1-3 image of the problem with the page number).

- [x] **User Guide in UI** - At least have a structural guide or manual how to use the system or how to conduct the evaluation for online evaluation and not meetup setup.

- [x] **Bookmark** - Should have at least a bookmark for user aside from citate.

- [x] **Graph in UI** - Add a graph to track how many thesis and capstone does the repo has, and who's program has the most upload.

- [x] **Credibility/Access** - Give credibility to student to upload their own study. If the student name from the uploaded thesis or capstone is the same as the user's name, then in that user's profile, there should be a tab for "My Uploads" and in that tab, the user can see the list of thesis and capstone that they uploaded. For example: If author 1 uploaded their study, when author 2 and 3 create its account or already created an account, they can see the list of thesis and capstone that author 1 uploaded in their profile.

## Next Agenda

- [x] **Recommendation Issue** - Fix the issue with recommendation algorithm or logic to don't recommend anything related studies if the current research paper that the user viewing or browsing is not related or the context of the study is not related to the recommended studies. (During presentation, the system recommend system that is not related to the study or it is only recommending by Title. The recommendation module should be context aware also, similar to the search query logic)

- [x] **Comprehensive IMRaD** - Improve the IMRaD extraction to be "comprehensive" (no cut-offs, proper sub-heading detection, and better structural flow).

- [x] **Abstract Extraction** - Fix the issue where Abstract content is being cut off. Implement logic to flag exactly where it starts and ends to ensure full capture.

- [x] **Author Extraction Accuracy** - Refine the author capture logic to work accurately across different document formats.

- [x] **UI Refinement (Year/Title)** - Move the publication year (e.g., 2024) next to the Title in the detail view for better visual clarity.

- [x] **Advanced Citation Logic** -
  - Implement citation triggers for _both_ the Cite button and PDF Download (as per panel feedback).
  - Add "Removable Citations": Allow users to toggle their citation on/off.

- [ ] **Enhanced Bookmark Management** - Add "Select All", "Unselect All", and individual deletion/checkboxes within the bookmark modal for easier management.

- [ ] **PDF Export Styling** - Adjust the fonts and layout in the downloadable PDF IMRaD document for better readability. Make it justified both sides since it is using 2 columns.

- [ ] **Student Upload Approval Workflow** -
  - Implement a "Pending/Approval" state in the management view.
  - Student uploads are cached in the database and must be approved by Admin/Faculty before becoming public.

---
