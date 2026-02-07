export interface PromptTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: PromptCategory;
  template: string;
  variables: TemplateVariable[];
  defaultStyle: 'professional' | 'casual' | 'creative' | 'technical';
  defaultTone: 'formal' | 'friendly' | 'enthusiastic' | 'neutral';
  defaultLength: 'short' | 'medium' | 'long';
  icon: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  labelEn: string;
  placeholder: string;
  placeholderEn: string;
  required: boolean;
}

export type PromptCategory =
  | 'writing'
  | 'business'
  | 'marketing'
  | 'education'
  | 'productivity'
  | 'creative';

export const categoryLabels: Record<PromptCategory, { pt: string; en: string }> = {
  writing: { pt: 'Escrita', en: 'Writing' },
  business: { pt: 'Negocios', en: 'Business' },
  marketing: { pt: 'Marketing', en: 'Marketing' },
  education: { pt: 'Educacao', en: 'Education' },
  productivity: { pt: 'Produtividade', en: 'Productivity' },
  creative: { pt: 'Criativo', en: 'Creative' },
};

export const promptTemplates: PromptTemplate[] = [
  // Writing
  {
    id: 'blog-post',
    name: 'Artigo de Blog',
    nameEn: 'Blog Post',
    description: 'Crie um artigo de blog completo e envolvente',
    descriptionEn: 'Create a complete and engaging blog post',
    category: 'writing',
    template: 'Escreva um artigo de blog sobre {{topic}}. {{audience ? "Publico-alvo: " + audience + "." : ""}} {{keyPoints ? "Pontos-chave a abordar: " + keyPoints + "." : ""}}',
    variables: [
      { key: 'topic', label: 'Topico', labelEn: 'Topic', placeholder: 'Ex: Inteligencia Artificial no dia a dia', placeholderEn: 'E.g.: Artificial Intelligence in daily life', required: true },
      { key: 'audience', label: 'Publico-alvo', labelEn: 'Target audience', placeholder: 'Ex: Profissionais de tecnologia', placeholderEn: 'E.g.: Tech professionals', required: false },
      { key: 'keyPoints', label: 'Pontos-chave', labelEn: 'Key points', placeholder: 'Ex: Beneficios, exemplos praticos, tendencias', placeholderEn: 'E.g.: Benefits, practical examples, trends', required: false },
    ],
    defaultStyle: 'professional',
    defaultTone: 'friendly',
    defaultLength: 'long',
    icon: 'FileText',
  },
  {
    id: 'email-professional',
    name: 'Email Profissional',
    nameEn: 'Professional Email',
    description: 'Redija um email profissional claro e eficaz',
    descriptionEn: 'Write a clear and effective professional email',
    category: 'business',
    template: 'Escreva um email profissional sobre {{subject}}. {{recipient ? "Destinatario: " + recipient + "." : ""}} {{objective ? "Objetivo: " + objective + "." : ""}}',
    variables: [
      { key: 'subject', label: 'Assunto', labelEn: 'Subject', placeholder: 'Ex: Proposta de parceria', placeholderEn: 'E.g.: Partnership proposal', required: true },
      { key: 'recipient', label: 'Destinatario', labelEn: 'Recipient', placeholder: 'Ex: Gerente de vendas', placeholderEn: 'E.g.: Sales manager', required: false },
      { key: 'objective', label: 'Objetivo', labelEn: 'Objective', placeholder: 'Ex: Agendar uma reuniao', placeholderEn: 'E.g.: Schedule a meeting', required: false },
    ],
    defaultStyle: 'professional',
    defaultTone: 'formal',
    defaultLength: 'short',
    icon: 'Mail',
  },
  {
    id: 'social-media',
    name: 'Post para Redes Sociais',
    nameEn: 'Social Media Post',
    description: 'Crie posts atraentes para redes sociais',
    descriptionEn: 'Create engaging social media posts',
    category: 'marketing',
    template: 'Crie um post para {{platform}} sobre {{topic}}. {{hashtags ? "Inclua hashtags relacionadas a: " + hashtags + "." : ""}} {{callToAction ? "Call to action: " + callToAction + "." : ""}}',
    variables: [
      { key: 'platform', label: 'Plataforma', labelEn: 'Platform', placeholder: 'Ex: LinkedIn, Instagram, Twitter', placeholderEn: 'E.g.: LinkedIn, Instagram, Twitter', required: true },
      { key: 'topic', label: 'Topico', labelEn: 'Topic', placeholder: 'Ex: Lancamento de produto', placeholderEn: 'E.g.: Product launch', required: true },
      { key: 'hashtags', label: 'Hashtags', labelEn: 'Hashtags', placeholder: 'Ex: tecnologia, inovacao', placeholderEn: 'E.g.: technology, innovation', required: false },
      { key: 'callToAction', label: 'Call to Action', labelEn: 'Call to Action', placeholder: 'Ex: Visite nosso site', placeholderEn: 'E.g.: Visit our website', required: false },
    ],
    defaultStyle: 'creative',
    defaultTone: 'enthusiastic',
    defaultLength: 'short',
    icon: 'Share2',
  },
  {
    id: 'study-summary',
    name: 'Resumo de Estudo',
    nameEn: 'Study Summary',
    description: 'Crie resumos estruturados para estudo',
    descriptionEn: 'Create structured summaries for studying',
    category: 'education',
    template: 'Crie um resumo detalhado e estruturado sobre {{subject}}. {{level ? "Nivel: " + level + "." : ""}} {{focus ? "Foco em: " + focus + "." : ""}} Inclua pontos principais, exemplos e conexoes importantes.',
    variables: [
      { key: 'subject', label: 'Assunto', labelEn: 'Subject', placeholder: 'Ex: Teoria da Relatividade', placeholderEn: 'E.g.: Theory of Relativity', required: true },
      { key: 'level', label: 'Nivel', labelEn: 'Level', placeholder: 'Ex: Intermediario', placeholderEn: 'E.g.: Intermediate', required: false },
      { key: 'focus', label: 'Foco', labelEn: 'Focus area', placeholder: 'Ex: Aplicacoes praticas', placeholderEn: 'E.g.: Practical applications', required: false },
    ],
    defaultStyle: 'technical',
    defaultTone: 'neutral',
    defaultLength: 'medium',
    icon: 'GraduationCap',
  },
  {
    id: 'brainstorm-ideas',
    name: 'Brainstorm de Ideias',
    nameEn: 'Brainstorm Ideas',
    description: 'Gere ideias criativas e inovadoras',
    descriptionEn: 'Generate creative and innovative ideas',
    category: 'creative',
    template: 'Gere ideias criativas e inovadoras sobre {{theme}}. {{constraints ? "Restricoes: " + constraints + "." : ""}} {{quantity ? "Quantidade: " + quantity + " ideias." : "Gere pelo menos 5 ideias."}} Para cada ideia, inclua um titulo curto e uma descricao breve.',
    variables: [
      { key: 'theme', label: 'Tema', labelEn: 'Theme', placeholder: 'Ex: Aplicativos de saude mental', placeholderEn: 'E.g.: Mental health apps', required: true },
      { key: 'constraints', label: 'Restricoes', labelEn: 'Constraints', placeholder: 'Ex: Baixo custo, mobile-first', placeholderEn: 'E.g.: Low cost, mobile-first', required: false },
      { key: 'quantity', label: 'Quantidade', labelEn: 'Quantity', placeholder: 'Ex: 10', placeholderEn: 'E.g.: 10', required: false },
    ],
    defaultStyle: 'creative',
    defaultTone: 'enthusiastic',
    defaultLength: 'medium',
    icon: 'Lightbulb',
  },
  {
    id: 'meeting-agenda',
    name: 'Pauta de Reuniao',
    nameEn: 'Meeting Agenda',
    description: 'Crie uma pauta estruturada para reuniao',
    descriptionEn: 'Create a structured meeting agenda',
    category: 'productivity',
    template: 'Crie uma pauta de reuniao estruturada sobre {{topic}}. {{duration ? "Duracao: " + duration + "." : ""}} {{participants ? "Participantes: " + participants + "." : ""}} {{objectives ? "Objetivos: " + objectives + "." : ""}} Inclua horarios estimados para cada item.',
    variables: [
      { key: 'topic', label: 'Topico', labelEn: 'Topic', placeholder: 'Ex: Planejamento trimestral', placeholderEn: 'E.g.: Quarterly planning', required: true },
      { key: 'duration', label: 'Duracao', labelEn: 'Duration', placeholder: 'Ex: 1 hora', placeholderEn: 'E.g.: 1 hour', required: false },
      { key: 'participants', label: 'Participantes', labelEn: 'Participants', placeholder: 'Ex: Equipe de produto, marketing', placeholderEn: 'E.g.: Product team, marketing', required: false },
      { key: 'objectives', label: 'Objetivos', labelEn: 'Objectives', placeholder: 'Ex: Definir metas Q2', placeholderEn: 'E.g.: Define Q2 goals', required: false },
    ],
    defaultStyle: 'professional',
    defaultTone: 'formal',
    defaultLength: 'medium',
    icon: 'Calendar',
  },
  {
    id: 'product-description',
    name: 'Descricao de Produto',
    nameEn: 'Product Description',
    description: 'Crie descricoes persuasivas de produtos',
    descriptionEn: 'Create persuasive product descriptions',
    category: 'marketing',
    template: 'Crie uma descricao persuasiva para o produto {{product}}. {{features ? "Caracteristicas: " + features + "." : ""}} {{targetAudience ? "Publico-alvo: " + targetAudience + "." : ""}} {{differentials ? "Diferenciais: " + differentials + "." : ""}}',
    variables: [
      { key: 'product', label: 'Produto', labelEn: 'Product', placeholder: 'Ex: Smartwatch fitness premium', placeholderEn: 'E.g.: Premium fitness smartwatch', required: true },
      { key: 'features', label: 'Caracteristicas', labelEn: 'Features', placeholder: 'Ex: GPS, monitor cardiaco, 7 dias de bateria', placeholderEn: 'E.g.: GPS, heart monitor, 7-day battery', required: false },
      { key: 'targetAudience', label: 'Publico-alvo', labelEn: 'Target audience', placeholder: 'Ex: Atletas amadores', placeholderEn: 'E.g.: Amateur athletes', required: false },
      { key: 'differentials', label: 'Diferenciais', labelEn: 'Differentials', placeholder: 'Ex: Preco acessivel, design elegante', placeholderEn: 'E.g.: Affordable price, elegant design', required: false },
    ],
    defaultStyle: 'creative',
    defaultTone: 'enthusiastic',
    defaultLength: 'medium',
    icon: 'ShoppingBag',
  },
  {
    id: 'lesson-plan',
    name: 'Plano de Aula',
    nameEn: 'Lesson Plan',
    description: 'Crie planos de aula estruturados',
    descriptionEn: 'Create structured lesson plans',
    category: 'education',
    template: 'Crie um plano de aula sobre {{subject}}. {{level ? "Nivel dos alunos: " + level + "." : ""}} {{duration ? "Duracao: " + duration + "." : ""}} {{objectives ? "Objetivos de aprendizagem: " + objectives + "." : ""}} Inclua introducao, desenvolvimento, atividades praticas e avaliacao.',
    variables: [
      { key: 'subject', label: 'Assunto', labelEn: 'Subject', placeholder: 'Ex: Fotossintese', placeholderEn: 'E.g.: Photosynthesis', required: true },
      { key: 'level', label: 'Nivel', labelEn: 'Level', placeholder: 'Ex: Ensino medio', placeholderEn: 'E.g.: High school', required: false },
      { key: 'duration', label: 'Duracao', labelEn: 'Duration', placeholder: 'Ex: 50 minutos', placeholderEn: 'E.g.: 50 minutes', required: false },
      { key: 'objectives', label: 'Objetivos', labelEn: 'Learning objectives', placeholder: 'Ex: Compreender o processo da fotossintese', placeholderEn: 'E.g.: Understand the photosynthesis process', required: false },
    ],
    defaultStyle: 'professional',
    defaultTone: 'friendly',
    defaultLength: 'long',
    icon: 'BookOpen',
  },
];

