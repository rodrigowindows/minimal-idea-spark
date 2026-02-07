import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { listVariables, applyVariables, getDefaultValues } from '@/lib/templates/engine'
import { TEMPLATE_CATEGORIES } from '@/lib/db/schema-templates'

export function TemplateEditor() {
  const [name, setName] = useState('')
  const [body, setBody] = useState('# {{title}}\nDate: {{date}}\n\n{{content}}')
  const [category, setCategory] = useState(TEMPLATE_CATEGORIES[0])
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})

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
              <Label>Preview variables</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {vars.map(v => (
                  <Input
                    key={v}
                    placeholder={v}
                    value={previewValues[v] ?? ''}
                    onChange={e => setPreviewValues(p => ({ ...p, [v]: e.target.value }))}
                    className="w-32"
                  />
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
          <Button>Save template</Button>
        </CardContent>
      </Card>
    </div>
  )
}
