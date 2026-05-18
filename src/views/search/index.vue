<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, FileText, Layers, ChevronDown, Bug, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import http from '@/utils/http'
import { debugSearch } from '@/api/search'
import type { DebugResult, DebugHit } from '@/api/search'
import { useSpacesStore } from '@/stores/spaces'

// ── 类型 ──────────────────────────────────────────────────────────────────────
type SearchMode = 'hybrid' | 'vector' | 'fulltext'

interface SearchResult {
  chunk_id: string
  doc_id: string
  doc_name: string
  chunk_index: number
  content: string
  final_score: number
  source: string
}

const spacesStore = useSpacesStore()

// ── 简单模式状态 ──────────────────────────────────────────────────────────────
const query      = ref('')
const mode       = ref<SearchMode>('hybrid')
const topK       = ref(5)
const loading    = ref(false)
const searched   = ref(false)
const results    = ref<SearchResult[]>([])
const expandedIds = ref<string[]>([])

const modeOptions: { label: string; value: SearchMode }[] = [
  { label: '混合检索', value: 'hybrid' },
  { label: '向量检索', value: 'vector' },
  { label: '全文检索', value: 'fulltext' },
]

// ── 调试模式状态 ──────────────────────────────────────────────────────────────
const debugMode   = ref(false)
const debugResult = ref<DebugResult | null>(null)
const paramsOpen  = ref(true)

const debugParams = ref({
  top_k: 10,
  score_threshold: 0.0,
  query_rewrite_enabled: true,
  rerank_enabled: true,
  vector_top_k: 20,
  keyword_top_k: 20,
  rrf_k: 60,
  include_answer: false,
})

// 调试结果列各自的展开状态
const expandedDebug = ref<Record<string, string[]>>({
  vector: [],
  keyword: [],
  final: [],
})

// 耗时条形图计算
const timingRows = computed(() => {
  if (!debugResult.value) return []
  const t = debugResult.value.timings_ms
  const entries = [
    { key: 'query_rewrite',  label: '查询改写' },
    { key: 'vector_search',  label: '向量检索' },
    { key: 'keyword_search', label: '关键词检索' },
    { key: 'rrf_fusion',     label: 'RRF 融合' },
    { key: 'rerank',         label: 'Rerank' },
    { key: 'chunk_fetch',    label: '内容拉取' },
  ]
  const max = Math.max(...entries.map(e => t[e.key] ?? 0), 1)
  return entries.map(e => ({
    label: e.label,
    ms: t[e.key] ?? 0,
    pct: ((t[e.key] ?? 0) / max) * 100,
  }))
})

// ── 检索逻辑 ──────────────────────────────────────────────────────────────────
async function handleSearch() {
  if (!query.value.trim()) return
  loading.value = true
  searched.value = false

  try {
    if (debugMode.value) {
      debugResult.value = await debugSearch({
        query: query.value.trim(),
        space_id: spacesStore.currentSpace?.space_id ?? '',
        ...debugParams.value,
      })
    } else {
      const data = await http.get<{ hits: any[]; chunks: any[]; total: number }>('/search', {
        params: { q: query.value.trim(), space_id: spacesStore.currentSpace?.space_id ?? '', top_k: topK.value, score_threshold: 0.0 },
      })
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
    }
  } finally {
    expandedIds.value = []
    expandedDebug.value = { vector: [], keyword: [], final: [] }
    loading.value = false
    searched.value = true
  }
}

function toggleExpand(id: string) {
  const idx = expandedIds.value.indexOf(id)
  if (idx !== -1) expandedIds.value.splice(idx, 1)
  else expandedIds.value.push(id)
}

