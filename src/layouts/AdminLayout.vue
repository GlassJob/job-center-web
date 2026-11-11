<template>
  <div class="shell" :class="{ collapsed }">
    <aside class="sidebar">
      <div class="brand" @click="router.push('/')">
        <div class="logo" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <rect width="32" height="32" rx="8" fill="#7147E8" />
            <path
              d="M9 11.5h6.2c2.6 0 4.3 1.5 4.3 3.7 0 1.5-.8 2.6-2.1 3.2l2.6 4.1h-2.6l-2.3-3.7h-3.4V22.5H9V11.5Zm2.7 2v3.2h3.3c1.2 0 1.9-.6 1.9-1.6s-.7-1.6-1.9-1.6H11.7Z"
              fill="#fff"
            />
          </svg>
        </div>
        <div v-show="!collapsed" class="wordmark">
          <div>Job</div>
          <div>Center</div>
        </div>
      </div>

      <nav class="nav">
        <template v-for="group in navGroups" :key="group.title">
          <div v-show="!collapsed" class="group-title">{{ group.title }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ active: isActive(item.to) }"
            :title="item.label"
          >
            <el-icon :size="18"><component :is="item.icon" /></el-icon>
            <span v-show="!collapsed">{{ item.label }}</span>
          </router-link>
        </template>
      </nav>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="left">
          <button class="icon-btn" type="button" @click="collapsed = !collapsed" :title="collapsed ? '展开菜单' : '收起菜单'">
            <el-icon :size="18"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="(item, idx) in breadcrumbs" :key="idx" :to="item.to">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="right">
          <span class="pill" :class="healthClass">
            <span class="dot" />
            {{ healthLabel }}
          </span>
          <div class="operator">
            <span class="avatar">{{ operatorInitial }}</span>
            <span class="op-name">{{ settings.displayOperator }}</span>
          </div>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Clock,
  Cpu,
  Expand,
  Fold,
  Grid,
  Key,
  List,
  OfficeBuilding,
  Setting,
  Ticket,
} from '@element-plus/icons-vue'
import { healthApi } from '@/api'
import { useCrumbsStore } from '@/stores/crumbs'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const route = useRoute()
const settings = useSettingsStore()
const crumbsStore = useCrumbsStore()
const collapsed = ref(false)

const navGroups = [
  {
    title: '调度中心',
    items: [
      { to: '/', label: '概览', icon: Grid },
      { to: '/jobs', label: '任务管理', icon: List },
      { to: '/executions', label: '执行记录', icon: Ticket },
      { to: '/instances', label: '实例', icon: Cpu },
      { to: '/services', label: '服务', icon: OfficeBuilding },
    ],
  },
  {
    title: '访问',
    items: [
      { to: '/clients', label: '客户端', icon: Key },
      { to: '/audits', label: '审计', icon: Clock },
    ],
  },
  {
    title: '系统',
    items: [{ to: '/settings', label: '连接设置', icon: Setting }],
  },
]

const crumbs = ref<{ title: string; to?: string }[]>([{ title: '概览', to: '/' }])

const breadcrumbs = computed(() => crumbs.value)

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  if (to === '/jobs') return route.path === '/jobs' || Boolean(route.params.jobId)
  if (to === '/instances') return route.path === '/instances' || Boolean(route.params.instanceId)
  if (to === '/executions') {
    return route.path === '/executions' || Boolean(route.params.executionId)
  }
  if (to === '/services') {
    if (route.params.jobId || route.params.instanceId || route.params.executionId) return false
    return route.path === '/services' || route.path.startsWith('/services/')
  }
  return route.path === to || route.path.startsWith(`${to}/`)
}

const liveOk = ref<boolean | null>(null)
const readyOk = ref<boolean | null>(null)
let timer: number | undefined

const healthLabel = computed(() => {
  if (liveOk.value === null) return '检测中'
  if (liveOk.value && readyOk.value) return '已连接'
  if (liveOk.value && readyOk.value === false) return '存活但未就绪'
  return '无法连接'
})

const healthClass = computed(() => {
  if (liveOk.value && readyOk.value) return 'ok'
  if (liveOk.value) return 'warn'
  if (liveOk.value === null) return 'pending'
  return 'bad'
})

