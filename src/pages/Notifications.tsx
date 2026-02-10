import { useState, useMemo, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Archive,
  Clock,
  MoreHorizontal,
  AlertCircle,
  ArrowUp,
  Minus,
  ArrowDown,
  Inbox,
  BellOff,
  Target,
  Flame,
  Trophy,
  CalendarDays,
  Brain,
  Zap,
  Lightbulb,
  Settings2,
  Info,
  Search,
  Filter,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { getPriorityLevel } from '@/lib/notifications/priority-engine'
import type { AppNotification, NotificationType } from '@/lib/notifications/manager'
import { NotificationDigest } from '@/components/NotificationDigest'
import { VirtualList } from '@/components/VirtualList'
import { EmptyState } from '@/components/EmptyState'
import { SearchEmptyState } from '@/components/SearchEmptyState'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  task_due: Target,
  goal_progress: Target,
  habit_reminder: Clock,
  achievement: Trophy,
  streak: Flame,
  weekly_review: CalendarDays,
  calendar_event: CalendarDays,
  deep_work: Brain,
  xp_milestone: Zap,
  system: Settings2,
  insight: Lightbulb,
  general: Info,
}

const PRIORITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
  high: { icon: ArrowUp, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'High' },
  medium: { icon: Minus, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Medium' },
  low: { icon: ArrowDown, color: 'text-muted-foreground', bg: 'bg-muted/30', label: 'Low' },
}

const SNOOZE_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '3 hours', minutes: 180 },
  { label: 'Tomorrow', minutes: 60 * 24 },
]

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const NotificationRow = memo(function NotificationRow({
  n,
  onMarkRead,
  onArchive,
  onSnooze,
  onRemove,
}: {
  n: AppNotification
  onMarkRead: (id: string) => void
  onArchive: (id: string) => void
  onSnooze: (id: string, minutes: number) => void
  onRemove: (id: string) => void
}) {
  const priority = getPriorityLevel(n)
  const config = PRIORITY_CONFIG[priority]
  const TypeIcon = TYPE_ICONS[n.type] ?? Bell

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border p-4 transition-colors',
        !n.read && 'bg-primary/5 border-primary/20',
        n.archived && 'opacity-60'
      )}
    >
      <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full', config.bg)}>
        <TypeIcon className={cn('h-5 w-5', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={cn('font-medium text-sm', !n.read && 'font-semibold')}>{n.title}</p>
          {priority === 'critical' && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1">Critical</Badge>
          )}
          {priority === 'high' && (
            <Badge variant="default" className="text-[10px] h-4 px-1 bg-orange-500">High</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{n.body}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground">{formatTimeAgo(n.createdAt)}</span>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
            {n.type.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="secondary" className={cn('h-4 px-1.5 text-[9px]', config.color)}>
            {config.label}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!n.read && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMarkRead(n.id)} title="Mark read">
            <Check className="h-4 w-4" />
          </Button>
        )}
        {!n.archived && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onArchive(n.id)} title="Archive">
            <Archive className="h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {SNOOZE_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt.minutes} onClick={() => onSnooze(n.id, opt.minutes)}>
                <Clock className="mr-2 h-3.5 w-3.5" />Snooze {opt.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onRemove(n.id)} className="text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
})

