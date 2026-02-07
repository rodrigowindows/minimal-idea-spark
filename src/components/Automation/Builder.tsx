import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TRIGGER_EVENTS, type Trigger, type EventTrigger, type ScheduleTrigger, type ConditionTrigger } from '@/lib/automation/triggers'
import { ACTION_KINDS, type Action, type CreateTaskAction, type SendNotificationAction } from '@/lib/automation/actions'
import { describeTrigger } from '@/lib/automation/triggers'
import { describeAction } from '@/lib/automation/actions'
import { AUTOMATION_TEMPLATES } from '@/lib/automation/templates'
import { getExecutionLog, type LogEntry } from '@/lib/automation/templates'
import { suggestAutomations } from '@/lib/automation/ai-suggestions'
import { Trash2, Zap, ListOrdered, Lightbulb, FileStack } from 'lucide-react'

const CONDITION_OPS = ['eq', 'gt', 'lt', 'contains'] as const

export function AutomationBuilder() {
  const [name, setName] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [trigger, setTrigger] = useState<Trigger>({ kind: 'event', event: 'task_completed' })
  const [actions, setActions] = useState<Action[]>([
    { kind: 'send_notification', title: 'Done!', body: 'Task completed.' } as SendNotificationAction,
  ])
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([])
  const refreshLog = () => setExecutionLog(getExecutionLog())
  useEffect(() => refreshLog(), [])

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

  const applyTemplate = (t: (typeof AUTOMATION_TEMPLATES)[0]) => {
    setName(t.name)
    setTrigger(t.trigger)
    setActions(t.actions)
  }
  const applySuggestion = () => {
    const suggestions = suggestAutomations()
    if (suggestions.length) {
      const s = suggestions[0]
      setName(s.name)
      setTrigger(s.trigger)
      setActions(s.actions)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Automation Builder</h1>
        <p className="text-muted-foreground">Create no-code automations with triggers and actions.</p>
      </header>

      <Tabs defaultValue="builder">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder" className="gap-2"><Zap className="h-4 w-4" /> Builder</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><FileStack className="h-4 w-4" /> Templates</TabsTrigger>
          <TabsTrigger value="log" className="gap-2"><ListOrdered className="h-4 w-4" /> Execution log</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2"><Zap className="h-5 w-5" /> New automation</span>
                <Button variant="outline" size="sm" onClick={applySuggestion} className="gap-2">
                  <Lightbulb className="h-4 w-4" /> AI suggest
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Notify on task done" className="max-w-xs" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-2">
                <Label>Trigger type</Label>
                <Select
                  value={trigger.kind}
                  onValueChange={(v) => {
                    if (v === 'event') setTrigger({ kind: 'event', event: 'task_completed' })
                    else if (v === 'schedule') setTrigger({ kind: 'schedule', cron: '0 9 * * *' })
                    else setTrigger({ kind: 'condition', field: 'status', op: 'eq', value: 'done' })
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="condition">Condition</SelectItem>
                  </SelectContent>
                </Select>
                {trigger.kind === 'event' && (
                  <Select value={trigger.event} onValueChange={(ev) => setTrigger({ ...trigger, event: ev as EventTrigger['event'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_EVENTS.map(ev => (<SelectItem key={ev} value={ev}>{ev.replace(/_/g, ' ')}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
                {trigger.kind === 'schedule' && (
                  <div className="flex gap-2">
                    <Input value={(trigger as ScheduleTrigger).cron} onChange={e => setTrigger({ ...trigger, cron: e.target.value })} placeholder="0 9 * * *" />
                    <Input value={(trigger as ScheduleTrigger).timezone ?? ''} onChange={e => setTrigger({ ...trigger, timezone: e.target.value || undefined })} placeholder="Timezone" className="w-32" />
                  </div>
                )}
                {trigger.kind === 'condition' && (
                  <div className="flex flex-wrap gap-2">
                    <Input value={(trigger as ConditionTrigger).field} onChange={e => setTrigger({ ...trigger, field: e.target.value })} placeholder="Field" className="w-28" />
                    <Select value={(trigger as ConditionTrigger).op} onValueChange={(op) => setTrigger({ ...trigger, op: op as ConditionTrigger['op'] })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPS.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Input value={String((trigger as ConditionTrigger).value)} onChange={e => setTrigger({ ...trigger, value: e.target.value })} placeholder="Value" className="w-28" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{describeTrigger(trigger)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Actions</Label>
                  <Select onValueChange={(v) => addAction(v as Action['kind'])}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Add action" /></SelectTrigger>
                    <SelectContent>
                      {ACTION_KINDS.map(k => (<SelectItem key={k} value={k}>{k.replace(/_/g, ' ')}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <ul className="space-y-2">
                  {actions.map((ac, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg border p-2">
                      <span className="text-sm flex-1">{describeAction(ac)}</span>
                      {ac.kind === 'create_task' && 'title' in ac && (
                        <Input value={ac.title} onChange={e => updateAction(i, { title: e.target.value })} placeholder="Task title" className="max-w-[200px]" />
                      )}
                      {ac.kind === 'send_notification' && 'title' in ac && (
                        <>
                          <Input value={ac.title} onChange={e => updateAction(i, { title: e.target.value })} placeholder="Title" className="max-w-[120px]" />
                          <Input value={ac.body} onChange={e => updateAction(i, { body: e.target.value })} placeholder="Body" className="max-w-[160px]" />
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => removeAction(i)}><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                </ul>
              </div>
              <Button>Save automation</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
              <p className="text-sm text-muted-foreground">Use a template to pre-fill the builder.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {AUTOMATION_TEMPLATES.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => applyTemplate(t)}>Use template</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Execution log</CardTitle>
                <p className="text-sm text-muted-foreground">Recent automation runs.</p>
              </div>
              <Button variant="outline" size="sm" onClick={refreshLog}>Refresh</Button>
            </CardHeader>
            <CardContent>
              {executionLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No runs yet. Executions will appear here.</p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-auto">
                  {executionLog.map(entry => (
                    <li key={entry.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <span>{entry.automationName}</span>
                      <span className={entry.success ? 'text-green-600' : 'text-destructive'}>{entry.success ? 'OK' : 'Failed'}</span>
                      <span className="text-muted-foreground">{new Date(entry.at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
