<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Check,
  CircleAlert,
  EyeOff,
  FileText,
  LoaderCircle,
  RotateCcw,
  Upload,
} from 'lucide-vue-next'

import type { AttachmentVO } from '@/types/chat'
import { ACCEPTED_MIME, isAccepted } from '@/lib/file-types'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  attachment: AttachmentVO
  actionsEnabled?: boolean
}>(), {
  actionsEnabled: true,
})

const emit = defineEmits<{
  retry: [attachmentId: string]
  retryUpload: [attachmentId: string, file: File]
  ignore: [attachmentId: string]
}>()

const fileEl = ref<HTMLInputElement | null>(null)

const progress = computed(() => Math.min(Math.max(props.attachment.progress ?? 0, 0), 100))

const statusLabel = computed(() => {
  switch (props.attachment.status) {
    case 'pending_upload': return '等待上传'
    case 'uploading': return `上传中 ${progress.value}%`
    case 'ingesting': return '正在入库'
    case 'indexed': return '已入库'
    case 'failed': return props.attachment.error_message || '处理失败'
    case 'ignored': return '已忽略'
  }
})

const isWorking = computed(() => (
  props.attachment.status === 'pending_upload'
  || props.attachment.status === 'uploading'
  || props.attachment.status === 'ingesting'
))

function onReplacementPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && isAccepted(file)) emit('retryUpload', props.attachment.attachment_id, file)
  input.value = ''
}
</script>

<template>
  <div
    :class="cn(
      'rounded-sm border px-sm py-xs',
      attachment.status === 'failed'
        ? 'border-alert-ink bg-alert-fill'
        : 'border-rule bg-paper',
    )"
  >
    <div class="flex items-center gap-sm">
      <CircleAlert
        v-if="attachment.status === 'failed'"
        class="h-4 w-4 shrink-0 text-alert-ink"
        :stroke-width="1.5"
        aria-hidden="true"
      />
      <Check
        v-else-if="attachment.status === 'indexed'"
        class="h-4 w-4 shrink-0 text-accent-green"
        :stroke-width="1.5"
        aria-hidden="true"
      />
      <EyeOff
        v-else-if="attachment.status === 'ignored'"
        class="h-4 w-4 shrink-0 text-graphite-45"
        :stroke-width="1.5"
        aria-hidden="true"
      />
      <LoaderCircle
        v-else-if="isWorking"
        class="h-4 w-4 shrink-0 animate-spin text-graphite-45 motion-reduce:animate-none"
        :stroke-width="1.5"
        aria-hidden="true"
      />
      <FileText
        v-else
        class="h-4 w-4 shrink-0 text-graphite-45"
        :stroke-width="1.5"
        aria-hidden="true"
      />

      <span class="min-w-0 flex-1 truncate font-callnum text-callnum-sm text-graphite-70">
        {{ attachment.file_name }}
      </span>
      <span
        class="shrink-0 text-meta"
        :class="attachment.status === 'failed' ? 'text-alert-ink' : 'text-graphite-45'"
      >
        {{ statusLabel }}
      </span>

      <template v-if="attachment.status === 'failed' && actionsEnabled">
        <button
          v-if="attachment.document_id"
          type="button"
          :aria-label="`重试 ${attachment.file_name}`"
          class="grid h-6 w-6 shrink-0 place-items-center rounded-xs text-alert-ink transition-colors duration-hover ease-settle hover:bg-paper motion-reduce:transition-none"
          @click="emit('retry', attachment.attachment_id)"
        >
          <RotateCcw class="h-3.5 w-3.5" :stroke-width="1.5" />
        </button>
        <button
          v-else
          type="button"
          :aria-label="`重新选择 ${attachment.file_name}`"
          class="grid h-6 w-6 shrink-0 place-items-center rounded-xs text-alert-ink transition-colors duration-hover ease-settle hover:bg-paper motion-reduce:transition-none"
          @click="fileEl?.click()"
        >
          <Upload class="h-3.5 w-3.5" :stroke-width="1.5" />
        </button>
        <input
          v-if="!attachment.document_id"
          ref="fileEl"
          type="file"
          class="hidden"
          :accept="ACCEPTED_MIME.join(',')"
          @change="onReplacementPicked"
        />
        <button
          type="button"
          :aria-label="`忽略 ${attachment.file_name}`"
          class="grid h-6 w-6 shrink-0 place-items-center rounded-xs text-alert-ink transition-colors duration-hover ease-settle hover:bg-paper motion-reduce:transition-none"
          @click="emit('ignore', attachment.attachment_id)"
        >
          <EyeOff class="h-3.5 w-3.5" :stroke-width="1.5" />
        </button>
      </template>
    </div>

    <div
      v-if="attachment.status === 'uploading'"
      role="progressbar"
      aria-label="附件上传进度"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progress"
      class="mt-xs h-[2px] overflow-hidden rounded-full bg-desk-sunken"
    >
      <span
        class="block h-full rounded-full bg-graphite-70 transition-[width] duration-standard ease-settle motion-reduce:transition-none"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>
