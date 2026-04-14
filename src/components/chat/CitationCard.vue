<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, FileText } from 'lucide-vue-next'
import type { Citation } from '@/types/chat'

defineProps<{ citations: Citation[] }>()

const expanded = ref(false)
</script>

<template>
  <div class="mt-3 rounded-lg border border-surface-border overflow-hidden text-xs">
    <!-- 折叠头 -->
    <button
      class="flex items-center gap-2 w-full px-3 py-2 bg-surface-muted hover:bg-zinc-100 transition-colors text-left"
      @click="expanded = !expanded"
    >
      <FileText class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      <span class="flex-1 text-zinc-500 font-medium">引用来源（{{ citations.length }} 处）</span>
      <ChevronDown
        class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200"
        :class="{ 'rotate-180': expanded }"
      />
    </button>

    <!-- 展开内容 -->
    <div v-if="expanded" class="divide-y divide-surface-border">
      <div
        v-for="(cite, i) in citations"
        :key="i"
        class="px-3 py-2.5 space-y-1"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-zinc-600">{{ cite.doc_name }}</span>
          <span class="text-zinc-400">切片 #{{ cite.chunk_index + 1 }} · 相关度 {{ (cite.score * 100).toFixed(0) }}%</span>
        </div>
        <p class="text-zinc-500 leading-relaxed line-clamp-3">{{ cite.content }}</p>
      </div>
    </div>
  </div>
</template>
