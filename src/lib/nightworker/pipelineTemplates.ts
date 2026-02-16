import type { PipelineTemplate } from '@/types/night-worker'

function nowIso() {
  return new Date().toISOString()
}

function defaultTimestampedTemplate(template: Omit<PipelineTemplate, 'created_at' | 'updated_at'>): PipelineTemplate {
  const now = nowIso()
  return { ...template, created_at: now, updated_at: now }
}

export function getDefaultPipelineTemplates(): PipelineTemplate[] {
  return [
    defaultTimestampedTemplate({
      id: 'tpl-default-pipeline',
      name: 'Default Pipeline',
      description: 'Gemini planeja -> Codex valida e codifica -> Claude revisa e finaliza',
      context_mode: 'all_steps',
      is_default: true,
      steps: [
        {
          provider: 'gemini',
          role: 'brainstorm',
          instruction:
            'Voce e um arquiteto de software. Analise o pedido abaixo e produza um PLANO DE IMPLEMENTACAO claro e completo.\n\nIMPORTANTE:\n- NAO explore arquivos ou diretorios\n- NAO leia arquivos existentes\n- NAO use ferramentas\n- APENAS analise o pedido e crie o plano\n\nResponda SOMENTE neste formato:\n\n## Objetivo\nDescreva em 1-2 frases o que precisa ser feito.\n\n## Arquivos a Criar/Modificar\nListe cada arquivo com caminho completo:\n- `caminho/arquivo.ext` - descricao do conteudo\n\n## Passo a Passo\n1. Primeiro crie... (seja especifico: nome da funcao, parametros, logica)\n2. Depois implemente... (inclua exemplos de codigo quando util)\n3. ...\n\n## Dependencias\n- Libs ou ferramentas necessarias\n\n---\nPEDIDO:\n{input}',
        },
        {
          provider: 'codex',
          role: 'coder',
          instruction:
            'Voce recebeu um plano de implementacao do step anterior.\n\n1. VALIDE o plano: verifique se faz sentido e se a abordagem e correta\n2. EXECUTE o plano: crie e modifique TODOS os arquivos listados\n\nRegras:\n- Crie TODOS os arquivos do plano, nao pule nenhum\n- Escreva codigo completo e funcional, nao use placeholders\n- Se encontrar problemas no plano, corrija e implemente a versao melhorada\n- NAO peca confirmacao, apenas execute\n- Instale dependencias se necessario',
        },
        {
          provider: 'claude',
          role: 'finalizer',
          instruction:
            'Voce e um desenvolvedor senior. Revise a implementacao do step anterior e FACA as correcoes necessarias.\n\n1. REVISE: Verifique completude, bugs, seguranca e qualidade\n2. EXECUTE: Corrija TODOS os problemas encontrados diretamente nos arquivos\n3. FINALIZE: Garanta que tudo funciona e esta pronto para uso\n\nRegras:\n- Se encontrar bugs, CORRIJA nos arquivos (nao apenas aponte)\n- Se faltou algo do pedido original, IMPLEMENTE\n- Se o codigo tem problemas de seguranca, CORRIJA\n- Rode testes se existirem\n\nAo final, responda:\n\n## Status: COMPLETO | INCOMPLETO\n\n### O que foi implementado\n- Lista do que foi feito\n\n### Correcoes aplicadas (se houver)\n- O que voce corrigiu e por que\n\n### Pendencias (se INCOMPLETO)\n- O que ficou faltando e por que',
        },
      ],
    }),
  ]
}
