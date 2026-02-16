export type NightWorkerProvider = 'codex' | 'claude' | 'gemini' | string;

export type PromptStatus = 'pending' | 'processing' | 'done' | 'failed';
type QueueStage = 'backlog' | 'prioritized';
type ProjectStatus = 'active' | 'archived' | 'paused';

export type PipelineContextMode = 'previous_only' | 'all_steps';

/** Single step in a pipeline template */
export interface PipelineStep {
  provider: NightWorkerProvider;
  role: string;
  instruction: string;
  context_mode?: PipelineContextMode;
}

/** Pipeline template definition (stored in localStorage) */
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  context_mode?: PipelineContextMode;
  version?: number;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

/** Pipeline metadata persisted in nw_prompts */
export interface PipelineConfig {
  template_version: number;
  steps: PipelineStep[];
  original_input: string;
  context_mode?: PipelineContextMode;
}

interface ProjectStats {
  total: number;
  pending: number;
  processing: number;
  done: number;
  failed: number;
}

export interface NightWorkerProject {
  id: string;
  name: string;
  description?: string | null;
  default_target_folder?: string | null;
  status: ProjectStatus;
  sla_timeout_seconds?: number;
  sla_max_retries?: number;
  sla_retry_delay_seconds?: number;
  created_at: string;
  updated_at: string;
  stats?: ProjectStats;
}

/** Item returned in the GET /prompts list */
interface PromptListItem {
  id: string;
  provider: NightWorkerProvider;
  status: PromptStatus;
  filename: string;
  created_at?: string;
  has_result: boolean;
}

/** Full prompt detail returned by GET /prompts/:id */
export interface PromptDetail {
  id: string;
  provider: NightWorkerProvider;
  status: PromptStatus;
  filename: string;
  path?: string;
  content?: string | null;
  result?: string | null;
}

/** Normalized prompt item used throughout the UI */
export interface PromptItem {
  id: string;
  name: string;
  provider: NightWorkerProvider;
  status: PromptStatus;
  queue_stage?: QueueStage;
  priority_order?: number | null;
  cloned_from?: string | null;
  content?: string;
  target_folder?: string;
  created_at?: string;
  updated_at?: string;
  result_path?: string | null;
  result_content?: string | null;
  error?: string | null;
  attempts?: number;
  next_retry_at?: string | null;
  filename?: string;
  has_result?: boolean;
  pipeline_config?: PipelineConfig | null;
  pipeline_id?: string | null;
  pipeline_step?: number | null;
  pipeline_total_steps?: number | null;
  pipeline_template_name?: string | null;
  project_id?: string | null;
  template_id?: string | null;
  template_version?: number | null;
  events?: PromptEvent[];
}

/** Response from GET /prompts */
export interface PromptsListResponse {
  total: number;
  providers: string[];
  prompts: PromptListItem[];
}

/** Response from POST /prompts */
export interface CreatePromptResponse {
  id: string;
  provider?: string;
  status?: PromptStatus;
  filename?: string;
  message?: string;
  idempotent?: boolean;
}

export interface WorkerConfig {
  active: boolean;
  provider: string;
  windowStart: string;
  windowEnd: string;
  intervalSeconds: number;
  timeoutSeconds: number;
  maxFiles: number;
  maxPromptSize: number;
  folder?: string;
  cliPath?: string;
  model?: string;
}

export interface NightWorkerConfig {
  baseUrl: string;
  token: string | null;
  port: number;
  workers: {
    claude: WorkerConfig;
    codex: WorkerConfig;
  };
  providers: string[];
}

export interface HealthResponse {
  status: 'ok' | 'error';
  providers?: string[];
  uptime?: string;
  version?: string;
  pending?: number;
  pending_prioritized?: number;
  pending_backlog?: number;
  processing?: number;
  processedToday?: number;
  failures?: number;
  workers?: Array<{
    name: string;
    worker_id?: string;
    provider: string;
    active: boolean;
    status?: string;
    last_seen?: string;
    queue?: number;
    intervalSeconds?: number;
    lastRun?: string;
    window?: string;
  }>;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | string;
  worker: 'Claude' | 'Codex' | string;
  message: string;
}

/** Single event from nw_prompt_events */
export interface PromptEvent {
  id: string;
  prompt_id: string;
  type: string;
  message: string | null;
  created_at: string;
}
