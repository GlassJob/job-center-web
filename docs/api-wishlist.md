# 管理端希望补充的接口

控制台这一版已经按任务中心的日常操作改过布局。下列接口原先不存在；**Batch A/B/C 已在 job-center 落地**，前端已接真实数据。路径与字段以 `{code:0,message,data}` 信封、列表 `{list,total}` 为准。

## 优先（日常运维强依赖）— 已实现

### 1. 全局任务列表 ✅

`GET /v1/admin/jobs?keyword=&service_id=&status=&enabled=&page=&limit=`

含 `service_code` / `service_name`、`schedules[]` 摘要、`last_execution_*`。

### 2. 执行列表 ✅

`GET /v1/admin/executions?...`  
`GET /v1/admin/services/:serviceId/jobs/:jobId/executions?...`

列表项含 `job_name` / `service_code` / `service_name`。

### 3. 执行日志（chunk 拉取）✅

`GET /v1/admin/services/:serviceId/jobs/:jobId/executions/:executionId/logs?after=&limit=`

Executor `task.log` 写入 `execution_logs`；暂无 SSE。

### 4. 运行概览统计 ✅

`GET /v1/admin/overview`

## 建议一并补上的字段和列表 — 已实现

### 5. 服务列表带计数 ✅

`GET /v1/admin/services` 直接带 `job_count` / `instance_count` / `online_instance_count` / `credential_count`。

### 6. 全局实例列表 ✅

`GET /v1/admin/instances?keyword=&service_id=&status=&page=&limit=`

### 7. 任务上的最近运行 ✅

由全局任务列表的 `last_execution_*` 提供。

## 暂时不会调用的能力

SSE 日志流仍未做；详情页使用 chunk 拉取即可。
}