const operatorInitial = computed(() => {
  const name = settings.displayOperator
  return name.slice(0, 1).toUpperCase()
})

async function probe() {
  try {
    const live = await healthApi.live()
    liveOk.value = live?.status === 'ok'
  } catch {
    liveOk.value = false
    readyOk.value = false
    return
  }
  try {
    const ready = await healthApi.ready()
    readyOk.value = ready?.status === 'ok'
  } catch {
    readyOk.value = false
  }
}

onMounted(() => {
  void probe()
  timer = window.setInterval(() => void probe(), 30000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

function syncCrumbs() {
  const path = route.path
  const serviceName = crumbsStore.serviceTitle || '服务'
  const jobName = crumbsStore.jobTitle || '任务'
  const instanceName = crumbsStore.instanceTitle || '实例'
  if (path === '/') {
    crumbs.value = [{ title: '概览' }]
    return
  }
  if (path === '/jobs') {
    crumbs.value = [{ title: '任务管理' }]
    return
  }
  if (path === '/instances') {
    crumbs.value = [{ title: '实例' }]
    return
  }
  if (path === '/executions') {
    crumbs.value = [{ title: '执行记录' }]
    return
  }
  if (path === '/services') {
    crumbs.value = [{ title: '服务' }]
    return
  }
  if (path.startsWith('/services/')) {
    const segs: { title: string; to?: string }[] = [
      { title: '服务', to: '/services' },
      { title: serviceName, to: `/services/${route.params.serviceId as string}` },
    ]
    if (route.params.instanceId) {
      segs.push({ title: instanceName })
    }
    if (route.params.jobId) {
      segs.push({
        title: jobName,
        to: `/services/${route.params.serviceId as string}/jobs/${route.params.jobId as string}`,
      })
    }
    if (route.params.executionId) {
      segs.push({ title: '执行详情' })
    }
    crumbs.value = segs
    return
  }
  const staticCrumb = (route.meta.breadcrumb as { title: string }[] | undefined) || [
    { title: (route.meta.title as string) || '页面' },
  ]
  crumbs.value = staticCrumb
}

watch([() => route.fullPath, () => crumbsStore.serviceTitle, () => crumbsStore.jobTitle, () => crumbsStore.instanceTitle], syncCrumbs, { immediate: true })
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--jc-bg);
}
.sidebar {
  width: var(--jc-sidebar-width);
  flex-shrink: 0;
  background: var(--jc-sidebar-bg);
  border-right: 1px solid var(--jc-border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  transition: width 0.2s ease;
}
.collapsed .sidebar {
  width: var(--jc-sidebar-collapsed);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
  cursor: pointer;
  min-height: 64px;
}
.wordmark {
  font-weight: 700;
  line-height: 1.05;
  font-size: 16px;
  color: #1c1c28;
  letter-spacing: -0.03em;
}
.nav {
  padding: 8px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: auto;
}
.group-title {
  margin: 14px 10px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--jc-text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  color: #3f3f4a;
  font-weight: 500;
}
.nav-item:hover {
  background: #f3f0fc;
  color: var(--jc-primary);
}
.nav-item.active {
  background: var(--jc-primary);
  color: #fff;
  box-shadow: 0 6px 16px rgba(113, 71, 232, 0.28);
}
.collapsed .nav-item {
  justify-content: center;
  padding: 0;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: var(--jc-header-height);
  background: #fff;
  border-bottom: 1px solid var(--jc-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 0 8px;
  position: sticky;
  top: 0;
  z-index: 20;
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon-btn {
  border: 0;
  background: transparent;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #4b5563;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover {
  background: var(--jc-primary-soft);
  color: var(--jc-primary);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #f3f4f6;
  color: #6b7280;
}
.pill .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.pill.ok {
  background: #def7ec;
  color: #046c4e;
}
.pill.warn {
  background: #fef3c7;
  color: #9a3412;
}
.pill.bad {
  background: #fde8e8;
  color: #9b1c1c;
}
.operator {
  display: flex;
  align-items: center;
  gap: 8px;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ede9fe;
  color: var(--jc-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
}
.op-name {
  font-weight: 600;
  color: #1f2937;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.content {
  padding: 20px 24px 32px;
  flex: 1;
}
</style>
