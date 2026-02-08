import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { getPriorityLevel } from '@/lib/notifications/priority-engine'
import type { AppNotification, NotificationType } from '@/lib/notifications/manager'
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

function NotificationItem({
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
  const PriorityIcon = config.icon
  const TypeIcon = TYPE_ICONS[n.type] ?? Bell

  return (
    <div
      className={cn(
        'flex items-start gap-3 border-b px-4 py-3 last:border-0 transition-colors',
        !n.read && 'bg-primary/5',
        n.archived && 'opacity-60'
      )}
    >
      {/* Type icon with priority indicator */}
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', config.bg)} aria-hidden="true">
        <TypeIcon className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('font-medium text-sm truncate', !n.read && 'font-semibold')}>{n.title}</p>
          {priority === 'critical' && (
            <PriorityIcon className="h-3.5 w-3.5 shrink-0 text-red-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(n.createdAt)}</span>
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            {n.type.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Notification actions">
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {!n.read && (
            <DropdownMenuItem onClick={() => onMarkRead(n.id)}>
              <Check className="mr-2 h-3.5 w-3.5" />Mark read
            </DropdownMenuItem>
          )}
          {!n.archived && (
            <DropdownMenuItem onClick={() => onArchive(n.id)}>
              <Archive className="mr-2 h-3.5 w-3.5" />Archive
            </DropdownMenuItem>
          )}
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
  )
}

function GroupedView({
  groups,
  onMarkRead,
  onArchive,
  onSnooze,
  onRemove,
}: {
  groups: ReturnType<typeof useNotifications>['groups']
  onMarkRead: (id: string) => void
  onArchive: (id: string) => void
  onSnooze: (id: string, minutes: number) => void
  onRemove: (id: string) => void
}) {
  if (groups.length === 0) {
    return <EmptyState message="No notifications" />
  }

  return (
    <>
      {groups.map(group => (
        <div key={group.key}>
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted/50 px-4 py-1.5 backdrop-blur-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {group.notifications.length}
            </Badge>
          </div>
          {group.notifications.map(n => (
            <NotificationItem
              key={n.id}
              n={n}
              onMarkRead={onMarkRead}
              onArchive={onArchive}
              onSnooze={onSnooze}
              onRemove={onRemove}
            />
          ))}
        </div>
      ))}
    </>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Inbox className="h-10 w-10 mb-2 opacity-40" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('all')
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat')
  const {
    active, archived, snoozed, groups, unreadCount,
    markRead, markAllRead, remove, archive, archiveRead, snooze,
  } = useNotifications()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode(v => v === 'flat' ? 'grouped' : 'flat')}
              title={viewMode === 'flat' ? 'Group by type' : 'Flat view'}
              aria-label={viewMode === 'flat' ? 'Group by type' : 'Flat view'}
            >
              {viewMode === 'flat' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={markAllRead}>
                  <CheckCheck className="mr-2 h-3.5 w-3.5" />Mark all read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={archiveRead}>
                  <Archive className="mr-2 h-3.5 w-3.5" />Archive all read
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="border-b px-2">
            <TabsList className="h-9 w-full bg-transparent gap-0">
              <TabsTrigger value="all" className="flex-1 text-xs data-[state=active]:bg-muted rounded-none data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary">
                All {active.length > 0 && `(${active.length})`}
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 text-xs data-[state=active]:bg-muted rounded-none data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="snoozed" className="flex-1 text-xs data-[state=active]:bg-muted rounded-none data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary" aria-label={`Snoozed${snoozed.length > 0 ? ` (${snoozed.length})` : ''}`}>
                <BellOff className="h-3 w-3 mr-1" aria-hidden="true" />
                {snoozed.length > 0 && `(${snoozed.length})`}
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex-1 text-xs data-[state=active]:bg-muted rounded-none data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary" aria-label={`Archived${archived.length > 0 ? ` (${archived.length})` : ''}`}>
                <Archive className="h-3 w-3 mr-1" aria-hidden="true" />
                {archived.length > 0 && `(${archived.length})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[400px]">
            <TabsContent value="all" className="m-0">
              {viewMode === 'grouped' ? (
                <GroupedView
                  groups={groups}
                  onMarkRead={markRead}
                  onArchive={archive}
                  onSnooze={snooze}
                  onRemove={remove}
                />
              ) : active.length === 0 ? (
                <EmptyState message="No notifications" />
              ) : (
                active.map(n => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onMarkRead={markRead}
                    onArchive={archive}
                    onSnooze={snooze}
                    onRemove={remove}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="unread" className="m-0">
              {active.filter(n => !n.read).length === 0 ? (
                <EmptyState message="All caught up!" />
              ) : (
                active.filter(n => !n.read).map(n => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onMarkRead={markRead}
                    onArchive={archive}
                    onSnooze={snooze}
                    onRemove={remove}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="snoozed" className="m-0">
              {snoozed.length === 0 ? (
                <EmptyState message="No snoozed notifications" />
              ) : (
                snoozed.map(n => (
                  <div key={n.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
                    <Clock className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                      {n.snoozedUntil && (
                        <p className="text-[10px] text-primary mt-1">
                          Snoozed until {new Date(n.snoozedUntil).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => remove(n.id)}
                      aria-label={`Delete: ${n.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="archived" className="m-0">
              {archived.length === 0 ? (
                <EmptyState message="No archived notifications" />
              ) : (
                archived.slice(0, 30).map(n => (
                  <div key={n.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-0 opacity-60">
                    <Archive className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => remove(n.id)}
                      aria-label={`Delete: ${n.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
