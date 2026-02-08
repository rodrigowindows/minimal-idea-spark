import { ContentGenerator } from '@/components/ContentGenerator';
import { useTranslation } from 'react-i18next';

export function ContentGeneratorPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('nav.contentGenerator')}
        </h1>
        <p className="text-muted-foreground">
          {t('nav.contentGenerator')}
        </p>
      </div>
      <ContentGenerator />
    </div>
  );
}
