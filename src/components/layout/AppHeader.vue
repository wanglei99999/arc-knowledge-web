<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const breadcrumbMap: Record<string, string> = {
  '/':          '概览',
  '/documents': '文档管理',
  '/chat':      '智能问答',
  '/search':    '检索调试',
  '/admin':     '管理配置',
}

const currentTitle = computed(() => breadcrumbMap[route.path] ?? '')

const dropdownOpen = ref(false)

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="flex h-[60px] shrink-0 items-center justify-between border-b border-rule bg-paper px-xl">
    <!-- 收起侧栏。贴着侧栏的边——它调的是侧栏与主区的关系，
         手要够的是那条边，不是屏幕对角 -->
    <div class="flex items-center gap-sm">
      <button
        type="button"
        :aria-label="appStore.sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        :aria-pressed="appStore.sidebarCollapsed"
        class="-ml-sm grid h-7 w-7 shrink-0 place-items-center rounded-sm text-graphite-70 transition-colors duration-hover ease-settle hover:bg-desk-hover hover:text-graphite motion-reduce:transition-none"
        @click="appStore.toggleSidebar"
      >
        <PanelLeftClose v-if="!appStore.sidebarCollapsed" class="h-4 w-4" :stroke-width="1.5" />
        <PanelLeftOpen v-else class="h-4 w-4" :stroke-width="1.5" />
      </button>
      <h1 class="text-title text-graphite">{{ currentTitle }}</h1>
    </div>

    <div class="flex items-center gap-xs">
      <div class="relative">
        <button
          type="button"
          class="flex h-8 items-center gap-sm rounded-sm px-sm text-label text-graphite-70 transition-colors duration-hover ease-settle hover:bg-desk-hover hover:text-graphite motion-reduce:transition-none"
          :aria-expanded="dropdownOpen"
          @click="dropdownOpen = !dropdownOpen"
        >
          <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-graphite font-callnum text-callnum-sm text-paper">
            {{ authStore.avatarLetter }}
          </span>
          <span class="truncate">{{ authStore.displayName }}</span>
          <ChevronDown
            class="h-3 w-3 shrink-0 transition-transform duration-standard ease-settle motion-reduce:transition-none"
            :class="{ 'rotate-180': dropdownOpen }"
            :stroke-width="1.5"
          />
        </button>

        <Transition name="overlay">
          <div
            v-if="dropdownOpen"
            class="absolute right-0 top-full z-40 mt-xs w-48 rounded-md border border-rule-strong bg-paper p-xs shadow-overlay"
          >
            <p class="truncate px-sm py-xs font-callnum text-callnum-sm text-graphite-45">
              {{ authStore.email }}
            </p>
            <button
              type="button"
              class="flex h-[30px] w-full items-center gap-sm rounded-sm px-sm text-body-sm text-graphite transition-colors duration-hover ease-settle hover:bg-desk-hover motion-reduce:transition-none"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4 shrink-0" :stroke-width="1.5" />
              退出登录
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>

  <div v-if="dropdownOpen" class="fixed inset-0 z-30" @click="dropdownOpen = false" />
</template>
