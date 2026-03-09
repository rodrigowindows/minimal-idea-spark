import { PageHeader } from '@/components/layout/PageHeader'
import { ContentGenerator } from '@/components/ContentGenerator'
import { Wand2 } from 'lucide-react'
import { AIFeatureInfo } from '@/components/AIFeatureInfo'

export function ContentGen() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <PageHeader
        icon={<Wand2 className="h-6 w-6 text-primary" />}
        title="Content Generator"
        description="Create, expand, and refine content with AI-powered templates"
        actions={<AIFeatureInfo feature="content-generation" />}
      />

      <ContentGenerator />
    </div>
  )
}