function toggleDebugExpand(col: string, id: string) {
  const list = expandedDebug.value[col]
  const idx = list.indexOf(id)
  if (idx !== -1) list.splice(idx, 1)
  else list.push(id)
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

function fmtScore(s: number) {
  return s >= 0.01 ? s.toFixed(4) : s.toExponential(2)
}

function sourceLabel(src: string) {
  const map: Record<string, string> = {
    vector: '向量', keyword: '关键词', rrf: 'RRF', rerank: 'Rerank',
  }
  return map[src] ?? src
}

function sourceClass(src: string) {
  const map: Record<string, string> = {
    vector:  'bg-indigo-50 text-indigo-600',
    keyword: 'bg-amber-50 text-amber-600',
    rrf:     'bg-violet-50 text-violet-600',
    rerank:  'bg-emerald-50 text-emerald-600',
  }
  return map[src] ?? 'bg-zinc-100 text-zinc-500'
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

        <!-- 简单模式：检索模式 + TopK -->
        <template v-if="!debugMode">
          <select
            v-model="mode"
            class="px-3 py-2 text-sm rounded-lg border border-surface-border bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          >
            <option v-for="opt in modeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <div class="flex items-center gap-2 text-sm text-zinc-600">
            <span class="shrink-0">Top-K</span>
            <input
              v-model.number="topK"
              type="number" min="1" max="20"
              class="w-16 px-2 py-2 text-sm rounded-lg border border-surface-border text-center focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
            />
          </div>
        </template>

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

        <!-- 调试模式 toggle -->
        <button
          :class="cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
            debugMode
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-surface-border text-zinc-500 hover:border-amber-300 hover:text-amber-600'
          )"
          @click="debugMode = !debugMode; debugResult = null; searched = false"
        >
          <Bug class="w-3.5 h-3.5" />
          {{ debugMode ? '调试模式' : '调试' }}
        </button>
      </div>

      <!-- 简单模式说明 -->
      <p v-if="!debugMode" class="mt-2 text-xs text-zinc-400">
        <template v-if="mode === 'hybrid'">混合检索：向量召回 × RRF + BM25 召回 × RRF，融合重排</template>
        <template v-else-if="mode === 'vector'">向量检索：仅使用 Milvus 余弦相似度召回，最终分 = vector_score</template>
        <template v-else>全文检索：仅使用 Elasticsearch BM25 召回，最终分 = bm25_score</template>
      </p>
    </div>

    <!-- ── 调试模式面板 ─────────────────────────────────────────────────────── -->
    <template v-if="debugMode">
      <!-- 参数面板 -->
      <div class="rounded-card bg-surface-card border border-amber-200 shadow-card overflow-hidden">
        <button
          class="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
          @click="paramsOpen = !paramsOpen"
        >
          <ChevronDown class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': !paramsOpen }" />
          调试参数
        </button>
        <div v-if="paramsOpen" class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <label class="flex flex-col gap-1 text-xs text-zinc-500">
            Top-K（最终）
            <input v-model.number="debugParams.top_k" type="number" min="1" max="50"
              class="px-2 py-1.5 text-sm rounded border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-zinc-500">
            分数阈值
            <input v-model.number="debugParams.score_threshold" type="number" min="0" max="1" step="0.05"
              class="px-2 py-1.5 text-sm rounded border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-zinc-500">
            向量候选数
            <input v-model.number="debugParams.vector_top_k" type="number" min="1" max="100"
              class="px-2 py-1.5 text-sm rounded border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-zinc-500">
            关键词候选数
            <input v-model.number="debugParams.keyword_top_k" type="number" min="1" max="100"
              class="px-2 py-1.5 text-sm rounded border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-zinc-500">
            RRF-k 参数
            <input v-model.number="debugParams.rrf_k" type="number" min="1" max="200"
              class="px-2 py-1.5 text-sm rounded border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <label class="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer pt-4">
            <input v-model="debugParams.query_rewrite_enabled" type="checkbox"
              class="rounded border-zinc-300 text-primary focus:ring-primary/30" />
            查询改写
          </label>
          <label class="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer pt-4">
            <input v-model="debugParams.rerank_enabled" type="checkbox"
              class="rounded border-zinc-300 text-primary focus:ring-primary/30" />
            Rerank
          </label>
          <label class="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer pt-4">
            <input v-model="debugParams.include_answer" type="checkbox"
              class="rounded border-zinc-300 text-primary focus:ring-primary/30" />
            生成答案
          </label>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <a-spin />
      </div>

      <!-- 调试结果 -->
      <template v-else-if="debugResult">
        <!-- 改写结果 -->
        <div class="rounded-card bg-surface-card border border-surface-border shadow-card p-4 space-y-2">
          <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide">查询改写</p>
          <div class="flex items-center gap-3 flex-wrap">
            <span :class="debugResult.intent_is_valid ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'"
              class="text-xs px-2 py-0.5 rounded-full font-medium">
              {{ debugResult.intent_is_valid ? '有效查询' : '无效查询' }}
            </span>
            <span v-for="(q, i) in debugResult.rewritten_queries" :key="i"
              class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              {{ q }}
            </span>
            <span v-if="!debugResult.rewritten_queries.length" class="text-xs text-zinc-400">（未改写）</span>
          </div>
        </div>

        <!-- 耗时条形图 -->
        <div class="rounded-card bg-surface-card border border-surface-border shadow-card p-4 space-y-2">
          <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide">各阶段耗时</p>
          <div class="space-y-2">
            <div v-for="row in timingRows" :key="row.label" class="flex items-center gap-3">
              <span class="w-20 shrink-0 text-xs text-zinc-500 text-right">{{ row.label }}</span>
              <div class="flex-1 h-3 rounded-full bg-surface-muted overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary/70 transition-all duration-500"
                  :style="{ width: `${row.pct}%` }"
                />
              </div>
              <span class="w-16 shrink-0 text-xs text-zinc-500 font-mono">{{ row.ms.toFixed(1) }}ms</span>
            </div>
          </div>
        </div>

        <!-- 三列结果 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- 向量检索列 -->
          <div class="rounded-card bg-surface-card border border-surface-border shadow-card overflow-hidden">
            <div class="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
              <p class="text-xs font-semibold text-indigo-700">
                向量检索 <span class="font-normal text-indigo-400">（{{ debugResult.vector_hits.length }} 条）</span>
              </p>
            </div>
            <div class="divide-y divide-surface-border max-h-[480px] overflow-y-auto">
              <div v-if="!debugResult.vector_hits.length" class="px-4 py-6 text-xs text-zinc-400 text-center">无命中</div>
              <div v-for="(hit, idx) in debugResult.vector_hits" :key="hit.chunk_id">
                <div
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-muted transition-colors"
                  @click="toggleDebugExpand('vector', hit.chunk_id)"
                >
                  <span class="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                  <span class="flex-1 min-w-0 text-xs text-zinc-600 truncate">{{ hit.doc_name }}</span>
                  <span class="shrink-0 text-xs font-mono text-indigo-600">{{ fmtScore(hit.score) }}</span>
                  <ChevronRight
                    class="w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-150"
                    :class="{ 'rotate-90': expandedDebug.vector.includes(hit.chunk_id) }"
                  />
                </div>
                <div v-if="expandedDebug.vector.includes(hit.chunk_id)"
                  class="px-3 pb-3 text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap bg-indigo-50/40">
                  {{ hit.content || '（内容为空）' }}
                </div>
              </div>
            </div>
          </div>

          <!-- 关键词检索列 -->
          <div class="rounded-card bg-surface-card border border-surface-border shadow-card overflow-hidden">
            <div class="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <p class="text-xs font-semibold text-amber-700">
                关键词检索 <span class="font-normal text-amber-400">（{{ debugResult.keyword_hits.length }} 条）</span>
              </p>
            </div>
            <div class="divide-y divide-surface-border max-h-[480px] overflow-y-auto">
              <div v-if="!debugResult.keyword_hits.length" class="px-4 py-6 text-xs text-zinc-400 text-center">无命中</div>
              <div v-for="(hit, idx) in debugResult.keyword_hits" :key="hit.chunk_id">
                <div
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-muted transition-colors"
                  @click="toggleDebugExpand('keyword', hit.chunk_id)"
                >
                  <span class="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                  <span class="flex-1 min-w-0 text-xs text-zinc-600 truncate">{{ hit.doc_name }}</span>
                  <span class="shrink-0 text-xs font-mono text-amber-600">{{ fmtScore(hit.score) }}</span>
                  <ChevronRight
                    class="w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-150"
                    :class="{ 'rotate-90': expandedDebug.keyword.includes(hit.chunk_id) }"
                  />
                </div>
                <div v-if="expandedDebug.keyword.includes(hit.chunk_id)"
                  class="px-3 pb-3 text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap bg-amber-50/40">
                  {{ hit.content || '（内容为空）' }}
                </div>
              </div>
            </div>
          </div>

          <!-- 最终结果列（Rerank 后） -->
          <div class="rounded-card bg-surface-card border border-surface-border shadow-card overflow-hidden">
            <div class="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
              <p class="text-xs font-semibold text-emerald-700">
                最终结果 <span class="font-normal text-emerald-400">（{{ debugResult.final_hits.length }} 条）</span>
              </p>
            </div>
            <div class="divide-y divide-surface-border max-h-[480px] overflow-y-auto">
              <div v-if="!debugResult.final_hits.length" class="px-4 py-6 text-xs text-zinc-400 text-center">无命中</div>
              <div v-for="(hit, idx) in debugResult.final_hits" :key="hit.chunk_id">
                <div
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-muted transition-colors"
                  @click="toggleDebugExpand('final', hit.chunk_id)"
                >
                  <span class="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                  <span class="flex-1 min-w-0 text-xs text-zinc-600 truncate">{{ hit.doc_name }}</span>
                  <span class="shrink-0 text-xs font-mono text-emerald-600">{{ fmtScore(hit.score) }}</span>
                  <ChevronRight
                    class="w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-150"
                    :class="{ 'rotate-90': expandedDebug.final.includes(hit.chunk_id) }"
                  />
                </div>
                <div v-if="expandedDebug.final.includes(hit.chunk_id)"
                  class="px-3 pb-3 text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap bg-emerald-50/40">
                  {{ hit.content || '（内容为空）' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- LLM 答案（include_answer=true 时） -->
        <div v-if="debugResult.answer !== null"
          class="rounded-card bg-surface-card border border-surface-border shadow-card p-4 space-y-2">
          <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide">LLM 答案</p>
          <p class="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{{ debugResult.answer }}</p>
        </div>
      </template>

      <!-- 初始空状态（调试模式未搜索） -->
      <div v-else-if="!loading && !searched"
        class="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
        <Bug class="w-10 h-10 opacity-20" />
        <p class="text-sm">配置调试参数后点击检索</p>
      </div>
    </template>

    <!-- ── 简单模式结果 ──────────────────────────────────────────────────────── -->
    <template v-else>
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
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-muted transition-colors"
              @click="toggleExpand(result.chunk_id)"
            >
              <span class="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {{ idx + 1 }}
              </span>
              <div class="flex-1 min-w-0 flex items-center gap-2">
                <FileText class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span class="text-sm font-medium text-zinc-700 truncate">{{ result.doc_name }}</span>
                <span class="text-xs text-zinc-400 shrink-0">切片 #{{ result.chunk_index + 1 }}</span>
              </div>
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

            <div v-if="expandedIds.includes(result.chunk_id)" class="border-t border-surface-border">
              <p class="px-4 py-3 text-sm text-zinc-600 leading-relaxed">{{ result.content }}</p>
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
    </template>
  </div>
</template>
