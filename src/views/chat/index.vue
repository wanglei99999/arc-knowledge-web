<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import { Compass, Combine, Quote, SearchX } from 'lucide-vue-next'

const store = useChatStore()
const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<InstanceType<typeof ChatInput> | null>(null)

/** 输入框的草稿。它一有字，就说明人已经想好要问什么，引导卡该退场了 */
const draft = ref('')

/**
 * 四个动作要在一眼之内被区分——这正是"用户此刻在判断它"的定义，
 * 也是类型色在全屏唯一一次出场的理由。
 */
const intents = [
  { icon: Compass, tone: 'text-accent-blue',   label: '探索', question: '这个空间里有哪些文档？' },
  { icon: Combine, tone: 'text-accent-violet', label: '综述', question: '把这些文档的要点综述成一段。' },
  { icon: Quote,   tone: 'text-accent-green',  label: '求证', question: '这个说法的依据是什么？' },
  { icon: SearchX, tone: 'text-accent-amber',  label: '排查', question: '为什么这个问题召不回相关内容？' },
] as const

function scrollToBottom(smooth = true) {
  nextTick(() => {
    messagesEl.value?.scrollTo({
      top: messagesEl.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  })
}

watch(() => store.messages.length, () => scrollToBottom())
watch(
  () => store.messages[store.messages.length - 1]?.content,
  () => { if (store.isStreaming) scrollToBottom(false) },
)

/** 空桌子是一张邀请函：没有会话不该拦着人提问，直接开一张单子就是了 */
function ensureSession() {
  if (!store.activeSessionId && !store.pendingNew) store.newSession()
}

function handleSend(content: string) {
  ensureSession()
  store.sendMessage(content)
}

function pickIntent(question: string) {
  ensureSession()
  nextTick(() => inputEl.value?.fill(question))
}

onMounted(() => scrollToBottom(false))
</script>

<template>
  <!-- 满幅：输入器要贴着纸的底边 -->
  <div class="flex h-full flex-col overflow-hidden">
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-xl py-xl">

      <div v-if="store.messagesLoading" class="mx-auto max-w-prose space-y-md" aria-hidden="true">
        <div
          v-for="i in 4"
          :key="i"
          class="h-3 animate-breathe rounded-xs bg-desk-hover"
          :style="{ width: `${[94, 88, 96, 61][i - 1]}%` }"
        />
      </div>

      <!-- 空桌子是一张邀请函 -->
      <div
        v-else-if="!store.messages.length"
        class="mx-auto flex h-full max-w-prose flex-col justify-center"
      >
        <h1 class="text-display text-balance text-graphite-45">今天要查什么？</h1>

        <!-- 引导卡：草稿一有字就退场——人已经想好了，卡片就成了噪音。
             只淡不移，且退场时保留占位：标题跟卡片一起被 justify-center 居中，
             若把卡片移出文档流，标题会下移补位。inert 一并挡掉隐藏后的聚焦与点击。 -->
        <div
          class="mt-xl grid gap-sm transition-opacity duration-standard ease-settle motion-reduce:transition-none sm:grid-cols-2"
          :class="draft.trim() ? 'opacity-0' : 'opacity-100'"
          :inert="Boolean(draft.trim())"
        >
          <button
            v-for="intent in intents"
            :key="intent.label"
            type="button"
            class="rounded-lg border border-rule bg-paper p-[14px] text-left shadow-contact transition-colors duration-hover ease-settle hover:border-rule-strong hover:bg-desk motion-reduce:transition-none"
            @click="pickIntent(intent.question)"
          >
            <component :is="intent.icon" :class="['h-[18px] w-[18px]', intent.tone]" :stroke-width="1.5" />
            <p class="mt-sm text-label text-graphite">{{ intent.label }}</p>
            <p class="mt-xxs text-meta text-graphite-45">{{ intent.question }}</p>
          </button>
        </div>
      </div>

      <div v-else class="mx-auto max-w-prose space-y-xl">
        <MessageBubble
          v-for="msg in store.messages"
          :key="msg.id"
          :message="msg"
        />
      </div>
    </div>

    <ChatInput
      ref="inputEl"
      v-model:text="draft"
      :disabled="false"
      :is-streaming="store.isStreaming"
      @send="handleSend"
      @stop="store.stopGeneration()"
    />
  </div>
</template>
