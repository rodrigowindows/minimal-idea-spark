import { useMemo } from 'react'
import { useLocalData } from '@/hooks/useLocalData'
import { buildWeeklyReport, printReport, reportToPlainText, type ReportData } from '@/lib/reports/generate-pdf'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Printer, Download } from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'

const REPORT_CONTAINER_ID = 'report-print'

export function ReportsPage() {
  const { t } = useTranslation()
  const { opportunities, dailyLogs, domains } = useLocalData()

  const report = useMemo((): ReportData | null => {
    if (!opportunities || !dailyLogs || !domains) return null
    const completed = opportunities.filter((o) => o.status === 'done').length
    const domainCounts: Record<string, number> = {}
    for (const o of opportunities) {
      if (o.domain_id) domainCounts[o.domain_id] = (domainCounts[o.domain_id] ?? 0) + 1
    }
    const topDomains = domains
      .map((d) => ({ name: d.name, count: domainCounts[d.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    const summary = `Completed ${completed} of ${opportunities.length} opportunities. ${dailyLogs.length} journal entries this period.`
    return buildWeeklyReport({
      opportunitiesCompleted: completed,
      opportunitiesTotal: opportunities.length,
      journalEntries: dailyLogs.length,
      topDomains,
      summary,
    })
  }, [opportunities, dailyLogs, domains])

  function handlePrint() {
    printReport(REPORT_CONTAINER_ID)
  }

  function handleExportText() {
    if (!report) return
    const text = reportToPlainText(report)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-report-${report.period}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!report) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('reports.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t('reports.title')}</h1>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {t('reports.print')}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportText}>
            <Download className="h-4 w-4" />
            {t('reports.exportText')}
          </Button>
        </div>
      </header>

      <div id={REPORT_CONTAINER_ID} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{report.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('reports.period')}: {report.period} · {t('reports.generatedAt')}: {new Date(report.generatedAt).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {report.sections.map((section) => (
              <div key={section.title}>
                <h3 className="font-semibold mb-2">{section.title}</h3>
                {section.type === 'text' && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content}</p>}
                {section.type === 'metrics' && <p className="text-sm">{section.content}</p>}
                {section.type === 'list' && <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content}</pre>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
