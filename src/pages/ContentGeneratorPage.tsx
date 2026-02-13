import { ContentGenerator } from '@/components/ContentGenerator';
import { useTranslation } from 'react-i18next';
import { AIFeatureInfo } from '@/components/AIFeatureInfo';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContent } from '@/components/layout/PageContent';

export function ContentGeneratorPage() {
  const { t } = useTranslation();

  return (
    <PageContent>
      <PageHeader
        icon={<Sparkles className="h-6 w-6 text-primary" />}
        title={t('nav.contentGenerator')}
        description={t('nav.contentGenerator')}
        variant="compact"
        actions={<AIFeatureInfo feature="content" />}
      />
      <ContentGenerator />
    </PageContent>
  );
}
