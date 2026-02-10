import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, RotateCcw, FileText } from 'lucide-react'
import type { ImportResult } from '@/lib/import/types'

interface ImportResultCardProps {
  result: ImportResult
  onRollback: () => void
  onNewImport: () => void
  canRollback: boolean
  rollingBack: boolean
}

export function ImportResultCard({
  result,
  onRollback,
  onNewImport,
  canRollback,
  rollingBack,
}: ImportResultCardProps) {
  const hasErrors = result.errors.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasErrors ? (
            <XCircle className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          Import Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <span className="text-sm text-muted-foreground">Created</span>
            <Badge variant="secondary">{result.created}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <span className="text-sm text-muted-foreground">Skipped</span>
            <Badge variant="outline">{result.skipped}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <span className="text-sm text-muted-foreground">Errors</span>
            <Badge variant={result.errors.length > 0 ? 'destructive' : 'outline'}>
              {result.errors.length}
            </Badge>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">Errors:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {result.errors.map((err, i) => (
                <li key={i} className="flex items-start gap-1">
                  <XCircle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {canRollback && result.created > 0 && (
            <Button
              variant="outline"
              onClick={onRollback}
              disabled={rollingBack}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {rollingBack ? 'Rolling back...' : 'Undo import'}
            </Button>
          )}
          <Button onClick={onNewImport}>
            <FileText className="mr-2 h-4 w-4" />
            New import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
