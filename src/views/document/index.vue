<script setup lang="ts">
import { ref, onMounted, onUnmounted,watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { RefreshCw, FileText, Layers } from 'lucide-vue-next'
import dayjs from 'dayjs'
import UploadZone from '@/components/document/UploadZone.vue'
import StatusBadge from '@/components/document/StatusBadge.vue'
import { listDocuments, uploadDocument, deleteDocument, listChunks } from '@/api/document'
import type { DocumentVO, ChunkVO } from '@/types/document'
import { useSpacesStore } from '@/stores/spaces'

const spacesStore = useSpacesStore()

// ── 文档列表 ────────────────────────────────────────────────────────────────
const documents = ref<DocumentVO[]>([])
const total     = ref(0)
const loading   = ref(false)

async function fetchDocuments() {
  loading.value = true
  try {
    const res = await listDocuments({ space_id: spacesStore.currentSpace?.space_id ?? '', limit: 50 })
    documents.value = (res as any).items ?? []
    total.value     = (res as any).total ?? 0
  } finally {
    loading.value = false
  }
}

onMounted(fetchDocuments)

// ── 处理进度轮询 ──────────────────────────────────────────────────────────────
const TERMINAL_STATUSES = new Set(['indexed', 'failed', 'deleted'])

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    await fetchDocuments()
    if (documents.value.every(d => TERMINAL_STATUSES.has(d.status))) stopPolling()
  }, 3000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

onUnmounted(stopPolling)
watch(() => spacesStore.currentSpace?.space_id, fetchDocuments)

// ── 上传 ─────────────────────────────────────────────────────────────────────
interface UploadTask { file: File; progress: number; status: 'uploading' | 'done' | 'error' }
const uploadTasks = ref<UploadTask[]>([])

async function handleUpload(files: File[]) {
  for (const file of files) {
    const task: UploadTask = { file, progress: 0, status: 'uploading' }
    uploadTasks.value.push(task)

    try {
      await uploadDocument(file, spacesStore.currentSpace?.space_id ?? '', (pct) => { task.progress = pct })
      task.status = 'done'
      message.success(`${file.name} 上传成功，正在入库处理`)
    } catch {
      task.status = 'error'
      message.error(`${file.name} 上传失败`)
    }
  }

  // 上传完成后刷新列表，并在有文档处理中时启动轮询
  setTimeout(async () => {
    uploadTasks.value = uploadTasks.value.filter(t => t.status !== 'done')
    await fetchDocuments()
    if (documents.value.some(d => !TERMINAL_STATUSES.has(d.status))) startPolling()
  }, 1500)
}

