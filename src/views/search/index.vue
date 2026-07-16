<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Target, Type, Combine, ArrowDownUp, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { debugSearch, search as searchApi } from '@/api/search'
import type { DebugResult, DebugHit } from '@/api/search'
import { useSpacesStore } from '@/stores/spaces'
import ScoreBar from '@/components/ui/ScoreBar.vue'

type SearchMode = 'hybrid' | 'vector' | 'fulltext'
type View = 'results' | 'pipeline'

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

const view = ref<View>('results')
const query = ref('')
const mode = ref<SearchMode>('hybrid')
const topK = ref(5)
const loading = ref(false)
const searched = ref(false)
const results = ref<SearchResult[]>([])
const expanded = ref<string[]>([])

const debugResult = ref<DebugResult | null>(null)
const paramsOpen = ref(false)
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

const modeHint: Record<SearchMode, string> = {
  hybrid: '向量召回与 BM25 召回各自 RRF 加权，融合后重排',
  vector: '只走 Milvus 余弦相似度，最终分即 vector_score',
  fulltext: '只走 Elasticsearch BM25，最终分即 bm25_score',
}

/**
 * 四路来源是一次真正的类型识别：扫一列结果时要一眼看出这条是谁召回的。
 * 这正是"用户此刻在判断它"的定义，也是类型色在本页唯一的出场——只上图标。
 */
const sourceMeta: Record<string, { label: string; icon: unknown; tone: string }> = {
  vector:  { label: '向量',   icon: Target,      tone: 'text-accent-blue' },
  keyword: { label: '关键词', icon: Type,        tone: 'text-accent-amber' },
  rrf:     { label: '融合',   icon: Combine,     tone: 'text-accent-violet' },
  rerank:  { label: '重排',   icon: ArrowDownUp, tone: 'text-accent-green' },
}

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
  return entries.map(e => ({ label: e.label, ms: t[e.key] ?? 0, pct: ((t[e.key] ?? 0) / max) * 100 }))
})

/**
 * 重排前后的名次变化。rrf_hits 一直在接口里，只是从没被画出来——
 * 而它正是"rerank 到底干了什么"的唯一答案。
 * 返回 null 表示这条在融合结果里不存在（rerank 关掉时不会发生）。
 */
const rrfRank = computed(() => {
  const m = new Map<string, number>()
  debugResult.value?.rrf_hits.forEach((h, i) => m.set(h.chunk_id, i + 1))
  return m
})

function rankDelta(hit: DebugHit, finalIdx: number): number | null {
  const before = rrfRank.value.get(hit.chunk_id)
  if (before === undefined) return null
  return before - (finalIdx + 1)
}

async function handleSearch() {
  if (!query.value.trim()) return
  loading.value = true
  searched.value = false
  try {
    if (view.value === 'pipeline') {
      debugResult.value = await debugSearch({
        query: query.value.trim(),
        space_id: spacesStore.currentSpace?.space_id ?? '',
        ...debugParams.value,
      })
    } else {
      const data = await searchApi({
        q: query.value.trim(),
        space_id: spacesStore.currentSpace?.space_id ?? '',
        top_k: topK.value,
        score_threshold: 0.0,
      })
      const chunkMap = new Map(data.chunks.map(c => [c.chunk_id, c]))
      results.value = data.hits.map(hit => ({
        chunk_id: hit.chunk_id,
        doc_id: hit.document_id,
        doc_name: hit.document_id,
        chunk_index: hit.chunk_index,
        // 命中里没有原文，原文在 chunks 里，靠 chunk_id 对回去。
        // 兜底空串不是防御性写法：真出现对不上，说明后端两个数组不同步——
        // 那是它的 bug，前端此刻能做的只有不炸
        content: chunkMap.get(hit.chunk_id)?.content ?? '',
        final_score: hit.score,
        source: hit.source ?? 'vector',
      }))
    }
  } finally {
    expanded.value = []
    loading.value = false
    searched.value = true
  }
}

function toggle(id: string) {
  const i = expanded.value.indexOf(id)
  if (i !== -1) expanded.value.splice(i, 1)
  else expanded.value.push(id)
}

function switchView(v: View) {
  view.value = v
  searched.value = false
  debugResult.value = null
  results.value = []
}
</script>

