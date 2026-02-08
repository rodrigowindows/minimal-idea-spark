import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { listVariables, applyVariables, getDefaultValues, validateTemplate, inferVariableMetadata } from '@/lib/templates/engine'
import { suggestTemplateValues } from '@/lib/templates/ai-fill'
import { TEMPLATE_CATEGORIES, createEmptyTemplate } from '@/lib/db/schema-templates'
import type { Template, TemplateCategory } from '@/lib/db/schema-templates'
import { useTemplates } from '@/hooks/useTemplates'
import { Sparkles, Save, Eye, Code, Plus, ArrowLeft, History, Tag, X, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateEditorProps {
  editingTemplate?: Template | null
  onBack?: () => void
}

export function TemplateEditor({ editingTemplate, onBack }: TemplateEditorProps) {
  const { addTemplate, updateTemplate, saveNewVersion } = useTemplates()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('# {{title}}\nDate: {{date}}\n\n{{content}}')
  const [category, setCategory] = useState<TemplateCategory>('other')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const [version, setVersion] = useState(1)
  const [aiFilling, setAiFilling] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  // Load editing template data
  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name)
      setDescription(editingTemplate.description ?? '')
      setBody(editingTemplate.body)
      setCategory(editingTemplate.category)
      setTags(editingTemplate.tags)
      setIsPublic(editingTemplate.is_public)
      setVersion(editingTemplate.version)
    }
  }, [editingTemplate])

  const vars = listVariables(body)
  const variableMetadata = inferVariableMetadata(vars)
  const defaults = getDefaultValues(vars)
  const values = { ...defaults, ...previewValues }
  const preview = applyVariables(body, values)
  const validation = validateTemplate(body)

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }
    if (!validation.valid) {
      toast.error(validation.errors[0])
      return
    }

    if (editingTemplate) {
      updateTemplate(editingTemplate.id, {
        name,
        description: description || null,
        body,
        category,
        tags,
        is_public: isPublic,
        variables: variableMetadata,
      })
      toast.success('Template updated')
    } else {
      const tpl = createEmptyTemplate('mock-user-001')
      addTemplate({
        ...tpl,
        name,
        description: description || null,
        body,
        category,
        tags,
        is_public: isPublic,
        variables: variableMetadata,
      })
      toast.success('Template saved')
    }

    if (!editingTemplate) {
      setName('')
      setDescription('')
      setBody('# {{title}}\nDate: {{date}}\n\n{{content}}')
      setCategory('other')
      setTags([])
      setIsPublic(false)
      setPreviewValues({})
      setVersion(1)
    }
  }

  const handleSaveNewVersion = () => {
    if (!editingTemplate) return
    saveNewVersion(editingTemplate.id, body)
    setVersion(v => v + 1)
    toast.success(`Saved as v${version + 1}`)
  }

  const handleAiFill = async () => {
    setAiFilling(true)
    try {
      const suggested = await suggestTemplateValues(vars, {
        templateName: name,
        category,
      })
      setPreviewValues(suggested)
    } finally {
      setAiFilling(false)
    }
  }

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(preview)
    toast.success('Preview copied to clipboard')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use {'{{variable}}'} syntax for dynamic fields
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Editor' : 'Preview'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor panel */}
        <Card className={showPreview ? 'hidden lg:block' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Weekly Standup" />
            </div>

            <div>
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of this template" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as TemplateCategory)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TEMPLATE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                    className="rounded border-input"
                  />
                  Share in Marketplace
                </label>
              </div>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Add tag..."
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addTag}>
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Body (use {'{{variable}}'} syntax)</Label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={12}
                className="font-mono text-sm mt-1"
                placeholder="# {{title}}&#10;Date: {{date}}&#10;&#10;{{content}}"
              />
              {!validation.valid && (
                <p className="text-xs text-destructive mt-1">{validation.errors[0]}</p>
              )}
            </div>

            {/* Detected variables */}
            {vars.length > 0 && (
              <div>
                <Label className="text-muted-foreground">
                  Detected variables ({vars.length})
                </Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {vars.map(v => (
                    <Badge key={v} variant="outline" className="font-mono text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <Separator />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">v{version}</Badge>
                {editingTemplate && editingTemplate.versions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="gap-1"
                  >
                    <History className="h-4 w-4" />
                    History ({editingTemplate.versions.length})
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {editingTemplate && (
                  <Button variant="outline" size="sm" onClick={handleSaveNewVersion} className="gap-2">
                    <Save className="h-4 w-4" /> New Version
                  </Button>
                )}
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  {editingTemplate ? 'Update' : 'Save Template'}
                </Button>
              </div>
            </div>

            {/* Version history */}
            {showVersionHistory && editingTemplate && editingTemplate.versions.length > 0 && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Version History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-2">
                      {[...editingTemplate.versions].reverse().map(v => (
                        <div key={v.version} className="flex items-center justify-between p-2 rounded border bg-background">
                          <div>
                            <span className="font-mono text-sm">v{v.version}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(v.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBody(v.body)}
                          >
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Preview panel */}
        <Card className={!showPreview ? 'hidden lg:block' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Preview</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={aiFilling || vars.length === 0}
                  onClick={handleAiFill}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {aiFilling ? 'Filling...' : 'AI Fill'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopyPreview} className="gap-2">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Variable inputs */}
            {vars.length > 0 && (
              <div className="space-y-3">
                <Label>Fill variables</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {variableMetadata.map(v => (
                    <div key={v.key}>
                      <Label className="text-xs text-muted-foreground">{v.label}</Label>
                      <Input
                        type={v.type === 'date' ? 'date' : v.type === 'number' ? 'number' : 'text'}
                        placeholder={v.key}
                        value={previewValues[v.key] ?? ''}
                        onChange={e => setPreviewValues(p => ({ ...p, [v.key]: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Rendered preview */}
            <div>
              <Label>Rendered output</Label>
              <ScrollArea className="mt-2 max-h-[500px]">
                <pre className="rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                  {preview}
                </pre>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
