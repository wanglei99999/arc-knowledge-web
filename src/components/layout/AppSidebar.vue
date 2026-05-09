<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const route = useRoute()
const appStore = useAppStore()

const navItems = [
  { path: '/',          icon: LayoutDashboard, label: '概览'     },
  { path: '/documents', icon: FileText,         label: '文档管理' },
  { path: '/chat',      icon: MessageSquare,    label: '智能问答' },
  { path: '/search',    icon: Search,           label: '检索调试' },
  { path: '/admin',     icon: Settings,         label: '管理配置' },
]

const isActive = (path: string) =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)
</script>

<template>
  <aside
    :class="cn(
      'flex flex-col bg-sidebar-bg border-r border-sidebar-border transition-all duration-300 shrink-0',
      appStore.sidebarCollapsed ? 'w-[60px]' : 'w-[240px]'
    )"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 h-[60px] border-b border-sidebar-border shrink-0">
      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
        <Database class="w-4 h-4 text-white" />
      </div>
      <span
        v-if="!appStore.sidebarCollapsed"
        class="text-white font-semibold text-sm tracking-wide truncate"
      >
        ArcKnowledge
      </span>
    </div>

    <!-- 导航项 -->
    <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 group',
          isActive(item.path)
            ? 'bg-sidebar-active text-white'
            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
        )"
      >
        <component
          :is="item.icon"
          :class="cn(
            'shrink-0 transition-colors',
            appStore.sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4',
            isActive(item.path) ? 'text-primary-300' : 'text-sidebar-text group-hover:text-white'
          )"
        />
        <span
          v-if="!appStore.sidebarCollapsed"
          class="text-sm font-medium truncate"
        >
          {{ item.label }}
        </span>
      </RouterLink>
    </nav>

    <!-- 折叠按钮 -->
    <div class="px-2 pb-4 shrink-0">
      <button
        class="flex items-center justify-center w-full h-9 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors"
        @click="appStore.toggleSidebar"
      >
        <ChevronLeft v-if="!appStore.sidebarCollapsed" class="w-4 h-4" />
        <ChevronRight v-else class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>
