import { jsPDF } from "jspdf";
import type { Paper } from "./api";

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

    // --- Helper: Clean Text of Boilerplate ---
    const cleanText = (text: string) => {
      if (!text) return "";
      const bp = [
        /Cavite State University/i,
        /CvSU/i,
        /Imus Campus/i,
        /Bachelor of Science/i,
        /in partial fulfillment/i,
        /requirements for the degree/i,
        /Undergraduate Thesis/i,
        /Capstone Project/i,
        /Adviser\s*:/i,
        /Prepared under the supervision/i,
        /Department\s+of\s+[A-Za-z\s]+/i,
        /College\s+of\s+[A-Za-z\s]+/i,
        /Contribution\s+No\.?/i,
        /Imus\s+City/i,
        /^\s*\d+\s*$/,
        /^\s*[ivxIVX]+\s*$/,
      ];

      return text
        .split("\n")
        .filter((line) => !bp.some((regex) => regex.test(line.trim())))
        .join("\n")
        .trim();
    };

    // --- Helper: Add Text with Wraps, Pagination, and Column Support ---
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

      const lines = doc.splitTextToSize(text, targetWidth);

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
            this.addFooter(doc, paper);
            y = MARGIN;
            columnTopY = MARGIN;
            currentColumn = 0;
          }
          // Re-apply font settings after page/column switch
          doc.setFont(FONT_SERIF, fontStyle);
          doc.setFontSize(fontSize);
        }

        const line = lines[i];
        const currentX = useColumns ? MARGIN + currentColumn * (COLUMN_WIDTH + COLUMN_GAP) : MARGIN;

        if (align === "center") {
          doc.text(line, A4_WIDTH / 2, y, { align: "center" });
        } else if (align === "justify" && i < lines.length - 1) {
          // Manual justification for better narrow-column rendering
          doc.text(line, currentX, y, { maxWidth: targetWidth, align: "justify" });
        } else {
          doc.text(line, currentX, y);
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
    addText(cleanText(paper.abstract), 11, FONT_NORMAL, "justify", 0, 10, false);

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
    const sections = [
      { label: "INTRODUCTION", key: "introduction" },
      { label: "METHODOLOGY", key: "methods" },
      { label: "RESULTS", key: "results" },
      { label: "DISCUSSION", key: "discussion" },
    ];

    for (const sec of sections) {
      const blocks = paper.imrad_structured?.[sec.key as keyof typeof paper.imrad_structured] || [];

      if (blocks.length > 0 || paper[sec.key as keyof Paper]) {
        addText(sec.label, 12, FONT_BOLD, "left", 12, 8, true);

        if (blocks.length > 0) {
          for (const block of blocks) {
            if (block.type === "subheading") {
              addText(block.text, 12, FONT_BOLD, "left", 6, 5, true);
            } else if (block.type === "text") {
              // Apply boilerplate cleaning to Introduction specifically as requested
              const text = sec.key === "introduction" ? cleanText(block.text) : block.text;
              if (text) addText(text, 12, FONT_NORMAL, "justify", 0, 7, true);
            } else if (block.type === "table-image") {
              try {
                const imgData = await this.getImageData(block.text);
                const imgProps = doc.getImageProperties(imgData);

                // Reverted to Column Width as requested.
                // The backend high DPI ensures this is sharp and readable.
                const finalWidth = COLUMN_WIDTH;
                const finalHeight = (imgProps.height * finalWidth) / imgProps.width;

                if (y + finalHeight > A4_HEIGHT - MARGIN) {
                  if (currentColumn === 0) {
                    currentColumn = 1;
                    y = columnTopY;
                  } else {
                    doc.addPage();
                    this.addFooter(doc, paper);
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
        } else {
          const flatText = (paper[sec.key as keyof Paper] as string) || "";
          const cleanedFlat = sec.key === "introduction" ? cleanText(flatText) : flatText;
          if (cleanedFlat) {
            addText(cleanedFlat, 12, FONT_NORMAL, "justify", 0, 10, true);
          }
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
    this.addFooter(doc, paper);

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
  },
};
