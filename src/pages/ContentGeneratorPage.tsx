import { ContentGenerator } from '@/components/ContentGenerator';
import { useTranslation } from '@/contexts/LanguageContext';

export function ContentGeneratorPage() {
  const { language } = useTranslation();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEn ? 'AI Content Generator' : 'Gerador de Conteudo IA'}
        </h1>
        <p className="text-muted-foreground">
          {isEn
            ? 'Generate, refine and manage AI-powered content with templates'
            : 'Gere, refine e gerencie conteudo com IA usando templates'}
        </p>
      </div>
      <ContentGenerator />
    </div>
  );
}
