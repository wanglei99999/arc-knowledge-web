<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ArrowUp, Square, Plus, X, Paperclip, Library, Check } from 'lucide-vue-next'
import { useSpacesStore } from '@/stores/spaces'
import { useChatStore } from '@/stores/chat'
import { uploadDocument } from '@/api/document'
import { ACCEPTED_MIME, ACCEPTED_LABEL, isAccepted } from '@/lib/file-types'
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
const chatStore = useChatStore()
const text = ref('')
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)

/** 一次只开一个浮层 */
const menu = ref<'add' | 'space' | null>(null)

const space = computed(() => spacesStore.currentSpace)

/**
 * 空间是会话的属性，在建立那一刻定下来。所以抬头只在新建对话时出现：
 * 打开一条历史会话时它已经属于某个空间了（侧栏里就嵌在那个空间底下），
 * 再显示一遍是把一次性的选择变成永久的装饰。
 */
const isNewConversation = computed(() => !chatStore.activeSessionId)

/**
 * /chat 的 space_id 是必填（app/api/routers/chat.py）。没有空间就发不出去，
 * 这里必须自己挡住 —— 把注定失败的请求丢给服务器不叫容错。
 */
const canSend = computed(() =>
  Boolean(text.value.trim()) && Boolean(space.value) && !props.disabled,
)

/**
 * 加进来的文档走的是入库管线，不是这条消息的附件——
 * /chat 只收 query 和 space_id，模型永远看不到文件本身。
 * 所以这里的状态只到"交给管线"为止，后面的解析/分片/向量化归文档管理。
 */
interface Upload {
  id: string
  name: string
  pct: number
  state: 'uploading' | 'queued' | 'failed'
  reason?: string
}
const uploads = ref<Upload[]>([])

/** 只有真进了管线，"加的是知识库不是这条消息"这句话才需要说 */
const anyIngesting = computed(() => uploads.value.some(u => u.state !== 'failed'))

function reasonOf(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail || '连不上服务器'
}

function patch(id: string, next: Partial<Upload>) {
  uploads.value = uploads.value.map(u => (u.id === id ? { ...u, ...next } : u))
}

function dismiss(id: string) {
  uploads.value = uploads.value.filter(u => u.id !== id)
}

