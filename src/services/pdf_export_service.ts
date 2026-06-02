import { jsPDF } from 'jspdf'
import type { Paper, ImradBlock } from './api'

// ── Mirrors parseSummaryBlocks() in detail_win.vue exactly ───────────────────
function parseSummaryBlocks(text: string): { heading: string; body: string }[] {
  if (!text) return []
  const lines = text.split('\n')
  const blocks: { heading: string; body: string }[] = []
  let current: { heading: string; body: string } | null = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const isHeading =
      trimmed.length <= 80 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(',') &&
      /^[A-Z]/.test(trimmed) &&
      !/[a-z]{20,}/.test(trimmed)
    if (isHeading && lines.indexOf(line) < lines.length - 1) {
      if (current) blocks.push(current)
      current = { heading: trimmed, body: '' }
    } else {
      if (!current) current = { heading: '', body: '' }
      current.body += (current.body ? ' ' : '') + trimmed
    }
  }
  if (current) blocks.push(current)
  return blocks.filter((b) => b.body.trim())
}

// ── Strip [[TABLE_IMAGE:X]] / [TABLE_IMAGE:X] markers from raw fallback text ──
function stripMarkers(text: string): string {
  if (!text) return ''
  return (
    text
      .replace(/\[{1,2}(?:TABLE|FIGURE)_IMAGE:.*?\]{1,2}/gi, '')
      // Collapse multiple horizontal spaces but PRESERVE newlines
      .replace(/[^\S\n]{2,}/g, ' ')
      // Collapse 3+ newlines into 2 (standard paragraph break)
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

/**
 * Mirrors normalizeBlocks() in detail_win.vue.
 * Ensures table-label is always immediately followed by its table-image,
 * and removes exact consecutive duplicate blocks.
 */
function normalizeBlocks(blocks: ImradBlock[]): ImradBlock[] {
  if (!blocks.length) return blocks
  // Step 1: Remove exact consecutive duplicates
  const deduped: ImradBlock[] = blocks.filter((block: ImradBlock, idx: number) => {
    if (idx === 0) return true
    const prev: ImradBlock = blocks[idx - 1] as ImradBlock
    return !(prev.type === block.type && prev.text === block.text)
  })
  // Step 2: Pair table-label with its immediately following table-image
  const result: ImradBlock[] = []
  let i = 0
  while (i < deduped.length) {
    const block: ImradBlock = deduped[i] as ImradBlock
    if (block.type === 'table-label') {
      result.push(block)
      i++
      const pending: ImradBlock[] = []
      while (i < deduped.length && (deduped[i] as ImradBlock).type !== 'table-image' && (deduped[i] as ImradBlock).type !== 'table-label') {
        pending.push(deduped[i] as ImradBlock)
        i++
      }
      if (i < deduped.length && (deduped[i] as ImradBlock).type === 'table-image') {
        result.push(deduped[i] as ImradBlock)
        i++
        result.push(...pending)
      } else {
        result.push(...pending)
      }
    } else {
      result.push(block)
      i++
    }
  }
  return result
}

/**
 * Unicode sanitiser for jsPDF
 * Even with custom fonts, some complex combining characters (like x-bar)
 * are better handled as readable ASCII to ensure perfect alignment.
 */
function sanitizeForPdf(text: string): string {
  if (!text) return ''
  return (
    text
      // ── Statistical / Math approximations for better alignment ──────────
      .replace(/X̄|x̄|X\u0305|x\u0305/g, 'x-bar')
      .replace(/ȳ|Ȳ|Y\u0305|y\u0305/g, 'y-bar')
      .replace(/n̄|N̄|N\u0305|n\u0305/g, 'n-bar')
      // ── Typographic punctuation (safe replacements) ─────────────────────
      .replace(/[\u2018\u2019]/g, "'") // curly single quotes
      .replace(/[\u201C\u201D]/g, '"') // curly double quotes
      .replace(/\u2013/g, '-') // en dash
      .replace(/\u2014/g, '--') // em dash
      .replace(/\u2026/g, '...') // ellipsis
      .replace(/\u00A0/g, ' ') // non-breaking space
  )
}

// ── Inverted Pyramid Title ─────────────────────────────────────────────────────
// Splits a title into lines where each line is shorter than the previous,
// producing a top-heavy inverted pyramid shape regardless of title length.
function getPyramidTitleLines(title: string): string[] {
  if (!title) return []

  const words = title.trim().split(/\s+/)
  const total = words.length

  // Very short titles: single line
  if (total <= 3) return [words.join(' ')]

  const charLen = title.length

  // Base the number of lines on character length.
  const numLines = charLen <= 45 ? 2 : charLen <= 80 ? 3 : charLen <= 115 ? 4 : 5

  const shareWeights: number[] = []
  for (let i = numLines; i >= 1; i--) shareWeights.push(i)
  const shareSum = shareWeights.reduce((a, b) => a + b, 0)

  // Character budgets per line (descending)
  const budgets = shareWeights.map((w) => Math.floor((w / shareSum) * charLen))

  const lines: string[] = []
  let wi = 0 // word index

  for (let li = 0; li < numLines; li++) {
    if (wi >= total) break
    const remaining = numLines - li - 1
    const wordsLeft = total - wi

    // Last line: take all remaining words
    if (li === numLines - 1 || wordsLeft <= remaining) {
      lines.push(words.slice(wi).join(' '))
      wi = total
      break
    }

    const budget = budgets[li]
    if (budget === undefined) break

    let count = 0
    let len = 0
    while (wi + count < total - remaining) {
      const word = words[wi + count]
      if (!word) break

      const wordLen = word.length + (count > 0 ? 1 : 0)
      if (count > 0 && len + wordLen > budget) break
      len += wordLen
      count++
    }
    count = Math.max(1, count)
    lines.push(words.slice(wi, wi + count).join(' '))
    wi += count
  }

  return lines.filter((l) => l.length > 0)
}

/**
 * PDF Export Service
 * ------------------
 * Generates a professionally formatted A4 IMRAD document from paper data.
 * Now supports a 2-column layout for the main body.
 */

// A4 Dimensions in points (72 DPI)
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

// Official Thesis Margins (Inches to Points: 1" = 72pt)
const MARGIN_LEFT = 108 // 1.5"
const MARGIN_RIGHT = 72 // 1.0"
const MARGIN_TOP = 72 // 1.0"
const MARGIN_BOTTOM = 72 // 1.0"

const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

// Column configuration
const COLUMN_GAP = 20
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2

// Fonts
const FONT_MAIN = 'times'
const FONT_UNICODE = 'SourceSans3' // Used only for symbols
const FONT_BOLD = 'bold'
const FONT_NORMAL = 'normal'
const FONT_ITALIC = 'italic'

export const pdfExportService = {
  /**
   * Internal helper to fetch and register fonts
   */
  async registerFonts(doc: jsPDF) {
    const fonts = [
      { file: 'SourceSans3-Regular.ttf', name: 'SourceSans3', style: 'normal' },
      { file: 'SourceSans3-Bold.ttf', name: 'SourceSans3', style: 'bold' },
    ]

    for (const f of fonts) {
      try {
        const response = await fetch(`/src/assets/fonts/${f.file}`)
        if (!response.ok) throw new Error(`Font ${f.file} not found`)
        const buffer = await response.arrayBuffer()

        // Convert to Base64
        let binary = ''
        const bytes = new Uint8Array(buffer)
        const len = bytes.byteLength
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i] as number)
        }
        const base64 = window.btoa(binary)

        doc.addFileToVFS(f.file, base64)
        doc.addFont(f.file, f.name, f.style)
      } catch (e) {
        console.error('Failed to load font:', e)
      }
    }
  },

  /**
   * Generates and downloads the PDF
   */
  async downloadPaper(paper: Paper) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    })

    // Load custom fonts to support Unicode symbols (Sigma, etc.)
    await this.registerFonts(doc)

    let y = MARGIN_TOP
    let currentColumn = 0 // 0 for left, 1 for right
    let columnTopY = MARGIN_TOP // Where the 2-column section starts on the current page

    // --- Helper: Add Text with Wraps, Pagination, Column Support, Indent & Manual Justify ---
    const addText = (
      text: string,
      fontSize: number,
      fontStyle: string = FONT_NORMAL,
      align: 'left' | 'center' | 'justify' = 'left',
      marginTop: number = 0,
      marginBottom: number = 10,
      useColumns: boolean = true,
    ) => {
      if (!text) return

      const safeText = sanitizeForPdf(text)
      doc.setTextColor(0, 0, 0)
      doc.setFont(FONT_MAIN, fontStyle)
      doc.setFontSize(fontSize)

      const targetWidth = useColumns ? COLUMN_WIDTH : CONTENT_WIDTH

      const isAtTop = y === MARGIN_TOP || y === columnTopY

      if (isAtTop) {
        y += fontSize
        // Skip marginTop at the very top of a column/page to ensure cross-column alignment
      } else {
        y += marginTop
      }

      const FIRST_LINE_INDENT = 24
      const shouldIndent = fontStyle === FONT_NORMAL && fontSize <= 12 && align === 'justify'
      const indent = shouldIndent ? FIRST_LINE_INDENT : 0

      // Split text into lines
      let lines: string[] = []
      if (indent > 0) {
        const res = doc.splitTextToSize(safeText, targetWidth - indent)
        const firstLineCandidates = Array.isArray(res) ? res : [res]
        const firstLine = firstLineCandidates.length > 0 ? String(firstLineCandidates[0]) : ''
        const restStart = safeText.indexOf(firstLine) + firstLine.length
        const restText = safeText.slice(restStart).trimStart()
        const restLinesRes = restText ? doc.splitTextToSize(restText, targetWidth) : []
        const restLines = Array.isArray(restLinesRes) ? restLinesRes : [restLinesRes]
        lines = [firstLine, ...restLines]
      } else {
        const res = doc.splitTextToSize(safeText, targetWidth)
        lines = Array.isArray(res) ? res : [res]
      }

      /**
       * Inner helper to render text segments with font switching
       */
      const drawSegmentedLine = (
        txt: string,
        startX: number,
        startY: number,
        lineAlign: 'left' | 'center' | 'justify',
        lineWidth: number,
      ) => {
        // Find Unicode symbols (non-Latin-1)
        const parts = txt.split(/([\u0100-\uffff]+)/g).filter(Boolean)

        if (lineAlign === 'center') {
          const totalW = doc.getTextWidth(txt)
          const pageCenter = (MARGIN_LEFT + (A4_WIDTH - MARGIN_RIGHT)) / 2
          let currX = pageCenter - totalW / 2
          for (const p of parts) {
            const isSymbol = /[\u0100-\uffff]/.test(p)
            doc.setFont(isSymbol ? FONT_UNICODE : FONT_MAIN, fontStyle)
            doc.text(p, currX, startY)
            currX += doc.getTextWidth(p)
          }
        } else if (lineAlign === 'justify' && txt.includes(' ')) {
          // Manual justification with segments
          const words = txt.split(/\s+/)
          if (words.length > 1) {
            const totalWordsWidth = words.reduce((acc, w) => {
              let wWidth = 0
              const wParts = w.split(/([\u0100-\uffff]+)/g).filter(Boolean)
              wParts.forEach((wp) => {
                doc.setFont(/[\u0100-\uffff]/.test(wp) ? FONT_UNICODE : FONT_MAIN, fontStyle)
                wWidth += doc.getTextWidth(wp)
              })
              return acc + wWidth
            }, 0)
            const totalSpace = lineWidth - totalWordsWidth
            const spaceWidth = Math.max(0, totalSpace / (words.length - 1))

            let wordX = startX
            words.forEach((word, index) => {
              const wParts = word.split(/([\u0100-\uffff]+)/g).filter(Boolean)
              wParts.forEach((wp) => {
                doc.setFont(/[\u0100-\uffff]/.test(wp) ? FONT_UNICODE : FONT_MAIN, fontStyle)
                doc.text(wp, wordX, startY)
                wordX += doc.getTextWidth(wp)
              })
              if (index < words.length - 1) wordX += spaceWidth
            })
          } else {
            drawSegmentedLine(txt, startX, startY, 'left', lineWidth)
          }
        } else {
          let currX = startX
          for (const p of parts) {
            const isSymbol = /[\u0100-\uffff]/.test(p)
            doc.setFont(isSymbol ? FONT_UNICODE : FONT_MAIN, fontStyle)
            doc.text(p, currX, startY)
            currX += doc.getTextWidth(p)
          }
        }
      }

      for (let i = 0; i < lines.length; i++) {
        if (y + fontSize > A4_HEIGHT - MARGIN_BOTTOM) {
          if (useColumns && currentColumn === 0) {
            currentColumn = 1
            y = columnTopY + fontSize
          } else {
            doc.addPage()
            y = MARGIN_TOP + fontSize
            columnTopY = MARGIN_TOP
            currentColumn = 0
          }
          doc.setFontSize(fontSize)
          doc.setTextColor(0, 0, 0)
        }

        const line = (lines[i] || '').trim()
        const currentX = useColumns
          ? MARGIN_LEFT + currentColumn * (COLUMN_WIDTH + COLUMN_GAP)
          : MARGIN_LEFT

        const xForLine = i === 0 && indent > 0 ? currentX + indent : currentX
        const widthForLine = i === 0 && indent > 0 ? targetWidth - indent : targetWidth

        drawSegmentedLine(line, xForLine, y, align, widthForLine)

        y += fontSize * 1.5
      }

      y += marginBottom
    }

    // 1. --- Full Width Header Section ---

    // Dynamic Font Size to prevent jsPDF from auto-wrapping our pyramid lines
    const titleLen = paper.title.length
    const titleFontSize = titleLen > 85 ? 14 : titleLen > 55 ? 16 : 18

    // Title (Formatted as Inverted Pyramid)
    const pyramidTitle = getPyramidTitleLines(paper.title).join('\n')
    addText(pyramidTitle, titleFontSize, FONT_BOLD, 'center', 0, 15, false)

    // Authors (Reduced from 11pt to 10pt to prevent long author lists from wrapping)
    const authors = paper.author
      .split('|')
      .map((a) => a.trim())
      .join(' · ')
    addText(authors, 10, FONT_NORMAL, 'center', 0, 5, false)

    // Dept / Year
    addText(`${paper.department} · ${paper.year}`, 10, FONT_ITALIC, 'center', 0, 15, false)

    // Abstract (cleaned)
    addText('Abstract', 12, FONT_BOLD, 'left', 10, 5, false)
    addText(paper.abstract ?? '', 12, FONT_NORMAL, 'justify', 0, 10, false)

    if (paper.keywords) {
      addText(`Keywords: ${paper.keywords}`, 10, FONT_BOLD, 'left', 0, 15, false)
    }

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(MARGIN_LEFT, y, A4_WIDTH - MARGIN_RIGHT, y)

    // --- Page Break: Introduction always starts on Page 2 ---
    doc.addPage()
    y = MARGIN_TOP
    currentColumn = 0
    columnTopY = y

    // 2. --- 2-Column IMRAD Content ---
    // Mirrors IMRAD_SECTION_CONFIGS + rendering logic in detail_win.vue exactly:
    //   Introduction → parseSummaryBlocks(introduction_summary) or stripMarkers(introduction)
    //   Methods/RAD  → imrad_structured typed blocks or stripMarkers(raw)
    // This is the same cleaned data the web view uses — no boilerplate can leak in.

    // Robust combined R&D detection — mirrors isRadCombined in detail_win.vue
    const rawR = paper.results ?? ''
    const rawD = paper.discussion ?? ''
    let isRadCombined = !!(rawR && rawD && rawR.trim() === rawD.trim())
    if (!isRadCombined) {
      const imradCheck = paper.imrad_structured
      if (imradCheck) {
        const rBlocks: ImradBlock[] = imradCheck.results ?? []
        const dBlocks: ImradBlock[] = imradCheck.discussion ?? []
        if (rBlocks.length > 0 && dBlocks.length > 0) {
          const rKey = rBlocks.map(b => b.text).join('|')
          const dKey = dBlocks.map(b => b.text).join('|')
          if (rKey === dKey || rKey.endsWith(dKey) || dKey.endsWith(rKey)) isRadCombined = true
        }
        if (!isRadCombined && rBlocks.length > 0 && dBlocks.length === 0 && rawD === '') isRadCombined = true
      }
      if (!isRadCombined && rawR && !rawD) isRadCombined = true
    }

    const sections = [
      { label: 'INTRODUCTION', key: 'introduction' },
      { label: 'METHODOLOGY', key: 'methods' },
      { label: 'RESULTS AND DISCUSSION', key: 'rad' },
    ]

    for (const sec of sections) {
      // Resolve 'rad' virtual key → 'results' for raw-text fallback
      const resolvedKey = sec.key === 'rad' ? 'results' : sec.key

      // Get structured blocks — mirrors getStructuredBlocks() in detail_win.vue
      let blocks: ImradBlock[] = []
      const imrad = paper.imrad_structured
      if (imrad) {
        if (sec.key === 'rad') {
          const r: ImradBlock[] = imrad.results ?? []
          const d: ImradBlock[] = imrad.discussion ?? []
          if (isRadCombined) {
            blocks = normalizeBlocks(r)
          } else {
            blocks = normalizeBlocks([...r, ...d])
          }
        } else if (sec.key === 'methods') {
          blocks = normalizeBlocks(imrad.methods ?? [])
        } else if (sec.key === 'introduction') {
          blocks = normalizeBlocks(imrad.introduction ?? [])
        } else {
          blocks = normalizeBlocks((imrad as Record<string, ImradBlock[]>)[resolvedKey] ?? [])
        }
      }

      // Check if there's any content at all before rendering the heading
      const hasSummary =
        sec.key === 'introduction' && !!(paper.introduction_summary as string | undefined)
      const hasStructured = blocks.length > 0
      const hasRaw = !!(paper[resolvedKey as keyof Paper] as string | undefined)

      if (!hasSummary && !hasStructured && !hasRaw) continue

      addText(sec.label, 12, FONT_BOLD, 'left', 12, 8, true)

      // Reset alphabetic subheading counter for this section (A, B, ...)
      let subheadingIndex = 0

      // ── Introduction: use AI summary (already boilerplate-free) ─────────
      if (sec.key === 'introduction') {
        const summary = paper.introduction_summary as string | undefined
        if (summary) {
          for (const block of parseSummaryBlocks(summary)) {
            if (block.heading) {
              subheadingIndex += 1
              const prefix = String.fromCharCode(64 + subheadingIndex) + '. '
              addText(prefix + block.heading, 12, FONT_BOLD, 'left', 6, 3, true)
            }
            addText(block.body, 12, FONT_NORMAL, 'justify', 0, 6, true)
          }
        } else if (paper.introduction) {
          // Fallback: strip markers from raw text (summary not yet generated)
          addText(stripMarkers(paper.introduction), 12, FONT_NORMAL, 'justify', 0, 7, true)
        }
        continue
      }

      // ── Methods / RAD: use imrad_structured typed blocks ─────────────────
      if (hasStructured) {
        for (const block of blocks) {
          if (block.type === 'subheading') {
            subheadingIndex += 1
            const prefix = String.fromCharCode(64 + subheadingIndex) + '. '
            addText(prefix + block.text, 12, FONT_BOLD, 'left', 6, 3, true)
          } else if (block.type === 'text') {
            addText(block.text, 12, FONT_NORMAL, 'justify', 0, 6, true)
          } else if (block.type === 'table-image') {
            try {
              const imgData = await this.getImageData(block.text)
              const imgProps = doc.getImageProperties(imgData)

              const finalWidth = COLUMN_WIDTH
              const finalHeight = (imgProps.height * finalWidth) / imgProps.width

              if (y + finalHeight > A4_HEIGHT - MARGIN_BOTTOM) {
                if (currentColumn === 0) {
                  currentColumn = 1
                  y = columnTopY
                } else {
                  doc.addPage()
                  y = MARGIN_TOP
                  columnTopY = MARGIN_TOP
                  currentColumn = 0
                }
              }

              const currentX = MARGIN_LEFT + currentColumn * (COLUMN_WIDTH + COLUMN_GAP)
              doc.addImage(imgData, 'PNG', currentX, y, finalWidth, finalHeight)
              y += finalHeight + 8
            } catch (e) {
              console.warn('Failed to add image:', e)
            }
          } else if (block.type === 'table-label') {
            addText(block.text, 9, FONT_ITALIC, 'center', 0, 8, true)
          }
        }
      } else if (hasRaw) {
        // Fallback: raw text with markers stripped
        const rawText = paper[resolvedKey as keyof Paper] as string
        addText(stripMarkers(rawText), 12, FONT_NORMAL, 'justify', 0, 7, true)
        // For non-combined RAD, append discussion if separate
        if (sec.key === 'rad' && paper.discussion && !isRadCombined) {
          addText(stripMarkers(paper.discussion), 12, FONT_NORMAL, 'justify', 0, 7, true)
        }
      }
    }

    // 3. --- References Section (APA 6th Edition) ---
    if (paper.references) {
      doc.addPage()
      y = MARGIN_TOP
      addText('References', 12, FONT_BOLD, 'center', 0, 15, false)

      const refs = paper.references.split(/\n\n+/).filter(Boolean)
      for (const ref of refs) {
        // APA 6th: Hanging Indent (First line flat, subsequent lines indented 0.5" = 36pt)
        const HANGING_INDENT = 36
        const targetWidth = CONTENT_WIDTH

        doc.setFont(FONT_MAIN, FONT_NORMAL)
        doc.setFontSize(11)

        const lines = doc.splitTextToSize(ref, targetWidth)
        const linesArr = Array.isArray(lines) ? lines : [lines]

        for (let i = 0; i < linesArr.length; i++) {
          if (y + 12 > A4_HEIGHT - MARGIN_BOTTOM) {
            doc.addPage()
            y = MARGIN_TOP
            doc.setFont(FONT_MAIN, FONT_NORMAL)
            doc.setFontSize(11)
          }

          const line = linesArr[i].trim()
          const x = i === 0 ? MARGIN_LEFT : MARGIN_LEFT + HANGING_INDENT
          doc.text(line, x, y)
          y += 11 * 1.5 // APA line spacing
        }
        y += 10 // Space between entries
      }
    }

    // --- Final Footer Pass: Execute only once at the end ---
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont(FONT_MAIN, FONT_ITALIC)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150) // Professional gray for footer

      const footerY = A4_HEIGHT - MARGIN_BOTTOM / 2
      doc.text(`Page ${i} of ${pageCount}`, A4_WIDTH - MARGIN_RIGHT, footerY, { align: 'right' })
      doc.text(
        `Exported from LUMIA Retrieval Repository - DCS - CVSUIMUS · ${paper.year}`,
        MARGIN_LEFT,
        footerY,
      )
    }

    // Save
    const filename = `${paper.title
      .substring(0, 30)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()}_IMRAD.pdf`
    doc.save(filename)
  },

  /**
   * Helper to fetch image and convert to Base64
   */
  async getImageData(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } else {
          reject(new Error('Failed to get 2D context'))
        }
      }
      img.onerror = (e) => reject(e)
      img.src = url
    })
  },
}
