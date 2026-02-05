import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { MOOD_OPTIONS } from '@/lib/constants'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

export function QuickJournal() {
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [energyLevel, setEnergyLevel] = useState(5)

  function handleSubmit() {
    if (!content.trim()) {
      toast.error('Please write something before submitting.')
      return
    }

    toast.success('Journal entry saved!')
    setContent('')
    setSelectedMood(null)
    setEnergyLevel(5)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="How's your day going? What's on your mind..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none"
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

        <Button onClick={handleSubmit} className="w-full gap-2">
          <Send className="h-4 w-4" />
          Save Entry
        </Button>
      </CardContent>
    </Card>
  )
}
