import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export const useAppStore = defineStore('app', () => {
  // MVP 阶段硬编码，后期接 JWT 后动态赋值
  const auth = useAuthStore()
  const tenantId = computed(() => auth.context?.tenant_id ?? '')
  const userId = computed(() => auth.context?.membership_id ?? '')

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
