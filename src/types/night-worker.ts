export type NightWorkerProvider = 'codex' | 'claude' | string;

export type PromptStatus = 'pending' | 'done' | 'failed';

export interface PromptItem {
  id: string;
  name: string;
  provider: NightWorkerProvider;
  status: PromptStatus;
  content?: string;
  target_folder?: string;
  created_at?: string;
  updated_at?: string;
  result_path?: string | null;
  result_content?: string | null;
  error?: string | null;
  attempts?: number;
  next_retry_at?: string | null;
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
  pending?: number;
  processedToday?: number;
  failures?: number;
  workers?: Array<{
    name: string;
    provider: string;
    active: boolean;
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
