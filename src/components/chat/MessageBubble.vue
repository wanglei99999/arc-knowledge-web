<script setup lang="ts">
import { computed } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import CitationCard from './CitationCard.vue'
import MessageAttachment from './MessageAttachment.vue'
import TurnRecoveryActions from './TurnRecoveryActions.vue'
import type { MessageVO } from '@/types/chat'

const props = defineProps<{ message: MessageVO }>()

const emit = defineEmits<{
  retryAttachment: [turnId: string, attachmentId: string]
  retryUpload: [turnId: string, attachmentId: string, file: File]
  ignoreAttachment: [turnId: string, attachmentId: string]
  addAttachments: [turnId: string, files: File[]]
  cancelTurn: [turnId: string]
}>()

const showTurnRecovery = computed(() => (
  props.message.processing_status === 'waiting_files'
  && Boolean(props.message.attachments?.length)
  && props.message.attachments!.every(attachment => (
    attachment.status === 'failed' || attachment.status === 'ignored'
  ))
))
</script>

<template>
  <!-- 提问：桌板色的一小张卡，右对齐 -->
  <div v-if="message.role === 'user'" class="flex justify-end">
    <div class="max-w-[85%] rounded-lg bg-desk px-[14px] py-[10px] text-body text-graphite">
      <p>{{ message.content }}</p>
      <div v-if="message.attachments?.length" class="mt-sm space-y-xs">
        <MessageAttachment
          v-for="attachment in message.attachments"
          :key="attachment.attachment_id"
          :attachment="attachment"
          :actions-enabled="message.processing_status === 'waiting_files'"
          @retry="emit('retryAttachment', props.message.id, $event)"
          @retry-upload="(attachmentId, file) => emit('retryUpload', props.message.id, attachmentId, file)"
          @ignore="emit('ignoreAttachment', props.message.id, $event)"
        />
      </div>
      <TurnRecoveryActions
        v-if="showTurnRecovery"
        :turn-id="message.id"
        @add-attachments="emit('addAttachments', props.message.id, $event)"
        @cancel="emit('cancelTurn', props.message.id)"
      />
    </div>
  </div>

  <!-- 回答：直接落在纸上。没有卡、没有边、没有头像——它就是桌上的那页纸 -->
  <div v-else class="min-w-0">
    <MdPreview
      v-if="message.content"
      :id="message.id"
      :model-value="message.content"
      :show-code-row-number="false"
      preview-theme="default"
      class="arc-md !bg-transparent !p-0"
    />

    <!-- 流式光标：呼吸的石墨块。它对应"字正在一个个到达"这件真事 -->
    <span
      v-if="message.streaming"
      class="ml-[2px] inline-block h-4 w-[2px] animate-breathe rounded-full bg-graphite-45 align-middle"
      aria-hidden="true"
    />

    <CitationCard
      v-if="!message.streaming && message.citations?.length"
      :citations="message.citations"
    />
  </div>
</template>

<style>
/* md-editor-v3 自带一套 slate 蓝灰 + 靛蓝的默认皮肤，逐条按 DESIGN.md 覆盖。
   作用域限定在 .arc-md 内，避免影响其他页面仍在用的旧样式。 */
.arc-md .md-editor-preview-wrapper {
  padding: 0 !important;
}
.arc-md .md-editor-preview {
  color: #1C1C1C !important;
  font-family: 'IBM Plex Sans', 'IBM Plex Sans SC', sans-serif !important;
  font-size: 14px !important;
  line-height: 1.65 !important;
  /* md-editor 默认 break-all，会把 `metadata filtering` 拦腰断成 filteri / ng。
     normal 下中文照常换行，西文术语保持完整。 */
  word-break: normal !important;
  overflow-wrap: break-word !important;
}

/* 层级靠字重和留白，不靠字号跨度。18px / 15px 就是 title-lg 与 title */
.arc-md .md-editor-preview h1,
.arc-md .md-editor-preview h2 {
  font-size: 18px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  margin: 16px 0 8px !important;
}
.arc-md .md-editor-preview h3,
.arc-md .md-editor-preview h4 {
  font-size: 15px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  margin: 12px 0 4px !important;
}
.arc-md .md-editor-preview p {
  margin: 0 0 8px !important;
}
/* Tailwind 的 preflight 把 list-style 清成 none，编号会整个消失。
   Markdown 的有序列表里顺序是信息，必须还回去。 */
.arc-md .md-editor-preview ul,
.arc-md .md-editor-preview ol {
  padding-left: 20px !important;
  margin: 0 0 8px !important;
}
.arc-md .md-editor-preview ul { list-style: disc outside !important; }
.arc-md .md-editor-preview ol { list-style: decimal outside !important; }
.arc-md .md-editor-preview li { display: list-item !important; }
.arc-md .md-editor-preview li::marker { color: #6C6C6C !important; }
.arc-md .md-editor-preview a {
  color: #1C1C1C !important;
  text-decoration: underline !important;
  text-underline-offset: 2px !important;
}

/* 索书号族：等宽的一切 */
.arc-md .md-editor-preview code:not(pre code) {
  background: #F1F1F1 !important;
  color: #1C1C1C !important;
  font-family: 'IBM Plex Mono', ui-monospace, monospace !important;
  font-size: 12px !important;
  padding: 1px 5px !important;
  border-radius: 4px !important;
}
.arc-md .md-editor-preview pre {
  border: 1px solid #E4E4E4 !important;
  border-radius: 8px !important;
  margin: 8px 0 !important;
}
.arc-md .md-editor-preview pre code {
  font-family: 'IBM Plex Mono', ui-monospace, monospace !important;
  font-size: 12px !important;
}

/* 引文的左线必须停在 1px 且不出石墨族：它是发丝格线，
   再粗或再带色就变成规范头一条禁令里的彩色侧条。 */
.arc-md .md-editor-preview blockquote {
  border-left: 1px solid #D6D6D6 !important;
  /* md-editor 默认给引用块填了底。填底是失败专用的——
     全系统只有那一处色块，引用块抢不得。 */
  background: transparent !important;
  padding: 0 0 0 12px !important;
  margin: 8px 0 !important;
  color: #5B5B5B !important;
}

/* 表格：桌上的一张表，靠格线分隔 */
.arc-md .md-editor-preview table {
  font-size: 13px !important;
  border-collapse: collapse !important;
  width: 100% !important;
}
.arc-md .md-editor-preview th,
.arc-md .md-editor-preview td {
  border: 1px solid #E4E4E4 !important;
  padding: 4px 8px !important;
}
.arc-md .md-editor-preview th {
  background: #F1F1F1 !important;
  color: #5B5B5B !important;
  font-size: 12px !important;
  font-weight: 400 !important;
}
.arc-md .md-editor-preview hr {
  border: 0 !important;
  border-top: 1px solid #E4E4E4 !important;
  margin: 16px 0 !important;
}
</style>
