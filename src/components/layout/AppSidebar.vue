<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useSpacesStore } from '@/stores/spaces'
import { useChatStore } from '@/stores/chat'
import SessionNotificationDot from '@/components/layout/SessionNotificationDot.vue'
import {
  LayoutDashboard,
  FileText,
  Search,
  Settings,
  SquarePen,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-vue-next'
import { Modal, message } from 'ant-design-vue'
import { cn } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const spacesStore = useSpacesStore()
const chatStore = useChatStore()

/** 功能菜单。智能问答不在这里——「新建会话」和底下的会话行就是它的入口 */
const navItems = [
  { path: '/',          icon: LayoutDashboard, label: '概览'     },
  { path: '/documents', icon: FileText,        label: '文档管理' },
  { path: '/search',    icon: Search,          label: '检索调试' },
] as const

const isActive = (path: string) =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)

const creating = ref(false)
const newSpaceName = ref('')
const composingSpace = ref(false)

async function startChat() {
  chatStore.newSession()
  if (!route.path.startsWith('/chat')) await router.push('/chat')
}

async function openSession(id: string) {
  chatStore.switchSession(id)
  if (!route.path.startsWith('/chat')) await router.push('/chat')
}

/**
 * 只有当前空间展开。这不是偷懒：store 里只存着当前空间的会话，
 * 给别的空间画一份会话列表就是在编。点它 = 切过去 = 它成为当前空间 = 会话自然加载。
 */
function toggleSpace(id: string) {
  if (spacesStore.currentSpace?.space_id !== id) spacesStore.switchSpace(id)
}

function confirmDeleteSpace(e: Event, spaceId: string, spaceName: string) {
  e.stopPropagation()
  Modal.confirm({
    title: '删除空间',
    content: `确认删除「${spaceName}」？空间内的文档数据不会被删除。`,
    okText: '删除空间',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await spacesStore.deleteSpace(spaceId)
      message.success('空间已删除')
    },
  })
}

function confirmDeleteSession(e: Event, id: string, title: string) {
  e.stopPropagation()
  Modal.confirm({
    title: '删除会话',
    content: `删除「${title}」后不可恢复。`,
    okText: '删除会话',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await chatStore.removeSession(id)
    },
  })
}

