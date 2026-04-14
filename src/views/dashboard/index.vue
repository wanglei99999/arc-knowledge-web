<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import {
  FileText, Layers, MessageSquare, HardDrive,
  RefreshCw, Boxes
} from 'lucide-vue-next'
import dayjs from 'dayjs'
import StatusBadge from '@/components/document/StatusBadge.vue'
import type { DocumentStatus } from '@/types/document'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

// ── 统计卡片 ──────────────────────────────────────────────────────────────────
const stats = [
  {
    label: '文档总数',
    value: '24',
    unit: '个',
    icon: FileText,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50',
    change: '+3 本周',
    up: true,
  },
  {
    label: '切片总数',
    value: '1,847',
    unit: '条',
    icon: Layers,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-50',
    change: '+214 本周',
    up: true,
  },
  {
    label: '对话次数',
    value: '312',
    unit: '次',
    icon: MessageSquare,
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-50',
    change: '+48 本周',
    up: true,
  },
  {
    label: '存储占用',
    value: '128.5',
    unit: 'MB',
    icon: HardDrive,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    change: '+12.3 MB',
    up: false,
  },
]

// ── 7 天对话趋势 ───────────────────────────────────────────────────────────────
const last7Days = Array.from({ length: 7 }, (_, i) =>
  dayjs().subtract(6 - i, 'day').format('MM-DD'),
)

const trendOption = {
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#E4E4E7',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: '#3f3f46', fontSize: 12 },
    axisPointer: { lineStyle: { color: '#6366F1', opacity: 0.3 } },
    formatter: (params: { name: string; value: number }[]) =>
      `${params[0].name}　对话 <b>${params[0].value}</b> 次`,
  },
  grid: { left: 8, right: 8, top: 12, bottom: 0, containLabel: true },
  xAxis: {
    type: 'category',
    data: last7Days,
    axisLine: { lineStyle: { color: '#E4E4E7' } },
    axisLabel: { color: '#A1A1AA', fontSize: 11 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    minInterval: 10,
    axisLabel: { color: '#A1A1AA', fontSize: 11 },
    splitLine: { lineStyle: { color: '#F4F4F5', type: 'dashed' } },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  series: [
    {
      name: '对话数',
      type: 'line',
      smooth: true,
      data: [28, 42, 35, 58, 67, 45, 37],
      lineStyle: { color: '#6366F1', width: 2.5 },
      itemStyle: { color: '#6366F1', borderWidth: 2, borderColor: '#fff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99,102,241,0.18)' },
            { offset: 1, color: 'rgba(99,102,241,0.00)' },
          ],
        },
      },
      symbol: 'circle',
      symbolSize: 7,
    },
  ],
}

// ── 最近入库记录 ──────────────────────────────────────────────────────────────
interface Task {
  name: string
  status: DocumentStatus
  chunks: number
  time: string
}

const recentTasks: Task[] = [
  { name: '产品设计规范v2.pdf',    status: 'completed',  chunks: 124, time: '2026-04-14 18:30' },
  { name: '研发流程手册.docx',      status: 'completed',  chunks: 87,  time: '2026-04-14 16:12' },
  { name: '竞品分析报告Q1.pdf',     status: 'processing', chunks: 0,   time: '2026-04-14 15:50' },
  { name: '用户访谈记录合集.txt',   status: 'failed',     chunks: 0,   time: '2026-04-14 14:22' },
  { name: '技术架构说明.md',        status: 'completed',  chunks: 43,  time: '2026-04-14 10:05' },
]

// ── 知识空间 ──────────────────────────────────────────────────────────────────
const spaces = [
  {
    name: '产品知识库',
    desc: '产品设计文档、需求规格、用户调研',
    docs: 12,
    letterColor: 'bg-indigo-100 text-indigo-600',
  },
  {
    name: '技术文档库',
    desc: '架构设计、API 文档、部署手册',
    docs: 8,
    letterColor: 'bg-violet-100 text-violet-600',
  },
  {
    name: '运营资料库',
    desc: '营销素材、数据报告、竞品分析',
    docs: 4,
    letterColor: 'bg-sky-100 text-sky-600',
  },
]
</script>

<template>
  <div class="space-y-6">
    <!-- 页头 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-800">概览</h1>
        <p class="mt-0.5 text-sm text-zinc-400">数据每 5 分钟刷新一次</p>
      </div>
      <button class="flex items-center gap-1.5 px-3 py-2 rounded-button text-sm text-zinc-500 hover:bg-surface-muted transition-colors">
        <RefreshCw class="w-3.5 h-3.5" />
        刷新
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-4 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-card bg-surface-card border border-surface-border shadow-card p-5 flex items-start gap-4"
      >
        <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', stat.iconBg]">
          <component :is="stat.icon" :class="['w-5 h-5', stat.iconColor]" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-zinc-400 mb-1">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-zinc-800 leading-none">
            {{ stat.value }}<span class="text-sm font-normal text-zinc-400 ml-1">{{ stat.unit }}</span>
          </p>
          <p class="mt-1.5 text-xs text-zinc-400">{{ stat.change }}</p>
        </div>
      </div>
    </div>

    <!-- 趋势图 + 知识空间 -->
    <div class="grid grid-cols-3 gap-4">
      <!-- 7 天对话趋势 -->
      <div class="col-span-2 rounded-card bg-surface-card border border-surface-border shadow-card p-5">
        <p class="text-sm font-semibold text-zinc-700 mb-4">7 天对话趋势</p>
        <VChart
          :option="trendOption"
          autoresize
          style="height: 200px"
        />
      </div>

      <!-- 知识空间 -->
      <div class="rounded-card bg-surface-card border border-surface-border shadow-card p-5">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-semibold text-zinc-700">知识空间</p>
          <Boxes class="w-4 h-4 text-zinc-300" />
        </div>
        <div class="space-y-3">
          <div
            v-for="space in spaces"
            :key="space.name"
            class="flex items-center gap-3 p-3 rounded-xl bg-surface-muted hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0', space.letterColor]">
              {{ space.name[0] }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-zinc-700 truncate">{{ space.name }}</p>
              <p class="text-xs text-zinc-400 truncate">{{ space.desc }}</p>
            </div>
            <span class="shrink-0 text-xs text-zinc-400">{{ space.docs }} 文档</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近入库记录 -->
    <div class="rounded-card bg-surface-card border border-surface-border shadow-card overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-border">
        <p class="text-sm font-semibold text-zinc-700">最近入库记录</p>
      </div>
      <div class="divide-y divide-surface-border">
        <div
          v-for="task in recentTasks"
          :key="task.name"
          class="flex items-center gap-4 px-5 py-3 hover:bg-surface-muted transition-colors"
        >
          <FileText class="w-4 h-4 text-zinc-300 shrink-0" />
          <span class="flex-1 text-sm text-zinc-700 truncate">{{ task.name }}</span>
          <span v-if="task.chunks" class="text-xs text-zinc-400 shrink-0">{{ task.chunks }} 切片</span>
          <span v-else class="text-xs text-zinc-300 shrink-0">—</span>
          <StatusBadge :status="task.status" />
          <span class="text-xs text-zinc-400 shrink-0 w-32 text-right">{{ task.time }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