export function fillTemplate(template: PromptTemplate, values: Record<string, string>): string {
  let result = template.template;
  for (const variable of template.variables) {
    const value = values[variable.key] || '';
    // Handle conditional expressions like {{key ? "prefix" + key + "suffix" : "fallback"}}
    const conditionalPattern = new RegExp(
      `\\{\\{\\s*${variable.key}\\s*\\?\\s*[^}]+\\s*\\}\\}`,
      'g'
    );
    if (value) {
      result = result.replace(conditionalPattern, (match) => {
        // Extract the truthy branch
        const truthyMatch = match.match(/\?\s*"([^"]*?)"\s*\+\s*\w+\s*\+\s*"([^"]*?)"/);
        if (truthyMatch) {
          return truthyMatch[1] + value + truthyMatch[2];
        }
        const simpleMatch = match.match(/\?\s*"([^"]*?)"\s*\+\s*\w+/);
        if (simpleMatch) {
          return simpleMatch[1] + value;
        }
        return value;
      });
    } else {
      result = result.replace(conditionalPattern, (match) => {
        // Extract the falsy branch
        const falsyMatch = match.match(/:\s*"([^"]*?)"\s*\}\}/);
        return falsyMatch ? falsyMatch[1] : '';
      });
    }
    // Replace simple {{key}} references
    result = result.replace(new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g'), value);
  }
  return result.replace(/\s+/g, ' ').trim();
}

export function getTemplatesByCategory(category?: PromptCategory): PromptTemplate[] {
  if (!category) return promptTemplates;
  return promptTemplates.filter((t) => t.category === category);
}

export function getTemplateById(id: string): PromptTemplate | undefined {
  return promptTemplates.find((t) => t.id === id);
}

// Generation history stored in localStorage
const HISTORY_KEY = 'lifeos_content_generations';

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  content: string;
  templateId?: string;
  style: string;
  tone: string;
  length: string;
  rating?: number;
  created_at: string;
}

export function saveToHistory(item: Omit<GenerationHistoryItem, 'id' | 'created_at'>): GenerationHistoryItem {
  const history = getHistory();
  const newItem: GenerationHistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  history.unshift(newItem);
  // Keep last 50 items
  const trimmed = history.slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  return newItem;
}

export function getHistory(): GenerationHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function rateHistoryItem(id: string, rating: number): void {
  const history = getHistory();
  const item = history.find((h) => h.id === id);
  if (item) {
    item.rating = rating;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
