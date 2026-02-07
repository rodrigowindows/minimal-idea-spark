import { useMemo, useState } from 'react'
import { useLocalData } from '@/hooks/useLocalData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { MOOD_OPTIONS } from '@/lib/constants'
import { useXPSystem } from '@/hooks/useXPSystem'
import { BookOpen, Plus, Calendar, Sparkles, Send, Trash2, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { VoiceInput } from '@/components/smart-capture/VoiceInput'
import { AudioToText } from '@/components/AudioToText'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

export function Journal() {
  const { dailyLogs, isLoading, addDailyLog, deleteDailyLog } = useLocalData()
  const { addXP } = useXPSystem()
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

  async function generateEmbeddingForLog(logId: string, text: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return // Not authenticated, skip embedding

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      await fetch(`${supabaseUrl}/functions/v1/generate-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          text,
          table: 'daily_logs',
          id: logId,
        }),
      })
    } catch {
      // Embedding generation is best-effort, don't block the user
    }
  }

  async function syncLogToSupabase(logData: {
    content: string
    mood: string | null
    energy_level: number
    log_date: string
  }) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return null // Not authenticated, skip sync

      const { data, error } = await supabase
        .from('daily_logs')
        .insert({
          user_id: session.user.id,
          content: logData.content,
          mood: logData.mood,
          energy_level: logData.energy_level,
          log_date: logData.log_date,
        })
        .select('id')
        .single()

      if (error || !data) return null
      return data.id as string
    } catch {
      return null
    }
  }

  async function handleSubmit() {
    if (!content.trim()) {
      toast.error('Please write something before saving.')
      return
    }

    const logDate = new Date().toISOString().split('T')[0]
    const trimmedContent = content.trim()

    // Save locally
    addDailyLog({
      content: trimmedContent,
      mood: selectedMood,
      energy_level: energyLevel,
      log_date: logDate,
    })
    addXP(15)
    toast.success(
      <div className="flex items-center gap-2">
        <span>Journal entry saved!</span>
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
          <Zap className="h-3 w-3" />+15 XP
        </Badge>
      </div>
    )
    setContent('')
    setSelectedMood(null)
    setEnergyLevel(5)
    setShowNewEntry(false)

    // Sync to Supabase and generate embedding (best-effort, async)
    const embeddingText = `${trimmedContent} | Mood: ${selectedMood ?? 'N/A'} | Energy: ${energyLevel}/10 | Date: ${logDate}`
    const supabaseLogId = await syncLogToSupabase({
      content: trimmedContent,
      mood: selectedMood,
      energy_level: energyLevel,
      log_date: logDate,
    })
    if (supabaseLogId) {
      generateEmbeddingForLog(supabaseLogId, embeddingText)
    }
  }

  function handleDelete(id: string) {
    deleteDailyLog(id)
    toast.success('Entry deleted')
  }

  const getMoodEmoji = (mood: string | null) => {
    if (!mood) return null
    const option = MOOD_OPTIONS.find((m) => m.value === mood)
    return option?.emoji ?? null
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
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

      {showNewEntry && (
        <Card className="mb-6 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Today's Reflection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="How's your day going? What's on your mind..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] resize-none pr-20"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <VoiceInput
                  onTranscript={(text) => setContent((prev) => prev ? prev + ' ' + text : text)}
                />
                <AudioToText
                  onTranscription={(text) => setContent((prev) => prev ? prev + ' ' + text : text)}
                  sourcePage="journal"
                  compact
                />
              </div>
            </div>

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
                <Card key={log.id} className="group rounded-xl">
                  <CardContent className="py-4">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
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
