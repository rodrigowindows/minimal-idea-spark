import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { VoiceInput } from '@/components/smart-capture/VoiceInput'
import { TagPicker } from '@/components/tags/TagPicker'
import { getTagsForOpportunity, setTagsForOpportunity } from '@/lib/tags/tag-service'
import type { Opportunity, LifeDomain, OpportunityTypeValue, OpportunityStatusValue } from '@/types'
import { OPPORTUNITY_TYPES, OPPORTUNITY_STATUSES } from '@/lib/constants'

interface GoalOption {
  id: string
  title: string
}

interface OpportunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity?: Opportunity | null
  domains: LifeDomain[]
  goals?: GoalOption[]
  onSave: (data: Omit<Opportunity, 'id' | 'user_id' | 'created_at' | 'domain'>, tagIds?: string[]) => void
}

export function OpportunityDialog({
  open,
  onOpenChange,
  opportunity,
  domains,
  goals = [],
  onSave,
}: OpportunityDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [domainId, setDomainId] = useState<string>('')
  const [type, setType] = useState<OpportunityTypeValue>('action')
  const [status, setStatus] = useState<OpportunityStatusValue>('backlog')
  const [priority, setPriority] = useState(5)
  const [strategicValue, setStrategicValue] = useState(5)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [reminderAt, setReminderAt] = useState('')
  const [goalId, setGoalId] = useState<string>('')

  useEffect(() => {
    if (opportunity) {
      setSelectedTagIds(getTagsForOpportunity(opportunity.id))
      setDueDate(opportunity.due_date ?? '')
      setReminderAt(opportunity.reminder_at ?? '')
      setTitle(opportunity.title)
      setDescription(opportunity.description || '')
      setDomainId(opportunity.domain_id || '')
      setType(opportunity.type)
      setStatus(opportunity.status)
      setPriority(opportunity.priority)
      setStrategicValue(opportunity.strategic_value ?? 5)
    } else {
      setTitle('')
      setDescription('')
      setDomainId(domains[0]?.id || '')
      setType('action')
      setStatus('backlog')
      setPriority(5)
      setStrategicValue(5)
      setSelectedTagIds([])
      setDueDate('')
      setReminderAt('')
      setGoalId('')
    }
  }, [opportunity, open, domains])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      domain_id: domainId || null,
      type,
      status,
      priority,
      strategic_value: strategicValue,
      due_date: dueDate || null,
      reminder_at: reminderAt || null,
      goal_id: goalId || null,
    }, selectedTagIds)
    if (opportunity) setTagsForOpportunity(opportunity.id, selectedTagIds)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{opportunity ? 'Edit Opportunity' : 'New Opportunity'}</DialogTitle>
          <DialogDescription>
            {opportunity ? 'Update the details of this opportunity.' : 'Fill in the details to create a new opportunity.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opp-title">Title</Label>
            <div className="flex items-center gap-1">
              <Input
                id="opp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
                className="flex-1"
              />
              <VoiceInput
                onTranscript={(text) => setTitle((prev) => prev ? prev + ' ' + text : text)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opp-desc">Description</Label>
            <div className="relative">
              <Textarea
                id="opp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details..."
                className="resize-none pr-12"
                rows={3}
              />
              <div className="absolute right-2 top-2">
                <VoiceInput
                  onTranscript={(text) => setDescription((prev) => prev ? prev + ' ' + text : text)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opp-due">Due date</Label>
              <Input
                id="opp-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-reminder">Reminder</Label>
              <Input
                id="opp-reminder"
                type="datetime-local"
                value={reminderAt ? reminderAt.slice(0, 16) : ''}
                onChange={(e) => setReminderAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
              {dueDate && (
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: '1h before', hours: 1 },
                    { label: '1 day before', hours: 24 },
                    { label: '3 days before', hours: 72 },
                    { label: '1 week before', hours: 168 },
                  ].map((preset) => {
                    const dueDateObj = new Date(dueDate + 'T09:00:00')
                    const reminderDate = new Date(dueDateObj.getTime() - preset.hours * 60 * 60 * 1000)
                    if (reminderDate <= new Date()) return null
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        onClick={() => setReminderAt(reminderDate.toISOString())}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          {goals.length > 0 && (
            <div className="space-y-2">
              <Label>Link to goal (OKR)</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagPicker
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              placeholder="Add tags..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color_theme }} />
                        {d.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as OpportunityTypeValue)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OpportunityStatusValue)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label id="priority-label">Priority: {priority}/10</Label>
              <Slider
                value={[priority]}
                onValueChange={([v]) => setPriority(v)}
                min={1}
                max={10}
                step={1}
                aria-labelledby="priority-label"
                aria-valuetext={`${priority} out of 10`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label id="strategic-value-label">Strategic Value: {strategicValue}/10</Label>
            <Slider
              value={[strategicValue]}
              onValueChange={([v]) => setStrategicValue(v)}
              min={1}
              max={10}
              step={1}
              aria-labelledby="strategic-value-label"
              aria-valuetext={`${strategicValue} out of 10`}
            />
            <p className="text-xs text-muted-foreground">
              Higher = more XP reward. Study at SV 10 = 500 XP, Action at SV 2 = 60 XP.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {opportunity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
