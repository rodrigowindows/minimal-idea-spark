import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
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
import type { Opportunity, LifeDomain, OpportunityTypeValue, OpportunityStatusValue } from '@/types'
import { OPPORTUNITY_TYPES, OPPORTUNITY_STATUSES } from '@/lib/constants'

interface OpportunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity?: Opportunity | null
  domains: LifeDomain[]
  onSave: (data: Omit<Opportunity, 'id' | 'user_id' | 'created_at' | 'domain'>) => void
}

export function OpportunityDialog({
  open,
  onOpenChange,
  opportunity,
  domains,
  onSave,
}: OpportunityDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [domainId, setDomainId] = useState<string>('')
  const [type, setType] = useState<OpportunityTypeValue>('action')
  const [status, setStatus] = useState<OpportunityStatusValue>('backlog')
  const [priority, setPriority] = useState(5)
  const [strategicValue, setStrategicValue] = useState(5)

  useEffect(() => {
    if (opportunity) {
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
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{opportunity ? 'Edit Opportunity' : 'New Opportunity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opp-title">Title</Label>
            <Input
              id="opp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opp-desc">Description</Label>
            <Textarea
              id="opp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details..."
              className="resize-none"
              rows={3}
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
              <Label>Priority: {priority}/10</Label>
              <Slider
                value={[priority]}
                onValueChange={([v]) => setPriority(v)}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Strategic Value: {strategicValue}/10</Label>
            <Slider
              value={[strategicValue]}
              onValueChange={([v]) => setStrategicValue(v)}
              min={1}
              max={10}
              step={1}
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
