import { useState } from 'react'
import { TemplatesLibrary } from '@/components/Templates/Library'
import { TemplateEditor } from '@/components/Templates/Editor'
import { TemplateMarketplace } from '@/components/Templates/Marketplace'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Template } from '@/lib/db/schema-templates'
import { FileStack, PenTool, Store } from 'lucide-react'

export function TemplatesPage() {
  const [tab, setTab] = useState('library')
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setTab('editor')
  }

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setTab('editor')
  }

  const handleBackToLibrary = () => {
    setEditingTemplate(null)
    setTab('library')
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="library" className="gap-2">
            <FileStack className="h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2">
            <PenTool className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2">
            <Store className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <TemplatesLibrary
            onEdit={handleEdit}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>

        <TabsContent value="editor">
          <TemplateEditor
            editingTemplate={editingTemplate}
            onBack={handleBackToLibrary}
          />
        </TabsContent>

        <TabsContent value="marketplace">
          <TemplateMarketplace />
        </TabsContent>
      </Tabs>
    </div>
  )
}