async function handleCreateSpace() {
  const name = newSpaceName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    await spacesStore.createSpace(name)
    composingSpace.value = false
    newSpaceName.value = ''
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <!-- 桌板本身。没有右边框——靠底色差一格与主区分开，不靠线 -->
  <aside
    :class="cn(
      'flex shrink-0 flex-col bg-desk transition-[width] duration-standard ease-settle motion-reduce:transition-none',
      appStore.sidebarCollapsed ? 'w-[60px]' : 'w-[260px]',
    )"
  >
    <!--
      品牌行。不挂 lucide 图标：一个通用图标跟下面的导航图标同形同重同色，
      品牌就读成了第五个菜单项——这是层级问题，不是好看不好看的问题。

      「I」是起首字母。手抄本的 incipit 从一个放大的首字母（versal）开始，
      而 IBM Plex Mono 的大写 I 自带上下横画，本来就是那个形，不用另画。

      框取石墨不取朱红：藏书印本该是红的，但朱红一屏一枚、只标依据，
      而 logo 是常驻的——染红就等于每屏都有一处不是依据的红，那条规则当场作废。
    -->
    <div class="flex h-[60px] shrink-0 items-center gap-sm px-md">
      <span
        aria-hidden="true"
        class="grid h-5 w-5 shrink-0 place-items-center rounded-xs border border-graphite font-callnum text-callnum-sm leading-none text-graphite"
      >I</span>
      <span v-if="!appStore.sidebarCollapsed" class="truncate text-title-lg text-graphite">
        Incipit
      </span>
      <!-- 收起时字标被摘掉，只剩 aria-hidden 的印记，读屏就什么都读不到了 -->
      <span v-else class="sr-only">Incipit</span>
    </div>

    <!-- 功能菜单 -->
    <nav class="shrink-0 px-sm">
      <button
        type="button"
        :class="cn(
          'flex h-8 w-full items-center rounded-sm px-sm text-label text-graphite-70',
          'transition-colors duration-hover ease-settle hover:bg-desk-hover hover:text-graphite motion-reduce:transition-none',
          appStore.sidebarCollapsed ? 'justify-center' : 'gap-sm',
        )"
        @click="startChat"
      >
        <SquarePen class="h-4 w-4 shrink-0" :stroke-width="1.5" />
        <span v-if="!appStore.sidebarCollapsed" class="truncate">新建会话</span>
      </button>

      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="cn(
          'flex h-8 items-center rounded-sm px-sm text-label',
          'transition-colors duration-hover ease-settle motion-reduce:transition-none',
          appStore.sidebarCollapsed ? 'justify-center' : 'gap-sm',
          isActive(item.path)
            ? 'bg-desk-sunken text-graphite'
            : 'text-graphite-70 hover:bg-desk-hover hover:text-graphite',
        )"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" :stroke-width="1.5" />
        <span v-if="!appStore.sidebarCollapsed" class="truncate">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- 知识库：空间是库房，会话挂在库房底下 -->
    <div v-if="!appStore.sidebarCollapsed" class="flex min-h-0 flex-1 flex-col pt-xl">
      <div class="flex shrink-0 items-center gap-xs px-md pb-xs">
        <span class="flex-1 text-meta text-graphite-45">知识库</span>
        <button
          type="button"
          aria-label="新建空间"
          class="grid h-5 w-5 place-items-center rounded-xs text-graphite-45 transition-colors duration-hover ease-settle hover:bg-desk-hover hover:text-graphite motion-reduce:transition-none"
          @click="composingSpace = !composingSpace"
        >
          <Plus class="h-3.5 w-3.5" :stroke-width="1.5" />
        </button>
      </div>

      <div v-if="composingSpace" class="shrink-0 px-sm pb-xs">
        <input
          v-model="newSpaceName"
          placeholder="空间名，Enter 建立"
          autofocus
          class="h-8 w-full rounded-md border border-rule bg-paper px-[10px] text-body-sm text-graphite outline-none transition-colors duration-hover ease-settle placeholder:text-graphite-45 focus:border-rule-strong motion-reduce:transition-none"
          @keyup.enter="handleCreateSpace"
          @keyup.esc="composingSpace = false"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-sm pb-md">
        <template v-for="space in spacesStore.spaces" :key="space.space_id">
          <div
            :class="cn(
              'group flex h-8 cursor-pointer items-center gap-sm rounded-sm px-sm text-label',
              'transition-colors duration-hover ease-settle motion-reduce:transition-none',
              spacesStore.currentSpace?.space_id === space.space_id
                ? 'text-graphite'
                : 'text-graphite-70 hover:bg-desk-hover hover:text-graphite',
            )"
            @click="toggleSpace(space.space_id)"
          >
            <FolderOpen
              v-if="spacesStore.currentSpace?.space_id === space.space_id"
              class="h-4 w-4 shrink-0"
              :stroke-width="1.5"
            />
            <Folder v-else class="h-4 w-4 shrink-0" :stroke-width="1.5" />
            <span class="min-w-0 flex-1 truncate">{{ space.name }}</span>
            <button
              type="button"
              :aria-label="`删除空间 ${space.name}`"
              class="hidden shrink-0 rounded-xs p-[2px] text-graphite-45 hover:text-alert-ink group-hover:block"
              @click="confirmDeleteSpace($event, space.space_id, space.name)"
            >
              <Trash2 class="h-3 w-3" :stroke-width="1.5" />
            </button>
          </div>

          <!-- 只有当前空间摊开它的会话 -->
          <div v-if="spacesStore.currentSpace?.space_id === space.space_id" class="pl-lg">
            <div v-if="chatStore.sessionsLoading" class="space-y-xs py-xs pl-sm" aria-hidden="true">
              <div
                v-for="i in 3"
                :key="i"
                class="h-3 animate-breathe rounded-xs bg-desk-hover"
                :style="{ width: `${[78, 60, 68][i - 1]}%` }"
              />
            </div>

            <template v-else>
              <div
                v-if="chatStore.pendingNew"
                class="flex items-center gap-sm rounded-sm bg-desk-sunken px-sm py-[5px] text-meta text-graphite"
              >
                <span class="min-w-0 flex-1 truncate">新会话</span>
                <span class="shrink-0 font-callnum text-callnum-sm text-graphite-45">待发送</span>
              </div>

              <div
                v-for="session in chatStore.sessions"
                :key="session.id"
                :class="cn(
                  'group flex cursor-pointer items-center gap-sm rounded-sm px-sm py-[5px] text-meta',
                  'transition-colors duration-hover ease-settle motion-reduce:transition-none',
                  chatStore.activeSessionId === session.id && route.path.startsWith('/chat')
                    ? 'bg-desk-sunken text-graphite'
                    : 'text-graphite-45 hover:bg-desk-hover hover:text-graphite',
                )"
                @click="openSession(session.id)"
              >
                <span class="min-w-0 flex-1 truncate">{{ session.title }}</span>
                <SessionNotificationDot
                  v-if="chatStore.sessionNotification(session.id)"
                  :status="chatStore.sessionNotification(session.id)!"
                />
                <button
                  type="button"
                  :aria-label="`删除会话 ${session.title}`"
                  class="hidden shrink-0 rounded-xs p-[2px] text-graphite-45 hover:text-alert-ink group-hover:block"
                  @click="confirmDeleteSession($event, session.id, session.title)"
                >
                  <Trash2 class="h-3 w-3" :stroke-width="1.5" />
                </button>
              </div>

              <p
                v-if="!chatStore.sessions.length && !chatStore.pendingNew"
                class="px-sm py-xs text-meta text-graphite-45"
              >
                无会话
              </p>
            </template>
          </div>
        </template>

        <p v-if="!spacesStore.spaces.length" class="px-sm py-xs text-meta text-graphite-45">
          还没有空间。用上面的 + 建一个。
        </p>
      </div>
    </div>

    <div v-else class="flex-1" />

    <div class="shrink-0 border-t border-rule p-sm">
      <RouterLink
        to="/admin"
        :class="cn(
          'flex h-8 items-center rounded-sm px-sm text-label',
          'transition-colors duration-hover ease-settle motion-reduce:transition-none',
          appStore.sidebarCollapsed ? 'justify-center' : 'gap-sm',
          isActive('/admin')
            ? 'bg-desk-sunken text-graphite'
            : 'text-graphite-70 hover:bg-desk-hover hover:text-graphite',
        )"
      >
        <Settings class="h-4 w-4 shrink-0" :stroke-width="1.5" />
        <span v-if="!appStore.sidebarCollapsed" class="truncate">设置</span>
      </RouterLink>
    </div>
  </aside>
</template>
