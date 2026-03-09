import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Target, 
  BookOpen, 
  Lightbulb, 
  Maximize2, 
  Edit3,
  Calendar,
  ListChecks
} from 'lucide-react'
import { getAllTemplates, type ContentType, type PromptTemplate } from '@/lib/ai/prompt-library'

interface PromptTemplatesProps {
  onSelect: (contentType: ContentType, template: PromptTemplate) => void
  selectedType?: ContentType
  detailed?: boolean
}

export function PromptTemplates({ onSelect, selectedType, detailed = false }: PromptTemplatesProps) {
  const templates = getAllTemplates()

  const icons: Record<ContentType, any> = {
    task_description: FileText,
    goal_description: Target,
    journal_prompt: BookOpen,
    brainstorm: Lightbulb,
    expand_idea: Maximize2,
    refine_text: Edit3,
    weekly_plan: Calendar,
    action_steps: ListChecks,
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const Icon = icons[template.contentType]
        const isSelected = selectedType === template.contentType

        return (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => onSelect(template.contentType, template)}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-sm">{template.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              {detailed && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {template.suggestedTones.map((tone) => (
                      <Badge key={tone} variant="secondary" className="text-xs">
                        {tone}
                      </Badge>
                    ))}
                  </div>
                  
                  {template.examples && template.examples.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Examples:</p>
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {template.examples.map((example, i) => (
                          <li key={i} className="line-clamp-1">• {example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
