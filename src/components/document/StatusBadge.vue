<script setup lang="ts">
import type { DocumentStatus } from '@/types/document'
import { cn } from '@/lib/utils'

const props = defineProps<{ status: DocumentStatus }>()

const config: Record<DocumentStatus, { label: string; class: string }> = {
  pending:   { label: '等待处理', class: 'bg-zinc-100 text-zinc-500' },
  parsing:   { label: '解析中',   class: 'bg-blue-50 text-blue-600 animate-pulse' },
  parsed:    { label: '已解析',   class: 'bg-blue-50 text-blue-500' },
  chunking:  { label: '切片中',   class: 'bg-blue-50 text-blue-600 animate-pulse' },
  chunked:   { label: '已切片',   class: 'bg-blue-50 text-blue-500' },
  embedding: { label: '向量化中', class: 'bg-violet-50 text-violet-600 animate-pulse' },
  indexed:   { label: '已完成',   class: 'bg-green-50 text-green-600' },
  failed:    { label: '处理失败', class: 'bg-red-50 text-red-600' },
  stale:     { label: '索引过期', class: 'bg-amber-50 text-amber-600' },
  deleting:  { label: '删除中',   class: 'bg-orange-50 text-orange-500' },
  deleted:   { label: '已删除',   class: 'bg-zinc-100 text-zinc-400' },
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
