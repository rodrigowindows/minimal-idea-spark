/**
 * Report generation utilities: build report data, generate PDF via jsPDF + html2canvas, print, export text.
 */
import type { Opportunity, DailyLog, LifeDomain } from '@/types'
import type { Habit, Goal } from '@/hooks/useLocalData'

export interface ReportSection {
  id: string
  title: string
  content: string
  type: 'text' | 'list' | 'metrics' | 'chart'
  visible: boolean
}

export interface ReportData {
  title: string
  period: string
  periodType: 'weekly' | 'monthly' | 'custom'
  sections: ReportSection[]
  generatedAt: string
  stats: ReportStats
}

export interface ReportStats {
  totalOpportunities: number
  completedOpportunities: number
  inProgressOpportunities: number
  backlogOpportunities: number
  journalEntries: number
  avgMood: number
  avgEnergy: number
  topDomains: { name: string; count: number; color: string }[]
  tasksByType: Record<string, number>
  completionRate: number
  habitsCount: number
  habitsCompletionRate: number
  goalsCount: number
  goalsAvgProgress: number
}

export interface ReportTemplate {
  headerText: string
  footerText: string
  showLogo: boolean
  accentColor: string
}

export interface ReportHistoryEntry {
  id: string
  title: string
  periodType: string
  period: string
  generatedAt: string
  sections: string[]
}

const MOOD_VALUES: Record<string, number> = {
  great: 5, good: 4, okay: 3, bad: 2, terrible: 1,
}

const REPORT_HISTORY_KEY = 'lifeos_report_history'

export function buildReport(
  opportunities: Opportunity[],
  dailyLogs: DailyLog[],
  domains: LifeDomain[],
  habits: Habit[],
  goals: Goal[],
  periodType: 'weekly' | 'monthly' | 'custom' = 'weekly',
  startDate?: Date,
  endDate?: Date,
): ReportData {
  const now = new Date()
  const end = endDate || now
  const start = startDate || (periodType === 'monthly'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))

  const periodOpps = opportunities.filter(o => {
    try {
      const d = new Date(o.created_at)
      return d >= start && d <= end
    } catch { return false }
  })

  const periodLogs = dailyLogs.filter(l => {
    try {
      const d = new Date(l.log_date || l.created_at)
      return d >= start && d <= end
    } catch { return false }
  })

  const completed = periodOpps.filter(o => o.status === 'done').length
  const doing = periodOpps.filter(o => o.status === 'doing').length
  const backlog = periodOpps.filter(o => o.status === 'backlog').length

  const domainCounts: Record<string, number> = {}
  for (const o of periodOpps) {
    if (o.domain_id) domainCounts[o.domain_id] = (domainCounts[o.domain_id] ?? 0) + 1
  }
  const topDomains = domains
    .map(d => ({ name: d.name, count: domainCounts[d.id] ?? 0, color: d.color_theme }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const tasksByType: Record<string, number> = {}
  for (const o of periodOpps) {
    tasksByType[o.type] = (tasksByType[o.type] ?? 0) + 1
  }

  const moodValues = periodLogs.map(l => MOOD_VALUES[l.mood] || 0).filter(v => v > 0)
  const avgMood = moodValues.length > 0 ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : 0
  const energyValues = periodLogs.map(l => l.energy_level).filter(v => v > 0)
  const avgEnergy = energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : 0

  let habitsDone = 0
  let habitsTotal = 0
  habits.forEach(h => {
    const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
    if (h.frequency === 'daily') {
      habitsTotal += daysDiff * h.target_count
    } else {
      habitsTotal += h.target_count
    }
    habitsDone += h.completions.filter(c => {
      try {
        const d = new Date(c)
        return d >= start && d <= end
      } catch { return false }
    }).length
  })
  const habitsCompletionRate = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0

  const activeGoals = goals.filter(g => g.progress < 100)
  const goalsAvgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0

  const completionRate = periodOpps.length > 0 ? Math.round((completed / periodOpps.length) * 100) : 0

  const periodLabel = `${formatDate(start)} - ${formatDate(end)}`

  const stats: ReportStats = {
    totalOpportunities: periodOpps.length,
    completedOpportunities: completed,
    inProgressOpportunities: doing,
    backlogOpportunities: backlog,
    journalEntries: periodLogs.length,
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    topDomains,
    tasksByType,
    completionRate,
    habitsCount: habits.length,
    habitsCompletionRate,
    goalsCount: goals.length,
    goalsAvgProgress,
  }

  const sections: ReportSection[] = [
    {
      id: 'summary',
      title: 'Summary',
      type: 'text',
      visible: true,
      content: `${completed} of ${periodOpps.length} opportunities completed (${completionRate}%). ${periodLogs.length} journal entries. Average mood: ${stats.avgMood}/5. Average energy: ${stats.avgEnergy}/10.`,
    },
    {
      id: 'opportunities',
      title: 'Opportunities',
      type: 'metrics',
      visible: true,
      content: `Completed: ${completed} | In Progress: ${doing} | Backlog: ${backlog} | Total: ${periodOpps.length}`,
    },
    {
      id: 'journal',
      title: 'Journal',
      type: 'metrics',
      visible: true,
      content: `${periodLogs.length} entries | Avg Mood: ${stats.avgMood}/5 | Avg Energy: ${stats.avgEnergy}/10`,
    },
    {
      id: 'domains',
      title: 'Top Domains',
      type: 'list',
      visible: true,
      content: topDomains.map(d => `${d.name}: ${d.count} opportunities`).join('\n'),
    },
    {
      id: 'taskTypes',
      title: 'Tasks by Type',
      type: 'chart',
      visible: true,
      content: Object.entries(tasksByType).map(([k, v]) => `${k}: ${v}`).join('\n'),
    },
    {
      id: 'habits',
      title: 'Habits',
      type: 'metrics',
      visible: true,
      content: `${habits.length} habits tracked | Completion rate: ${habitsCompletionRate}%`,
    },
    {
      id: 'goals',
      title: 'Goals',
      type: 'metrics',
      visible: true,
      content: `${goals.length} goals | ${activeGoals.length} active | Average progress: ${goalsAvgProgress}%`,
    },
  ]

  return {
    title: periodType === 'monthly' ? 'Monthly Report' : periodType === 'weekly' ? 'Weekly Report' : 'Custom Report',
    period: periodLabel,
    periodType,
    sections,
    generatedAt: now.toISOString(),
    stats,
  }
}

/** Legacy compat wrapper */
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
    periodType: 'weekly',
    generatedAt: new Date().toISOString(),
    stats: {
      totalOpportunities: data.opportunitiesTotal,
      completedOpportunities: data.opportunitiesCompleted,
      inProgressOpportunities: 0,
      backlogOpportunities: 0,
      journalEntries: data.journalEntries,
      avgMood: 0,
      avgEnergy: 0,
      topDomains: data.topDomains.map(d => ({ ...d, color: '#6366f1' })),
      tasksByType: {},
      completionRate: data.opportunitiesTotal > 0 ? Math.round((data.opportunitiesCompleted / data.opportunitiesTotal) * 100) : 0,
      habitsCount: 0,
      habitsCompletionRate: 0,
      goalsCount: 0,
      goalsAvgProgress: 0,
    },
    sections: [
      { id: 'summary', title: 'Summary', type: 'text', content: data.summary || 'No summary.', visible: true },
      { id: 'opportunities', title: 'Opportunities', type: 'metrics', content: `${data.opportunitiesCompleted} / ${data.opportunitiesTotal} completed`, visible: true },
      { id: 'journal', title: 'Journal', type: 'metrics', content: `${data.journalEntries} entries`, visible: true },
      { id: 'domains', title: 'Top domains', type: 'list', content: data.topDomains.map(d => `${d.name}: ${d.count}`).join('\n'), visible: true },
    ],
  }
}

