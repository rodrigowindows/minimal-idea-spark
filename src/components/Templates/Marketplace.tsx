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
import { MARKETPLACE_TEMPLATES, TEMPLATE_CATEGORIES, createEmptyTemplate } from '@/lib/db/schema-templates'
import type { MarketplaceTemplate } from '@/lib/db/schema-templates'
import { listVariables, applyVariables, getDefaultValues } from '@/lib/templates/engine'
import { suggestTemplateValues } from '@/lib/templates/ai-fill'
import { useTemplates } from '@/hooks/useTemplates'
import {
  Search,
  FileText,
  Star,
  Download,
  Eye,
  Sparkles,
  Copy,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

type SortBy = 'popular' | 'rating' | 'newest'

export function TemplateMarketplace() {
  const { addTemplate, templates } = useTemplates()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortBy>('popular')
  const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null)
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const [aiFilling, setAiFilling] = useState(false)

  const installedIds = useMemo(() => {
    return new Set(templates.filter(t => t.id.startsWith('mkt-')).map(t => t.id))
  }, [templates])

  const filtered = useMemo(() => {
    let result = MARKETPLACE_TEMPLATES.filter(t => {
      const matchSearch = !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      const matchCat = category === 'all' || t.category === category
      return matchSearch && matchCat
    })

    if (sortBy === 'popular') result.sort((a, b) => b.downloads - a.downloads)
    else if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return result
  }, [search, category, sortBy])

  const handlePreview = (t: MarketplaceTemplate) => {
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

  const handleInstall = (mkt: MarketplaceTemplate) => {
    const tpl = createEmptyTemplate('mock-user-001')
    addTemplate({
      ...tpl,
      id: mkt.id,
      name: mkt.name,
      description: mkt.description,
      body: mkt.body,
      category: mkt.category,
      tags: mkt.tags,
      is_public: false,
      version: mkt.version,
      author_name: mkt.author_name,
    })
    toast.success(`"${mkt.name}" added to your library`)
  }

  const renderStars = (rating: number) => {
    const full = Math.floor(rating)
    const half = rating - full >= 0.5
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ))}
        {half && <Star className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />}
        <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </span>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Template Marketplace</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse community templates. {MARKETPLACE_TEMPLATES.length} templates available.
        </p>
      </header>

      {/* Search, filter, sort */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search marketplace..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant={category === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCategory('all')}>All</Button>
          {TEMPLATE_CATEGORIES.map(c => (
            <Button key={c} variant={category === c ? 'default' : 'outline'} size="sm" onClick={() => setCategory(c)}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Sort options */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Button variant={sortBy === 'popular' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('popular')} className="gap-1">
          <TrendingUp className="h-3.5 w-3.5" /> Popular
        </Button>
        <Button variant={sortBy === 'rating' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('rating')} className="gap-1">
          <Star className="h-3.5 w-3.5" /> Rating
        </Button>
        <Button variant={sortBy === 'newest' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('newest')} className="gap-1">
          Newest
        </Button>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No templates found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => {
            const isInstalled = installedIds.has(t.id)
            return (
              <Card key={t.id} className="hover:bg-muted/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <CardTitle className="text-base truncate">{t.name}</CardTitle>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                    <Badge variant="outline" className="text-xs">v{t.version}</Badge>
                    {t.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {t.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {renderStars(t.rating)}
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {t.downloads}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{t.author_name}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => handlePreview(t)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      disabled={isInstalled}
                      onClick={() => handleInstall(t)}
                    >
                      {isInstalled ? (
                        <>Installed</>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Install
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3">
              <span>by {previewTemplate?.author_name}</span>
              {previewTemplate && (
                <>
                  <span>{renderStars(previewTemplate.rating)}</span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {previewTemplate.downloads}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {previewTemplate.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>

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
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
            {previewTemplate && !installedIds.has(previewTemplate.id) && (
              <Button onClick={() => { handleInstall(previewTemplate); setPreviewTemplate(null) }} className="gap-2">
                <Download className="h-4 w-4" />
                Install to Library
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (!previewTemplate) return
                const result = applyVariables(previewTemplate.body, previewValues)
                navigator.clipboard.writeText(result)
                toast.success('Copied to clipboard')
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
