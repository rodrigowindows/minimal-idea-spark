import { ContentGenerator } from '@/components/ContentGenerator';
import { useTranslation } from 'react-i18next';
import { AIFeatureInfo } from '@/components/AIFeatureInfo';

export function ContentGeneratorPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('nav.contentGenerator')}
          </h1>
          <AIFeatureInfo feature="content" />
        </div>
        <p className="text-muted-foreground">
          {t('nav.contentGenerator')}
        </p>
      </div>
      <ContentGenerator />
    </div>
  );
}
