import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError, isConflict } from '@/api/client'

export function toastError(err: unknown, fallback = '操作失败'): void {
  if (err instanceof ApiError) {
    ElMessage.error(err.message || fallback)
    return
  }
  if (err instanceof Error && err.message) {
    ElMessage.error(err.message)
    return
  }
  ElMessage.error(fallback)
}

export async function handleConflict(err: unknown, reload?: () => Promise<void> | void): Promise<boolean> {
  if (!isConflict(err)) return false
  ElMessage.warning('版本冲突，已刷新')
  await reload?.()
  return true
}

export async function confirmAction(
  message: string,
  title = '确认',
  type: 'warning' | 'info' | 'success' | 'error' = 'warning',
): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, {
      type,
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
    return true
  } catch {
    return false
  }
}

export async function confirmDelete(name: string, supportHard = true): Promise<'soft' | 'hard' | null> {
  if (!supportHard) {
    const ok = await confirmAction(`确定要删除「${name}」吗？此操作将停用该资源。`, '删除确认')
    return ok ? 'soft' : null
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除「${name}」吗？默认执行软删除（停用）。如需永久删除，请点击「永久删除」。`,
      '删除确认',
      {
        type: 'warning',
        distinguishCancelAndClose: true,
        confirmButtonText: '软删除',
        cancelButtonText: '永久删除',
        closeOnClickModal: false,
      },
    )
    return 'soft'
  } catch (action) {
    if (action !== 'cancel') return null
    try {
      await ElMessageBox.confirm(
        `永久删除「${name}」不可恢复，且在仍有依赖时会返回 409。确认继续？`,
        '永久删除',
        {
          type: 'error',
          confirmButtonText: '确认永久删除',
          cancelButtonText: '取消',
        },
      )
      return 'hard'
    } catch {
      return null
    }
  }
}

export async function confirmHardOnly(name: string, extra = ''): Promise<boolean> {
  return confirmAction(
    `确定要永久删除「${name}」吗？此操作不可恢复。${extra}`,
    '永久删除',
    'error',
  )
}
