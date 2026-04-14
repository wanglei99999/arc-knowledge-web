<script setup lang="ts">
import { Plus, MessageSquare, Trash2 } from 'lucide-vue-next'
import { Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useChatStore } from '@/stores/chat'
import { cn } from '@/lib/utils'

const store = useChatStore()

function confirmDelete(id: string, title: string, e: MouseEvent) {
  e.stopPropagation()
  Modal.confirm({
    title: '删除会话',
    content: `删除「${title}」后不可恢复。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await store.removeSession(id)
    },
  })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 新建会话按钮 -->
    <div class="p-3 shrink-0">
      <button
        class="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        @click="store.newSession()"
      >
        <Plus class="w-4 h-4" />
        新建会话
      </button>
    </div>

    <!-- 会话列表 -->
    <div class="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
      <div
        v-if="store.sessionsLoading"
        class="flex justify-center py-8"
      >
        <a-spin size="small" />
      </div>

      <template v-else>
        <div
          v-for="session in store.sessions"
          :key="session.id"
          :class="cn(
            'group relative flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
            store.activeSessionId === session.id
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-zinc-100 text-zinc-700'
          )"
          @click="store.switchSession(session.id)"
        >
          <MessageSquare class="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate leading-tight">{{ session.title }}</p>
            <p class="text-xs text-zinc-400 mt-0.5">{{ dayjs(session.updated_at).format('MM-DD HH:mm') }}</p>
          </div>

          <!-- 删除按钮（hover 显示） -->
          <button
            class="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:text-red-500 transition-all"
            @click="confirmDelete(session.id, session.title, $event)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          v-if="!store.sessions.length"
          class="flex flex-col items-center justify-center py-12 gap-2 text-zinc-400"
        >
          <MessageSquare class="w-8 h-8 opacity-30" />
          <p class="text-xs">暂无会话</p>
        </div>
      </template>
    </div>
  </div>
</template>