async function ingest(file: File) {
  const spaceId = space.value?.space_id
  if (!spaceId) return
  const id = `${file.name}-${Date.now()}-${Math.random()}`
  uploads.value = [...uploads.value, { id, name: file.name, pct: 0, state: 'uploading' }]
  try {
    await uploadDocument(file, spaceId, pct => patch(id, { pct }))
    patch(id, { pct: 100, state: 'queued' })
  } catch (err) {
    patch(id, { state: 'failed', reason: reasonOf(err) })
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  Array.from(input.files ?? []).filter(isAccepted).forEach(ingest)
  input.value = ''
}

function pickFiles() {
  menu.value = null
  fileEl.value?.click()
}

function chooseSpace(id: string) {
  spacesStore.switchSpace(id)
  menu.value = null
}

function clearSpace() {
  spacesStore.clearSpace()
  menu.value = null
}

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
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
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
    <div class="relative mx-auto w-full max-w-prose">

      <!-- 点外面关掉浮层 -->
      <div v-if="menu" class="fixed inset-0 z-30" @click="menu = null" />

      <!-- + 的菜单 -->
      <Transition name="overlay">
        <div
          v-if="menu === 'add'"
          class="absolute bottom-full left-0 right-0 z-40 mb-sm rounded-lg border border-rule-strong bg-paper p-xs shadow-overlay"
        >
          <p class="px-sm py-xs text-meta text-graphite-45">添加</p>
          <button
            type="button"
            :disabled="!space"
            :class="cn(
              'flex h-[30px] w-full items-center gap-sm rounded-sm px-sm text-body-sm',
              'transition-colors duration-hover ease-settle motion-reduce:transition-none',
              space ? 'text-graphite hover:bg-desk-hover' : 'cursor-not-allowed text-graphite-25',
            )"
            @click="pickFiles"
          >
            <Paperclip class="h-4 w-4 shrink-0" :stroke-width="1.5" />
            <span class="flex-1 text-left">文件和文件夹</span>
            <span class="shrink-0 text-meta" :class="space ? 'text-graphite-45' : 'text-graphite-25'">
              {{ space ? ACCEPTED_LABEL : '先选一个工作空间' }}
            </span>
          </button>
        </div>
      </Transition>

      <!-- 空间选择器：只有新建对话才需要挑库房 -->
      <Transition name="overlay">
        <div
          v-if="menu === 'space' && isNewConversation"
          class="absolute bottom-full left-0 z-40 mb-sm w-64 rounded-lg border border-rule-strong bg-paper p-xs shadow-overlay"
        >
          <p class="px-sm py-xs text-meta text-graphite-45">工作空间</p>
          <button
            v-for="s in spacesStore.spaces"
            :key="s.space_id"
            type="button"
            class="flex h-[30px] w-full items-center gap-sm rounded-sm px-sm text-body-sm text-graphite transition-colors duration-hover ease-settle hover:bg-desk-hover motion-reduce:transition-none"
            @click="chooseSpace(s.space_id)"
          >
            <Check
              class="h-3.5 w-3.5 shrink-0"
              :class="s.space_id === space?.space_id ? 'text-graphite' : 'text-transparent'"
              :stroke-width="1.5"
            />
            <span class="min-w-0 flex-1 truncate text-left">{{ s.name }}</span>
          </button>
          <p v-if="!spacesStore.spaces.length" class="px-sm py-xs text-meta text-graphite-45">
            还没有工作空间。用侧栏「知识库」旁的 + 建一个。
          </p>
        </div>
      </Transition>

      <!-- 调阅单抬头：压在后面的那张卡，只露出上边缘。只在新建对话时出现。
           不描边——它靠底色就认得出来，轮廓只会在接缝上多画一条线。
           圆角与下面那张卡一致，否则接缝是歪的 -->
      <div
        v-if="isNewConversation"
        class="mx-md flex items-center gap-sm rounded-t-xl bg-desk px-md pt-xs pb-md -mb-sm"
      >
        <!-- 叉：选中了才有得叉 -->
        <button
          v-if="space"
          type="button"
          :aria-label="`不限定工作空间（当前 ${space.name}）`"
          class="grid h-4 w-4 shrink-0 place-items-center rounded-full text-graphite-45 transition-colors duration-hover ease-settle hover:bg-desk-sunken hover:text-graphite motion-reduce:transition-none"
          @click="clearSpace"
        >
          <X class="h-3 w-3" :stroke-width="1.5" />
        </button>
        <Library v-else class="h-3.5 w-3.5 shrink-0 text-graphite-45" :stroke-width="1.5" />

        <button
          type="button"
          :aria-expanded="menu === 'space'"
          class="min-w-0 flex-1 truncate rounded-xs text-left font-callnum text-callnum-sm text-graphite-70 transition-colors duration-hover ease-settle hover:text-graphite motion-reduce:transition-none"
          @click="menu = menu === 'space' ? null : 'space'"
        >
          {{ space?.name ?? '选择工作空间' }}
        </button>
      </div>

      <!-- 输入的那张卡 -->
      <div
        :class="cn(
          // 它压在纸上，用 slip 的影 ——「不浮」说的是动作（聚焦不跳），
          // 不是存在感：一张压在别的纸上面的单子当然有影
          'relative rounded-xl border bg-paper p-md shadow-slip',
          'transition-colors duration-standard ease-settle motion-reduce:transition-none',
          // 焦点指示是光标本身：它是石墨的，16.58:1，闪在你要打字的地方。
          // 边只是补一格（rule → rule-strong），不承担 SC 1.4.11 ——
          // 让边去当指示器，就得顶到 3:1，而 3:1 的深边套在 640px 的单子上
          // 就是一条黑线。有光标的用光标，没光标的（按钮、链接）才用环。
          // 只认 textarea：focus-within 连点 + 号都会让整张单子跟着变
          'has-[textarea:focus]:border-rule-strong',
          // 轮廓由 slip 的影加这道浅边合力交代 —— 重边配小圆角就是塑料感
          'border-rule',
        )"
      >
        <!-- 入库中的文档 -->
        <ul v-if="uploads.length" class="mb-md space-y-xs">
          <li
            v-for="u in uploads"
            :key="u.id"
            :class="cn(
              'flex items-center gap-sm rounded-sm px-sm py-xs',
              u.state === 'failed' ? 'bg-alert-fill' : 'bg-desk',
            )"
          >
            <span
              class="min-w-0 flex-1 truncate font-callnum text-callnum-sm"
              :class="u.state === 'failed' ? 'text-alert-ink' : 'text-graphite-70'"
            >
              {{ u.name }}
            </span>

            <span v-if="u.state === 'uploading'" class="h-[2px] w-16 overflow-hidden rounded-full bg-desk-sunken">
              <span
                class="block h-full rounded-full bg-graphite-70 transition-[width] duration-standard ease-settle motion-reduce:transition-none"
                :style="{ width: `${u.pct}%` }"
              />
            </span>
            <span v-else-if="u.state === 'queued'" class="shrink-0 text-meta text-graphite-45">正在入库</span>
            <span v-else class="shrink-0 text-meta text-alert-ink">{{ u.reason }}，重新选一次</span>

            <button
              type="button"
              :aria-label="`移除 ${u.name}`"
              class="grid h-5 w-5 shrink-0 place-items-center rounded-xs text-graphite-45 transition-colors duration-hover ease-settle hover:text-graphite motion-reduce:transition-none"
              @click="dismiss(u.id)"
            >
              <X class="h-3 w-3" :stroke-width="1.5" />
            </button>
          </li>

          <!-- 加进来的文档进的是知识库，不是这条消息。这句话不能省：
               两者的语义差得很远，而 + 号长得就像"附件"。
               全都失败时就不必说了——那时没有任何东西进了知识库 -->
          <li v-if="anyIngesting" class="px-sm text-meta text-graphite-45">
            文档加进的是「{{ space?.name }}」，不是这条消息。入库完成后才能被检索到。
          </li>
        </ul>

        <textarea
          ref="textareaEl"
          v-model="text"
          rows="1"
          :placeholder="space ? '随心输入' : '先选一个工作空间'"
          :disabled="disabled && !isStreaming"
          class="block max-h-[200px] min-h-[36px] w-full resize-none bg-transparent text-body text-graphite outline-none placeholder:text-graphite-45 disabled:text-graphite-45"
          @keydown="handleKeydown"
          @input="resize"
        />

        <div class="mt-sm flex items-center justify-between">
          <button
            type="button"
            aria-label="添加"
            :aria-expanded="menu === 'add'"
            :class="cn(
              'grid h-7 w-7 place-items-center rounded-sm transition-colors duration-hover ease-settle motion-reduce:transition-none',
              menu === 'add'
                ? 'bg-desk-hover text-graphite'
                : 'text-graphite-70 hover:bg-desk-hover hover:text-graphite',
            )"
            @click="menu = menu === 'add' ? null : 'add'"
          >
            <Plus class="h-4 w-4" :stroke-width="1.5" />
          </button>
          <input
            ref="fileEl"
            type="file"
            multiple
            class="hidden"
            :accept="ACCEPTED_MIME.join(',')"
            @change="onPick"
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
  </div>
</template>
