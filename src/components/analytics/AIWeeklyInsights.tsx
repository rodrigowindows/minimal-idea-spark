import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { useAIWeeklyInsights } from '@/hooks/useAIFeatures'
import ReactMarkdown from 'react-markdown'

interface AIWeeklyInsightsProps {
  metrics: {
    tasks_completed: number
    tasks_doing: number
    deep_work_minutes: number
    streak_days: number
    xp_gained: number
    avg_mood?: string
    avg_energy?: string
    habits_rate?: number
    goals_count?: number
    goals_progress?: number
    domains?: string[]
  }
}

export function AIWeeklyInsights({ metrics }: AIWeeklyInsightsProps) {
  const { generateInsights, insights, loading } = useAIWeeklyInsights()
  const [generated, setGenerated] = useState(false)

  const handleGenerate = async () => {
    await generateInsights(metrics)
    setGenerated(true)
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Weekly Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!generated && !loading && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Get personalized AI insights based on your weekly performance data.
            </p>
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing your week...</span>
          </div>
        )}

        {insights && !loading && (
          <div className="space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              className="gap-1.5 w-full"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
