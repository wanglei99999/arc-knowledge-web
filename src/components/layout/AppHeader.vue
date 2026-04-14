<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Bell } from 'lucide-vue-next'

const route = useRoute()

const breadcrumbMap: Record<string, string> = {
  '/':          '概览',
  '/documents': '文档管理',
  '/chat':      '智能问答',
  '/search':    '检索调试',
}

const currentTitle = computed(() => breadcrumbMap[route.path] ?? '')
</script>

<template>
  <header class="flex items-center justify-between px-6 h-[60px] bg-surface-card border-b border-surface-border shrink-0">
    <!-- 面包屑 -->
    <div class="flex items-center gap-2 text-sm">
      <span class="text-zinc-400">ArcKnowledge</span>
      <span class="text-zinc-300">/</span>
      <span class="text-zinc-800 font-medium">{{ currentTitle }}</span>
    </div>

    <!-- 右侧操作区 -->
    <div class="flex items-center gap-3">
      <button class="relative flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:bg-surface-muted hover:text-zinc-600 transition-colors">
        <Bell class="w-4 h-4" />
      </button>

      <!-- 用户头像（MVP 硬编码） -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
          D
        </div>
        <span class="text-sm text-zinc-600 font-medium">dev-user</span>
      </div>
    </div>
  </header>
</template>
