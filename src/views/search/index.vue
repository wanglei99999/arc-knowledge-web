<script setup lang="ts">
import { ref } from 'vue'
import { Search, FileText, Layers, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import http from '@/utils/http'

// ── 类型 ──────────────────────────────────────────────────────────────────────
type SearchMode = 'hybrid' | 'vector' | 'fulltext'

interface SearchResult {
  chunk_id: string
  doc_id: string
  doc_name: string
  chunk_index: number
  content: string
  final_score: number
  source: string   // "vector" | "keyword"
}

// ── 参数 ──────────────────────────────────────────────────────────────────────
const query    = ref('')
const mode     = ref<SearchMode>('hybrid')
const topK     = ref(5)
const loading  = ref(false)
const searched = ref(false)
const results  = ref<SearchResult[]>([])
const expandedIds = ref<string[]>([])

const modeOptions: { label: string; value: SearchMode }[] = [
  { label: '混合检索', value: 'hybrid' },
  { label: '向量检索', value: 'vector' },
  { label: '全文检索', value: 'fulltext' },
]

// ── 检索逻辑 ──────────────────────────────────────────────────────────────────
async function handleSearch() {
  if (!query.value.trim()) return
  loading.value = true
  searched.value = false

  try {
    const data = await http.get<{ hits: any[]; chunks: any[]; total: number }>('/search', {
      params: { q: query.value.trim(), space_id: 'default', top_k: topK.value, score_threshold: 0.0 },
    })

    // chunks 按 chunk_id 建立索引，方便合并
    const chunkMap = new Map(data.chunks.map((c: any) => [c.chunk_id, c]))

    results.value = data.hits.map((hit: any) => {
      const chunk = chunkMap.get(hit.chunk_id) ?? {}
      return {
        chunk_id:    hit.chunk_id,
        doc_id:      hit.document_id,
        doc_name:    hit.document_id,
        chunk_index: hit.chunk_index,
        content:     chunk.content ?? '',
        final_score: hit.score,
        source:      hit.source ?? 'vector',
      } as SearchResult
    })
  } finally {
    expandedIds.value = []
    loading.value = false
    searched.value = true
  }
}

function toggleExpand(id: string) {
  const idx = expandedIds.value.indexOf(id)
  if (idx !== -1) {
    expandedIds.value.splice(idx, 1)
  } else {
    expandedIds.value.push(id)
  }
}

function scoreColor(score: number) {
  if (score >= 0.85) return 'text-emerald-600 bg-emerald-50'
  if (score >= 0.70) return 'text-amber-600 bg-amber-50'
  return 'text-zinc-500 bg-zinc-100'
}

function scoreBar(score: number) {
  if (score >= 0.85) return 'bg-emerald-400'
  if (score >= 0.70) return 'bg-amber-400'
  return 'bg-zinc-300'
}
</script>

<template>
  <div class="space-y-6">
    <!-- 页头 -->
    <div>
      <h1 class="text-2xl font-semibold text-zinc-800">检索调试</h1>
      <p class="mt-0.5 text-sm text-zinc-400">验证向量检索 / 全文检索 / 混合召回的效果</p>
    </div>

    <!-- 搜索栏 -->
    <div class="rounded-card bg-surface-card border border-surface-border shadow-card p-4">
      <div class="flex gap-3 items-center flex-wrap">
        <!-- 查询框 -->
        <div class="relative flex-1 min-w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            v-model="query"
            type="text"
            placeholder="输入查询词，例如：RAG 混合检索原理"
            class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            @keydown.enter="handleSearch"
          />
        </div>

        <!-- 检索模式 -->
        <select
          v-model="mode"
          class="px-3 py-2 text-sm rounded-lg border border-surface-border bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
        >
          <option v-for="opt in modeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- Top-K -->
        <div class="flex items-center gap-2 text-sm text-zinc-600">
          <span class="shrink-0">Top-K</span>
          <input
            v-model.number="topK"
            type="number"
            min="1"
            max="20"
            class="w-16 px-2 py-2 text-sm rounded-lg border border-surface-border text-center focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          />
        </div>

        <!-- 搜索按钮 -->
        <button
          :disabled="!query.trim() || loading"
          :class="cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            query.trim() && !loading
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-surface-muted text-zinc-400 cursor-not-allowed'
          )"
          @click="handleSearch"
        >
          <Search class="w-3.5 h-3.5" />
          检索
        </button>
      </div>

      <!-- 模式说明 -->
      <p class="mt-2 text-xs text-zinc-400">
        <template v-if="mode === 'hybrid'">混合检索：向量召回 × RRF + BM25 召回 × RRF，融合重排</template>
        <template v-else-if="mode === 'vector'">向量检索：仅使用 Milvus 余弦相似度召回，最终分 = vector_score</template>
        <template v-else>全文检索：仅使用 Elasticsearch BM25 召回，最终分 = bm25_score</template>
      </p>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <a-spin />
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!searched"
      class="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400"
    >
      <Search class="w-10 h-10 opacity-20" />
      <p class="text-sm">输入查询词后点击检索</p>
    </div>

    <!-- 无结果 -->
    <div
      v-else-if="!results.length"
      class="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400"
    >
      <Layers class="w-10 h-10 opacity-20" />
      <p class="text-sm">未找到相关切片</p>
    </div>

    <!-- 结果列表 -->
    <template v-else>
      <div class="flex items-center justify-between">
        <p class="text-sm text-zinc-500">
          共 <span class="font-medium text-zinc-700">{{ results.length }}</span> 条结果
          <span class="ml-2 text-zinc-300">·</span>
          <span class="ml-2">{{ { hybrid: '混合检索', vector: '向量检索', fulltext: '全文检索' }[mode] }}</span>
        </p>
      </div>

      <div class="space-y-3">
        <div
          v-for="(result, idx) in results"
          :key="result.chunk_id"
          class="rounded-card bg-surface-card border border-surface-border shadow-card overflow-hidden"
        >
          <!-- 卡片头 -->
          <div
            class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-muted transition-colors"
            @click="toggleExpand(result.chunk_id)"
          >
            <!-- 排名 -->
            <span class="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {{ idx + 1 }}
            </span>

            <!-- 文档信息 -->
            <div class="flex-1 min-w-0 flex items-center gap-2">
              <FileText class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span class="text-sm font-medium text-zinc-700 truncate">{{ result.doc_name }}</span>
              <span class="text-xs text-zinc-400 shrink-0">切片 #{{ result.chunk_index + 1 }}</span>
            </div>

            <!-- 最终分 -->
            <div class="shrink-0 flex items-center gap-2">
              <div class="w-24 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="scoreBar(result.final_score)"
                  :style="{ width: `${result.final_score * 100}%` }"
                />
              </div>
              <span :class="cn('text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0', scoreColor(result.final_score))">
                {{ (result.final_score * 100).toFixed(0) }}%
              </span>
            </div>

            <ChevronDown
              class="w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0"
              :class="{ 'rotate-180': expandedIds.includes(result.chunk_id) }"
            />
          </div>

          <!-- 展开内容 -->
          <div v-if="expandedIds.includes(result.chunk_id)" class="border-t border-surface-border">
            <!-- 切片内容 -->
            <p class="px-4 py-3 text-sm text-zinc-600 leading-relaxed">{{ result.content }}</p>

            <!-- 来源标签 -->
            <div class="px-4 pb-3 flex flex-wrap gap-3">
              <div
                :class="result.source === 'vector' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              >
                {{ result.source === 'vector' ? '向量检索' : '关键词检索' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