<template>
  <div class="mx-auto max-w-[1100px] space-y-xl p-xl">

    <!-- 视图切换。两种视图是两个问题：「召回了什么」与「管线怎么走的」 -->
    <div class="flex gap-xxs">
      <button
        v-for="v in ([['results', '结果'], ['pipeline', '管线']] as [View, string][])"
        :key="v[0]"
        type="button"
        :class="cn(
          'rounded-sm px-[10px] py-[6px] text-label transition-colors duration-hover ease-settle motion-reduce:transition-none',
          view === v[0] ? 'bg-desk-sunken text-graphite' : 'text-graphite-45 hover:bg-desk-hover hover:text-graphite',
        )"
        @click="switchView(v[0])"
      >
        {{ v[1] }}
      </button>
    </div>

    <!-- 检索栏 -->
    <div class="space-y-sm">
      <div class="flex flex-wrap items-center gap-sm">
        <div class="relative min-w-64 flex-1">
          <Search class="pointer-events-none absolute left-[10px] top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-45" :stroke-width="1.5" />
          <input
            v-model="query"
            type="text"
            placeholder="输入查询词，例如：混合检索的权重"
            class="h-8 w-full rounded-md border border-rule-strong bg-paper pl-[34px] pr-[10px] text-body-sm text-graphite outline-none transition-colors duration-hover ease-settle placeholder:text-graphite-45 focus:border-graphite motion-reduce:transition-none"
            @keydown.enter="handleSearch"
          />
        </div>

        <template v-if="view === 'results'">
          <select
            v-model="mode"
            class="h-8 rounded-sm bg-transparent px-sm text-label text-graphite-70 outline-none transition-colors duration-hover ease-settle hover:bg-desk-hover hover:text-graphite motion-reduce:transition-none"
          >
            <option value="hybrid">混合检索</option>
            <option value="vector">向量检索</option>
            <option value="fulltext">全文检索</option>
          </select>
          <label class="flex items-center gap-sm text-label text-graphite-70">
            Top-K
            <input
              v-model.number="topK"
              type="number" min="1" max="20"
              class="h-8 w-14 rounded-md border border-rule-strong bg-paper px-sm text-center font-callnum text-callnum text-graphite outline-none transition-colors duration-hover ease-settle focus:border-graphite motion-reduce:transition-none"
            />
          </label>
        </template>

        <button
          type="button"
          :disabled="!query.trim() || loading"
          :class="cn(
            'h-8 rounded-sm px-[14px] text-label transition-colors duration-hover ease-settle motion-reduce:transition-none',
            query.trim() && !loading
              ? 'bg-graphite text-paper hover:bg-graphite-70'
              : 'cursor-not-allowed bg-desk-sunken text-graphite-45',
          )"
          @click="handleSearch"
        >
          {{ loading ? '检索中' : '检索' }}
        </button>
      </div>

      <p v-if="view === 'results'" class="text-meta text-graphite-45">{{ modeHint[mode] }}</p>
    </div>

    <!-- 管线参数 -->
    <div v-if="view === 'pipeline'" class="space-y-sm">
      <button
        type="button"
        :aria-expanded="paramsOpen"
        class="flex items-center gap-xs rounded-sm px-sm py-xs text-meta text-graphite-45 transition-colors duration-hover ease-settle hover:bg-desk-hover hover:text-graphite motion-reduce:transition-none"
        @click="paramsOpen = !paramsOpen"
      >
        <ChevronRight
          class="h-3 w-3 transition-transform duration-standard ease-settle motion-reduce:transition-none"
          :class="{ 'rotate-90': paramsOpen }"
          :stroke-width="1.5"
        />
        参数
      </button>

      <div v-if="paramsOpen" class="grid grid-cols-2 gap-lg rounded-lg border border-rule p-lg sm:grid-cols-3 lg:grid-cols-4">
        <label v-for="f in ([
          ['top_k', '最终 Top-K', 1, 50, 1],
          ['score_threshold', '分数阈值', 0, 1, 0.05],
          ['vector_top_k', '向量候选数', 1, 100, 1],
          ['keyword_top_k', '关键词候选数', 1, 100, 1],
          ['rrf_k', 'RRF-k', 1, 200, 1],
        ] as [keyof typeof debugParams, string, number, number, number][])"
          :key="f[0]"
          class="flex flex-col gap-xs text-meta text-graphite-45"
        >
          {{ f[1] }}
          <input
            v-model.number="debugParams[f[0]]"
            type="number" :min="f[2]" :max="f[3]" :step="f[4]"
            class="h-8 rounded-md border border-rule-strong bg-paper px-[10px] font-callnum text-callnum text-graphite outline-none transition-colors duration-hover ease-settle focus:border-graphite motion-reduce:transition-none"
          />
        </label>

        <label v-for="c in ([
          ['query_rewrite_enabled', '查询改写'],
          ['rerank_enabled', 'Rerank'],
          ['include_answer', '生成答案'],
        ] as [keyof typeof debugParams, string][])"
          :key="c[0]"
          class="flex cursor-pointer items-center gap-sm self-end pb-xs text-label text-graphite"
        >
          <input
            v-model="debugParams[c[0]]"
            type="checkbox"
            class="h-3.5 w-3.5 rounded-xs border-graphite-25 accent-graphite"
          />
          {{ c[1] }}
        </label>
      </div>
    </div>

    <!-- 骨架保住布局；居中的 spinner 只是在说"等着" -->
    <div v-if="loading" class="space-y-sm" aria-hidden="true">
      <div
        v-for="i in 6"
        :key="i"
        class="h-3 animate-breathe rounded-xs bg-desk-hover"
        :style="{ width: `${[92, 74, 88, 61, 80, 55][i - 1]}%` }"
      />
    </div>

    <!-- ── 结果视图 ─────────────────────────────────────────────── -->
    <template v-else-if="view === 'results'">
      <p v-if="!searched" class="py-xxl text-body-sm text-graphite-45">
        输入查询词，看这个空间能召回什么。
      </p>

      <p v-else-if="!results.length" class="py-xxl text-body-sm text-graphite-45">
        没有召回到切片。换个说法，或到「管线」看看是哪一级空了。
      </p>

      <template v-else>
        <p class="text-meta text-graphite-45">
          {{ results.length }} 条 · {{ { hybrid: '混合检索', vector: '向量检索', fulltext: '全文检索' }[mode] }}
        </p>

        <div class="divide-y divide-rule border-y border-rule">
          <div v-for="(r, idx) in results" :key="r.chunk_id">
            <div
              class="flex cursor-pointer items-center gap-sm px-sm py-[10px] transition-colors duration-hover ease-settle hover:bg-desk-hover motion-reduce:transition-none"
              @click="toggle(r.chunk_id)"
            >
              <span class="w-6 shrink-0 text-right font-callnum text-callnum-sm text-graphite-45 tabular-nums">
                {{ idx + 1 }}
              </span>
              <component
                :is="sourceMeta[r.source]?.icon ?? Target"
                :class="['h-4 w-4 shrink-0', sourceMeta[r.source]?.tone ?? 'text-graphite-45']"
                :stroke-width="1.5"
              />
              <span class="min-w-0 flex-1 truncate font-callnum text-callnum-sm text-graphite-70">
                {{ r.doc_name }} · #{{ r.chunk_index + 1 }}
              </span>
              <ScoreBar :score="r.final_score" />
              <ChevronRight
                class="h-3 w-3 shrink-0 text-graphite-45 transition-transform duration-standard ease-settle motion-reduce:transition-none"
                :class="{ 'rotate-90': expanded.includes(r.chunk_id) }"
                :stroke-width="1.5"
              />
            </div>
            <p v-if="expanded.includes(r.chunk_id)" class="whitespace-pre-wrap px-sm pb-md pl-[52px] text-body-sm text-graphite-70">
              {{ r.content || '（内容为空）' }}
            </p>
          </div>
        </div>
      </template>
    </template>

    <!-- ── 管线视图 ─────────────────────────────────────────────── -->
    <template v-else-if="debugResult">
      <!-- 查询改写 -->
      <section class="space-y-sm">
        <h2 class="text-title text-graphite">查询改写</h2>
        <div class="flex flex-wrap items-center gap-sm">
          <span
            :class="cn(
              'rounded-xs border px-[6px] py-[2px] font-callnum text-callnum-sm',
              debugResult.intent_is_valid
                ? 'border-rule text-accent-green'
                : 'border-alert-ink bg-alert-fill text-alert-ink',
            )"
          >
            {{ debugResult.intent_is_valid ? '有效查询' : '无效查询' }}
          </span>
          <span
            v-for="(q, i) in debugResult.rewritten_queries"
            :key="i"
            class="rounded-xs border border-rule px-[6px] py-[2px] font-callnum text-callnum-sm text-graphite-70"
          >
            {{ q }}
          </span>
          <span v-if="!debugResult.rewritten_queries.length" class="text-meta text-graphite-45">未改写</span>
        </div>
      </section>

      <!-- 各阶段耗时。也是读数，也用长度 -->
      <section class="space-y-sm">
        <h2 class="text-title text-graphite">各阶段耗时</h2>
        <div class="space-y-xs">
          <div v-for="row in timingRows" :key="row.label" class="flex items-center gap-md">
            <span class="w-20 shrink-0 text-right text-meta text-graphite-45">{{ row.label }}</span>
            <span class="h-[3px] flex-1 overflow-hidden rounded-full bg-desk-sunken">
              <span class="block h-full rounded-full bg-graphite-70" :style="{ width: `${row.pct}%` }" />
            </span>
            <span class="w-16 shrink-0 text-right font-callnum text-callnum text-graphite-70 tabular-nums">
              {{ row.ms.toFixed(1) }}ms
            </span>
          </div>
        </div>
      </section>

      <!-- 两路召回：它们是管线的输入 -->
      <section class="space-y-sm">
        <h2 class="text-title text-graphite">两路召回</h2>
        <p class="text-meta text-graphite-45">
          向量分是余弦，落在 0–1 上，条长即分数。BM25 没有上界，画出来的长度不代表任何东西，所以这一路只列名次和分数。
        </p>
        <div class="grid gap-lg lg:grid-cols-2">
          <div v-for="col in ([
            ['vector', debugResult.vector_hits],
            ['keyword', debugResult.keyword_hits],
          ] as [string, DebugHit[]][])" :key="col[0]">
            <div class="flex items-center gap-sm pb-xs">
              <component :is="sourceMeta[col[0]].icon" :class="['h-4 w-4', sourceMeta[col[0]].tone]" :stroke-width="1.5" />
              <span class="text-label text-graphite">{{ sourceMeta[col[0]].label }}</span>
              <span class="font-callnum text-callnum-sm text-graphite-45">{{ col[1].length }} 条</span>
            </div>
            <div class="max-h-[420px] divide-y divide-rule overflow-y-auto border-y border-rule">
              <p v-if="!col[1].length" class="px-sm py-md text-meta text-graphite-45">这一路没有召回。</p>
              <div
                v-for="(hit, i) in col[1]"
                :key="hit.chunk_id"
                class="flex items-center gap-sm px-sm py-[6px]"
              >
                <span class="w-5 shrink-0 text-right font-callnum text-callnum-sm text-graphite-45 tabular-nums">{{ i + 1 }}</span>
                <span class="min-w-0 flex-1 truncate font-callnum text-callnum-sm text-graphite-70">{{ hit.doc_name }}</span>
                <!-- 向量分是余弦，活在 0..1 上，长度有绝对意义；
                     BM25 无上界，画绝对长度会撒谎，只列名次和数字 -->
                <ScoreBar v-if="col[0] === 'vector'" :score="hit.score" />
                <span v-else class="w-14 shrink-0 text-right font-callnum text-callnum text-graphite-70 tabular-nums">
                  {{ hit.score.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 融合与重排：这页的主角 -->
      <section class="space-y-sm">
        <h2 class="text-title text-graphite">融合与重排</h2>
        <p class="text-meta text-graphite-45">
          名次变化是相对 RRF 融合结果的。方向靠符号，不靠红绿——升降对色觉障碍用户同样要能读。
        </p>

        <div class="divide-y divide-rule border-y border-rule">
          <p v-if="!debugResult.final_hits.length" class="px-sm py-md text-meta text-graphite-45">
            融合后没有结果。检查分数阈值，或看上面两路是不是都空了。
          </p>
          <div v-for="(hit, idx) in debugResult.final_hits" :key="hit.chunk_id">
            <div
              class="flex cursor-pointer items-center gap-sm px-sm py-[10px] transition-colors duration-hover ease-settle hover:bg-desk-hover motion-reduce:transition-none"
              @click="toggle(hit.chunk_id)"
            >
              <span class="w-6 shrink-0 text-right font-callnum text-callnum-sm text-graphite-45 tabular-nums">
                {{ idx + 1 }}
              </span>

              <!-- rerank 升降 -->
              <span class="w-8 shrink-0 text-right font-callnum text-callnum-sm text-graphite tabular-nums">
                <template v-if="rankDelta(hit, idx) === null">—</template>
                <template v-else-if="rankDelta(hit, idx)! > 0">↑{{ rankDelta(hit, idx) }}</template>
                <template v-else-if="rankDelta(hit, idx)! < 0">↓{{ -rankDelta(hit, idx)! }}</template>
                <span v-else class="text-graphite-45">·</span>
              </span>

              <span class="min-w-0 flex-1 truncate font-callnum text-callnum-sm text-graphite-70">
                {{ hit.doc_name }} · #{{ hit.chunk_index + 1 }}
              </span>
              <ScoreBar :score="hit.score" />
              <ChevronRight
                class="h-3 w-3 shrink-0 text-graphite-45 transition-transform duration-standard ease-settle motion-reduce:transition-none"
                :class="{ 'rotate-90': expanded.includes(hit.chunk_id) }"
                :stroke-width="1.5"
              />
            </div>
            <p v-if="expanded.includes(hit.chunk_id)" class="whitespace-pre-wrap px-sm pb-md pl-[68px] text-body-sm text-graphite-70">
              {{ hit.content || '（内容为空）' }}
            </p>
          </div>
        </div>
      </section>

      <section v-if="debugResult.answer !== null" class="space-y-sm">
        <h2 class="text-title text-graphite">LLM 答案</h2>
        <p class="max-w-prose whitespace-pre-wrap text-body text-graphite">{{ debugResult.answer }}</p>
      </section>
    </template>

    <p v-else-if="!searched" class="py-xxl text-body-sm text-graphite-45">
      设好参数，检索一次，看每一级召回了什么、重排把谁挪到了哪里。
    </p>
  </div>
</template>
