import { useAppContext } from '@/contexts/AppContext'
import { PomodoroTimer } from './PomodoroTimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Target, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DeepWorkOverlay() {
  const { deepWorkMode, currentOpportunity, toggleDeepWorkMode, setCurrentOpportunity } =
    useAppContext()

  if (!deepWorkMode) return null

  const handleClose = () => {
    toggleDeepWorkMode()
    setCurrentOpportunity(null)
  }

  const priorityStars = currentOpportunity
    ? Math.min(Math.max(Math.round(currentOpportunity.priority / 2), 1), 5)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-50" />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="absolute right-4 top-4 z-10 rounded-full"
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Exit Deep Work Mode</span>
      </Button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Current task */}
        {currentOpportunity ? (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Current Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                {currentOpportunity.title}
              </h2>

              {currentOpportunity.description && (
                <p className="text-sm text-muted-foreground">
                  {currentOpportunity.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="capitalize">
                  {currentOpportunity.type}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {currentOpportunity.status}
                </Badge>
              </div>

              {/* Priority stars */}
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs font-medium text-muted-foreground">
                  Priority
                </span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < priorityStars
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Deep Work Mode</h2>
            <p className="mt-2 text-muted-foreground">
              Focus on your most important task without distractions.
            </p>
          </div>
        )}

        {/* Pomodoro Timer */}
        <PomodoroTimer />

        {/* Quick exit hint */}
        <p className="text-xs text-muted-foreground">
          Press{' '}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            Esc
          </kbd>{' '}
          or click the X to exit
        </p>
      </div>
    </div>
  )
}
