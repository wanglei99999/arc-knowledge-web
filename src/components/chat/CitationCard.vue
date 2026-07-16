<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type { Citation } from '@/types/chat'
import { cn } from '@/lib/utils'

const props = defineProps<{ citations: Citation[] }>()

const expanded = ref(false)

/** 分数最高的一条是「依据」。一屏最多一处印泥底——所以 key 只认第一名 */
const keyIndex = computed(() => {
  let best = 0
  props.citations.forEach((c, i) => {
    if (c.score > props.citations[best].score) best = i
  })
  return best
})

/** 按分数降序，让长条从长到短排下来——一列长短不齐才扫得出这批召回塌没塌 */
const ranked = computed(() =>
  props.citations
    .map((cite, i) => ({ cite, isKey: i === keyIndex.value }))
    .sort((a, b) => b.cite.score - a.cite.score),
)
</script>

<template>
  <div class="mt-md">
    <!-- 折叠头 -->
    <button
      type="button"
      :aria-expanded="expanded"
      class="flex items-center gap-xs rounded-sm px-sm py-xs text-meta text-graphite-45 transition-colors duration-hover ease-settle hover:bg-desk-hover hover:text-graphite motion-reduce:transition-none"
      @click="expanded = !expanded"
    >
      <ChevronDown
        class="h-3 w-3 transition-transform duration-standard ease-settle motion-reduce:transition-none"
        :class="{ '-rotate-90': !expanded }"
        :stroke-width="1.5"
      />
      {{ citations.length }} 处依据
    </button>

    <!-- 展开的引证卡。不做错峰：它们是一批到的，不是一条条到的 -->
    <div v-if="expanded" class="mt-sm space-y-sm">
      <div
        v-for="({ cite, isKey }) in ranked"
        :key="`${cite.doc_id}-${cite.chunk_index}`"
        :class="cn(
          'rounded-md border p-md',
          isKey ? 'border-seal-pale bg-seal-pale' : 'border-rule bg-paper',
        )"
      >
        <!-- 钤印行：标记盖在卡顶，原件之外。
             印只钤在依据那一条上——四条出处全标红，红就不再是签名了。
             文件名是用来认的，不是用来判断的，所以它是石墨。 -->
        <div class="flex items-baseline gap-sm">
          <span
            v-if="isKey"
            class="shrink-0 rounded-xs border border-seal px-[5px] py-[1px] font-callnum text-callnum-sm text-seal"
          >
            依据
          </span>
          <span class="min-w-0 flex-1 truncate font-callnum text-callnum-sm text-graphite-70">
            {{ cite.doc_name }} · #{{ cite.chunk_index + 1 }}
          </span>

          <!-- 分数用长度，不用深浅。白底上装不下 0.00–1.00 的连续量，这是算术 -->
          <span class="flex shrink-0 items-center gap-sm">
            <span class="h-[3px] w-12 overflow-hidden rounded-full bg-desk-sunken">
              <span
                class="block h-full rounded-full bg-graphite-70"
                :style="{ width: `${Math.max(0, Math.min(1, cite.score)) * 100}%` }"
              />
            </span>
            <span class="font-callnum text-callnum text-graphite-70 tabular-nums">
              {{ cite.score.toFixed(2) }}
            </span>
          </span>
        </div>

        <!-- 原件。不高亮、不划线、不改一个像素 -->
        <p class="mt-sm line-clamp-3 text-body-sm text-graphite-70">{{ cite.content }}</p>
      </div>
    </div>
  </div>
</template>
