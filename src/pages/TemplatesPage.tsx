import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TemplatesLibrary } from '@/components/Templates/Library'
import { TemplateEditor } from '@/components/Templates/Editor'
import { TemplateMarketplace } from '@/components/Templates/Marketplace'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Template } from '@/lib/db/schema-templates'
import { FileStack, PenTool, Store } from 'lucide-react'
import { ContextualTip } from '@/components/Onboarding/ContextualTip'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'

export function TemplatesPage() {
  const { t } = useTranslation()
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
    <PageContent>
      <PageHeader
        icon={<FileStack className="h-6 w-6 text-primary" />}
        title={t('templatesPage.library')}
        variant="withTabs"
        tabs={
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="library" className="gap-2">
                <FileStack className="h-4 w-4" />
                {t('templatesPage.library')}
              </TabsTrigger>
              <TabsTrigger value="editor" className="gap-2">
                <PenTool className="h-4 w-4" />
                {t('templatesPage.editor')}
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="gap-2">
                <Store className="h-4 w-4" />
                {t('templatesPage.marketplace')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <ContextualTip
        tipId="templates-intro"
        titleKey="onboarding.contextualTips.templatesTitle"
        descriptionKey="onboarding.contextualTips.templatesDesc"
        className="mb-6"
      />
      <Tabs value={tab} onValueChange={setTab}>

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
    </PageContent>
  )
}
