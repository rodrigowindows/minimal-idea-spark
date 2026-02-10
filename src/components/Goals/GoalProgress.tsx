import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { getScoreColor } from '@/lib/goals/goal-service'

interface GoalProgressProps {
  value: number
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function GoalProgress({ value, label, size = 'md', className }: GoalProgressProps) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn('font-semibold', getScoreColor(value))}>{value}%</span>
        </div>
      )}
      <Progress value={value} className={height} />
    </div>
  )
}
