import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type AIFeatureKey = 'rag' | 'priorities' | 'automation' | 'content' | 'images' | 'insights' | 'assistant' | 'content-generation'

const featureDescriptions: Record<AIFeatureKey, { title: string; description: string }> = {
  rag: {
    title: 'RAG (Retrieval-Augmented Generation)',
    description: 'Combina busca de dados relevantes com geração de texto para respostas personalizadas baseadas nas suas tarefas e metas.',
  },
  priorities: {
    title: 'Prioridades Inteligentes',
    description: 'Usa embeddings e AI para avaliar, categorizar e sugerir ações com base nas suas prioridades e contexto atual.',
  },
  automation: {
    title: 'Automação com AI',
    description: 'Sugestões automáticas de workflows baseadas nos seus padrões de uso. Otimiza sua rotina com ações inteligentes.',
  },
  content: {
    title: 'Geração de Conteúdo',
    description: 'Gera textos, expande tópicos e refina conteúdo com diferentes estilos usando modelos de linguagem.',
  },
  'content-generation': {
    title: 'Content Generator',
    description: 'Templates de prompts para criar, expandir e refinar conteúdo com diferentes tons e estilos. Suporta refinamento iterativo.',
  },
  images: {
    title: 'Geração de Imagens',
    description: 'Cria imagens com DALL-E em diferentes tamanhos e estilos. Suporta variações e edição.',
  },
  insights: {
    title: 'Insights de AI',
    description: 'Analisa métricas de produtividade e gera insights: padrões positivos, alertas e previsões.',
  },
  assistant: {
    title: 'AI Assistant',
    description: 'Assistente flutuante que executa ações rápidas: criar tarefas, navegar, iniciar deep work e mais.',
  },
}

interface AIFeatureInfoProps {
  feature: AIFeatureKey
  className?: string
  iconSize?: string
}

export function AIFeatureInfo({ feature, className, iconSize = 'h-3.5 w-3.5' }: AIFeatureInfoProps) {
  const info = featureDescriptions[feature]
  if (!info) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex items-center text-muted-foreground hover:text-primary transition-colors', className)}
          aria-label={`O que é ${info.title}?`}
        >
          <HelpCircle className={iconSize} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium text-xs">{info.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}
