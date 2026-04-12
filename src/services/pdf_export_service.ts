import { jsPDF } from "jspdf";
import type { Paper, ImradBlock } from "./api";

// ── Mirrors parseSummaryBlocks() in detail_win.vue exactly ───────────────────
function parseSummaryBlocks(text: string): { heading: string; body: string }[] {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string } | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isHeading =
      trimmed.length <= 80 &&
      !trimmed.endsWith(".") &&
      !trimmed.endsWith(",") &&
      /^[A-Z]/.test(trimmed) &&
      !/[a-z]{20,}/.test(trimmed);
    if (isHeading && lines.indexOf(line) < lines.length - 1) {
      if (current) blocks.push(current);
      current = { heading: trimmed, body: "" };
    } else {
      if (!current) current = { heading: "", body: "" };
      current.body += (current.body ? " " : "") + trimmed;
    }
  }
  if (current) blocks.push(current);
  return blocks.filter((b) => b.body.trim());
}

// ── Strip [[TABLE_IMAGE:X]] / [TABLE_IMAGE:X] markers from raw fallback text ──
function stripMarkers(text: string): string {
  return text
    .replace(/\[{1,2}(?:TABLE|FIGURE)_IMAGE:.*?\]{1,2}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * PDF Export Service
 * ------------------
 * Generates a professionally formatted A4 IMRAD document from paper data.
 * Now supports a 2-column layout for the main body.
 */

// A4 Dimensions in points (72 DPI)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 40; // Reduced margin slightly to expand column width
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

// Column configuration
const COLUMN_GAP = 15; // Slightly reduced gap
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;

// Fonts
const FONT_SERIF = "times";
const FONT_BOLD = "bold";
const FONT_NORMAL = "normal";
const FONT_ITALIC = "italic";

export const pdfExportService = {
  /**
   * Generates and downloads the PDF
   */
  async downloadPaper(paper: Paper) {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    let y = MARGIN;
    let currentColumn = 0; // 0 for left, 1 for right
    let columnTopY = MARGIN; // Where the 2-column section starts on the current page

    // --- Helper: Add Text with Wraps, Pagination, Column Support, Indent & Justify ---
    const addText = (
      text: string,
      fontSize: number,
      fontStyle: string = FONT_NORMAL,
      align: "left" | "center" | "justify" = "left",
      marginTop: number = 0,
      marginBottom: number = 10,
      useColumns: boolean = true,
    ) => {
      if (!text) return;

      doc.setTextColor(0, 0, 0); // Ensure text is black (prevents footer color bleed)
      doc.setFont(FONT_SERIF, fontStyle);
      doc.setFontSize(fontSize);

      const targetWidth = useColumns ? COLUMN_WIDTH : CONTENT_WIDTH;
      y += marginTop;

      // Determine whether to apply first-line indent (approx. 1.5rem ≈ 18pt)
      const FIRST_LINE_INDENT = 18;
      const shouldIndent = fontStyle === FONT_NORMAL && fontSize <= 11 && align === "justify";
      const indent = shouldIndent ? FIRST_LINE_INDENT : 0;

      // If indent is required, build first line separately then wrap remaining text
      let lines: string[] = [];
      if (indent > 0) {
        const firstLineCandidatesRaw = doc.splitTextToSize(text, targetWidth - indent);
        const firstLineCandidates = Array.isArray(firstLineCandidatesRaw)
          ? firstLineCandidatesRaw
          : [firstLineCandidatesRaw];
        const firstLine = firstLineCandidates.length > 0 ? String(firstLineCandidates[0]) : "";
        const restStart = text.indexOf(firstLine) + firstLine.length;
        const restText = text.slice(restStart).trimStart();
        const restLinesRaw = restText ? doc.splitTextToSize(restText, targetWidth) : [];
        const restLines = Array.isArray(restLinesRaw)
          ? restLinesRaw
          : restLinesRaw
            ? [restLinesRaw]
            : [];
        lines = [firstLine, ...restLines];
      } else {
        const wrappedRaw = doc.splitTextToSize(text, targetWidth);
        lines = Array.isArray(wrappedRaw) ? wrappedRaw : wrappedRaw ? [wrappedRaw] : [];
      }

      for (let i = 0; i < lines.length; i++) {
        // Check if we need to switch columns or pages
        if (y + fontSize > A4_HEIGHT - MARGIN) {
          if (useColumns && currentColumn === 0) {
            // Switch to second column
            currentColumn = 1;
            y = columnTopY;
          } else {
            // New page
            doc.addPage();
            pdfExportService.addFooter(doc, paper);
            y = MARGIN;
            columnTopY = MARGIN;
            currentColumn = 0;
          }
          // Re-apply font settings after page/column switch
          doc.setFont(FONT_SERIF, fontStyle);
          doc.setFontSize(fontSize);
        }

        const line = (lines[i] ?? "") as string;
        const currentX = useColumns ? MARGIN + currentColumn * (COLUMN_WIDTH + COLUMN_GAP) : MARGIN;

        // Apply indent only to the very first rendered line
        const xForLine = i === 0 && indent > 0 ? currentX + indent : currentX;
        const maxWidthForLine = i === 0 && indent > 0 ? targetWidth - indent : targetWidth;

        if (align === "center") {
          doc.text(line, A4_WIDTH / 2, y, { align: "center" });
        } else if (align === "justify" && i < lines.length - 1) {
          doc.text(line, xForLine, y, { maxWidth: maxWidthForLine, align: "justify" });
        } else {
          doc.text(line, xForLine, y);
        }

        y += fontSize * 1.2; // standard line spacing
      }

      y += marginBottom;
    };

    // 1. --- Full Width Header Section ---
    // Title
    addText(paper.title, 18, FONT_BOLD, "center", 0, 15, false);

    // Authors
    const authors = paper.author
      .split("|")
      .map((a) => a.trim())
      .join(" · ");
    addText(authors, 11, FONT_NORMAL, "center", 0, 5, false);

    // Dept / Year
    addText(`${paper.department} · ${paper.year}`, 10, FONT_ITALIC, "center", 0, 15, false);

    // Abstract (cleaned)
    addText("Abstract", 12, FONT_BOLD, "left", 10, 5, false);
    addText(paper.abstract ?? "", 11, FONT_NORMAL, "justify", 0, 10, false);

    if (paper.keywords) {
      addText(`Keywords: ${paper.keywords}`, 10, FONT_BOLD, "left", 0, 15, false);
    }

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, y, A4_WIDTH - MARGIN, y);
    y += 20;

    // Set Column start point
    columnTopY = y;

    // 2. --- 2-Column IMRAD Content ---
    // Mirrors IMRAD_SECTION_CONFIGS + rendering logic in detail_win.vue exactly:
    //   Introduction → parseSummaryBlocks(introduction_summary) or stripMarkers(introduction)
    //   Methods/RAD  → imrad_structured typed blocks or stripMarkers(raw)
    // This is the same cleaned data the web view uses — no boilerplate can leak in.

    const isRadCombined = !!(
      paper.results &&
      paper.discussion &&
      paper.results.trim() === paper.discussion.trim()
    );

    const sections = [
      { label: "INTRODUCTION", key: "introduction" },
      { label: "METHODOLOGY", key: "methods" },
      { label: "RESULTS AND DISCUSSION", key: "rad" },
    ];

    for (const sec of sections) {
      // Resolve 'rad' virtual key → 'results' for raw-text fallback
      const resolvedKey = sec.key === "rad" ? "results" : sec.key;

      // Get structured blocks — mirrors getStructuredBlocks() in detail_win.vue
      let blocks: ImradBlock[] = [];
      const imrad = paper.imrad_structured;
      if (imrad) {
        if (sec.key === "rad") {
          const r: ImradBlock[] = imrad.results ?? [];
          const d: ImradBlock[] = imrad.discussion ?? [];
          blocks = isRadCombined ? r : [...r, ...d];
        } else if (sec.key === "methods") {
          blocks = imrad.methods ?? [];
        } else if (sec.key === "introduction") {
          blocks = imrad.introduction ?? [];
        } else {
          blocks = (imrad as Record<string, ImradBlock[]>)[resolvedKey] ?? [];
        }
      }

      // Check if there's any content at all before rendering the heading
      const hasSummary =
        sec.key === "introduction" && !!(paper.introduction_summary as string | undefined);
      const hasStructured = blocks.length > 0;
      const hasRaw = !!(paper[resolvedKey as keyof Paper] as string | undefined);

      if (!hasSummary && !hasStructured && !hasRaw) continue;

      addText(sec.label, 12, FONT_BOLD, "left", 12, 8, true);

      // Reset alphabetic subheading counter for this section (A, B, ...)
      let subheadingIndex = 0;

      // ── Introduction: use AI summary (already boilerplate-free) ─────────
      if (sec.key === "introduction") {
        const summary = paper.introduction_summary as string | undefined;
        if (summary) {
          for (const block of parseSummaryBlocks(summary)) {
            if (block.heading) {
              subheadingIndex += 1;
              const prefix = String.fromCharCode(64 + subheadingIndex) + ". ";
              addText(prefix + block.heading, 11, FONT_BOLD, "left", 6, 3, true);
            }
            addText(block.body, 11, FONT_NORMAL, "justify", 0, 6, true);
          }
        } else if (paper.introduction) {
          // Fallback: strip markers from raw text (summary not yet generated)
          addText(stripMarkers(paper.introduction), 11, FONT_NORMAL, "justify", 0, 7, true);
        }
        continue;
      }

      // ── Methods / RAD: use imrad_structured typed blocks ─────────────────
      if (hasStructured) {
        for (const block of blocks) {
          if (block.type === "subheading") {
            subheadingIndex += 1;
            const prefix = String.fromCharCode(64 + subheadingIndex) + ". ";
            addText(prefix + block.text, 11, FONT_BOLD, "left", 6, 3, true);
          } else if (block.type === "text") {
            addText(block.text, 11, FONT_NORMAL, "justify", 0, 6, true);
          } else if (block.type === "table-image") {
            try {
              const imgData = await this.getImageData(block.text);
              const imgProps = doc.getImageProperties(imgData);

              const finalWidth = COLUMN_WIDTH;
              const finalHeight = (imgProps.height * finalWidth) / imgProps.width;

              if (y + finalHeight > A4_HEIGHT - MARGIN) {
                if (currentColumn === 0) {
                  currentColumn = 1;
                  y = columnTopY;
                } else {
                  doc.addPage();
                  pdfExportService.addFooter(doc, paper);
                  y = MARGIN;
                  columnTopY = MARGIN;
                  currentColumn = 0;
                }
              }

              const currentX = MARGIN + currentColumn * (COLUMN_WIDTH + COLUMN_GAP);
              doc.addImage(imgData, "PNG", currentX, y, finalWidth, finalHeight);
              y += finalHeight + 8;
            } catch (e) {
              console.warn("Failed to add image:", e);
            }
          } else if (block.type === "table-label") {
            addText(block.text, 9, FONT_ITALIC, "center", 0, 8, true);
          }
        }
      } else if (hasRaw) {
        // Fallback: raw text with markers stripped
        const rawText = paper[resolvedKey as keyof Paper] as string;
        addText(stripMarkers(rawText), 11, FONT_NORMAL, "justify", 0, 7, true);
        // For non-combined RAD, append discussion if separate
        if (sec.key === "rad" && paper.discussion && !isRadCombined) {
          addText(stripMarkers(paper.discussion), 11, FONT_NORMAL, "justify", 0, 7, true);
        }
      }
    }

    // 3. --- References Section ---
    if (paper.references) {
      addText("REFERENCES", 12, FONT_BOLD, "left", 15, 8, true);
      const refs = paper.references.split(/\n\n+/).filter(Boolean);
      for (const ref of refs) {
        addText(ref, 9, FONT_NORMAL, "left", 0, 4, true);
      }
    }

    // Final Footer pass
    pdfExportService.addFooter(doc, paper);

    // Save
    const filename = `${paper.title
      .substring(0, 30)
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_IMRAD.pdf`;
    doc.save(filename);
  },

  /**
   * Helper to fetch image and convert to Base64
   */
  async getImageData(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  },

  /**
   * Adds consistent footer to all pages
   */
  addFooter(doc: jsPDF, paper: Paper) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont(FONT_SERIF, FONT_ITALIC);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);

      const footerY = A4_HEIGHT - MARGIN / 2;
      doc.text(`Page ${i} of ${pageCount}`, A4_WIDTH - MARGIN, footerY, { align: "right" });
      doc.text(`LUMIA Smart Archival System · ${paper.year}`, MARGIN, footerY);
    }
    // ── CRITICAL: reset text color to solid black after writing gray footer ──
    // jsPDF carries text color as state — any page added after addFooter()
    // would inherit gray (150,150,150) for all subsequent addText() calls,
    // causing the "gray text" bug visible in the PDF output.
    doc.setTextColor(0, 0, 0);
  },
};
