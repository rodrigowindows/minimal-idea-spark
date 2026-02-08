import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { TEMPLATE_CATEGORIES } from '@/lib/db/schema-templates'
import type { Template, TemplateCategory } from '@/lib/db/schema-templates'
import { listVariables, applyVariables, getDefaultValues } from '@/lib/templates/engine'
import { suggestTemplateValues } from '@/lib/templates/ai-fill'
import { useTemplates } from '@/hooks/useTemplates'
import {
  Search,
  Plus,
  FileText,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Star,
  Globe,
  Lock,
  Sparkles,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

interface TemplatesLibraryProps {
  onEdit?: (template: Template) => void
  onCreateNew?: () => void
}

export function TemplatesLibrary({ onEdit, onCreateNew }: TemplatesLibraryProps) {
  const { templates, deleteTemplate, duplicateTemplate, togglePublic } = useTemplates()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const [aiFilling, setAiFilling] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchSearch = !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      const matchCat = category === 'all' || t.category === category
      return matchSearch && matchCat
    })
  }, [templates, search, category])

  const handlePreview = (t: Template) => {
    setPreviewTemplate(t)
    setPreviewValues(getDefaultValues(listVariables(t.body)))
  }

  const handleAiFill = async () => {
    if (!previewTemplate) return
    setAiFilling(true)
    try {
      const vars = listVariables(previewTemplate.body)
      const suggested = await suggestTemplateValues(vars, {
        templateName: previewTemplate.name,
        category: previewTemplate.category,
      })
      setPreviewValues(suggested)
    } finally {
      setAiFilling(false)
    }
  }

  const handleUseTemplate = () => {
    if (!previewTemplate) return
    const result = applyVariables(previewTemplate.body, previewValues)
    navigator.clipboard.writeText(result)
    toast.success('Template content copied to clipboard')
    setPreviewTemplate(null)
  }

  const handleDelete = (id: string) => {
    deleteTemplate(id)
    setDeleteConfirm(null)
    toast.success('Template deleted')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Templates</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? 's' : ''} in your library
          </p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        )}
      </header>

      {/* Search and filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates, tags..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={category === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory('all')}
          >
            All
          </Button>
          {TEMPLATE_CATEGORIES.map(c => (
            <Button
              key={c}
              variant={category === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No templates found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {templates.length === 0
                ? 'Create your first template or browse the Marketplace.'
                : 'Try adjusting your search or filter.'}
            </p>
            {onCreateNew && templates.length === 0 && (
              <Button onClick={onCreateNew} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <Card key={t.id} className="group hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <CardTitle className="text-base truncate">{t.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.is_public ? (
                      <Globe className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                  <Badge variant="outline" className="text-xs">v{t.version}</Badge>
                  {t.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                  {t.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">+{t.tags.length - 2}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {t.description || 'No description'}
                </p>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handlePreview(t)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Use
                  </Button>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateTemplate(t.id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublic(t.id)}
                    title={t.is_public ? 'Make private' : 'Share publicly'}
                  >
                    {t.is_public ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview / Use dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Fill in the variables and use this template
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Variable inputs */}
                {(() => {
                  const vars = listVariables(previewTemplate.body)
                  if (vars.length === 0) return null
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Variables ({vars.length})</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={aiFilling}
                          onClick={handleAiFill}
                          className="gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          {aiFilling ? 'Filling...' : 'AI Fill'}
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {vars.map(v => (
                          <div key={v}>
                            <label className="text-xs text-muted-foreground capitalize">{v.replace(/_/g, ' ')}</label>
                            <Input
                              placeholder={v}
                              value={previewValues[v] ?? ''}
                              onChange={e => setPreviewValues(p => ({ ...p, [v]: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Preview */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Preview</h4>
                  <pre className="rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {applyVariables(previewTemplate.body, previewValues)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Cancel</Button>
            <Button onClick={handleUseTemplate} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
