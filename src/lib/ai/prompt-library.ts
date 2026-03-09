/**
 * Prompt Library - Templates for AI Content Generation
 */

export type ContentType = 
  | 'task_description'
  | 'goal_description'
  | 'journal_prompt'
  | 'brainstorm'
  | 'expand_idea'
  | 'refine_text'
  | 'weekly_plan'
  | 'action_steps'

export type ToneStyle = 
  | 'professional'
  | 'casual'
  | 'motivational'
  | 'analytical'
  | 'creative'

export interface PromptTemplate {
  id: string
  name: string
  description: string
  contentType: ContentType
  systemPrompt: string
  userPromptTemplate: (params: Record<string, any>) => string
  suggestedTones: ToneStyle[]
  examples?: string[]
}

export const PROMPT_TEMPLATES: Record<ContentType, PromptTemplate> = {
  task_description: {
    id: 'task_description',
    name: 'Task Description',
    description: 'Generate detailed task descriptions',
    contentType: 'task_description',
    systemPrompt: 'You are a productivity assistant.',
    userPromptTemplate: (params) => `Create a task description for: "${params.title}"`,
    suggestedTones: ['professional', 'casual'],
    examples: ['Build landing page']
  },
  goal_description: {
    id: 'goal_description',
    name: 'Goal Description',
    description: 'Create goal descriptions',
    contentType: 'goal_description',
    systemPrompt: 'You are a goal-setting coach.',
    userPromptTemplate: (params) => `Define a goal: "${params.title}"`,
    suggestedTones: ['motivational', 'professional'],
    examples: ['Launch side business']
  },
  journal_prompt: {
    id: 'journal_prompt',
    name: 'Journal Prompt',
    description: 'Generate journal prompts',
    contentType: 'journal_prompt',
    systemPrompt: 'You are a journaling guide.',
    userPromptTemplate: (params) => `Create a prompt about: "${params.topic}"`,
    suggestedTones: ['casual', 'motivational'],
    examples: ['Weekly reflection']
  },
  brainstorm: {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Generate creative ideas',
    contentType: 'brainstorm',
    systemPrompt: 'You are a creative partner.',
    userPromptTemplate: (params) => `Brainstorm ideas for: "${params.topic}"`,
    suggestedTones: ['creative', 'professional'],
    examples: ['Side project ideas']
  },
  expand_idea: {
    id: 'expand_idea',
    name: 'Expand Idea',
    description: 'Expand brief ideas',
    contentType: 'expand_idea',
    systemPrompt: 'You are a strategic thinker.',
    userPromptTemplate: (params) => `Expand: "${params.idea}"`,
    suggestedTones: ['analytical', 'professional'],
    examples: ['Create online course']
  },
  refine_text: {
    id: 'refine_text',
    name: 'Refine Text',
    description: 'Improve text clarity',
    contentType: 'refine_text',
    systemPrompt: 'You are an expert editor.',
    userPromptTemplate: (params) => `Refine: "${params.text}"`,
    suggestedTones: ['professional', 'casual'],
    examples: ['Polish email']
  },
  weekly_plan: {
    id: 'weekly_plan',
    name: 'Weekly Plan',
    description: 'Create weekly plans',
    contentType: 'weekly_plan',
    systemPrompt: 'You are a productivity strategist.',
    userPromptTemplate: (params) => `Plan week: "${params.focus}"`,
    suggestedTones: ['motivational', 'professional'],
    examples: ['Product launch week']
  },
  action_steps: {
    id: 'action_steps',
    name: 'Action Steps',
    description: 'Break down goals',
    contentType: 'action_steps',
    systemPrompt: 'You are an execution coach.',
    userPromptTemplate: (params) => `Break down: "${params.goal}"`,
    suggestedTones: ['professional', 'motivational'],
    examples: ['Launch new feature']
  }
}

export function getTemplate(contentType: ContentType): PromptTemplate {
  return PROMPT_TEMPLATES[contentType]
}

export function buildPrompt(
  contentType: ContentType,
  params: Record<string, any>
): { system: string; user: string } {
  const template = getTemplate(contentType)
  return {
    system: template.systemPrompt,
    user: template.userPromptTemplate(params)
  }
}

export function getAllTemplates(): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES)
}
