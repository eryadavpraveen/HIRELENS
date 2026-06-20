import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  buildViolationSummary,
  computeIntegrityScore,
  getEvaluation,
  CATEGORY_LIST,
  VIOLATION_CATEGORIES,
  categorizeViolation,
  SEVERITY_STYLES,
} from './violations'
import { TAGLINE } from './constants'

const BRAND = { r: 37, g: 99, b: 235 } // #2563EB
const INK = { r: 15, g: 23, b: 42 } // #0F172A
const MUTED = { r: 100, g: 116, b: 139 }

function hexToRgb(hex) {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

/**
 * Generate a professional HIRELENS integrity report PDF.
 * Sections: branded header + tagline, generated timestamp, interview info,
 * candidate info, integrity score + evaluation, violation summary table,
 * violation timeline table, and timeline/summary violation counts.
 */
export function generateReportPdf(report = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  const events = report.events || []
  const summary = report.summary || buildViolationSummary(events)
  const score = report.integrity_score ?? computeIntegrityScore(summary.counts)
  const evaluation = getEvaluation(score)

  // ---- Header band ----
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('HIRELENS', margin, 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(TAGLINE, margin, 54)
  doc.setFontSize(9)
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    pageWidth - margin,
    36,
    { align: 'right' }
  )
  doc.text('Integrity Assessment Report', pageWidth - margin, 54, { align: 'right' })

  let y = 100

  // ---- Interview & Candidate info (two columns) ----
  doc.setTextColor(INK.r, INK.g, INK.b)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Interview Information', margin, y)
  doc.text('Candidate Information', pageWidth / 2 + 10, y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)

  const left = [
    ['Interview', report.interview_title || '—'],
    ['Recruiter', report.recruiter_name || '—'],
    ['Date', report.start_time ? new Date(report.start_time).toLocaleDateString() : '—'],
    ['Status', report.completion_status || 'completed'],
  ]
  const right = [
    ['Name', report.candidate_name || '—'],
    ['Email', report.candidate_email || '—'],
    ['Interview ID', report.interview_id || '—'],
    ['Report ID', report.id || '—'],
  ]

  left.forEach((row, i) => {
    const ry = y + i * 16
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.text(`${row[0]}:`, margin, ry)
    doc.setTextColor(INK.r, INK.g, INK.b)
    doc.text(String(row[1]), margin + 70, ry)
  })
  right.forEach((row, i) => {
    const ry = y + i * 16
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.text(`${row[0]}:`, pageWidth / 2 + 10, ry)
    doc.setTextColor(INK.r, INK.g, INK.b)
    doc.text(String(row[1]), pageWidth / 2 + 90, ry)
  })

  y += 4 * 16 + 16

  // ---- Integrity score + evaluation card ----
  const [er, eg, eb] = hexToRgb(evaluation.color)
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 64, 8, 8, 'F')
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.setFontSize(10)
  doc.text('INTEGRITY SCORE', margin + 16, y + 22)
  doc.setTextColor(er, eg, eb)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text(`${score} / 100`, margin + 16, y + 50)

  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('EVALUATION', pageWidth - margin - 16, y + 22, { align: 'right' })
  doc.setTextColor(er, eg, eb)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(evaluation.label, pageWidth - margin - 16, y + 48, { align: 'right' })

  y += 88

  // ---- Violation Summary table ----
  const summaryBody = CATEGORY_LIST.map((c) => [
    c.label,
    String(summary.counts[c.key] || 0),
    SEVERITY_STYLES[c.severity].label,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Violation Type', 'Count', 'Severity']],
    body: summaryBody,
    theme: 'striped',
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 },
    margin: { left: margin, right: margin },
    didDrawPage: () => addFooter(doc),
  })

  y = doc.lastAutoTable.finalY + 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(INK.r, INK.g, INK.b)
  doc.text(`Summary Violations: ${summary.summaryTotal}`, margin, y)
  doc.text(`Timeline Violations: ${summary.timelineTotal}`, pageWidth - margin, y, { align: 'right' })

  y += 18

  // ---- Violation Timeline table ----
  const timelineBody = events
    .map((evt) => {
      const cat = categorizeViolation(evt.type)
      if (!cat) return null
      const meta = VIOLATION_CATEGORIES[cat]
      return [
        evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : '—',
        cat === 'multiple_person' ? 'MULTIPLE_PERSON' : meta.timelineLabel,
        evt.duration != null ? `${Number(evt.duration).toFixed(1)}s` : '—',
        SEVERITY_STYLES[meta.severity].label,
      ]
    })
    .filter(Boolean)

  if (timelineBody.length) {
    autoTable(doc, {
      startY: y,
      head: [['Time', 'Violation', 'Duration', 'Severity']],
      body: timelineBody,
      theme: 'grid',
      headStyles: { fillColor: [INK.r, INK.g, INK.b], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: margin, right: margin },
      didDrawPage: () => addFooter(doc),
    })
  }

  const fileName = `HIRELENS_Report_${(report.candidate_name || 'candidate').replace(/\s+/g, '_')}.pdf`
  doc.save(fileName)
}

function addFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.text('HIRELENS — See Beyond the Resume', 40, pageHeight - 16)
  doc.text(
    `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
    pageWidth - 40,
    pageHeight - 16,
    { align: 'right' }
  )
}

export default generateReportPdf
