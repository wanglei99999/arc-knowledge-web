<script setup lang="ts">
import { ref } from 'vue'
import { Send, Square } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  disabled: boolean
  isStreaming: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  stop: []
}>()

const text = ref('')

function handleSend() {
  const content = text.value.trim()
  if (!content || props.disabled) return
  emit('send', content)
  text.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (props.isStreaming) return
    handleSend()
  }
}
</script>

<template>
  <div class="flex items-end gap-2 p-4 border-t border-surface-border bg-white">
    <textarea
      v-model="text"
      rows="1"
      placeholder="输入问题，按 Enter 发送（Shift+Enter 换行）"
      :disabled="disabled && !isStreaming"
      class="flex-1 resize-none rounded-xl border border-surface-border px-4 py-2.5 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50 max-h-40 overflow-y-auto"
      style="min-height: 42px;"
      @keydown="handleKeydown"
      @input="($event.target as HTMLTextAreaElement).style.height = 'auto'; ($event.target as HTMLTextAreaElement).style.height = Math.min(($event.target as HTMLTextAreaElement).scrollHeight, 160) + 'px'"
    />

    <!-- 停止生成 -->
    <button
      v-if="isStreaming"
      class="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
      @click="emit('stop')"
    >
      <Square class="w-4 h-4 fill-white" />
    </button>

    <!-- 发送按钮 -->
    <button
      v-else
      :disabled="!text.trim() || disabled"
      :class="cn(
        'shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
        text.trim() && !disabled
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'bg-surface-muted text-zinc-300 cursor-not-allowed'
      )"
      @click="handleSend"
    >
      <Send class="w-4 h-4" />
    </button>
  </div>
</template>
