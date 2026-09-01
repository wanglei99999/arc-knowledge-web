<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Archive, MoreHorizontal, Pencil, Pin } from 'lucide-vue-next'

import SessionNotificationDot from '@/components/layout/SessionNotificationDot.vue'
import { cn } from '@/lib/utils'
import type { SessionNotification, SessionVO } from '@/types/chat'

const props = defineProps<{
  session: SessionVO
  active: boolean
  busy: boolean
  notification?: SessionNotification
}>()

const emit = defineEmits<{
  open: [sessionId: string]
  archive: [sessionId: string]
  pin: [sessionId: string]
  rename: [
    sessionId: string,
    title: string,
    complete: (saved: boolean) => void,
  ]
}>()

const menuOpen = ref(false)
const editing = ref(false)
const saving = ref(false)
const draftTitle = ref('')
const renameError = ref('')
const titleInput = ref<HTMLInputElement | null>(null)
const openButton = ref<HTMLButtonElement | null>(null)

function openMenu() {
  if (!editing.value) menuOpen.value = true
}

function handleContextMenu(event: MouseEvent) {
  if (editing.value) return
  event.preventDefault()
  openMenu()
}

function startRename() {
  menuOpen.value = false
  editing.value = true
  saving.value = false
  draftTitle.value = props.session.title
  renameError.value = ''
  void nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

function finishRename(restoreFocus: boolean) {
  const shouldRestoreFocus = restoreFocus
    && document.activeElement === titleInput.value
  editing.value = false
  renameError.value = ''
  if (shouldRestoreFocus) {
    void nextTick(() => openButton.value?.focus())
  }
}

function cancelRename() {
  if (saving.value) return
  draftTitle.value = props.session.title
  finishRename(true)
}

function submitRename(restoreFocus: boolean) {
  if (!editing.value || saving.value) return

  const title = draftTitle.value.trim()
  if (!title) {
    renameError.value = '会话标题不能为空'
    void nextTick(() => titleInput.value?.focus())
    return
  }
  if (title === props.session.title) {
    finishRename(restoreFocus)
    return
  }

  saving.value = true
  renameError.value = ''
  emit('rename', props.session.id, title, (saved) => {
    saving.value = false
    if (saved) {
      finishRename(restoreFocus)
      return
    }
    renameError.value = '保存失败，请重试'
    void nextTick(() => titleInput.value?.focus())
  })
}

function archive() {
  if (props.busy) return
  menuOpen.value = false
  emit('archive', props.session.id)
}

function pin() {
  menuOpen.value = false
  emit('pin', props.session.id)
}
</script>

<template>
  <div
    :class="cn(
      'session-row group relative flex items-center rounded-sm text-meta',
      'transition-colors duration-hover ease-settle motion-reduce:transition-none',
      active
        ? 'bg-desk-sunken text-graphite'
        : 'text-graphite-45 hover:bg-desk-hover hover:text-graphite',
    )"
    @contextmenu="handleContextMenu"
  >
    <div
      v-if="editing"
      class="relative min-w-0 flex-1 px-sm py-[3px]"
    >
      <input
        ref="titleInput"
        v-model="draftTitle"
        type="text"
        aria-label="会话标题"
        :aria-invalid="Boolean(renameError)"
        :aria-describedby="renameError ? `session-rename-error-${session.id}` : undefined"
        :readonly="saving"
        maxlength="100"
        class="h-7 w-full min-w-0 rounded-xs border border-rule-strong bg-paper px-xs text-meta text-graphite outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
        @keydown.enter.prevent="submitRename(true)"
        @keydown.esc.prevent.stop="cancelRename"
        @blur="submitRename(false)"
      >
      <span
        v-if="renameError"
        :id="`session-rename-error-${session.id}`"
        role="alert"
        class="absolute left-sm top-full z-40 mt-1 whitespace-nowrap rounded-xs bg-paper px-xs py-0.5 text-meta text-accent-red shadow-overlay"
      >
        {{ renameError }}
      </span>
    </div>

    <template v-else>
      <button
        ref="openButton"
        type="button"
        :aria-label="`打开会话 ${session.title}`"
        :aria-current="active ? 'page' : undefined"
        class="flex min-w-0 flex-1 items-center gap-sm rounded-sm px-sm py-[5px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue"
        @click="emit('open', session.id)"
      >
        <span class="min-w-0 flex-1 truncate">{{ session.title }}</span>
        <SessionNotificationDot v-if="notification" :status="notification" />
      </button>

      <div class="session-actions flex shrink-0 items-center pr-xs">
        <button
          type="button"
          :aria-label="`重命名会话 ${session.title}`"
          title="重命名会话"
          class="session-direct-action grid h-6 w-6 place-items-center rounded-xs text-graphite-45 hover:bg-desk-sunken hover:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue"
          @click="startRename"
        >
          <Pencil class="h-3.5 w-3.5" :stroke-width="1.5" />
        </button>

        <button
          type="button"
          :aria-label="`${session.pinned_at ? '取消置顶' : '置顶'}会话 ${session.title}`"
          :title="session.pinned_at ? '取消置顶' : '置顶会话'"
          class="session-direct-action grid h-6 w-6 place-items-center rounded-xs text-graphite-45 hover:bg-desk-sunken hover:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue"
          @click="pin"
        >
          <Pin
            class="h-3.5 w-3.5"
            :fill="session.pinned_at ? 'currentColor' : 'none'"
            :stroke-width="1.5"
          />
        </button>

        <button
          type="button"
          :aria-label="`归档会话 ${session.title}`"
          :disabled="busy"
          :title="busy ? '会话处理中，暂时不能归档' : '归档会话'"
          class="session-direct-action grid h-6 w-6 place-items-center rounded-xs text-graphite-45 hover:bg-desk-sunken hover:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue disabled:cursor-not-allowed disabled:opacity-40"
          @click="archive"
        >
          <Archive class="h-3.5 w-3.5" :stroke-width="1.5" />
        </button>

        <button
          type="button"
          aria-label="更多会话操作"
          :aria-expanded="menuOpen"
          class="session-more-action grid h-6 w-6 place-items-center rounded-xs text-graphite-45"
          @click="menuOpen = !menuOpen"
        >
          <MoreHorizontal class="h-4 w-4" :stroke-width="1.5" />
        </button>
      </div>
    </template>

    <div
      v-if="menuOpen"
      role="group"
      aria-label="会话操作"
      class="absolute right-0 top-full z-30 mt-1 w-36 rounded-md border border-rule-strong bg-paper p-xs shadow-overlay"
    >
      <button
        type="button"
        :aria-label="`重命名会话 ${session.title}`"
        class="flex h-8 w-full items-center gap-sm rounded-sm px-sm text-body-sm text-graphite hover:bg-desk-hover"
        @click="startRename"
      >
        <Pencil class="h-4 w-4" :stroke-width="1.5" />
        重命名
      </button>

      <button
        type="button"
        :aria-label="`${session.pinned_at ? '取消置顶' : '置顶'}会话 ${session.title}`"
        class="flex h-8 w-full items-center gap-sm rounded-sm px-sm text-body-sm text-graphite hover:bg-desk-hover"
        @click="pin"
      >
        <Pin
          class="h-4 w-4"
          :fill="session.pinned_at ? 'currentColor' : 'none'"
          :stroke-width="1.5"
        />
        {{ session.pinned_at ? '取消置顶' : '置顶' }}
      </button>

      <button
        type="button"
        :aria-label="`归档会话 ${session.title}`"
        :disabled="busy"
        class="flex h-8 w-full items-center gap-sm rounded-sm px-sm text-body-sm text-graphite hover:bg-desk-hover disabled:cursor-not-allowed disabled:opacity-40"
        @click="archive"
      >
        <Archive class="h-4 w-4" :stroke-width="1.5" />
        归档
      </button>
    </div>
  </div>
</template>

<style scoped>
.session-more-action {
  display: grid;
}

.session-direct-action {
  display: none;
}

@media (hover: hover) and (pointer: fine) {
  .session-actions {
    opacity: 0;
  }

  .session-row:hover .session-actions,
  .session-row:focus-within .session-actions {
    opacity: 1;
  }

  .session-more-action {
    display: none;
  }

  .session-direct-action {
    display: grid;
  }
}
</style>