export function printReport(containerId: string) {
  const el = document.getElementById(containerId)
  if (!el) {
    window.print()
    return
  }
  window.print()
}

export function reportToPlainText(report: ReportData): string {
  const lines: string[] = [
    report.title,
    `Period: ${report.period}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    '',
    ...report.sections.filter(s => s.visible).map(s => `## ${s.title}\n${s.content}\n`),
  ]
  return lines.join('\n')
}

export async function exportToPdf(containerId: string, filename: string): Promise<void> {
  const el = document.getElementById(containerId)
  if (!el) return

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = canvas.width
  const imgHeight = canvas.height
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
  const imgX = (pdfWidth - imgWidth * ratio) / 2
  const imgScaledWidth = imgWidth * ratio
  const imgScaledHeight = imgHeight * ratio

  // Handle multi-page
  const pageHeight = pdfHeight
  let heightLeft = imgScaledHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', imgX, position, imgScaledWidth, imgScaledHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = -pageHeight + (imgScaledHeight - heightLeft - pageHeight)
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', imgX, position, imgScaledWidth, imgScaledHeight)
    heightLeft -= pageHeight
  }

  pdf.save(filename)
}

export function saveReportToHistory(report: ReportData): void {
  const history = getReportHistory()
  const entry: ReportHistoryEntry = {
    id: `report-${Date.now()}`,
    title: report.title,
    periodType: report.periodType,
    period: report.period,
    generatedAt: report.generatedAt,
    sections: report.sections.filter(s => s.visible).map(s => s.id),
  }
  history.unshift(entry)
  // Keep last 50 reports
  if (history.length > 50) history.length = 50
  localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(history))
}

export function getReportHistory(): ReportHistoryEntry[] {
  try {
    const stored = localStorage.getItem(REPORT_HISTORY_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

export function clearReportHistory(): void {
  localStorage.removeItem(REPORT_HISTORY_KEY)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
