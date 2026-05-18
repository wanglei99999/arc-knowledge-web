<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useSpacesStore } from '@/stores/spaces'
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  ChevronDown,
  Plus,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const route = useRoute()
const appStore = useAppStore()
const spacesStore = useSpacesStore()

const navItems = [
  { path: '/',          icon: LayoutDashboard, label: '概览'     },
  { path: '/documents', icon: FileText,         label: '文档管理' },
  { path: '/chat',      icon: MessageSquare,    label: '智能问答' },
  { path: '/search',    icon: Search,           label: '检索调试' },
  { path: '/admin',     icon: Settings,         label: '管理配置' },
]

const isActive = (path: string) =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)

//空间切换器
const dropdownOpen = ref(false)
const newSpaceName = ref('')
const creating = ref(false)
function toggleDropdown(){
  dropdownOpen.value = !dropdownOpen.value
  newSpaceName.value = ''
}

function selectSpace(id: string){
  spacesStore.switchSpace(id)
  dropdownOpen.value = false
}

async function handleCreate(){
  const name = newSpaceName.value.trim()
  if(!name||creating.value) return 
  creating.value = true
  try{
    await spacesStore.createSpace(name)
    dropdownOpen.value = false
  } finally{
    creating.value = false
    newSpaceName.value = ''
  }
}

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

    <!-- 空间切换器 -->
    <div class="relative px-2 py-2 border-b border-sidebar-border shrink-0">
      <button
        :class="cn(
          'flex items-center w-full rounded-lg px-3 py-2 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors',
          appStore.sidebarCollapsed ? 'justify-center' : 'gap-2'
        )"
        @click="toggleDropdown"
      >
        <Layers class="w-4 h-4 shrink-0" />
        <span v-if="!appStore.sidebarCollapsed" class="flex-1 text-left text-sm truncate">
          {{ spacesStore.currentSpace?.name ?? '选择空间' }}
        </span>
        <ChevronDown v-if="!appStore.sidebarCollapsed" class="w-3 h-3 shrink-0" />
      </button>

      <!-- 下拉菜单 -->
      <template v-if="dropdownOpen">
        <!-- 遮罩 -->
        <div class="fixed inset-0 z-10" @click="dropdownOpen = false" />
        <!-- 菜单内容 -->
        <div class="absolute left-2 right-2 top-full mt-1 z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
          <div
            v-for="s in spacesStore.spaces"
            :key="s.space_id"
            :class="cn(
              'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
              s.space_id === spacesStore.currentSpace?.space_id
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-700'
            )"
            @click="selectSpace(s.space_id)"
          >
            <span class="flex-1 truncate">{{ s.name }}</span>
          </div>

          <div class="border-t border-gray-600 p-2">
            <div class="flex gap-1">
              <input
                v-model="newSpaceName"
                class="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1 outline-none placeholder-gray-400"
                placeholder="新建空间..."
                @keyup.enter="handleCreate"
              />
              <button
                class="flex items-center justify-center w-7 h-7 rounded bg-primary hover:bg-primary/80 text-white transition-colors disabled:opacity-50"
                :disabled="!newSpaceName.trim() || creating"
                @click="handleCreate"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </template>
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
