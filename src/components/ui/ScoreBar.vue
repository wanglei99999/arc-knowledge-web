<script setup lang="ts">
import { computed } from 'vue'

/**
 * 分数用长度，不用深浅——白底上可读的灰最多三档，装不下 0.00–1.00 的连续量。
 *
 * `max` 存在是因为不是所有分数都活在 0..1 上：余弦相似度和 rerank 分是，
 * BM25 无上界、RRF 分只有 ~0.016。给这类分数画绝对长度就是在撒谎，
 * 调用方要么传入该列的最大值换成相对长度，要么干脆别用这个组件、只列名次。
 */
const props = withDefaults(
  defineProps<{
    score: number
    max?: number
    /** 读数的小数位。RRF 这类小分数需要更多位 */
    digits?: number
  }>(),
  { max: 1, digits: 2 },
)

const pct = computed(() => {
  if (!(props.max > 0)) return 0
  return Math.max(0, Math.min(1, props.score / props.max)) * 100
})
</script>

<template>
  <span class="flex shrink-0 items-center gap-sm">
    <span class="h-[3px] w-12 overflow-hidden rounded-full bg-desk-sunken">
      <span class="block h-full rounded-full bg-graphite-70" :style="{ width: `${pct}%` }" />
    </span>
    <span class="w-10 shrink-0 text-right font-callnum text-callnum text-graphite-70 tabular-nums">
      {{ score.toFixed(digits) }}
    </span>
  </span>
</template>
