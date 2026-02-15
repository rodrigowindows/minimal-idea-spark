export type NightWorkerProvider = 'codex' | 'claude' | 'gemini' | string;

export type PromptStatus = 'pending' | 'processing' | 'done' | 'failed';
export type QueueStage = 'backlog' | 'prioritized';

/** Item returned in the GET /prompts list */
export interface PromptListItem {
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
  provider: string;
  status: PromptStatus;
  filename: string;
  message: string;
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
