<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import CitationCard from './CitationCard.vue'
import type { MessageVO } from '@/types/chat'

const props = defineProps<{ message: MessageVO }>()
</script>

<template>
  <!-- 用户消息：右对齐 -->
  <div v-if="message.role === 'user'" class="flex justify-end">
    <div class="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-white text-sm leading-relaxed">
      {{ message.content }}
    </div>
  </div>

  <!-- AI 消息：左对齐 -->
  <div v-else class="flex gap-3">
    <!-- 头像 -->
    <div class="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold mt-1">
      AI
    </div>

    <div class="flex-1 min-w-0">
      <!-- Markdown 内容 -->
      <div class="rounded-2xl rounded-tl-sm bg-surface-card border border-surface-border shadow-card px-4 py-3 overflow-hidden">
        <MdPreview
          v-if="message.content"
          :id="message.id"
          :model-value="message.content"
          :show-code-row-number="false"
          preview-theme="default"
          class="!bg-transparent !p-0 text-zinc-700"
        />
        <!-- 流式输出光标 -->
        <span
          v-if="message.streaming && !message.content"
          class="inline-block w-2 h-4 bg-zinc-400 animate-pulse rounded-sm"
        />
        <span
          v-if="message.streaming && message.content"
          class="inline-block w-1.5 h-4 ml-0.5 bg-zinc-400 animate-pulse rounded-sm align-middle"
        />
      </div>

      <!-- 引用来源 -->
      <CitationCard
        v-if="!message.streaming && message.citations?.length"
        :citations="message.citations"
      />
    </div>
  </div>
</template>

<style>
/* 覆盖 md-editor-v3 默认样式，融入设计系统 */
.md-editor-preview-wrapper {
  padding: 0 !important;
}
.md-editor-preview {
  font-size: 0.875rem !important;
  line-height: 1.6 !important;
}
.md-editor-preview h2 {
  font-size: 1rem !important;
  font-weight: 600 !important;
  margin-top: 0.75rem !important;
  margin-bottom: 0.375rem !important;
}
.md-editor-preview h3 {
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  margin-top: 0.5rem !important;
  margin-bottom: 0.25rem !important;
}
.md-editor-preview p {
  margin-bottom: 0.375rem !important;
}
.md-editor-preview ul,
.md-editor-preview ol {
  padding-left: 1.25rem !important;
  margin-bottom: 0.375rem !important;
}
.md-editor-preview code:not(pre code) {
  background: #f1f5f9 !important;
  padding: 0.1em 0.3em !important;
  border-radius: 4px !important;
  font-size: 0.8rem !important;
}
.md-editor-preview pre {
  border-radius: 8px !important;
  margin: 0.5rem 0 !important;
}
.md-editor-preview blockquote {
  border-left: 3px solid #6366f1 !important;
  padding-left: 0.75rem !important;
  color: #64748b !important;
  margin: 0.5rem 0 !important;
}
.md-editor-preview table {
  font-size: 0.8rem !important;
  border-collapse: collapse !important;
  width: 100% !important;
}
.md-editor-preview th,
.md-editor-preview td {
  border: 1px solid #e2e8f0 !important;
  padding: 0.25rem 0.5rem !important;
}
.md-editor-preview th {
  background: #f8fafc !important;
}
</style>
