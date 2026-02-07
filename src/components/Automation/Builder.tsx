import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TRIGGER_EVENTS, type Trigger, type EventTrigger } from '@/lib/automation/triggers'
import { ACTION_KINDS, type Action, type CreateTaskAction, type SendNotificationAction } from '@/lib/automation/actions'
import { describeTrigger } from '@/lib/automation/triggers'
import { describeAction } from '@/lib/automation/actions'
import { Plus, Trash2, Zap } from 'lucide-react'

export function AutomationBuilder() {
  const [name, setName] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [triggerEvent, setTriggerEvent] = useState<EventTrigger['event']>('task_completed')
  const [actions, setActions] = useState<Action[]>([
    { kind: 'send_notification', title: 'Done!', body: 'Task completed.' } as SendNotificationAction,
  ])

  const addAction = (kind: Action['kind']) => {
    if (kind === 'create_task') setActions(a => [...a, { kind: 'create_task', title: 'New task' } as CreateTaskAction])
    else if (kind === 'send_notification') setActions(a => [...a, { kind: 'send_notification', title: '', body: '' } as SendNotificationAction])
    else if (kind === 'log') setActions(a => [...a, { kind: 'log', message: '' }])
    else setActions(a => [...a, { kind: 'send_email', to: '', subject: '', body: '' }])
  }

  const removeAction = (i: number) => setActions(a => a.filter((_, idx) => idx !== i))

  const updateAction = (i: number, patch: Partial<Action>) => {
    setActions(a => a.map((ac, idx) => idx === i ? { ...ac, ...patch } : ac))
  }

  const trigger: Trigger = { kind: 'event', event: triggerEvent }

  return (
    <div className="max-w-2xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Automation Builder</h1>
        <p className="text-muted-foreground">Create no-code automations with triggers and actions.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            New automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Notify on task done"
              className="max-w-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Trigger</Label>
            <Select value={triggerEvent} onValueChange={(v) => setTriggerEvent(v as EventTrigger['event'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_EVENTS.map(ev => (
                  <SelectItem key={ev} value={ev}>{ev.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{describeTrigger(trigger)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Actions</Label>
              <Select onValueChange={(v) => addAction(v as Action['kind'])}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Add action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_KINDS.map(k => (
                    <SelectItem key={k} value={k}>{k.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ul className="space-y-2">
              {actions.map((ac, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="text-sm flex-1">{describeAction(ac)}</span>
                  {ac.kind === 'create_task' && 'title' in ac && (
                    <Input
                      value={ac.title}
                      onChange={e => updateAction(i, { title: e.target.value })}
                      placeholder="Task title"
                      className="max-w-[200px]"
                    />
                  )}
                  {ac.kind === 'send_notification' && 'title' in ac && (
                    <>
                      <Input
                        value={ac.title}
                        onChange={e => updateAction(i, { title: e.target.value })}
                        placeholder="Title"
                        className="max-w-[120px]"
                      />
                      <Input
                        value={ac.body}
                        onChange={e => updateAction(i, { body: e.target.value })}
                        placeholder="Body"
                        className="max-w-[160px]"
                      />
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeAction(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <Button>Save automation</Button>
        </CardContent>
      </Card>
    </div>
  )
}
