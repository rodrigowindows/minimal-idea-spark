import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLocalData } from '@/hooks/useLocalData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { MOOD_OPTIONS } from '@/lib/constants'
import { useXPSystem } from '@/hooks/useXPSystem'
import { BookOpen, Plus, Calendar, Sparkles, Send, Trash2, Zap, Pencil, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { VoiceInput } from '@/components/smart-capture/VoiceInput'
import { JournalCoach } from '@/components/journal/JournalCoach'

import { EmptyState } from '@/components/EmptyState'
import { VirtualList } from '@/components/VirtualList'
import { format, parseISO } from 'date-fns'
import { getDateLocale } from '@/lib/date-locale'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'


export function Journal() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const { t } = useTranslation()
  const { dailyLogs, isLoading, addDailyLog, updateDailyLog, deleteDailyLog } = useLocalData()
  const { addXP } = useXPSystem()
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [energyLevel, setEnergyLevel] = useState(5)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const dateTargetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dateParam && dateTargetRef.current) {
      dateTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [dateParam, dailyLogs])

  const sortedLogs = useMemo(() => {
    if (!dailyLogs) return []
    return [...dailyLogs].sort(
      (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    )
  }, [dailyLogs])


  async function handleSubmit() {
    if (!content.trim()) {
      toast.error(t('journal.writeFirst'))
      return
    }

    const logDate = new Date().toISOString().split('T')[0]
    const trimmedContent = content.trim()

    // addDailyLog already persists to Supabase — no dual-write needed
    const newLog = addDailyLog({
      content: trimmedContent,
      mood: selectedMood,
      energy_level: energyLevel,
      log_date: logDate,
    })
    addXP(15)
    toast.success(
      <div className="flex items-center gap-2">
        <span>{t('journal.entrySaved')}</span>
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
          <Zap className="h-3 w-3" />+15 XP
        </Badge>
      </div>
    )
    setContent('')
    setSelectedMood(null)
    setEnergyLevel(5)
    setShowNewEntry(false)

    // Generate embedding (best-effort, async) — uses the ID already persisted by addDailyLog
    const embeddingText = `${trimmedContent} | Mood: ${selectedMood ?? 'N/A'} | Energy: ${energyLevel}/10 | Date: ${logDate}`
    generateEmbeddingForLog(newLog.id, embeddingText)
  }

  function handleDelete(id: string) {
    deleteDailyLog(id)
    if (editingId === id) setEditingId(null)
    toast.success(t('journal.entryDeleted'))
  }

  function handleStartEdit(log: { id: string; content: string }) {
    setEditingId(log.id)
    setEditContent(log.content)
  }

  function handleSaveEdit(id: string) {
    if (!editContent.trim()) return
    updateDailyLog(id, { content: editContent.trim() })
    setEditingId(null)
    setEditContent('')
    toast.success(t('journal.entryUpdated', 'Entry updated'))
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  const getMoodEmoji = (mood: string | null) => {
    if (!mood) return null
    const option = MOOD_OPTIONS.find((m) => m.value === mood)
    return option?.emoji ?? null
  }

  return (
    <PageContent>
      <PageHeader
        icon={<BookOpen className="h-6 w-6 text-primary" />}
        title={t('journal.title')}
        variant="compact"
        actions={
          <Button onClick={() => setShowNewEntry(!showNewEntry)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('journal.newEntry')}
          </Button>
        }
      />

      {showNewEntry && (
        <Card className="mb-6 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('journal.todaysReflection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder={t('journal.placeholder')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] resize-none pr-20"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <VoiceInput
                  onTranscript={(text) => setContent((prev) => prev ? prev + ' ' + text : text)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('journal.mood')}</p>
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
                {t('journal.energyLevel')}: {energyLevel}/10
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
                {t('journal.saveEntry')}
              </Button>
              <Button variant="outline" onClick={() => setShowNewEntry(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Journal Coach - shows when creating new entry or always visible */}
      {showNewEntry && (
        <div className="mb-6">
          <JournalCoach
            currentMood={selectedMood ?? undefined}
            currentEnergy={energyLevel}
            recentEntries={sortedLogs.slice(0, 5).map(log => ({
              date: log.log_date,
              mood: log.mood ?? undefined,
              energy: log.energy_level ?? undefined,
              content: log.content,
            }))}
          />
        </div>
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
          <EmptyState
            icon={BookOpen}
            title={t('emptyStates.journal')}
            actionLabel={t('emptyStates.journalAction')}
            onAction={() => setShowNewEntry(true)}
          />
        ) : sortedLogs.length > 30 ? (
          <VirtualList
            items={sortedLogs}
            itemHeight={160}
            className="h-[calc(100vh-200px)]"
            getItemKey={(log) => log.id}
            renderItem={(log) => {
              const moodEmoji = getMoodEmoji(log.mood)
              const formattedDate = format(parseISO(log.log_date), 'EEEE, MMMM d, yyyy', { locale: getDateLocale() })
              const isTargetDate = dateParam && log.log_date.slice(0, 10) === dateParam
              return (
                <div className="pb-4" ref={isTargetDate ? dateTargetRef : undefined}>
                  <Card className={`group rounded-xl ${isTargetDate ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {moodEmoji && <span className="text-xl" title={log.mood ?? ''}>{moodEmoji}</span>}
                          {log.energy_level && (
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: `${log.energy_level * 10}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{log.energy_level}/10</span>
                            </div>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => handleDelete(log.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{log.content}</p>
                    </CardContent>
                  </Card>
                </div>
              )
            }}
          />
        ) : (
          <div className="space-y-4">
            {sortedLogs.map((log) => {
              const moodEmoji = getMoodEmoji(log.mood)
              const formattedDate = format(parseISO(log.log_date), 'EEEE, MMMM d, yyyy', { locale: getDateLocale() })
              const isTargetDate = dateParam && log.log_date.slice(0, 10) === dateParam
              return (
                <div key={log.id} ref={isTargetDate ? dateTargetRef : undefined}>
                <Card className={`group rounded-xl ${isTargetDate ? 'ring-2 ring-primary' : ''}`}>
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
                          onClick={() => handleStartEdit(log)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
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
                    {editingId === log.id ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px] resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(log.id)} className="gap-1">
                            <Check className="h-3 w-3" />{t('common.save', 'Save')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1">
                            <X className="h-3 w-3" />{t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                        {log.content}
                      </p>
                    )}
                  </CardContent>
                </Card>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </PageContent>
  )
}
