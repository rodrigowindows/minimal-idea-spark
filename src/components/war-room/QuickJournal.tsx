import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MOOD_OPTIONS } from '@/lib/constants'
import { Send, Zap, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useLocalData } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'

export function QuickJournal() {
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [energyLevel, setEnergyLevel] = useState(5)
  const { addDailyLog } = useLocalData()
  const { addXP } = useXPSystem()

  function handleSubmit() {
    if (!content.trim()) {
      toast.error('Please write something before submitting.')
      return
    }

    addDailyLog({
      content: content.trim(),
      mood: selectedMood,
      energy_level: energyLevel,
      log_date: new Date().toISOString().split('T')[0],
    })
    addXP(15)
    toast.success(
      <div className="flex items-center gap-2">
        <span>Journal saved!</span>
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
          <Zap className="h-3 w-3" />+15 XP
        </Badge>
      </div>
    )
    setContent('')
    setSelectedMood(null)
    setEnergyLevel(5)
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Quick Journal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="How's your day going? What's on your mind..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] resize-none"
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Mood</p>
          <div className="flex gap-1.5">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.value}
                type="button"
                onClick={() => setSelectedMood(mood.value)}
                className={cn(
                  'rounded-lg px-2 py-1 text-base transition-all hover:scale-110',
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Energy</p>
            <span className="text-xs font-medium text-muted-foreground">{energyLevel}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={energyLevel}
            onChange={(e) => setEnergyLevel(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <Button onClick={handleSubmit} className="w-full gap-2 min-h-[44px]" disabled={!content.trim()}>
          <Send className="h-4 w-4" />
          Save Entry
          <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400 ml-1">
            <Zap className="h-3 w-3" />+15 XP
          </Badge>
        </Button>
      </CardContent>
    </Card>
  )
}
