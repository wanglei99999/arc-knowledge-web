import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // MVP 阶段硬编码，后期接 JWT 后动态赋值
  const tenantId = ref(import.meta.env.VITE_TENANT_ID ?? 'default')
  const userId   = ref(import.meta.env.VITE_USER_ID   ?? 'dev-user')

  // 侧边栏折叠状态（持久化）
  const sidebarCollapsed = ref(
    localStorage.getItem('arc-sidebar-collapsed') === 'true'
  )

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('arc-sidebar-collapsed', String(sidebarCollapsed.value))
  }

  return { tenantId, userId, sidebarCollapsed, toggleSidebar }
})
