import { useState, useMemo, useCallback } from 'react'
import { useLocalData } from '@/hooks/useLocalData'
import {
  buildReport,
  printReport,
  reportToPlainText,
  exportToPdf,
  saveReportToHistory,
  getReportHistory,
  clearReportHistory,
  type ReportData,
  type ReportSection,
  type ReportTemplate,
  type ReportHistoryEntry,
} from '@/lib/reports/generate-pdf'
import { ReportPreview } from '@/components/reports/ReportPreview'
import { ReportOptionsModal } from '@/components/reports/ReportOptionsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Printer,
  Download,
  Settings2,
  FilePlus,
  History,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useTranslation } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

const REPORT_CONTAINER_ID = 'report-print'
const TEMPLATE_KEY = 'lifeos_report_template'

function loadTemplate(): ReportTemplate {
  try {
    const stored = localStorage.getItem(TEMPLATE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {
    headerText: 'LifeOS Report',
    footerText: '',
    showLogo: true,
    accentColor: '#4f46e5',
  }
}

function saveTemplate(template: ReportTemplate) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template))
}

export function ReportsPage() {
  const { t } = useTranslation()
  const { opportunities, dailyLogs, domains, habits, goals } = useLocalData()

  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'custom'>('weekly')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [template, setTemplate] = useState<ReportTemplate>(loadTemplate)
  const [exporting, setExporting] = useState(false)
  const [history, setHistory] = useState<ReportHistoryEntry[]>(() => getReportHistory())
  const [tab, setTab] = useState('report')

  const report = useMemo((): ReportData | null => {
    if (!opportunities || !dailyLogs || !domains) return null
    return buildReport(opportunities, dailyLogs, domains, habits || [], goals || [], periodType)
  }, [opportunities, dailyLogs, domains, habits, goals, periodType])

  const [sections, setSections] = useState<ReportSection[]>(() => report?.sections || [])

  // Keep sections in sync when report changes
  useMemo(() => {
    if (report) {
      setSections(prev => {
        const prevMap = new Map(prev.map(s => [s.id, s.visible]))
        return report.sections.map(s => ({
          ...s,
          visible: prevMap.has(s.id) ? prevMap.get(s.id)! : s.visible,
        }))
      })
    }
  }, [report])

  const displayReport = useMemo((): ReportData | null => {
    if (!report) return null
    return { ...report, sections }
  }, [report, sections])

  const handlePrint = useCallback(() => {
    printReport(REPORT_CONTAINER_ID)
  }, [])

  const handleExportText = useCallback(() => {
    if (!displayReport) return
    const text = reportToPlainText(displayReport)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${displayReport.periodType}-${displayReport.period.replace(/\s/g, '')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('reports.exported'))
  }, [displayReport, t])

  const handleExportPdf = useCallback(async () => {
    if (!displayReport) return
    setExporting(true)
    try {
      await exportToPdf(
        REPORT_CONTAINER_ID,
        `report-${displayReport.periodType}-${displayReport.period.replace(/\s/g, '')}.pdf`,
      )
      toast.success(t('reports.pdfExported'))
    } catch {
      toast.error(t('reports.pdfError'))
    } finally {
      setExporting(false)
    }
  }, [displayReport, t])

  const handleGenerate = useCallback(() => {
    if (!displayReport) return
    saveReportToHistory(displayReport)
    setHistory(getReportHistory())
    toast.success(t('reports.generated'))
  }, [displayReport, t])

  const handleTemplateChange = useCallback((newTemplate: ReportTemplate) => {
    setTemplate(newTemplate)
    saveTemplate(newTemplate)
  }, [])

  const handleClearHistory = useCallback(() => {
    clearReportHistory()
    setHistory([])
    toast.success(t('reports.historyCleared'))
  }, [t])

  if (!displayReport) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('reports.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t('reports.title')}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setOptionsOpen(true)}>
            <Settings2 className="h-4 w-4" />
            {t('reports.options')}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {t('reports.print')}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportText}>
            <Download className="h-4 w-4" />
            {t('reports.exportText')}
          </Button>
          <Button size="sm" className="gap-2" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />}
            {t('reports.exportPdf')}
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="no-print">
        <TabsList>
          <TabsTrigger value="report">{t('reports.report')}</TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="h-3.5 w-3.5" />
            {t('reports.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="mt-4">
          <div id={REPORT_CONTAINER_ID}>
            <ReportPreview report={displayReport} template={template} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('reports.noHistory')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={handleClearHistory}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('reports.clearHistory')}
                </Button>
              </div>
              {history.map(entry => (
                <Card key={entry.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{entry.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.period} &middot; {new Date(entry.generatedAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('reports.sections')}: {entry.sections.join(', ')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Print-only version */}
      <div className="hidden print:block" id={`${REPORT_CONTAINER_ID}-print`}>
        <ReportPreview report={displayReport} template={template} />
      </div>

      <ReportOptionsModal
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        sections={sections}
        onSectionsChange={setSections}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        template={template}
        onTemplateChange={handleTemplateChange}
        onGenerate={handleGenerate}
      />
    </div>
  )
}
