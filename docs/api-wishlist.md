# 管理端希望补充的接口

控制台这一版已经按任务中心的日常操作改过布局。下列接口目前不存在，页面上已预留位置；实现后可以把「待接入」换成真实数据。路径仅供参考，字段名可按现有 Admin API 风格微调，但请保持 `{code:0,message,data}` 信封，列表用 `{list,total}`。

## 优先（日常运维强依赖）

### 1. 全局任务列表

`GET /v1/admin/jobs?keyword=&service_id=&status=&enabled=&page=&limit=`

现在只能按服务拉任务，再分别拉调度，服务一多就会慢而且可能截断。建议每条任务在现有 `JobView` 基础上带上：

- `service_id` / `service_code` / `service_name`
- 调度摘要：`schedules[]`，至少包含 `id,code,name,enabled,cron_expression,timezone,next_fire_at,last_fire_at`
- 最近一次执行（若执行数据可查）：`last_execution_id,last_execution_status,last_execution_at`

对应页面：侧栏「任务管理」、概览「即将触发」。

### 2. 执行列表

`GET /v1/admin/executions?keyword=&service_id=&job_id=&status=&instance_id=&created_from=&created_to=&page=&limit=`

以及任务维度：

`GET /v1/admin/services/:serviceId/jobs/:jobId/executions?...`

列表项建议在现有 `ExecutionView` 上增加 `job_id,job_code,job_name,service_id,service_code,service_name`，方便全局表格直接展示。

对应页面：侧栏「执行记录」（已整页预留）、任务详情「最近执行」、概览「最近失败 / 今日成功失败 / 运行中」、任务列表「最近执行」列。

### 3. 执行日志（可选流式）

`GET /v1/admin/services/:serviceId/jobs/:jobId/executions/:executionId/logs?after=&limit=`

如可提供 SSE 或 chunk 拉取，执行详情页就可以做滚动日志，而不只看状态。

### 4. 运行概览统计

`GET /v1/admin/overview` 或 `/v1/admin/stats`

建议返回：

- `service_count`、`job_count`、`enabled_job_count`
- `instance_counts`：`REGISTERING / ONLINE / SUSPECT / OFFLINE / DRAINING`
- `execution_today`：`total / running / success / failed / canceled`
- `upcoming[]`：即将触发的调度（任务名、服务、cron、`next_fire_at`）
- `recent_failed[]`：最近失败执行（execution_id、任务、服务、结束时间、错误摘要）

对应页面：首页「今日调度 / 成功失败 / 运行中 / 最近失败」。当前这些卡片只用现有接口拼了服务、任务、实例健康和即将触发。

## 建议一并补上的字段和列表

### 5. 服务列表带计数

`GET /v1/admin/services` 的每条最好直接带上详情里已有的 `job_count`、`instance_count`、`credential_count`，再加 `online_instance_count`。

现在服务列表会再请求一次详情，只为显示任务数和实例数。

### 6. 全局实例列表

`GET /v1/admin/instances?keyword=&service_id=&status=&page=&limit=`

列表项用现有 `InstanceView`，并带 `service_code`、`service_name`。侧栏「实例」页目前也是按服务聚合的。

### 7. 任务 / 调度上的最近运行

即使暂时不做全局执行列表，只要在 `JobView` 或 `ScheduleView` 上增加 `last_execution_id/status/at`，任务表格和调度摘要就能先亮起来。

## 暂时不会调用的能力

管理端仍然没有执行列表、日志和 SSE 时，手动触发、按 execution_id 查看、本浏览器会话「最近触发」会继续可用。请不要为了占位页而改现有鉴权和信封格式。
