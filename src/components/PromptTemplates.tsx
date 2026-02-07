import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Mail,
  Share2,
  GraduationCap,
  Lightbulb,
  Calendar,
  ShoppingBag,
  BookOpen,
  Search,
  ArrowRight,
} from 'lucide-react';
import {
  type PromptTemplate,
  type PromptCategory,
  type TemplateVariable,
  promptTemplates,
  categoryLabels,
  fillTemplate,
} from '@/lib/ai/prompt-library';
import type { ContentGenerationOptions } from '@/lib/ai/content-generator';
import { useTranslation } from '@/contexts/LanguageContext';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Mail,
  Share2,
  GraduationCap,
  Lightbulb,
  Calendar,
  ShoppingBag,
  BookOpen,
};

interface PromptTemplatesProps {
  onSelectTemplate: (
    prompt: string,
    options: Partial<ContentGenerationOptions>
  ) => void;
}

export function PromptTemplates({ onSelectTemplate }: PromptTemplatesProps) {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const categories = Object.entries(categoryLabels) as [PromptCategory, { pt: string; en: string }][];

  const filteredTemplates = promptTemplates.filter((t) => {
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    const name = isEn ? t.nameEn : t.name;
    const desc = isEn ? t.descriptionEn : t.description;
    const matchesSearch =
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setVariableValues({});
  };

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;
    const prompt = fillTemplate(selectedTemplate, variableValues);
    onSelectTemplate(prompt, {
      style: selectedTemplate.defaultStyle,
      tone: selectedTemplate.defaultTone,
      length: selectedTemplate.defaultLength,
      templateId: selectedTemplate.id,
    });
    setSelectedTemplate(null);
    setVariableValues({});
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setVariableValues({});
  };

  const getLabel = (v: TemplateVariable) => (isEn ? v.labelEn : v.label);
  const getPlaceholder = (v: TemplateVariable) => (isEn ? v.placeholderEn : v.placeholder);

  // Template detail view
  if (selectedTemplate) {
    const Icon = iconMap[selectedTemplate.icon] || FileText;
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 px-2">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {isEn ? selectedTemplate.nameEn : selectedTemplate.name}
            </CardTitle>
          </div>
          <CardDescription className="ml-12">
            {isEn ? selectedTemplate.descriptionEn : selectedTemplate.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTemplate.variables.map((v) => (
            <div key={v.key} className="space-y-1.5">
              <Label htmlFor={v.key} className="text-sm">
                {getLabel(v)}
                {v.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={v.key}
                placeholder={getPlaceholder(v)}
                value={variableValues[v.key] || ''}
                onChange={(e) =>
                  setVariableValues({ ...variableValues, [v.key]: e.target.value })
                }
              />
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">{isEn ? selectedTemplate.defaultStyle : selectedTemplate.defaultStyle}</Badge>
            <Badge variant="outline">{isEn ? selectedTemplate.defaultTone : selectedTemplate.defaultTone}</Badge>
            <Badge variant="secondary">{isEn ? selectedTemplate.defaultLength : selectedTemplate.defaultLength}</Badge>
          </div>

          <Button
            onClick={handleUseTemplate}
            className="w-full"
            disabled={selectedTemplate.variables
              .filter((v) => v.required)
              .some((v) => !variableValues[v.key]?.trim())}
          >
            {isEn ? 'Use Template' : 'Usar Template'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Template list view
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isEn ? 'Prompt Templates' : 'Templates de Prompts'}
        </CardTitle>
        <CardDescription>
          {isEn
            ? 'Select a template to get started quickly'
            : 'Selecione um template para comecar rapidamente'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isEn ? 'Search templates...' : 'Buscar templates...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            {isEn ? 'All' : 'Todos'}
          </Badge>
          {categories.map(([key, label]) => (
            <Badge
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
            >
              {isEn ? label.en : label.pt}
            </Badge>
          ))}
        </div>

        {/* Template list */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-3">
            {filteredTemplates.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {isEn ? 'No templates found' : 'Nenhum template encontrado'}
              </p>
            ) : (
              filteredTemplates.map((template) => {
                const Icon = iconMap[template.icon] || FileText;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {isEn ? template.nameEn : template.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {isEn ? template.descriptionEn : template.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {isEn
                        ? categoryLabels[template.category].en
                        : categoryLabels[template.category].pt}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
