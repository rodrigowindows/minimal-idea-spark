import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'
import { parseMarkdownToItems, parseNotionCsv, type ParsedItem } from '@/lib/import/markdown-parser'
import { useLocalData } from '@/hooks/useLocalData'
import { FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'

export function ImportPage() {
  const { t } = useTranslation()
  const { addOpportunity } = useLocalData()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedItem[]>([])
  const [importing, setImporting] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const ext = f.name.toLowerCase()
      const items = ext.endsWith('.csv')
        ? parseNotionCsv(text)
        : parseMarkdownToItems(text)
      setPreview(items)
    }
    reader.readAsText(f)
  }, [])

  const handleImport = useCallback(() => {
    if (preview.length === 0) return
    setImporting(true)
    try {
      for (const item of preview) {
        addOpportunity({
          title: item.title,
          description: item.content || null,
          domain_id: null,
          type: 'action',
          status: 'backlog',
          priority: 5,
          strategic_value: 5,
        })
      }
      toast.success(`${preview.length} items imported.`)
      setPreview([])
      setFile(null)
    } finally {
      setImporting(false)
    }
  }, [preview, addOpportunity])

  return (
    <PageContent>
      <PageHeader
        title="Import"
        description="Import opportunities from Markdown or Notion CSV export."
        breadcrumb={[
          { label: t('nav.dashboard'), href: '/' },
          { label: 'Import' },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload file
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Markdown (.md) or CSV (.csv)</Label>
            <input
              type="file"
              accept=".md,.csv,.txt"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm"
            />
          </div>
          {preview.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {preview.length} item(s) to import:
              </p>
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                {preview.slice(0, 50).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 py-1">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{item.title}</span>
                    {item.content && (
                      <span className="truncate text-muted-foreground">— {item.content.slice(0, 40)}...</span>
                    )}
                  </li>
                ))}
                {preview.length > 50 && (
                  <li className="py-1 text-muted-foreground">... and {preview.length - 50} more</li>
                )}
              </ul>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${preview.length} items`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
