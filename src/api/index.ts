import { request, requestHealth } from './client'
import type {
  CancelExecutionInput,
  CancelExecutionResult,
  ClientCreated,
  ClientView,
  CreateClientInput,
  CreateCredentialInput,
  CreateJobInput,
  CreateJobStateInput,
  CreateScheduleInput,
  CreateServiceInput,
  CredentialCreated,
  CredentialView,
  DeleteClientResult,
  DeleteCredentialResult,
  DeleteJobResult,
  DeleteScheduleResult,
  DeleteServiceResult,
  ExecutionLogView,
  ExecutionView,
  HealthStatus,
  InstanceView,
  JobStateView,
  JobView,
  ListResult,
  OperationAuditView,
  Overview,
  PageQuery,
  RegenerateAllResult,
  RegenerateScheduleResult,
  ScheduleTriggerView,
  SchedulerStatus,
  PatchClientInput,
  PatchCredentialInput,
  PatchJobInput,
  PatchJobStateInput,
  PatchScheduleInput,
  PatchServiceInput,
  ScheduleView,
  Service,
  ServiceDetail,
  TriggerExecutionInput,
  TriggerExecutionResult,
} from './types'

function normalizeList<T>(data: ListResult<T> | null | undefined): ListResult<T> {
  return {
    list: data?.list ?? [],
    total: data?.total ?? 0,
  }
}

export const healthApi = {
  live: () => requestHealth<HealthStatus>('/health/live'),
  ready: () => requestHealth<HealthStatus>('/health/ready'),
}

export const overviewApi = {
  get: () => request<Overview>('GET', '/v1/admin/overview'),
}

export const schedulerApi = {
  get: () => request<SchedulerStatus>('GET', '/v1/admin/scheduler'),
  regenerateAll: () => request<RegenerateAllResult>('POST', '/v1/admin/scheduler/regenerate', { body: {} }),
}

export const triggersApi = {
  list: (query: PageQuery = {}) =>
    request<ListResult<ScheduleTriggerView>>('GET', '/v1/admin/triggers', { query }).then(normalizeList),
}

export const servicesApi = {
  list: (query: PageQuery = {}) =>
    request<ListResult<ServiceDetail>>('GET', '/v1/admin/services', { query }).then(normalizeList),
  get: (serviceId: string) => request<ServiceDetail>('GET', `/v1/admin/services/${serviceId}`),
  create: (body: CreateServiceInput) => request<Service>('POST', '/v1/admin/services', { body }),
  patch: (serviceId: string, body: PatchServiceInput) =>
    request<Service>('PATCH', `/v1/admin/services/${serviceId}`, { body }),
  remove: (serviceId: string, hard = false) =>
    request<DeleteServiceResult>('DELETE', `/v1/admin/services/${serviceId}`, {
      query: hard ? { hard: true } : undefined,
    }),
}

export const jobsApi = {
  listGlobal: (query: PageQuery = {}) =>
    request<ListResult<JobView>>('GET', '/v1/admin/jobs', { query }).then(normalizeList),
  list: (serviceId: string, query: PageQuery = {}) =>
    request<ListResult<JobView>>('GET', `/v1/admin/services/${serviceId}/jobs`, { query }).then(
      normalizeList,
    ),
  get: (serviceId: string, jobId: string) =>
    request<JobView>('GET', `/v1/admin/services/${serviceId}/jobs/${jobId}`),
  create: (serviceId: string, body: CreateJobInput) =>
    request<JobView>('POST', `/v1/admin/services/${serviceId}/jobs`, { body }),
  patch: (serviceId: string, jobId: string, body: PatchJobInput) =>
    request<JobView>('PATCH', `/v1/admin/services/${serviceId}/jobs/${jobId}`, { body }),
  remove: (serviceId: string, jobId: string, hard = false) =>
    request<DeleteJobResult>('DELETE', `/v1/admin/services/${serviceId}/jobs/${jobId}`, {
      query: hard ? { hard: true } : undefined,
    }),
}

export const credentialsApi = {
  list: (serviceId: string, query: PageQuery = {}) =>
    request<ListResult<CredentialView>>(
      'GET',
      `/v1/admin/services/${serviceId}/credentials`,
      { query },
    ).then(normalizeList),
  get: (serviceId: string, credentialId: string) =>
    request<CredentialView>('GET', `/v1/admin/services/${serviceId}/credentials/${credentialId}`),
  create: (serviceId: string, body: CreateCredentialInput) =>
    request<CredentialCreated>('POST', `/v1/admin/services/${serviceId}/credentials`, { body }),
  patch: (serviceId: string, credentialId: string, body: PatchCredentialInput) =>
    request<CredentialView>('PATCH', `/v1/admin/services/${serviceId}/credentials/${credentialId}`, {
      body,
    }),
  remove: (serviceId: string, credentialId: string, hard = false) =>
    request<DeleteCredentialResult>(
      'DELETE',
      `/v1/admin/services/${serviceId}/credentials/${credentialId}`,
      { query: hard ? { hard: true } : undefined },
    ),
  rotate: (serviceId: string, credentialId: string) =>
    request<CredentialCreated>(
      'POST',
      `/v1/admin/services/${serviceId}/credentials/${credentialId}/rotate`,
      { body: {} },
    ),
}

