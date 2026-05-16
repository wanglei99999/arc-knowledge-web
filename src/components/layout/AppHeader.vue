<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, LogOut, ChevronDown } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const breadcrumbMap: Record<string, string> = {
  '/':          '概览',
  '/documents': '文档管理',
  '/chat':      '智能问答',
  '/search':    '检索调试',
}

const currentTitle = computed(() => breadcrumbMap[route.path] ?? '')

const dropdownOpen = ref(false)

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
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

      <!-- 用户区域：点击展开退出登录下拉 -->
      <div class="relative">
        <button
          class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-muted transition-colors"
          @click="dropdownOpen = !dropdownOpen"
        >
          <!-- 头像：首字母 -->
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
            {{ authStore.avatarLetter }}
          </div>
          <span class="text-sm text-zinc-600 font-medium">{{ authStore.displayName }}</span>
          <ChevronDown class="w-3 h-3 text-zinc-400" :class="{ 'rotate-180': dropdownOpen }" />
        </button>

        <!-- 下拉菜单 -->
        <div
          v-if="dropdownOpen"
          class="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-50"
        >
          <div class="px-3 py-2 border-b border-zinc-100">
            <p class="text-xs text-zinc-400 truncate">{{ authStore.email }}</p>
          </div>
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- 点击外部关闭下拉 -->
  <div v-if="dropdownOpen" class="fixed inset-0 z-40" @click="dropdownOpen = false" />
</template>
