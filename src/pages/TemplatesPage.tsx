import { useState } from 'react'
import { TemplatesLibrary } from '@/components/Templates/Library'
import { TemplateEditor } from '@/components/Templates/Editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function TemplatesPage() {
  const [tab, setTab] = useState('library')
  return (
    <div className="min-h-screen p-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
        </TabsList>
        <TabsContent value="library"><TemplatesLibrary /></TabsContent>
        <TabsContent value="editor"><TemplateEditor /></TabsContent>
      </Tabs>
    </div>
  )
}
