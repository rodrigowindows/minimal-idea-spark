/**
 * Generate report as printable HTML / window.print or export text for PDF.
 * For full PDF generation without print dialog, use a lib like jsPDF or @react-pdf/renderer.
 */
export interface ReportSection {
  title: string
  content: string
  type: 'text' | 'list' | 'metrics'
}

export interface ReportData {
  title: string
  period: string
  sections: ReportSection[]
  generatedAt: string
}

export function buildWeeklyReport(data: {
  opportunitiesCompleted: number
  opportunitiesTotal: number
  journalEntries: number
  topDomains: { name: string; count: number }[]
  summary: string
}): ReportData {
  return {
    title: 'Weekly Report',
    period: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: 'Summary',
        type: 'text',
        content: data.summary || 'No summary.',
      },
      {
        title: 'Opportunities',
        type: 'metrics',
        content: `${data.opportunitiesCompleted} / ${data.opportunitiesTotal} completed`,
      },
      {
        title: 'Journal',
        type: 'metrics',
        content: `${data.journalEntries} entries`,
      },
      {
        title: 'Top domains',
        type: 'list',
        content: data.topDomains.map((d) => `${d.name}: ${d.count}`).join('\n'),
      },
    ],
  }
}

export function printReport(containerId: string) {
  const el = document.getElementById(containerId)
  if (!el) {
    window.print()
    return
  }
  const prev = document.body.innerHTML
  const style = document.createElement('style')
  style.textContent = 'body { padding: 24px; font-family: system-ui; } @media print { .no-print { display: none !important; } }'
  document.head.appendChild(style)
  document.body.innerHTML = el.innerHTML
  window.print()
  document.body.innerHTML = prev
  style.remove()
}

export function reportToPlainText(report: ReportData): string {
  const lines: string[] = [report.title, report.period, '', ...report.sections.map((s) => `${s.title}\n${s.content}\n`)]
  return lines.join('\n')
}
