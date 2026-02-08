import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Mail,
  Calendar,
  Trophy,
  Target,
  Flame,
  Clock,
  Brain,
  Zap,
  Lightbulb,
  Settings2,
  Info,
  Bell,
  CheckCheck,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { getDigestNotifications, type NotificationType } from '@/lib/notifications/manager'
import { getPriorityLevel } from '@/lib/notifications/priority-engine'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  task_due: Target,
  goal_progress: Target,
  habit_reminder: Clock,
  achievement: Trophy,
  streak: Flame,
  weekly_review: Calendar,
  calendar_event: Calendar,
  deep_work: Brain,
  xp_milestone: Zap,
  system: Settings2,
  insight: Lightbulb,
  general: Info,
}

const PRIORITY_COLORS = {
  critical: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-muted-foreground bg-muted/30',
}

export function NotificationDigest() {
  const { preferences, markAllRead } = useNotifications()
  const digestItems = getDigestNotifications()

  if (preferences.digestFrequency === 'none' || digestItems.length === 0) {
    return null
  }

  const byType = digestItems.reduce((acc, n) => {
    const key = n.type
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {} as Record<string, typeof digestItems>)

  const unreadCount = digestItems.filter(n => !n.read).length
  const periodLabel = preferences.digestFrequency === 'daily' ? 'Today' : 'This Week'

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Notification Digest — {periodLabel}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {digestItems.length} notification{digestItems.length !== 1 ? 's' : ''} in your {preferences.digestFrequency} digest
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4">
            {Object.entries(byType).map(([type, items]) => {
              const TypeIcon = TYPE_ICONS[type as NotificationType] ?? Bell
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold capitalize">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="space-y-1 pl-6">
                    {items.slice(0, 5).map(n => {
                      const priority = getPriorityLevel(n)
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                            !n.read ? 'bg-primary/5 font-medium' : 'bg-muted/30'
                          )}
                        >
                          <span
                            className={cn(
                              'h-2 w-2 shrink-0 rounded-full',
                              PRIORITY_COLORS[priority]
                            )}
                          />
                          <span className="flex-1 truncate">{n.title}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )
                    })}
                    {items.length > 5 && (
                      <p className="text-xs text-muted-foreground pl-3">
                        +{items.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
