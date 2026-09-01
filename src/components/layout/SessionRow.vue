<script setup lang="ts">
import { ref } from 'vue'
import { Archive, MoreHorizontal, Pin, PinOff } from 'lucide-vue-next'

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
}>()

const menuOpen = ref(false)

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
  >
    <button
      type="button"
      :aria-label="`打开会话 ${session.title}`"
      :aria-current="active ? 'page' : undefined"
      class="flex min-w-0 flex-1 items-center gap-sm rounded-sm px-sm py-[5px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue"
      @click="emit('open', session.id)"
    >
      <span class="min-w-0 flex-1 truncate">{{ session.title }}</span>
      <Pin
        v-if="session.pinned_at"
        aria-label="已置顶"
        class="h-3.5 w-3.5 shrink-0 text-graphite-45"
        :stroke-width="1.5"
      />
      <SessionNotificationDot v-if="notification" :status="notification" />
    </button>

    <div class="session-actions flex shrink-0 items-center pr-xs">
      <button
        type="button"
        :aria-label="`${session.pinned_at ? '取消置顶' : '置顶'}会话 ${session.title}`"
        :title="session.pinned_at ? '取消置顶' : '置顶会话'"
        class="session-direct-action grid h-6 w-6 place-items-center rounded-xs text-graphite-45 hover:bg-desk-sunken hover:text-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue"
        @click="pin"
      >
        <PinOff v-if="session.pinned_at" class="h-3.5 w-3.5" :stroke-width="1.5" />
        <Pin v-else class="h-3.5 w-3.5" :stroke-width="1.5" />
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

    <div
      v-if="menuOpen"
      class="absolute right-0 top-full z-30 mt-1 w-36 rounded-md border border-rule-strong bg-paper p-xs shadow-overlay"
    >
      <button
        type="button"
        :aria-label="`${session.pinned_at ? '取消置顶' : '置顶'}会话 ${session.title}`"
        class="flex h-8 w-full items-center gap-sm rounded-sm px-sm text-body-sm text-graphite hover:bg-desk-hover"
        @click="pin"
      >
        <PinOff v-if="session.pinned_at" class="h-4 w-4" :stroke-width="1.5" />
        <Pin v-else class="h-4 w-4" :stroke-width="1.5" />
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
