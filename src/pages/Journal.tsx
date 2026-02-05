import { useMemo, useState } from 'react'
import { useMockData } from '@/hooks/useMockData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { MOOD_OPTIONS } from '@/lib/constants'
import { BookOpen, Plus, Calendar, Sparkles, Send } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

export function Journal() {
  const { dailyLogs, isLoading } = useMockData()
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [energyLevel, setEnergyLevel] = useState(5)

  const sortedLogs = useMemo(() => {
    if (!dailyLogs) return []
    return [...dailyLogs].sort(
      (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    )
  }, [dailyLogs])

  function handleSubmit() {
    if (!content.trim()) {
      toast.error('Please write something before saving.')
      return
    }

    toast.success('Journal entry saved!')
    setContent('')
    setSelectedMood(null)
    setEnergyLevel(5)
    setShowNewEntry(false)
  }

  const getMoodEmoji = (mood: string | null) => {
    if (!mood) return null
    const option = MOOD_OPTIONS.find((m) => m.value === mood)
    return option?.emoji ?? null
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
          </div>
          <Button onClick={() => setShowNewEntry(!showNewEntry)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>
      </header>

      {/* New entry form */}
      {showNewEntry && (
        <Card className="mb-6 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Today's Reflection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="How's your day going? What's on your mind..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Mood</p>
              <div className="flex gap-2">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setSelectedMood(mood.value)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-lg transition-all hover:scale-110',
                      selectedMood === mood.value
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'hover:bg-secondary'
                    )}
                    title={mood.label}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Energy Level: {energyLevel}/10
              </p>
              <input
                type="range"
                min={1}
                max={10}
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="gap-2">
                <Send className="h-4 w-4" />
                Save Entry
              </Button>
              <Button variant="outline" onClick={() => setShowNewEntry(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journal entries */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedLogs.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No journal entries yet. Start reflecting on your day.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedLogs.map((log) => {
              const moodEmoji = getMoodEmoji(log.mood)
              const formattedDate = format(parseISO(log.log_date), 'EEEE, MMMM d, yyyy')

              return (
                <Card key={log.id} className="rounded-xl">
                  <CardContent className="py-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {moodEmoji && (
                          <span className="text-xl" title={log.mood ?? ''}>
                            {moodEmoji}
                          </span>
                        )}
                        {log.energy_level && (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                style={{ width: `${log.energy_level * 10}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {log.energy_level}/10
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                      {log.content}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
