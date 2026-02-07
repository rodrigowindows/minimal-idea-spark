/**
 * Export analytics data to CSV and PDF (print).
 */

export interface ExportRow {
  [key: string]: string | number
}

export function exportToCSV(rows: ExportRow[], filename = 'analytics-export.csv'): void {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const line = (row: ExportRow) => headers.map(h => {
    const v = row[h]
    const s = typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))
      ? `"${String(v).replace(/"/g, '""')}"`
      : String(v)
    return s
  }).join(',')
  const csv = [headers.join(','), ...rows.map(line)].join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToPDF(printElementId?: string): void {
  const el = printElementId ? document.getElementById(printElementId) : document.body
  if (!el) {
    window.print()
    return
  }
  const prev = document.body.innerHTML
  document.body.innerHTML = el.innerHTML
  window.print()
  document.body.innerHTML = prev
  window.location.reload()
}

export function printReport(containerRef: HTMLElement | null): void {
  if (!containerRef) {
    window.print()
    return
  }
  const win = window.open('', '_blank')
  if (!win) {
    window.print()
    return
  }
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>Analytics Report</title>
        <link rel="stylesheet" href="${window.location.origin}/index.css" />
        <style>body{ padding: 24px; font-family: system-ui; }</style>
      </head>
      <body>${containerRef.innerHTML}</body>
    </html>
  `)
  win.document.close()
  win.onload = () => {
    win.print()
    win.close()
  }
}
