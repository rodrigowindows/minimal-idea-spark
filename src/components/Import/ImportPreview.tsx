import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ImportPreview as ImportPreviewData } from '@/lib/export/restore'

interface ImportPreviewProps {
  preview: ImportPreviewData
}

export function ImportPreview({ preview }: ImportPreviewProps) {
  if (!preview.valid) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium">Arquivo invÃ¡lido</p>
            <p className="text-sm text-muted-foreground">{preview.error ?? 'NÃ£o foi possÃ­vel validar o arquivo.'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const summary = preview.summary
  const conflicts = preview.conflicts ?? []

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Arquivo pronto para importar</span>
        </div>
        {summary && (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span className="text-muted-foreground">Oportunidades</span>
              <Badge variant="secondary">{summary.opportunities}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span className="text-muted-foreground">Journal</span>
              <Badge variant="secondary">{summary.journalEntries}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span className="text-muted-foreground">Metas</span>
              <Badge variant="secondary">{summary.goals}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <span className="text-muted-foreground">Notas</span>
              <Badge variant="secondary">{summary.notes}</Badge>
            </div>
          </div>
        )}
        {conflicts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Conflitos detectados</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {conflicts.map((c) => (
                <li key={c.key}>
                  {c.key}: {c.duplicateItems} duplicados, {c.newItems} novos
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
