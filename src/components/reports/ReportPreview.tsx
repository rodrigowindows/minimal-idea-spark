import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useTranslation } from '@/contexts/LanguageContext'
import type { ReportData, ReportTemplate } from '@/lib/reports/generate-pdf'

interface ReportPreviewProps {
  report: ReportData
  template: ReportTemplate
}

const STATUS_COLORS = {
  done: '#22c55e',
  doing: '#3b82f6',
  review: '#f59e0b',
  backlog: '#94a3b8',
}

const TYPE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export function ReportPreview({ report, template }: ReportPreviewProps) {
  const { t } = useTranslation()
  const { stats } = report

  const statusData = [
    { name: t('reports.completed'), value: stats.completedOpportunities, color: STATUS_COLORS.done },
    { name: t('reports.inProgress'), value: stats.inProgressOpportunities, color: STATUS_COLORS.doing },
    { name: t('reports.backlog'), value: stats.backlogOpportunities, color: STATUS_COLORS.backlog },
  ].filter(d => d.value > 0)

  const typeData = Object.entries(stats.tasksByType).map(([key, value]) => ({
    name: key,
    value,
  }))

  const domainData = stats.topDomains.map(d => ({
    name: d.name,
    count: d.count,
    fill: d.color,
  }))

  const visibleSections = new Set(report.sections.filter(s => s.visible).map(s => s.id))

  return (
    <div className="space-y-4 report-preview">
      {/* Header */}
      <div
        className="rounded-lg p-6 text-white"
        style={{ backgroundColor: template.accentColor }}
      >
        {template.showLogo && (
          <div className="text-sm font-medium opacity-80 mb-1">LifeOS</div>
        )}
        {template.headerText && (
          <div className="text-xs opacity-70 mb-2">{template.headerText}</div>
        )}
        <h2 className="text-2xl font-bold">{report.title}</h2>
        <p className="text-sm opacity-80 mt-1">
          {t('reports.period')}: {report.period}
        </p>
        <p className="text-xs opacity-60">
          {t('reports.generatedAt')}: {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* Scorecard */}
      {visibleSections.has('summary') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ScoreCard
            label={t('reports.totalOpps')}
            value={stats.totalOpportunities}
            color={template.accentColor}
          />
          <ScoreCard
            label={t('reports.completionRate')}
            value={`${stats.completionRate}%`}
            color="#22c55e"
          />
          <ScoreCard
            label={t('reports.journalLabel')}
            value={stats.journalEntries}
            color="#8b5cf6"
          />
          <ScoreCard
            label={t('reports.avgMoodLabel')}
            value={`${stats.avgMood}/5`}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Opportunities breakdown */}
      {visibleSections.has('opportunities') && statusData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.opportunitiesBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domains chart */}
      {visibleSections.has('domains') && domainData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.domainDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {domainData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task types */}
      {visibleSections.has('taskTypes') && typeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.tasksByType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {typeData.map((item, idx) => (
                <Badge key={item.name} variant="secondary" className="text-sm py-1 px-3">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length] }}
                  />
                  {item.name}: {item.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journal */}
      {visibleSections.has('journal') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.journalSection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.journalEntries}</div>
                <div className="text-xs text-muted-foreground">{t('reports.entries')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgMood}/5</div>
                <div className="text-xs text-muted-foreground">{t('reports.avgMoodLabel')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgEnergy}/10</div>
                <div className="text-xs text-muted-foreground">{t('reports.avgEnergyLabel')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Habits */}
      {visibleSections.has('habits') && stats.habitsCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.habitsSection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('reports.habitsTracked')}: {stats.habitsCount}</span>
              <span>{stats.habitsCompletionRate}%</span>
            </div>
            <Progress value={stats.habitsCompletionRate} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      {visibleSections.has('goals') && stats.goalsCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.goalsSection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('reports.goalsActive')}: {stats.goalsCount}</span>
              <span>{t('reports.avgProgress')}: {stats.goalsAvgProgress}%</span>
            </div>
            <Progress value={stats.goalsAvgProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      {template.footerText && (
        <div className="text-center text-xs text-muted-foreground py-4 border-t">
          {template.footerText}
        </div>
      )}
    </div>
  )
}

function ScoreCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}
