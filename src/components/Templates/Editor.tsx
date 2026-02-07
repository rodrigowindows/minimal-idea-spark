import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { listVariables, applyVariables, getDefaultValues } from '@/lib/templates/engine'
import { suggestTemplateValues } from '@/lib/templates/ai-fill'
import { TEMPLATE_CATEGORIES } from '@/lib/db/schema-templates'
import { Sparkles, Save } from 'lucide-react'

export function TemplateEditor() {
  const [name, setName] = useState('')
  const [body, setBody] = useState('# {{title}}\nDate: {{date}}\n\n{{content}}')
  const [category, setCategory] = useState(TEMPLATE_CATEGORIES[0])
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const [version, setVersion] = useState(1)
  const [aiFilling, setAiFilling] = useState(false)

  const vars = listVariables(body)
  const defaults = getDefaultValues(vars)
  const values = { ...defaults, ...previewValues }
  const preview = applyVariables(body, values)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Template Editor</h1>
      <Card>
        <CardHeader>
          <CardTitle>New template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" />
          </div>
          <div>
            <Label>Category</Label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Body (use {{variable}})</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="font-mono text-sm" />
          </div>
          {vars.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <Label>Preview variables</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={aiFilling}
                  onClick={async () => {
                    setAiFilling(true)
                    const suggested = await suggestTemplateValues(vars)
                    setPreviewValues(suggested)
                    setAiFilling(false)
                  }}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {aiFilling ? 'Filling…' : 'Fill with AI'}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {vars.map(v => (
                  <Input key={v} placeholder={v} value={previewValues[v] ?? ''} onChange={e => setPreviewValues(p => ({ ...p, [v]: e.target.value }))} className="w-32" />
                ))}
              </div>
            </div>
          )}
          {vars.length > 0 && (
            <div>
              <Label>Preview</Label>
              <pre className="mt-2 rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">{preview}</pre>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">v{version}</Badge>
            <Button onClick={() => setVersion(v => v + 1)} variant="outline" size="sm" className="gap-2">
              <Save className="h-4 w-4" /> Save as new version
            </Button>
            <Button>Save template</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
