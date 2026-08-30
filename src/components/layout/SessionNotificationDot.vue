<script setup lang="ts">
import { computed } from 'vue'

import type { SessionNotification } from '@/types/chat'

const props = defineProps<{
  status: SessionNotification
}>()

const label = computed(() => (
  props.status === 'completed_unread'
    ? '会话已完成，有未读结果'
    : '会话处理失败'
))
</script>

<template>
  <span
    role="status"
    :aria-label="label"
    :title="label"
    :class="[
      'h-2 w-2 shrink-0 rounded-full',
      status === 'completed_unread' ? 'bg-accent-blue' : 'bg-alert-ink',
    ]"
  />
</template>