export const schedulesApi = {
  list: (serviceId: string, jobId: string, query: PageQuery = {}) =>
    request<ListResult<ScheduleView>>(
      'GET',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/schedules`,
      { query },
    ).then(normalizeList),
  get: (serviceId: string, jobId: string, scheduleId: string) =>
    request<ScheduleView>(
      'GET',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/schedules/${scheduleId}`,
    ),
  create: (serviceId: string, jobId: string, body: CreateScheduleInput) =>
    request<ScheduleView>('POST', `/v1/admin/services/${serviceId}/jobs/${jobId}/schedules`, {
      body,
    }),
  patch: (serviceId: string, jobId: string, scheduleId: string, body: PatchScheduleInput) =>
    request<ScheduleView>(
      'PATCH',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/schedules/${scheduleId}`,
      { body },
    ),
  remove: (serviceId: string, jobId: string, scheduleId: string, hard = false) =>
    request<DeleteScheduleResult>(
      'DELETE',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/schedules/${scheduleId}`,
      { query: hard ? { hard: true } : undefined },
    ),
  listTriggers: (
    serviceId: string,
    jobId: string,
    scheduleId: string,
    query: PageQuery = {},
  ) =>
    request<ListResult<ScheduleTriggerView>>(
      'GET',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/schedules/${scheduleId}/triggers`,
      { query },
    ).then(normalizeList),
  regenerate: (serviceId: string, jobId: string, scheduleId: string) =>
    request<RegenerateScheduleResult>(
      'POST',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/schedules/${scheduleId}/regenerate`,
      { body: {} },
    ),
}

export const statesApi = {
  list: (serviceId: string, jobId: string, query: PageQuery = {}) =>
    request<ListResult<JobStateView>>(
      'GET',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/states`,
      { query },
    ).then(normalizeList),
  get: (serviceId: string, jobId: string, stateId: string) =>
    request<JobStateView>('GET', `/v1/admin/services/${serviceId}/jobs/${jobId}/states/${stateId}`),
  create: (serviceId: string, jobId: string, body: CreateJobStateInput) =>
    request<JobStateView>('POST', `/v1/admin/services/${serviceId}/jobs/${jobId}/states`, { body }),
  patch: (serviceId: string, jobId: string, stateId: string, body: PatchJobStateInput) =>
    request<JobStateView>(
      'PATCH',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/states/${stateId}`,
      { body },
    ),
  remove: (serviceId: string, jobId: string, stateId: string) =>
    request<void>('DELETE', `/v1/admin/services/${serviceId}/jobs/${jobId}/states/${stateId}`),
}

export const executionsApi = {
  list: (query: PageQuery = {}) =>
    request<ListResult<ExecutionView>>('GET', '/v1/admin/executions', { query }).then(normalizeList),
  listByJob: (serviceId: string, jobId: string, query: PageQuery = {}) =>
    request<ListResult<ExecutionView>>(
      'GET',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/executions`,
      { query },
    ).then(normalizeList),
  trigger: (serviceId: string, jobId: string, body: TriggerExecutionInput) =>
    request<TriggerExecutionResult>(
      'POST',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/executions`,
      { body },
    ),
  get: (serviceId: string, jobId: string, executionId: string) =>
    request<ExecutionView>(
      'GET',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/executions/${executionId}`,
    ),
  logs: (
    serviceId: string,
    jobId: string,
    executionId: string,
    query: PageQuery & { after?: number | string; attempt_id?: string } = {},
  ) =>
    request<ListResult<ExecutionLogView>>(
      'GET',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/executions/${executionId}/logs`,
      { query },
    ).then(normalizeList),
  cancel: (serviceId: string, jobId: string, executionId: string, body: CancelExecutionInput = {}) =>
    request<CancelExecutionResult>(
      'POST',
      `/v1/admin/services/${serviceId}/jobs/${jobId}/executions/${executionId}/cancel`,
      { body },
    ),
}

export const instancesApi = {
  listGlobal: (query: PageQuery = {}) =>
    request<ListResult<InstanceView>>('GET', '/v1/admin/instances', { query }).then(normalizeList),
  list: (serviceId: string, query: PageQuery = {}) =>
    request<ListResult<InstanceView>>(
      'GET',
      `/v1/admin/services/${serviceId}/instances`,
      { query },
    ).then(normalizeList),
  get: (serviceId: string, instanceId: string) =>
    request<InstanceView>('GET', `/v1/admin/services/${serviceId}/instances/${instanceId}`),
}

export const clientsApi = {
  list: (query: PageQuery = {}) =>
    request<ListResult<ClientView>>('GET', '/v1/admin/clients', { query }).then(normalizeList),
  get: (id: string) => request<ClientView>('GET', `/v1/admin/clients/${id}`),
  create: (body: CreateClientInput) =>
    request<ClientCreated>('POST', '/v1/admin/clients', { body }),
  patch: (id: string, body: PatchClientInput) =>
    request<ClientView>('PATCH', `/v1/admin/clients/${id}`, { body }),
  rotate: (id: string) => request<ClientCreated>('POST', `/v1/admin/clients/${id}/rotate`, { body: {} }),
  revoke: (id: string) => request<ClientView>('POST', `/v1/admin/clients/${id}/revoke`, { body: {} }),
  remove: (id: string, hard = false) =>
    request<DeleteClientResult>('DELETE', `/v1/admin/clients/${id}`, {
      query: hard ? { hard: true } : undefined,
    }),
}

export const auditsApi = {
  list: (query: PageQuery = {}) =>
    request<ListResult<OperationAuditView>>('GET', '/v1/admin/audits', { query }).then(
      normalizeList,
    ),
  get: (auditId: string | number) =>
    request<OperationAuditView>('GET', `/v1/admin/audits/${auditId}`),
}

export { ApiError, isConflict, request } from './client'
