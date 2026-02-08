import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  TRIGGER_EVENTS,
  TRIGGER_KINDS,
  CONDITION_OPS,
  type Trigger,
  type TriggerKind,
  type EventTrigger,
  type ScheduleTrigger,
  type ConditionTrigger,
  type WebhookTrigger,
  describeTrigger,
  parseCronToHuman,
  getDefaultTrigger,
} from '@/lib/automation/triggers'
import {
  ACTION_KINDS,
  type Action,
  type ActionKind,
  describeAction,
  getDefaultAction,
  getActionIcon,
} from '@/lib/automation/actions'
import { AUTOMATION_TEMPLATES } from '@/lib/automation/templates'
import { getExecutionLog, clearExecutionLog, type LogEntry } from '@/lib/automation/templates'
import { suggestAutomations, type SuggestedAutomation } from '@/lib/automation/ai-suggestions'
import { runAutomation, type Automation } from '@/lib/automation/engine'
import { useLocalData } from '@/hooks/useLocalData'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  Trash2, Zap, ListOrdered, Lightbulb, FileStack, Plus, Save,
  Play, Pencil, Power, PowerOff, ChevronDown, ChevronUp,
  Clock, Bell, Mail, Globe, GitBranch, Star, FileText, PlusCircle,
  Edit2, AlertCircle, CheckCircle2, XCircle, RefreshCw, Wand2,
} from 'lucide-react'

const ACTION_ICON_MAP: Record<string, typeof Bell> = {
  'plus-circle': PlusCircle,
  'bell': Bell,
  'mail': Mail,
  'file-text': FileText,
  'globe': Globe,
  'clock': Clock,
  'git-branch': GitBranch,
  'edit': Edit2,
  'star': Star,
  'zap': Zap,
}

function ActionIcon({ kind }: { kind: ActionKind }) {
  const iconName = getActionIcon(kind)
  const Icon = ACTION_ICON_MAP[iconName] || Zap
  return <Icon className="h-4 w-4 shrink-0" />
}