export function NotificationsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const {
    active, archived, snoozed, groups, unreadCount,
    markRead, markAllRead, remove, archive, archiveRead, snooze,
    preferences,
  } = useNotifications()

  const filteredActive = useMemo(() => active.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    }
    return true
  }), [active, filterType, searchQuery])

  const unread = useMemo(() => filteredActive.filter(n => !n.read), [filteredActive])

  const handleMarkRead = useCallback((id: string) => markRead(id), [markRead])
  const handleArchive = useCallback((id: string) => archive(id), [archive])
  const handleSnooze = useCallback((id: string, minutes: number) => snooze(id, minutes), [snooze])
  const handleRemove = useCallback((id: string) => remove(id), [remove])

  const typeOptions = [
    'all', 'task_due', 'goal_progress', 'habit_reminder', 'achievement',
    'streak', 'weekly_review', 'calendar_event', 'deep_work', 'xp_milestone',
    'system', 'insight', 'general'
  ]

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={archiveRead}>
              <Archive className="h-3.5 w-3.5" />
              Archive read
            </Button>
          </div>
        </div>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{active.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{unreadCount}</p>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{snoozed.length}</p>
            <p className="text-xs text-muted-foreground">Snoozed</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{archived.length}</p>
            <p className="text-xs text-muted-foreground">Archived</p>
          </CardContent>
        </Card>
      </div>

      {/* Digest */}
      {preferences.digestFrequency !== 'none' && (
        <div className="mb-6">
          <NotificationDigest />
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {filterType === 'all' ? 'All types' : filterType.replace(/_/g, ' ')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
            {typeOptions.map(t => (
              <DropdownMenuItem key={t} onClick={() => setFilterType(t)}>
                <span className="capitalize">{t === 'all' ? 'All types' : t.replace(/_/g, ' ')}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All {filteredActive.length > 0 && `(${filteredActive.length})`}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unread.length > 0 && `(${unread.length})`}
          </TabsTrigger>
          <TabsTrigger value="grouped">
            Grouped {groups.length > 0 && `(${groups.length})`}
          </TabsTrigger>
          <TabsTrigger value="snoozed">
            <BellOff className="h-3.5 w-3.5 mr-1" />
            Snoozed {snoozed.length > 0 && `(${snoozed.length})`}
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="h-3.5 w-3.5 mr-1" />
            Archived {archived.length > 0 && `(${archived.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {filteredActive.length === 0 ? (
            (searchQuery || filterType !== 'all') ? (
              <SearchEmptyState
                query={searchQuery || filterType}
                onClearFilters={() => { setSearchQuery(''); setFilterType('all') }}
              />
            ) : (
              <EmptyState icon={Inbox} title={t('emptyStates.notifications')} />
            )
          ) : filteredActive.length > 30 ? (
            <VirtualList
              items={filteredActive}
              itemHeight={120}
              className="h-[calc(100vh-420px)]"
              getItemKey={(n) => n.id}
              renderItem={(n) => (
                <NotificationRow
                  n={n}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onSnooze={handleSnooze}
                  onRemove={handleRemove}
                />
              )}
            />
          ) : (
            <div className="space-y-2">
              {filteredActive.map(n => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onSnooze={handleSnooze}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread">
          {unread.length === 0 ? (
            <EmptyState icon={CheckCheck} title={t('emptyStates.notificationsAllRead')} />
          ) : unread.length > 30 ? (
            <VirtualList
              items={unread}
              itemHeight={120}
              className="h-[calc(100vh-420px)]"
              getItemKey={(n) => n.id}
              renderItem={(n) => (
                <NotificationRow
                  n={n}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onSnooze={handleSnooze}
                  onRemove={handleRemove}
                />
              )}
            />
          ) : (
            <div className="space-y-2">
              {unread.map(n => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onSnooze={handleSnooze}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grouped">
          {groups.length === 0 ? (
            <EmptyState icon={Inbox} title={t('emptyStates.notificationsGrouped')} />
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <Card key={group.key} className="rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {group.label}
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {group.notifications.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.notifications.map(n => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        onMarkRead={handleMarkRead}
                        onArchive={handleArchive}
                        onSnooze={handleSnooze}
                        onRemove={handleRemove}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="snoozed">
          {snoozed.length === 0 ? (
            <EmptyState icon={BellOff} title={t('emptyStates.notificationsSnoozed')} />
          ) : (
            <div className="space-y-2">
              {snoozed.map(n => (
                <div key={n.id} className="flex items-start gap-4 rounded-xl border p-4">
                  <Clock className="mt-1 h-5 w-5 shrink-0 text-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    {n.snoozedUntil && (
                      <p className="text-xs text-primary mt-1">
                        Snoozed until {new Date(n.snoozedUntil).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemove(n.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {archived.length === 0 ? (
            <EmptyState icon={Archive} title={t('emptyStates.notificationsArchived')} />
          ) : (
            <div className="space-y-2">
              {archived.slice(0, 50).map(n => (
                <div key={n.id} className="flex items-start gap-4 rounded-xl border p-4 opacity-60">
                  <Archive className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(n.createdAt)}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemove(n.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

