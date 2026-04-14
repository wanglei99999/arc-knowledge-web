<script setup lang="ts">
import { ref } from 'vue'
import { Upload } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const ACCEPTED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
]

function onDrop(e: DragEvent) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? []).filter(f =>
    ACCEPTED.includes(f.type)
  )
  if (files.length) emit('upload', files)
}

function onFileChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (files.length) emit('upload', files)
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div
    :class="cn(
      'relative flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-10 transition-colors cursor-pointer',
      isDragging
        ? 'border-primary bg-primary-50'
        : 'border-surface-border bg-surface-card hover:border-primary-300 hover:bg-primary-50/30'
    )"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="onDrop"
    @click="fileInput?.click()"
  >
    <div :class="cn(
      'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
      isDragging ? 'bg-primary-100' : 'bg-surface-muted'
    )">
      <Upload :class="cn('w-5 h-5', isDragging ? 'text-primary' : 'text-zinc-400')" />
    </div>

    <div class="text-center">
      <p class="text-sm font-medium text-zinc-700">
        拖拽文件到此处，或
        <span class="text-primary hover:text-primary-600 transition-colors">点击上传</span>
      </p>
      <p class="mt-1 text-xs text-zinc-400">
        支持 PDF、Word、Excel、TXT、Markdown
      </p>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      :accept="ACCEPTED.join(',')"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>
