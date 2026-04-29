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

// Official Thesis Margins (Inches to Points: 1" = 72pt)
const MARGIN_LEFT = 108;   // 1.5"
const MARGIN_RIGHT = 72;  // 1.0"
const MARGIN_TOP = 72;    // 1.0"
const MARGIN_BOTTOM = 72; // 1.0"

const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Column configuration
const COLUMN_GAP = 20;
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

    let y = MARGIN_TOP;
    let currentColumn = 0; // 0 for left, 1 for right
    let columnTopY = MARGIN_TOP; // Where the 2-column section starts on the current page

    // --- Helper: Add Text with Wraps, Pagination, Column Support, Indent & Manual Justify ---
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

      doc.setTextColor(0, 0, 0);
      doc.setFont(FONT_SERIF, fontStyle);
      doc.setFontSize(fontSize);

      const targetWidth = useColumns ? COLUMN_WIDTH : CONTENT_WIDTH;
      y += marginTop;

      // Determine whether to apply first-line indent
      const FIRST_LINE_INDENT = 24;
      const shouldIndent = fontStyle === FONT_NORMAL && fontSize <= 12 && align === "justify";
      const indent = shouldIndent ? FIRST_LINE_INDENT : 0;

      let lines: string[] = [];
      if (indent > 0) {
        const res = doc.splitTextToSize(text, targetWidth - indent);
        const firstLineCandidates = Array.isArray(res) ? res : [res];
        const firstLine = firstLineCandidates.length > 0 ? String(firstLineCandidates[0]) : "";
        const restStart = text.indexOf(firstLine) + firstLine.length;
        const restText = text.slice(restStart).trimStart();
        const restLinesRes = restText ? doc.splitTextToSize(restText, targetWidth) : [];
        const restLines = Array.isArray(restLinesRes) ? restLinesRes : [restLinesRes];
        lines = [firstLine, ...restLines];
      } else {
        const res = doc.splitTextToSize(text, targetWidth);
        lines = Array.isArray(res) ? res : [res];
      }

      for (let i = 0; i < lines.length; i++) {
        if (y + fontSize > A4_HEIGHT - MARGIN_BOTTOM) {
          if (useColumns && currentColumn === 0) {
            currentColumn = 1;
            y = columnTopY;
          } else {
            doc.addPage();
            y = MARGIN_TOP;
            columnTopY = MARGIN_TOP;
            currentColumn = 0;
          }
          doc.setFont(FONT_SERIF, fontStyle);
          doc.setFontSize(fontSize);
        }

        const line = (lines[i] || "").trim();
        const currentX = useColumns
          ? MARGIN_LEFT + currentColumn * (COLUMN_WIDTH + COLUMN_GAP)
          : MARGIN_LEFT;

        const xForLine = i === 0 && indent > 0 ? currentX + indent : currentX;
        const widthForLine = i === 0 && indent > 0 ? targetWidth - indent : targetWidth;

        if (align === "center") {
          const pageCenter = (MARGIN_LEFT + (A4_WIDTH - MARGIN_RIGHT)) / 2;
          doc.text(line, pageCenter, y, { align: "center" });
        } else if (align === "justify" && i < lines.length - 1 && line.includes(" ")) {
          // MANUAL JUSTIFICATION
          const words = line.split(/\s+/);
          if (words.length > 1) {
            const totalWordsWidth = words.reduce((acc, w) => acc + doc.getTextWidth(w), 0);
            const totalSpace = widthForLine - totalWordsWidth;
            const spaceWidth = totalSpace / (words.length - 1);

            let wordX = xForLine;
            words.forEach((word, index) => {
              doc.text(word, wordX, y);
              wordX += doc.getTextWidth(word);
              if (index < words.length - 1) {
                wordX += spaceWidth;
              }
            });
          } else {
            doc.text(line, xForLine, y);
          }
        } else {
          doc.text(line, xForLine, y);
        }

        y += fontSize * 1.5; // Formal spacing
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
    addText(paper.abstract ?? "", 12, FONT_NORMAL, "justify", 0, 10, false);

    if (paper.keywords) {
      addText(`Keywords: ${paper.keywords}`, 10, FONT_BOLD, "left", 0, 15, false);
    }

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN_LEFT, y, A4_WIDTH - MARGIN_RIGHT, y);
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
              addText(prefix + block.heading, 12, FONT_BOLD, "left", 6, 3, true);
            }
            addText(block.body, 12, FONT_NORMAL, "justify", 0, 6, true);
          }
        } else if (paper.introduction) {
          // Fallback: strip markers from raw text (summary not yet generated)
          addText(stripMarkers(paper.introduction), 12, FONT_NORMAL, "justify", 0, 7, true);
        }
        continue;
      }

      // ── Methods / RAD: use imrad_structured typed blocks ─────────────────
      if (hasStructured) {
        for (const block of blocks) {
          if (block.type === "subheading") {
            subheadingIndex += 1;
            const prefix = String.fromCharCode(64 + subheadingIndex) + ". ";
            addText(prefix + block.text, 12, FONT_BOLD, "left", 6, 3, true);
          } else if (block.type === "text") {
            addText(block.text, 12, FONT_NORMAL, "justify", 0, 6, true);
          } else if (block.type === "table-image") {
            try {
              const imgData = await this.getImageData(block.text);
              const imgProps = doc.getImageProperties(imgData);

              const finalWidth = COLUMN_WIDTH;
              const finalHeight = (imgProps.height * finalWidth) / imgProps.width;

              if (y + finalHeight > A4_HEIGHT - MARGIN_BOTTOM) {
                if (currentColumn === 0) {
                  currentColumn = 1;
                  y = columnTopY;
                } else {
                  doc.addPage();
                  y = MARGIN_TOP;
                  columnTopY = MARGIN_TOP;
                  currentColumn = 0;
                }
              }

              const currentX = MARGIN_LEFT + currentColumn * (COLUMN_WIDTH + COLUMN_GAP);
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
        addText(stripMarkers(rawText), 12, FONT_NORMAL, "justify", 0, 7, true);
        // For non-combined RAD, append discussion if separate
        if (sec.key === "rad" && paper.discussion && !isRadCombined) {
          addText(stripMarkers(paper.discussion), 12, FONT_NORMAL, "justify", 0, 7, true);
        }
      }
    }

    // 3. --- References Section (APA 6th Edition) ---
    if (paper.references) {
      doc.addPage();
      y = MARGIN_TOP;
      addText("References", 12, FONT_BOLD, "center", 0, 15, false);

      const refs = paper.references.split(/\n\n+/).filter(Boolean);
      for (const ref of refs) {
        // APA 6th: Hanging Indent (First line flat, subsequent lines indented 0.5" = 36pt)
        const HANGING_INDENT = 36;
        const targetWidth = CONTENT_WIDTH;

        doc.setFont(FONT_SERIF, FONT_NORMAL);
        doc.setFontSize(11);

        const lines = doc.splitTextToSize(ref, targetWidth);
        const linesArr = Array.isArray(lines) ? lines : [lines];

        for (let i = 0; i < linesArr.length; i++) {
          if (y + 12 > A4_HEIGHT - MARGIN_BOTTOM) {
            doc.addPage();
            y = MARGIN_TOP;
            doc.setFont(FONT_SERIF, FONT_NORMAL);
            doc.setFontSize(11);
          }

          const line = linesArr[i].trim();
          const x = i === 0 ? MARGIN_LEFT : MARGIN_LEFT + HANGING_INDENT;
          doc.text(line, x, y);
          y += 11 * 1.5; // APA line spacing
        }
        y += 10; // Space between entries
      }
    }

    // --- Final Footer Pass: Execute only once at the end ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont(FONT_SERIF, FONT_ITALIC);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150); // Professional gray for footer

      const footerY = A4_HEIGHT - MARGIN_BOTTOM / 2;
      doc.text(`Page ${i} of ${pageCount}`, A4_WIDTH - MARGIN_RIGHT, footerY, { align: "right" });
      doc.text(`Exported from LUMIA Retrieval Repository - DCS - CVSUIMUS · ${paper.year}`, MARGIN_LEFT, footerY);
    }

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
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          reject(new Error("Failed to get 2D context"));
        }
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  },
};
