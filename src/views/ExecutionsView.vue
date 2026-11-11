<template>
  <div class="jc-page">
    <PageHeader title="执行记录" description="查看调度与手动触发的执行历史、失败原因和日志。该列表接口尚未提供，页面已预留。">
      <el-button disabled>刷新</el-button>
    </PageHeader>

    <div class="jc-card reserved">
      <div class="jc-toolbar">
        <el-select disabled placeholder="全部服务" style="width: 200px" />
        <el-input disabled placeholder="搜索任务或执行 ID" style="width: 240px" />
        <el-select disabled placeholder="状态" style="width: 140px" />
        <el-date-picker disabled type="datetimerange" start-placeholder="开始时间" end-placeholder="结束时间" />
        <span class="jc-toolbar-spacer" />
        <span class="jc-muted">接口就绪后可筛选查询</span>
      </div>

      <el-empty description="还没有执行列表接口。接入后这里会显示执行状态、耗时、触发方式和日志入口。">
        <p class="hint">建议提供：</p>
        <ul class="hint-list">
          <li><code>GET /v1/admin/executions</code> 全局列表（支持 service_id、job_id、status、时间范围、分页）</li>
          <li><code>GET /v1/admin/services/:serviceId/jobs/:jobId/executions</code> 任务维度列表</li>
          <li>执行日志与可选的日志流接口</li>
        </ul>
      </el-empty>

      <el-table :data="[]">
        <el-table-column label="执行 ID" min-width="200" />
        <el-table-column label="任务" min-width="180" />
        <el-table-column label="服务" min-width="140" />
        <el-table-column label="状态" width="120" />
        <el-table-column label="触发方式" width="120" />
        <el-table-column label="开始 / 结束" width="200" />
        <el-table-column label="耗时" width="100" />
        <el-table-column label="实例" min-width="140" />
        <el-table-column label="操作" width="140" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
</script>

<style scoped>
.reserved { padding: 16px 16px 8px; }
.hint { margin: 8px 0 0; color: var(--jc-text-secondary); font-size: 13px; }
.hint-list {
  margin: 6px 0 16px;
  padding-left: 18px;
  color: var(--jc-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}
</style>
