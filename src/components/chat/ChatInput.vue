<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ArrowUp, Square } from 'lucide-vue-next'
import { useSpacesStore } from '@/stores/spaces'
import { cn } from '@/lib/utils'

const props = defineProps<{
  disabled: boolean
  isStreaming: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  stop: []
}>()

const spacesStore = useSpacesStore()
const text = ref('')
const textareaEl = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => Boolean(text.value.trim()) && !props.disabled)

function handleSend() {
  if (!canSend.value) return
  emit('send', text.value.trim())
  text.value = ''
  nextTick(resize)
}

function resize() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (props.isStreaming) return
    handleSend()
  }
}

/** 空状态的意图卡把问题填进来，光标落在末尾 */
function fill(question: string) {
  text.value = question
  nextTick(() => {
    resize()
    textareaEl.value?.focus()
  })
}

defineExpose({ fill })
</script>

<template>
  <div class="shrink-0 px-xl pb-lg pt-sm">
    <div class="mx-auto w-full max-w-prose">

      <!-- 调阅单抬头：压在后面的那张卡，只露出上边缘。写明你要从哪个库房调东西 -->
      <div
        class="mx-md rounded-t-md border border-b-0 border-rule-strong bg-desk px-md pt-xxs pb-md -mb-sm"
      >
        <span class="font-callnum text-callnum-sm text-graphite-70">
          空间 / {{ spacesStore.currentSpace?.name ?? '未选择' }}
        </span>
      </div>

      <!-- 输入的那张卡。聚焦时上浮 3px，边框从 rule-strong 收紧到 graphite-25 -->
      <div
        :class="cn(
          'relative flex items-end gap-sm rounded-lg border bg-paper p-md',
          'transition-[transform,border-color] duration-standard ease-settle',
          'motion-reduce:transition-none motion-reduce:transform-none',
          // 焦点环走 focus-ring token：2px 石墨、2px 外偏移。
          // 边框收紧只是装饰，graphite-25 是 1.92:1，撑不起 SC 1.4.11
          'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
          'focus-within:-translate-y-travel focus-within:border-graphite-25',
          'border-rule-strong',
        )"
      >
        <textarea
          ref="textareaEl"
          v-model="text"
          rows="1"
          placeholder="问点什么，Enter 发送，Shift+Enter 换行"
          :disabled="disabled && !isStreaming"
          class="max-h-40 flex-1 resize-none self-center bg-transparent text-body text-graphite outline-none placeholder:text-graphite-45 disabled:text-graphite-45"
          @keydown="handleKeydown"
          @input="resize"
        />

        <!-- 停止生成 -->
        <button
          v-if="isStreaming"
          type="button"
          aria-label="停止生成"
          class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-graphite text-paper transition-transform duration-hover ease-settle active:scale-press motion-reduce:transition-none motion-reduce:active:scale-100"
          @click="emit('stop')"
        >
          <Square class="h-3 w-3 fill-current" :stroke-width="1.5" />
        </button>

        <!-- 发送：石墨实心的圆键。不是朱红的——发送不是出处 -->
        <button
          v-else
          type="button"
          aria-label="发送"
          :disabled="!canSend"
          :class="cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full',
            'transition-[background-color,transform] duration-hover ease-settle',
            'motion-reduce:transition-none motion-reduce:active:scale-100',
            canSend
              ? 'bg-graphite text-paper hover:bg-graphite-70 active:scale-press'
              : 'cursor-not-allowed bg-desk-sunken text-graphite-45',
          )"
          @click="handleSend"
        >
          <ArrowUp class="h-4 w-4" :stroke-width="1.5" />
        </button>
      </div>
    </div>
  </div>
</template>
