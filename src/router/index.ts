import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AdminLayout,
    children: [
      {
        path: '',
        name: 'overview',
        component: () => import('@/views/OverviewView.vue'),
        meta: { title: '概览', breadcrumb: [{ title: '概览' }] },
      },
      {
        path: 'jobs',
        name: 'jobs',
        component: () => import('@/views/JobsView.vue'),
        meta: { title: '任务管理', breadcrumb: [{ title: '任务管理' }] },
      },
      {
        path: 'instances',
        name: 'instances',
        component: () => import('@/views/InstancesView.vue'),
        meta: { title: '实例', breadcrumb: [{ title: '实例' }] },
      },
      {
        path: 'executions',
        name: 'executions',
        component: () => import('@/views/ExecutionsView.vue'),
        meta: { title: '执行记录', breadcrumb: [{ title: '执行记录' }] },
      },
      {
        path: 'triggers',
        name: 'triggers',
        component: () => import('@/views/TriggersView.vue'),
        meta: { title: '调度触点', breadcrumb: [{ title: '调度触点' }] },
      },
      {
        path: 'services',
        name: 'services',
        component: () => import('@/views/ServicesView.vue'),
        meta: { title: '服务', breadcrumb: [{ title: '服务' }] },
      },
      {
        path: 'services/:serviceId',
        name: 'service-detail',
        component: () => import('@/views/ServiceDetailView.vue'),
        meta: { title: '服务详情' },
      },
      {
        path: 'services/:serviceId/instances/:instanceId',
        name: 'instance-detail',
        component: () => import('@/views/InstanceDetailView.vue'),
        meta: { title: '实例详情' },
      },
      {
        path: 'services/:serviceId/jobs/:jobId',
        name: 'job-detail',
        component: () => import('@/views/JobDetailView.vue'),
        meta: { title: '任务详情' },
      },
      {
        path: 'services/:serviceId/jobs/:jobId/executions/:executionId',
        name: 'execution-detail',
        component: () => import('@/views/ExecutionDetailView.vue'),
        meta: { title: '执行详情' },
      },
      {
        path: 'clients',
        name: 'clients',
        component: () => import('@/views/ClientsView.vue'),
        meta: { title: '客户端', breadcrumb: [{ title: '客户端' }] },
      },
      {
        path: 'audits',
        name: 'audits',
        component: () => import('@/views/AuditsView.vue'),
        meta: { title: '审计', breadcrumb: [{ title: '审计' }] },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: '连接设置', breadcrumb: [{ title: '连接设置' }] },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) || '任务中心'
  document.title = `${title} · 任务中心`
})

export default router