export function AutomationBuilder() {
  const { user } = useAuth()
  const userId = user?.id ?? 'mock-user-001'
  const { automations, addAutomation, updateAutomation, deleteAutomation, toggleAutomation } = useLocalData()

  // Builder state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [trigger, setTrigger] = useState<Trigger>({ kind: 'event', event: 'task_completed' })
  const [actions, setActions] = useState<Action[]>([
    { kind: 'send_notification', title: 'Done!', body: 'Task completed.' },
  ])

  // Log
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([])
  const refreshLog = () => setExecutionLog(getExecutionLog())
  useEffect(() => refreshLog(), [])

  // AI suggestions
  const [suggestions, setSuggestions] = useState<SuggestedAutomation[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Saved automations list expand
  const [expandedAuto, setExpandedAuto] = useState<string | null>(null)

  // Reset builder
  const resetBuilder = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setEnabled(true)
    setTrigger({ kind: 'event', event: 'task_completed' })
    setActions([{ kind: 'send_notification', title: 'Done!', body: 'Task completed.' }])
  }

  // Action CRUD
  const addAction = (kind: ActionKind) => {
    setActions(a => [...a, getDefaultAction(kind)])
  }
  const removeAction = (i: number) => setActions(a => a.filter((_, idx) => idx !== i))
  const updateAction = (i: number, patch: Partial<Action>) => {
    setActions(a => a.map((ac, idx) => idx === i ? { ...ac, ...patch } : ac))
  }

  // Save automation
  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the automation.')
      return
    }
    if (actions.length === 0) {
      toast.error('Add at least one action.')
      return
    }

    if (editingId) {
      updateAutomation(editingId, { name, description, enabled, trigger, actions })
      toast.success('Automation updated!')
    } else {
      addAutomation({ name, description, enabled, trigger, actions })
      toast.success('Automation saved!')
    }
    resetBuilder()
  }

  // Edit existing automation
  const startEditing = (auto: Automation) => {
    setEditingId(auto.id)
    setName(auto.name)
    setDescription(auto.description)
    setEnabled(auto.enabled)
    setTrigger(auto.trigger)
    setActions(auto.actions)
  }

  // Apply template
  const applyTemplate = (t: (typeof AUTOMATION_TEMPLATES)[0]) => {
    resetBuilder()
    setName(t.name)
    setDescription(t.description)
    setTrigger(t.trigger)
    setActions(t.actions)
    toast.success('Template applied! Customize and save.')
  }

  // AI suggest
  const handleAISuggest = () => {
    const s = suggestAutomations()
    setSuggestions(s)
    setShowSuggestions(true)
  }

  const applySuggestion = (s: SuggestedAutomation) => {
    resetBuilder()
    setName(s.name)
    setDescription(s.description)
    setTrigger(s.trigger)
    setActions(s.actions)
    setShowSuggestions(false)
    toast.success('AI suggestion applied! Customize and save.')
  }

  // Run manually
  const handleManualRun = async (auto: Automation) => {
    const ok = await runAutomation(
      { ...auto, enabled: true },
      { event: auto.trigger.kind === 'event' ? (auto.trigger as EventTrigger).event : 'manual', userId }
    )
    if (ok) {
      toast.success(`"${auto.name}" ran successfully.`)
      updateAutomation(auto.id, { lastRunAt: new Date().toISOString(), runCount: auto.runCount + 1 })
    } else {
      toast.error(`"${auto.name}" failed.`)
    }
    refreshLog()
  }

  // Trigger kind change
  const handleTriggerKindChange = (kind: string) => {
    setTrigger(getDefaultTrigger(kind as TriggerKind))
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" /> Automation Builder
        </h1>
        <p className="text-muted-foreground">Create no-code automations with triggers, actions, conditionals, and loops.</p>
      </header>

      <Tabs defaultValue="builder">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder" className="gap-2"><Zap className="h-4 w-4" /> Builder</TabsTrigger>
          <TabsTrigger value="automations" className="gap-2"><Power className="h-4 w-4" /> My Automations ({automations.length})</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><FileStack className="h-4 w-4" /> Templates</TabsTrigger>
          <TabsTrigger value="log" className="gap-2"><ListOrdered className="h-4 w-4" /> Log</TabsTrigger>
        </TabsList>

        {/* ============ BUILDER TAB ============ */}
        <TabsContent value="builder" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {editingId ? 'Edit automation' : 'New automation'}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAISuggest} className="gap-2">
                    <Wand2 className="h-4 w-4" /> AI Suggest
                  </Button>
                  {editingId && (
                    <Button variant="ghost" size="sm" onClick={resetBuilder}>Cancel edit</Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Suggestions Overlay */}
              {showSuggestions && suggestions.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" /> AI Suggestions
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowSuggestions(false)}>Close</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {suggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.reason}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {Math.round(s.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => applySuggestion(s)}>Use</Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Name & Description */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="auto-name">Name</Label>
                  <Input id="auto-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Notify on task done" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auto-desc">Description</Label>
                  <Input id="auto-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this automation do?" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={enabled} onCheckedChange={setEnabled} />
                <Label className="text-sm">{enabled ? 'Enabled' : 'Disabled'}</Label>
              </div>

              <Separator />

              {/* Trigger Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Trigger</Label>
                <Select value={trigger.kind} onValueChange={handleTriggerKindChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_KINDS.map(k => (
                      <SelectItem key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {trigger.kind === 'event' && (
                  <Select value={(trigger as EventTrigger).event} onValueChange={ev => setTrigger({ kind: 'event', event: ev as EventTrigger['event'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_EVENTS.map(ev => (
                        <SelectItem key={ev} value={ev}>{ev.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {trigger.kind === 'schedule' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={(trigger as ScheduleTrigger).cron}
                        onChange={e => setTrigger({ ...trigger, cron: e.target.value } as ScheduleTrigger)}
                        placeholder="0 9 * * *"
                      />
                      <Input
                        value={(trigger as ScheduleTrigger).timezone ?? ''}
                        onChange={e => setTrigger({ ...trigger, timezone: e.target.value || undefined } as ScheduleTrigger)}
                        placeholder="Timezone"
                        className="w-40"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {parseCronToHuman((trigger as ScheduleTrigger).cron)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {['0 9 * * *', '0 21 * * *', '0 8 * * 1-5', '0 10 * * 0', '0 */1 * * *'].map(cron => (
                        <Button
                          key={cron}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setTrigger({ ...trigger, cron } as ScheduleTrigger)}
                        >
                          {parseCronToHuman(cron)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {trigger.kind === 'condition' && (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={(trigger as ConditionTrigger).field}
                      onChange={e => setTrigger({ ...trigger, field: e.target.value } as ConditionTrigger)}
                      placeholder="Field"
                      className="w-32"
                    />
                    <Select value={(trigger as ConditionTrigger).op} onValueChange={op => setTrigger({ ...trigger, op } as ConditionTrigger)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPS.map(o => (
                          <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={String((trigger as ConditionTrigger).value)}
                      onChange={e => setTrigger({ ...trigger, value: e.target.value } as ConditionTrigger)}
                      placeholder="Value"
                      className="w-32"
                    />
                  </div>
                )}

                {trigger.kind === 'webhook' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select value={(trigger as WebhookTrigger).method} onValueChange={m => setTrigger({ ...trigger, method: m } as WebhookTrigger)}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={(trigger as WebhookTrigger).url}
                        onChange={e => setTrigger({ ...trigger, url: e.target.value } as WebhookTrigger)}
                        placeholder="https://api.example.com/webhook"
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                {trigger.kind === 'manual' && (
                  <p className="text-sm text-muted-foreground">
                    This automation will only run when you trigger it manually.
                  </p>
                )}

                <p className="text-xs text-muted-foreground">{describeTrigger(trigger)}</p>
              </div>

              <Separator />

              {/* Actions Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Actions ({actions.length})</Label>
                  <Select onValueChange={(v) => addAction(v as ActionKind)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="+ Add action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_KINDS.map(k => (
                        <SelectItem key={k} value={k}>
                          {k.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {actions.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No actions yet. Add one above.</p>
                )}

                <ul className="space-y-3">
                  {actions.map((ac, i) => (
                    <li key={i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <ActionIcon kind={ac.kind} />
                        <Badge variant="outline" className="text-xs">{ac.kind.replace(/_/g, ' ')}</Badge>
                        <span className="text-sm text-muted-foreground flex-1">{describeAction(ac)}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeAction(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Inline editors for each action type */}
                      {ac.kind === 'create_task' && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={ac.title} onChange={e => updateAction(i, { title: e.target.value })} placeholder="Task title" />
                          <Input value={ac.description || ''} onChange={e => updateAction(i, { description: e.target.value })} placeholder="Description" />
                        </div>
                      )}
                      {ac.kind === 'send_notification' && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={ac.title} onChange={e => updateAction(i, { title: e.target.value })} placeholder="Title" />
                          <Input value={ac.body} onChange={e => updateAction(i, { body: e.target.value })} placeholder="Body" />
                        </div>
                      )}
                      {ac.kind === 'send_email' && (
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Input value={ac.to} onChange={e => updateAction(i, { to: e.target.value })} placeholder="To email" />
                          <Input value={ac.subject} onChange={e => updateAction(i, { subject: e.target.value })} placeholder="Subject" />
                          <Input value={ac.body} onChange={e => updateAction(i, { body: e.target.value })} placeholder="Body" />
                        </div>
                      )}
                      {ac.kind === 'log' && (
                        <Input value={ac.message} onChange={e => updateAction(i, { message: e.target.value })} placeholder="Log message" />
                      )}
                      {ac.kind === 'webhook' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Select value={ac.method} onValueChange={m => updateAction(i, { method: m })}>
                              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input value={ac.url} onChange={e => updateAction(i, { url: e.target.value })} placeholder="URL" className="flex-1" />
                          </div>
                          {ac.method !== 'GET' && (
                            <Textarea value={ac.body || ''} onChange={e => updateAction(i, { body: e.target.value })} placeholder='{"key": "value"}' rows={2} />
                          )}
                        </div>
                      )}
                      {ac.kind === 'delay' && (
                        <div className="flex items-center gap-2">
                          <Input type="number" value={ac.seconds} onChange={e => updateAction(i, { seconds: Number(e.target.value) })} className="w-24" />
                          <span className="text-sm text-muted-foreground">seconds</span>
                        </div>
                      )}
                      {ac.kind === 'update_field' && (
                        <div className="grid gap-2 sm:grid-cols-4">
                          <Select value={ac.entity} onValueChange={v => updateAction(i, { entity: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="opportunity">Opportunity</SelectItem>
                              <SelectItem value="habit">Habit</SelectItem>
                              <SelectItem value="goal">Goal</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={ac.entityId} onChange={e => updateAction(i, { entityId: e.target.value })} placeholder="Entity ID" />
                          <Input value={ac.field} onChange={e => updateAction(i, { field: e.target.value })} placeholder="Field" />
                          <Input value={String(ac.value)} onChange={e => updateAction(i, { value: e.target.value })} placeholder="Value" />
                        </div>
                      )}
                      {ac.kind === 'add_xp' && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input type="number" value={ac.amount} onChange={e => updateAction(i, { amount: Number(e.target.value) })} placeholder="XP amount" />
                          <Input value={ac.reason} onChange={e => updateAction(i, { reason: e.target.value })} placeholder="Reason" />
                        </div>
                      )}
                      {ac.kind === 'condition' && (
                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                          <div className="flex flex-wrap gap-2">
                            <Input value={ac.field} onChange={e => updateAction(i, { field: e.target.value })} placeholder="Field" className="w-28" />
                            <Select value={ac.op} onValueChange={op => updateAction(i, { op })}>
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['eq', 'gt', 'lt', 'contains'].map(o => (
                                  <SelectItem key={o} value={o}>{o}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input value={String(ac.value)} onChange={e => updateAction(i, { value: e.target.value })} placeholder="Value" className="w-28" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Then: {ac.thenActions.length} action(s) / Else: {ac.elseActions.length} action(s)
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" /> {editingId ? 'Update' : 'Save'} automation
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetBuilder}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MY AUTOMATIONS TAB ============ */}
        <TabsContent value="automations" className="space-y-4 mt-4">
          {automations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No automations yet. Go to the Builder tab to create one.</p>
              </CardContent>
            </Card>
          ) : (
            automations.map(auto => (
              <Card key={auto.id} className={!auto.enabled ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={auto.enabled} onCheckedChange={() => toggleAutomation(auto.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{auto.name}</p>
                        <Badge variant={auto.enabled ? 'default' : 'secondary'} className="text-xs shrink-0">
                          {auto.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {auto.description && (
                        <p className="text-xs text-muted-foreground truncate">{auto.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleManualRun(auto)} title="Run now">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEditing(auto)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAutomation(auto.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedAuto(expandedAuto === auto.id ? null : auto.id)}
                      >
                        {expandedAuto === auto.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {expandedAuto === auto.id && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">TRIGGER</p>
                        <p className="text-sm">{describeTrigger(auto.trigger)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">ACTIONS ({auto.actions.length})</p>
                        <ul className="space-y-1">
                          {auto.actions.map((ac, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <ActionIcon kind={ac.kind} />
                              {describeAction(ac)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Created: {new Date(auto.createdAt).toLocaleDateString()}</span>
                        {auto.lastRunAt && <span>Last run: {new Date(auto.lastRunAt).toLocaleString()}</span>}
                        <span>Runs: {auto.runCount}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ============ TEMPLATES TAB ============ */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Automation Templates</CardTitle>
              <p className="text-sm text-muted-foreground">Use a template to quickly create an automation.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['productivity', 'gamification', 'notifications', 'wellness', 'integrations'] as const).map(category => {
                const items = AUTOMATION_TEMPLATES.filter(t => t.category === category)
                if (items.length === 0) return null
                return (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{category}</p>
                    {items.map(t => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border p-3 mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">{t.trigger.kind}</Badge>
                            <Badge variant="secondary" className="text-xs">{t.actions.length} action(s)</Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => applyTemplate(t)}>Use</Button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ LOG TAB ============ */}
        <TabsContent value="log" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Execution Log</CardTitle>
                <p className="text-sm text-muted-foreground">Recent automation runs.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshLog} className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </Button>
                {executionLog.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { clearExecutionLog(); refreshLog() }}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {executionLog.length === 0 ? (
                <div className="text-center py-8">
                  <ListOrdered className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No runs yet. Executions will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-auto">
                  {executionLog.map(entry => (
                    <li key={entry.id} className="flex items-center gap-3 rounded border p-3 text-sm">
                      {entry.success
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.automationName}</p>
                        <p className="text-xs text-muted-foreground">
                          Trigger: {entry.trigger} {entry.details && ` — ${entry.details}`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.at).toLocaleString()}
                      </span>
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
