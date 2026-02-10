import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'
import { ExternalImportPreview } from '@/components/Import/ExternalImportPreview'
import { ImportResultCard } from '@/components/Import/ImportResultCard'
import { parseMarkdownFile, parseNotionCsvToImportItems } from '@/lib/import/markdown-parser'
import { parseNotionHtml } from '@/lib/import/notion-parser'
import { parseObsidianFile, parseObsidianVault } from '@/lib/import/obsidian-parser'
import { detectDuplicates } from '@/lib/import/duplicate-detector'
import type {
  ImportedItem,
  ImportResult,
  ImportOptions,
  ImportTargetType,
  ImportSource,
} from '@/lib/import/types'
import { DEFAULT_IMPORT_OPTIONS } from '@/lib/import/types'
import { useLocalData } from '@/hooks/useLocalData'
import {
  Upload,
  FileText,
  FileCode,
  FolderOpen,
  Database,
} from 'lucide-react'
import { toast } from 'sonner'

const KNOWLEDGE_STORAGE_KEY = 'lifeos_knowledge_base'

type Step = 'upload' | 'preview' | 'result'

export function ImportPage() {
  const { t } = useTranslation()
  const { addOpportunity, addDailyLog, opportunities, domains } = useLocalData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [activeTab, setActiveTab] = useState<string>('markdown')
  const [items, setItems] = useState<ImportedItem[]>([])
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [canRollback, setCanRollback] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)
  const [createdIds, setCreatedIds] = useState<{ type: ImportTargetType; id: string }[]>([])

  const detectSource = (fileName: string): ImportSource => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.csv')) return 'notion-csv'
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'notion-html'
    return 'markdown'
  }

  const processFiles = useCallback(
    (fileList: FileList) => {
      const files = Array.from(fileList)
      if (files.length === 0) return

      const readers: Promise<ImportedItem[]>[] = files.map(
        (file) =>
          new Promise<ImportedItem[]>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              const text = String(reader.result ?? '')
              const source = detectSource(file.name)

              let parsed: ImportedItem[] = []
              try {
                if (source === 'notion-csv') {
                  parsed = parseNotionCsvToImportItems(text)
                } else if (source === 'notion-html') {
                  parsed = parseNotionHtml(text, file.name)
                } else {
                  // Determine if obsidian based on tab or file count
                  if (activeTab === 'obsidian') {
                    parsed = parseObsidianFile(text, file.name)
                  } else {
                    parsed = parseMarkdownFile(text, 'markdown', file.name)
                  }
                }
              } catch (err) {
                console.error(`Error parsing ${file.name}:`, err)
                toast.error(`Failed to parse ${file.name}`)
              }

              // Apply default target type from options
              parsed = parsed.map((item) => ({
                ...item,
                targetType: options.defaultTarget,
              }))

              resolve(parsed)
            }
            reader.readAsText(file)
          })
      )

      Promise.all(readers).then((results) => {
        let allItems = results.flat()

        // Detect duplicates against existing opportunities
        allItems = detectDuplicates(allItems, opportunities)

        // Auto-skip duplicates if strategy is 'skip'
        if (options.duplicateStrategy === 'skip') {
          allItems = allItems.map((item) =>
            item.isDuplicate ? { ...item, skipped: true } : item
          )
        }

        setItems(allItems)
        if (allItems.length > 0) {
          setStep('preview')
        } else {
          toast.error('No items found in the uploaded files.')
        }
      })
    },
    [opportunities, options, activeTab]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
      }
    },
    [processFiles]
  )

  const handleFolderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files
      if (!fileList || fileList.length === 0) return

      // For folder uploads, read all files and use vault parser
      const files = Array.from(fileList)
      const mdFiles = files.filter(
        (f) => f.name.toLowerCase().endsWith('.md') && !f.name.startsWith('.')
      )

      if (mdFiles.length === 0) {
        toast.error('No .md files found in the selected folder.')
        return
      }

      const readers = mdFiles.map(
        (file) =>
          new Promise<{ name: string; content: string }>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                name: file.webkitRelativePath || file.name,
                content: String(reader.result ?? ''),
              })
            }
            reader.readAsText(file)
          })
      )

      Promise.all(readers).then((fileContents) => {
        let parsed = parseObsidianVault(fileContents)

        // Apply default target type
        parsed = parsed.map((item) => ({
          ...item,
          targetType: options.defaultTarget,
        }))

        // Detect duplicates
        parsed = detectDuplicates(parsed, opportunities)

        if (options.duplicateStrategy === 'skip') {
          parsed = parsed.map((item) =>
            item.isDuplicate ? { ...item, skipped: true } : item
          )
        }

        setItems(parsed)
        if (parsed.length > 0) {
          setStep('preview')
        } else {
          toast.error('No items could be parsed from the vault.')
        }
      })
    },
    [opportunities, options]
  )

  const handleImport = useCallback(() => {
    const activeItems = items.filter((i) => !i.skipped)
    if (activeItems.length === 0) return

    setImporting(true)
    const importResult: ImportResult = { created: 0, skipped: 0, errors: [], createdIds: [] }
    const trackIds: { type: ImportTargetType; id: string }[] = []

    try {
      for (const item of items) {
        if (item.skipped) {
          importResult.skipped++
          continue
        }

        try {
          if (item.targetType === 'opportunity') {
            const opp = addOpportunity({
              title: item.title,
              description: item.content || null,
              domain_id: options.domainId,
              type: 'action',
              status: options.importAsDraft ? 'backlog' : 'doing',
              priority: 5,
              strategic_value: 5,
            })
            importResult.created++
            importResult.createdIds.push(opp.id)
            trackIds.push({ type: 'opportunity', id: opp.id })
          } else if (item.targetType === 'journal') {
            const log = addDailyLog({
              content: `**${item.title}**\n\n${item.content}`,
              mood: null,
              energy_level: null,
              log_date: item.date || new Date().toISOString().split('T')[0],
            })
            importResult.created++
            importResult.createdIds.push(log.id)
            trackIds.push({ type: 'journal', id: log.id })
          } else if (item.targetType === 'knowledge') {
            // Store in localStorage knowledge base
            const knowledgeId = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const entry = {
              id: knowledgeId,
              user_id: 'mock-user-001',
              source_title: item.title,
              content_chunk: item.content,
              created_at: new Date().toISOString(),
            }
            const existing = JSON.parse(
              localStorage.getItem(KNOWLEDGE_STORAGE_KEY) || '[]'
            )
            existing.push(entry)
            localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(existing))
            importResult.created++
            importResult.createdIds.push(knowledgeId)
            trackIds.push({ type: 'knowledge', id: knowledgeId })
          }
        } catch (err) {
          importResult.errors.push(
            `Failed to import "${item.title}": ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

      setCreatedIds(trackIds)
      setCanRollback(true)
      setResult(importResult)
      setStep('result')

      if (importResult.created > 0) {
        toast.success(`${importResult.created} items imported successfully.`)
      }
    } finally {
      setImporting(false)
    }
  }, [items, options, addOpportunity, addDailyLog])

  const handleRollback = useCallback(() => {
    if (!canRollback || createdIds.length === 0) return

    setRollingBack(true)
    try {
      // Rollback by removing created items from localStorage
      for (const { type, id } of createdIds) {
        if (type === 'opportunity') {
          const key = 'lifeos_opportunities'
          const data = JSON.parse(localStorage.getItem(key) || '[]')
          const filtered = data.filter((item: { id: string }) => item.id !== id)
          localStorage.setItem(key, JSON.stringify(filtered))
        } else if (type === 'journal') {
          const key = 'lifeos_daily_logs'
          const data = JSON.parse(localStorage.getItem(key) || '[]')
          const filtered = data.filter((item: { id: string }) => item.id !== id)
          localStorage.setItem(key, JSON.stringify(filtered))
        } else if (type === 'knowledge') {
          const data = JSON.parse(
            localStorage.getItem(KNOWLEDGE_STORAGE_KEY) || '[]'
          )
          const filtered = data.filter((item: { id: string }) => item.id !== id)
          localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(filtered))
        }
      }

      setCanRollback(false)
      toast.success('Import rolled back. Reload the page to see updated data.')
    } finally {
      setRollingBack(false)
    }
  }, [canRollback, createdIds])

  const handleNewImport = () => {
    setStep('upload')
    setItems([])
    setResult(null)
    setCanRollback(false)
    setCreatedIds([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  return (
    <PageContent>
      <PageHeader
        title="Import"
        description="Import notes from Markdown, Notion, or Obsidian into your workspace."
        breadcrumb={[
          { label: t('nav.dashboard'), href: '/' },
          { label: 'Import' },
        ]}
      />

      {step === 'upload' && (
        <div className="space-y-6">
          {/* Import options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Import Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default import type</Label>
                  <Select
                    value={options.defaultTarget}
                    onValueChange={(v) =>
                      setOptions((prev) => ({
                        ...prev,
                        defaultTarget: v as ImportTargetType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opportunity">Opportunity</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                      <SelectItem value="knowledge">Knowledge Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign to domain</Label>
                  <Select
                    value={options.domainId ?? 'none'}
                    onValueChange={(v) =>
                      setOptions((prev) => ({
                        ...prev,
                        domainId: v === 'none' ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No domain</SelectItem>
                      {domains.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duplicate handling</Label>
                  <Select
                    value={options.duplicateStrategy}
                    onValueChange={(v) =>
                      setOptions((prev) => ({
                        ...prev,
                        duplicateStrategy: v as ImportOptions['duplicateStrategy'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ask">Ask for each</SelectItem>
                      <SelectItem value="skip">Auto-skip duplicates</SelectItem>
                      <SelectItem value="merge">Import all (allow duplicates)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <Label htmlFor="import-draft" className="cursor-pointer">
                    Import as draft (Backlog)
                  </Label>
                  <Switch
                    id="import-draft"
                    checked={options.importAsDraft}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, importAsDraft: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="markdown" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Markdown
              </TabsTrigger>
              <TabsTrigger value="notion" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Notion
              </TabsTrigger>
              <TabsTrigger value="obsidian" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Obsidian
              </TabsTrigger>
            </TabsList>

            <TabsContent value="markdown">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Markdown files
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload one or more .md files. Each heading (# Title) or top-level list item
                    becomes a separate item.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt"
                    multiple
                    onChange={handleFileChange}
                    className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notion">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Notion export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a Notion export as CSV or HTML. For CSV, the file must have a
                    "Title" or "Name" column. For HTML, each page heading becomes an item.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.html,.htm"
                    multiple
                    onChange={handleFileChange}
                    className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="obsidian">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Obsidian vault
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Option 1: Select individual files</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select one or more .md files from your Obsidian vault. Internal
                        [[wikilinks]] will be preserved as references.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md"
                        multiple
                        onChange={handleFileChange}
                        className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Option 2: Select vault folder</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select your entire Obsidian vault folder. All .md files will be imported
                        with internal links resolved between them.
                      </p>
                      <input
                        ref={folderInputRef}
                        type="file"
                        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                        onChange={handleFolderChange}
                        className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {step === 'preview' && (
        <ExternalImportPreview
          items={items}
          onItemsChange={setItems}
          onConfirm={handleImport}
          onCancel={handleNewImport}
          importing={importing}
        />
      )}

      {step === 'result' && result && (
        <ImportResultCard
          result={result}
          onRollback={handleRollback}
          onNewImport={handleNewImport}
          canRollback={canRollback}
          rollingBack={rollingBack}
        />
      )}
    </PageContent>
  )
}