// ── 删除 ─────────────────────────────────────────────────────────────────────
function confirmDelete(doc: DocumentVO) {
  Modal.confirm({
    title: '确认删除',
    content: `删除「${doc.original_name}」将同时清除向量索引和全文索引，此操作不可恢复。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await deleteDocument(doc.id)
      message.success('删除成功')
      fetchDocuments()
    },
  })
}

// ── 切片预览 ──────────────────────────────────────────────────────────────────
const drawerVisible  = ref(false)
const drawerDoc      = ref<DocumentVO | null>(null)
const chunks         = ref<ChunkVO[]>([])
const chunksLoading  = ref(false)

async function openChunks(doc: DocumentVO) {
  drawerDoc.value    = doc
  drawerVisible.value = true
  chunksLoading.value = true
  try {
    const res = await listChunks(doc.id)
    chunks.value = (res as any).items ?? []
  } finally {
    chunksLoading.value = false
  }
}

// ── 表格列定义 ─────────────────────────────────────────────────────────────────
const columns = [
  { title: '文件名',   dataIndex: 'original_name', key: 'original_name', ellipsis: true },
  { title: '格式',     dataIndex: 'mime_type',      key: 'mime_type',     width: 120 },
  { title: '切片数',   dataIndex: 'chunk_count',    key: 'chunk_count',   width: 90 },
  { title: '状态',     dataIndex: 'status',         key: 'status',        width: 100 },
  { title: '上传时间', dataIndex: 'created_at',     key: 'created_at',    width: 160 },
  { title: '操作',     key: 'action',               width: 120 },
]

function mimeLabel(mime: string) {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'text/plain': 'TXT',
    'text/markdown': 'Markdown',
  }
  return map[mime] ?? mime.split('/')[1]?.toUpperCase() ?? '未知'
}
</script>

<template>
  <div class="space-y-6">
    <!-- 页头 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-800">文档管理</h1>
        <p class="mt-1 text-sm text-zinc-400">共 {{ total }} 个文档</p>
      </div>
      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded-button text-sm text-zinc-500 hover:bg-surface-muted transition-colors"
        @click="fetchDocuments"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
        刷新
      </button>
    </div>

    <!-- 上传区 -->
    <UploadZone @upload="handleUpload" />

    <!-- 上传进度条 -->
    <div v-if="uploadTasks.length" class="space-y-2">
      <div
        v-for="(task, i) in uploadTasks"
        :key="i"
        class="flex items-center gap-3 px-4 py-3 rounded-card bg-surface-card border border-surface-border shadow-card"
      >
        <FileText class="w-4 h-4 text-zinc-400 shrink-0" />
        <span class="flex-1 text-sm text-zinc-700 truncate">{{ task.file.name }}</span>
        <div class="w-32 h-1.5 rounded-full bg-surface-muted overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="task.status === 'error' ? 'bg-red-400' : 'bg-primary'"
            :style="{ width: `${task.progress}%` }"
          />
        </div>
        <span class="text-xs text-zinc-400 w-8 text-right">{{ task.progress }}%</span>
      </div>
    </div>

    <!-- 文档列表 -->
    <div class="rounded-card bg-surface-card border border-surface-border shadow-card overflow-hidden">
      <a-table
        :columns="columns"
        :data-source="documents"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <!-- 文件名列 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'original_name'">
            <button
              class="flex items-center gap-2 text-left hover:text-primary transition-colors"
              @click="openChunks(record)"
            >
              <FileText class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span class="text-sm font-medium text-zinc-700 truncate max-w-[280px]">
                {{ record.original_name }}
              </span>
            </button>
          </template>

          <template v-else-if="column.key === 'mime_type'">
            <span class="text-xs text-zinc-500">{{ mimeLabel(record.mime_type) }}</span>
          </template>

          <template v-else-if="column.key === 'chunk_count'">
            <div class="flex items-center gap-1 text-sm text-zinc-600">
              <Layers class="w-3 h-3 text-zinc-400" />
              {{ record.chunk_count }}
            </div>
          </template>

          <template v-else-if="column.key === 'status'">
            <StatusBadge :status="record.status" />
            <p v-if="record.error_message" class="mt-1 text-xs text-red-500 truncate max-w-[120px]" :title="record.error_message">
              {{ record.error_message }}
            </p>
          </template>

          <template v-else-if="column.key === 'created_at'">
            <span class="text-xs text-zinc-400">
              {{ dayjs(record.created_at).format('YYYY-MM-DD HH:mm') }}
            </span>
          </template>

          <template v-else-if="column.key === 'action'">
            <div class="flex items-center gap-2">
              <button
                class="text-xs text-zinc-400 hover:text-primary transition-colors"
                @click="openChunks(record)"
              >
                切片预览
              </button>
              <span class="text-zinc-200">|</span>
              <button
                class="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                @click="confirmDelete(record)"
              >
                删除
              </button>
            </div>
          </template>
        </template>

        <!-- 空状态 -->
        <template #emptyText>
          <div class="flex flex-col items-center justify-center py-16 gap-3">
            <FileText class="w-10 h-10 text-zinc-200" />
            <p class="text-sm text-zinc-400">暂无文档，请上传文件开始使用</p>
          </div>
        </template>
      </a-table>
    </div>
  </div>

  <!-- 切片预览抽屉 -->
  <a-drawer
    v-model:open="drawerVisible"
    :title="`切片预览 — ${drawerDoc?.original_name}`"
    placement="right"
    width="560"
  >
    <div v-if="chunksLoading" class="flex items-center justify-center h-40">
      <a-spin />
    </div>

    <div v-else class="space-y-3">
      <p class="text-xs text-zinc-400">共 {{ chunks.length }} 个切片</p>
      <div
        v-for="chunk in chunks"
        :key="chunk.chunk_id"
        class="rounded-lg border border-surface-border p-4 space-y-2 hover:border-primary-200 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-zinc-500"># {{ chunk.chunk_index + 1 }}</span>
          <span class="text-xs text-zinc-400">{{ chunk.token_count }} tokens</span>
        </div>
        <p class="text-sm text-zinc-700 leading-relaxed line-clamp-4">{{ chunk.content }}</p>
      </div>

      <div v-if="!chunks.length" class="flex flex-col items-center justify-center py-16 gap-2">
        <p class="text-sm text-zinc-400">暂无切片数据</p>
      </div>
    </div>
  </a-drawer>
</template>
