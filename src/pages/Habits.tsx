import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useLocalData, type Habit } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'
import { toast } from 'sonner'
import {
  Repeat,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Flame,
  Zap,
  Calendar,
} from 'lucide-react'
import { VoiceInput } from '@/components/smart-capture/VoiceInput'
import { format, subDays, startOfWeek, addDays } from 'date-fns'

const HABIT_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export function Habits() {
  const { habits, domains, addHabit, toggleHabitCompletion, deleteHabit } = useLocalData()
  const { addXP } = useXPSystem()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly'>('daily')
  const [newColor, setNewColor] = useState(HABIT_COLORS[0])
  const [newDomainId, setNewDomainId] = useState<string>('')

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
  const last30Days = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'))

  function handleCreateHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    addHabit({
      name: newName.trim(),
      domain_id: newDomainId || null,
      frequency: newFrequency,
      target_count: newFrequency === 'daily' ? 1 : 5,
      color: newColor,
    })
    setNewName('')
    setShowNew(false)
    toast.success('Habit created!')
  }

  function handleToggle(habit: Habit, date: string) {
    const wasCompleted = habit.completions.includes(date)
    toggleHabitCompletion(habit.id, date)
    if (!wasCompleted) {
      addXP(10)
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <span>{habit.name} done!</span>
          <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
            <Zap className="h-3 w-3" />+10 XP
          </Badge>
        </div>
      )
    }
  }

  const streaks = useMemo(() => {
    return habits.map(habit => {
      let streak = 0
      for (let i = 0; i < 365; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        if (habit.completions.includes(date)) {
          streak++
        } else if (i > 0) {
          break
        }
      }
      return { id: habit.id, streak }
    })
  }, [habits])

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Repeat className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" />New Habit
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Build consistency. Each completion = +10 XP.
        </p>
      </header>

      {habits.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center">
            <Repeat className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No habits yet. Create one to start building streaks!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Today's habits */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {habits.map((habit) => {
                  const isDone = habit.completions.includes(today)
                  const habitStreak = streaks.find(s => s.id === habit.id)?.streak ?? 0
                  return (
                    <motion.div
                      key={habit.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-3 transition-colors',
                        isDone ? 'bg-green-500/10' : 'bg-muted/50'
                      )}
                    >
                      <button
                        onClick={() => handleToggle(habit, today)}
                        className="shrink-0 touch-manipulation"
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-6 w-6 text-green-400" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: habit.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn('font-medium', isDone && 'line-through text-muted-foreground')}>
                          {habit.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{habit.frequency}</p>
                      </div>
                      {habitStreak > 0 && (
                        <Badge variant="secondary" className="gap-1 text-orange-400">
                          <Flame className="h-3 w-3" />{habitStreak}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          deleteHabit(habit.id)
                          toast.success('Habit deleted')
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Week view */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-muted-foreground py-2 pr-4">Habit</th>
                      {weekDays.map(day => (
                        <th key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                          {format(new Date(day + 'T12:00:00'), 'EEE')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map(habit => (
                      <tr key={habit.id}>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: habit.color }} />
                            <span className="truncate text-sm">{habit.name}</span>
                          </div>
                        </td>
                        {weekDays.map(day => {
                          const done = habit.completions.includes(day)
                          return (
                            <td key={day} className="px-2 py-2 text-center">
                              <button
                                onClick={() => handleToggle(habit, day)}
                                className={cn(
                                  'mx-auto flex h-6 w-6 items-center justify-center rounded-md transition-colors touch-manipulation',
                                  done
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                )}
                              >
                                {done ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Circle className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 30-day heatmap */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">30-Day Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {habits.map(habit => {
                const completedDays = last30Days.filter(d => habit.completions.includes(d)).length
                const percentage = Math.round((completedDays / 30) * 100)
                return (
                  <div key={habit.id} className="mb-4 last:mb-0">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: habit.color }} />
                        <span className="text-sm font-medium">{habit.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{completedDays}/30 days ({percentage}%)</span>
                    </div>
                    <div className="flex gap-0.5">
                      {last30Days.map(day => {
                        const done = habit.completions.includes(day)
                        return (
                          <div
                            key={day}
                            className={cn(
                              'h-4 flex-1 rounded-sm transition-colors',
                              done ? 'opacity-100' : 'opacity-20'
                            )}
                            style={{ backgroundColor: done ? habit.color : '#6b7280' }}
                            title={`${format(new Date(day + 'T12:00:00'), 'MMM d')} - ${done ? 'Done' : 'Missed'}`}
                          />
                        )
                      })}
                    </div>
                    <Progress value={percentage} className="mt-1 h-1" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* New habit dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateHabit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <div className="flex items-center gap-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Morning meditation"
                  required
                  className="flex-1"
                />
                <VoiceInput
                  onTranscript={(text) => setNewName((prev) => prev ? prev + ' ' + text : text)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as 'daily' | 'weekly')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={newDomainId} onValueChange={setNewDomainId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {domains.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {HABIT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      newColor === color && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button type="submit" disabled={!newName.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
