<script setup lang="ts">
import type { DocumentStatus } from '@/types/document'
import { cn } from '@/lib/utils'

const props = defineProps<{ status: DocumentStatus }>()

const config: Record<DocumentStatus, { label: string; class: string }> = {
  pending:    { label: '等待处理', class: 'bg-zinc-100 text-zinc-500' },
  processing: { label: '处理中',   class: 'bg-blue-50 text-blue-600 animate-pulse' },
  completed:  { label: '已完成',   class: 'bg-green-50 text-green-600' },
  failed:     { label: '处理失败', class: 'bg-red-50 text-red-600' },
  deleting:   { label: '删除中',   class: 'bg-orange-50 text-orange-500' },
  deleted:    { label: '已删除',   class: 'bg-zinc-100 text-zinc-400' },
}
</script>

<template>
  <span
    :class="cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      config[props.status].class
    )"
  >
    {{ config[props.status].label }}
  </span>
</template>
