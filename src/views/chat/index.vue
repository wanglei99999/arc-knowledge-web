<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import SessionList from '@/components/chat/SessionList.vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import { MessageSquare } from 'lucide-vue-next'

const store = useChatStore()
const messagesEl = ref<HTMLElement | null>(null)

function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTo({
        top: messagesEl.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      })
    }
  })
}

// 新消息时自动滚动到底部
watch(() => store.messages.length, () => scrollToBottom())
// 流式输出时持续滚动
watch(
  () => store.messages[store.messages.length - 1]?.content,
  () => { if (store.isStreaming) scrollToBottom(false) },
)

function handleSend(content: string) {
  store.sendMessage(content)
}

onMounted(async () => {
  await store.fetchSessions()
  scrollToBottom(false)
})
</script>

<template>
  <!-- 负边距抵消 AppLayout main 的 p-6，充满整个内容区 -->
  <div class="flex -m-6 overflow-hidden" style="height: calc(100vh - 60px)">

    <!-- 左侧：会话列表 -->
    <aside class="w-60 shrink-0 flex flex-col border-r border-surface-border bg-surface-card overflow-hidden">
      <div class="px-4 py-3 border-b border-surface-border shrink-0">
        <h2 class="text-sm font-semibold text-zinc-700">智能问答</h2>
      </div>
      <div class="flex-1 overflow-hidden">
        <SessionList />
      </div>
    </aside>

    <!-- 右侧：消息区 + 输入框 -->
    <div class="flex-1 flex flex-col overflow-hidden bg-surface">

      <!-- 消息列表 -->
      <div
        ref="messagesEl"
        class="flex-1 overflow-y-auto px-6 py-6 space-y-5"
      >
        <!-- 加载中 -->
        <div v-if="store.messagesLoading" class="flex justify-center py-16">
          <a-spin />
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="!store.messages.length && store.activeSessionId"
          class="flex flex-col items-center justify-center h-full gap-4 text-zinc-400"
        >
          <MessageSquare class="w-12 h-12 opacity-20" />
          <p class="text-sm">开始提问，AI 将基于知识库为您解答</p>
        </div>

        <!-- 无会话 -->
        <div
          v-else-if="!store.activeSessionId"
          class="flex flex-col items-center justify-center h-full gap-4 text-zinc-400"
        >
          <MessageSquare class="w-12 h-12 opacity-20" />
          <p class="text-sm">点击左侧「新建会话」开始</p>
        </div>

        <!-- 消息列表 -->
        <template v-else>
          <MessageBubble
            v-for="msg in store.messages"
            :key="msg.id"
            :message="msg"
          />
        </template>
      </div>

      <!-- 输入框 -->
      <ChatInput
        :disabled="!store.activeSessionId"
        :is-streaming="store.isStreaming"
        @send="handleSend"
        @stop="store.stopGeneration()"
      />
    </div>
  </div>
</template>
