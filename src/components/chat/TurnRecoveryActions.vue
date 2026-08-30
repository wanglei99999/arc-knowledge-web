<script setup lang="ts">
import { ref } from 'vue'
import { Ban, Paperclip } from 'lucide-vue-next'

import { ACCEPTED_MIME, isAccepted } from '@/lib/file-types'

defineProps<{ turnId: string }>()

const emit = defineEmits<{
  addAttachments: [files: File[]]
  cancel: []
}>()

const fileEl = ref<HTMLInputElement | null>(null)

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? []).filter(isAccepted)
  if (files.length) emit('addAttachments', files)
  input.value = ''
}
</script>

<template>
  <div class="mt-sm border-t border-rule pt-sm">
    <p class="text-meta text-graphite-45">本轮暂时没有可用于回答的附件。</p>
    <div class="mt-xs flex flex-wrap gap-xs">
      <button
        type="button"
        aria-label="补充附件到本轮"
        class="inline-flex h-7 items-center gap-xs rounded-sm border border-rule bg-paper px-sm text-meta text-graphite-70 transition-colors duration-hover ease-settle hover:border-rule-strong hover:text-graphite motion-reduce:transition-none"
        @click="fileEl?.click()"
      >
        <Paperclip class="h-3.5 w-3.5" :stroke-width="1.5" />
        补充附件
      </button>
      <input
        ref="fileEl"
        type="file"
        multiple
        aria-label="补充附件文件"
        class="hidden"
        :accept="ACCEPTED_MIME.join(',')"
        @change="onPick"
      />
      <button
        type="button"
        aria-label="取消本轮"
        class="inline-flex h-7 items-center gap-xs rounded-sm px-sm text-meta text-graphite-45 transition-colors duration-hover ease-settle hover:bg-paper hover:text-alert-ink motion-reduce:transition-none"
        @click="emit('cancel')"
      >
        <Ban class="h-3.5 w-3.5" :stroke-width="1.5" />
        取消本轮
      </button>
    </div>
  </div>
</template>
