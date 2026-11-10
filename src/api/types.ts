export interface Envelope<T> {
  code: number
  message: string
  data: T
}

export interface ListResult<T> {
  list: T[]
  total: number
}

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export interface Service {
  id: string
  code: string
  name: string
  description?: string
  status: string
  created_at: string
  updated_at: string
}

export interface ServiceDetail extends Service {
  job_count: number
  instance_count: number
  credential_count: number
}

export interface CreateServiceInput {
  code: string
  name: string
  description?: string
}

export interface PatchServiceInput {
  name?: string
  description?: string
  status?: string
}

export interface DeleteServiceResult {
  hard: boolean
  service?: Service
}

export interface JobView {
  id: string
  service_id: string
  code: string
  name: string
  description?: string
  enabled: boolean
  language?: string
  handler?: string
  handler_version?: string
  params_schema?: JsonObject
  schema_hash?: string
  metadata_version: number
  idempotency_mode: string
  idempotency_verified: boolean
  supports_cancel: boolean
  supports_timeout: boolean
  supports_progress: boolean
  supports_state: boolean
  default_timeout_seconds: number
  capabilities?: JsonObject
  status: string
  first_registered_at?: string | null
  last_registered_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateJobInput {
  code: string
  name: string
  description?: string
  enabled?: boolean
  default_timeout_seconds?: number
}

export interface PatchJobInput {
  name?: string
  description?: string
  enabled?: boolean
  idempotency_verified?: boolean
  default_timeout_seconds?: number
}

export interface DeleteJobResult {
  hard: boolean
  job?: JobView
}

export interface CredentialView {
  id: string
  service_id: string
  name: string
  secret_hint?: string
  hash_algo: string
  status: string
  allowed_job_codes?: string[] | null
  allowed_ips?: string[] | null
  expires_at?: string | null
  last_used_at?: string | null
  last_used_ip?: string
  created_by?: string
  revoked_at?: string | null
  revoked_by?: string
  created_at: string
}

export interface CredentialCreated extends CredentialView {
  secret: string
  token: string
}

export interface CreateCredentialInput {
  name: string
  allowed_job_codes?: string[]
  allowed_ips?: string[]
  expires_at?: string | null
}

export interface PatchCredentialInput {
  name?: string
  allowed_job_codes?: string[]
  clear_allowed_job_codes?: boolean
  allowed_ips?: string[]
  clear_allowed_ips?: boolean
  expires_at?: string | null
  clear_expires_at?: boolean
}

export interface DeleteCredentialResult {
  hard: boolean
  credential?: CredentialView
}

export interface ScheduleView {
  id: string
  job_id: string
  code: string
  name: string
  enabled: boolean
  manual_enabled: boolean
  cron_expression?: string
  timezone: string
  default_params?: JsonObject
  timeout_seconds: number
  max_retries: number
  retry_backoff: JsonObject
  concurrency_policy: string
  concurrency_scope: string
  max_concurrency: number
  queue_max: number
  misfire_policy: string
  misfire_threshold_seconds: number
  catch_up_max: number
  dispatch_strategy: string
  next_fire_at?: string | null
  last_fire_at?: string | null
  horizon_at?: string | null
  config_source: string
  version: number
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface CreateScheduleInput {
  code: string
  name: string
  enabled?: boolean
  manual_enabled?: boolean
  cron_expression?: string
  timezone?: string
  default_params?: JsonObject
  timeout_seconds?: number
  max_retries?: number
  retry_backoff?: JsonObject
  concurrency_policy?: string
  concurrency_scope?: string
  max_concurrency?: number
  queue_max?: number
  misfire_policy?: string
  misfire_threshold_seconds?: number
  catch_up_max?: number
  dispatch_strategy?: string
}

export interface PatchScheduleInput {
  version: number
  name?: string
  enabled?: boolean
  manual_enabled?: boolean
  cron_expression?: string
  clear_cron_expression?: boolean
  timezone?: string
  default_params?: JsonObject
  clear_default_params?: boolean
  timeout_seconds?: number
  max_retries?: number
  retry_backoff?: JsonObject
  concurrency_policy?: string
  concurrency_scope?: string
  max_concurrency?: number
  queue_max?: number
  misfire_policy?: string
  misfire_threshold_seconds?: number
  catch_up_max?: number
  dispatch_strategy?: string
}

export interface DeleteScheduleResult {
  hard: boolean
  schedule?: ScheduleView
}

export interface JobStateView {
  id: string
  job_id: string
  key: string
  value: JsonObject
  version: number
  updated_by: string
  updated_by_execution_id?: string
  updated_at: string
}

export interface CreateJobStateInput {
  key: string
  value: JsonObject
}

export interface PatchJobStateInput {
  version: number
  value: JsonObject
}

export interface TriggerExecutionInput {
  params: JsonObject
  idempotency_key?: string
  instance_id?: string
}

export interface TriggerExecutionResult {
  execution_id: string
  status: string
  attempt_id?: string
  instance_id?: string
  message?: string
  idempotent_replay?: boolean
}

export interface CancelExecutionInput {
  reason?: string
}

export interface CancelExecutionResult {
  execution_id: string
  status: string
  attempt_id?: string
  cancel_state?: string
  message?: string
  idempotent?: boolean
}

export interface AttemptView {
  id: string
  attempt_no: number
  instance_id?: string | null
  instance_key?: string
  status: string
  status_reason?: string
  handler_version?: string
  lease_expires_at?: string | null
  dispatched_at?: string | null
  acked_at?: string | null
  started_at?: string | null
  finished_at?: string | null
  progress_percent?: number | null
  progress_message?: string
  cancel_state?: string
  result?: unknown
  error_code?: string
  error_message?: string
}

export interface ExecutionView {
  id: string
  service_id: string
  job_id: string
  job_code: string
  trigger_type: string
  triggered_by: string
  params?: unknown
  status: string
  status_reason?: string
  handler_version?: string
  timeout_seconds: number
  max_attempts: number
  attempt_count: number
  current_attempt_no: number
  current_attempt_id?: string | null
  result?: unknown
  result_summary?: string
  error_code?: string
  error_message?: string
  queued_at?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at: string
  updated_at: string
  attempt?: AttemptView | null
}

export interface ClientView {
  id: string
  name: string
  description?: string
  secret_hint?: string
  hash_algo: string
  status: string
  scopes: string[]
  created_by?: string
  last_used_at?: string | null
  last_used_ip?: string
  revoked_at?: string | null
  revoked_by?: string
  created_at: string
  updated_at: string
}

export interface ClientCreated extends ClientView {
  secret: string
}

export interface CreateClientInput {
  name: string
  description?: string
  scopes: string[]
}

export interface PatchClientInput {
  name?: string
  description?: string
  status?: string
  scopes?: string[]
}

export interface DeleteClientResult {
  hard: boolean
  client?: ClientView
}

export interface OperationAuditView {
  id: number
  client_id: string
  operator_id?: string
  operator_name?: string
  action: string
  permission?: string
  resource_type: string
  resource_id?: string
  request_id?: string
  trace_id?: string
  client_ip?: string
  before_data?: unknown
  after_data?: unknown
  result: string
  error_message?: string
  created_at: string
}

export interface HealthStatus {
  status: string
}

export interface PageQuery {
  keyword?: string
  page?: number
  limit?: number
  status?: string
  enabled?: string
  client_id?: string
  operator_id?: string
  action?: string
  resource_type?: string
  resource_id?: string
  result?: string
  created_from?: string
  created_to?: string
  hard?: boolean
}

export const CLIENT_SCOPE_OPTIONS = [
  { value: 'job.service.view', label: '服务查看' },
  { value: 'job.service.manage', label: '服务管理' },
  { value: 'job.job.view', label: '任务查看' },
  { value: 'job.job.manage', label: '任务管理' },
  { value: 'job.schedule.view', label: '调度查看' },
  { value: 'job.schedule.manage', label: '调度管理' },
  { value: 'job.state.view', label: '游标/状态查看' },
  { value: 'job.state.manage', label: '游标/状态管理' },
  { value: 'job.credential.view', label: '凭据查看' },
  { value: 'job.credential.manage', label: '凭据管理' },
  { value: 'job.client.view', label: '客户端查看' },
  { value: 'job.client.manage', label: '客户端管理' },
  { value: 'job.audit.view', label: '审计查看' },
] as const

export const CONCURRENCY_POLICIES = ['ALLOW', 'FORBID', 'QUEUE'] as const
export const CONCURRENCY_SCOPES = ['JOB', 'SCHEDULE', 'IDEMPOTENCY_KEY'] as const
export const MISFIRE_POLICIES = ['SKIP', 'FIRE_ONCE', 'CATCH_UP'] as const
export const DISPATCH_STRATEGIES = ['LEAST_LOAD', 'ROUND_ROBIN', 'RANDOM'] as const

export const EXEC_FINAL_STATUSES = [
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
  'SKIPPED',
] as const
