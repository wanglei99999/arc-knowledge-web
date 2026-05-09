<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import {
  FileText, Layers, MessageSquare, HardDrive,
  RefreshCw, Plus, Trash2,
} from 'lucide-vue-next'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useAppStore } from '@/stores/app'
import {
  getAdminStats, getTenantUsage, listModelConfigs, upsertModelConfig, deleteModelConfig,
  getTenantConfig, updateTenantConfig,
} from '@/api/admin'
import type {
  AdminStats, ModelConfig, ModelConfigBody, TenantConfig,
} from '@/api/admin'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const appStore = useAppStore()

// ── 统计卡片 ──────────────────────────────────────────────────────────────────
const statsLoading = ref(false)
const stats = ref<AdminStats | null>(null)

const statCards = computed(() => {
  const s = stats.value
  return [
    {
      label: '文档总数',
      value: s ? String(s.document_count) : '--',
      unit: '个',
      icon: FileText,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-50',
    },
    {
      label: '切片总数',
      value: s ? String(s.chunk_count) : '--',
      unit: '条',
      icon: Layers,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-50',
    },
    {
      label: '会话总数',
      value: s ? String(s.session_count) : '--',
      unit: '个',
      icon: MessageSquare,
      iconColor: 'text-sky-500',
      iconBg: 'bg-sky-50',
    },
    {
      label: '存储占用',
      value: s ? (s.storage_bytes / 1024 / 1024).toFixed(1) : '--',
      unit: 'MB',
      icon: HardDrive,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50',
    },
  ]
})

// ── 7 天 Token 趋势 ────────────────────────────────────────────────────────────
const trendLoading = ref(false)
const trendDays = ref<string[]>([])
const trendData = ref<number[]>([])

const trendOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#E4E4E7',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: '#3f3f46', fontSize: 12 },
    axisPointer: { lineStyle: { color: '#6366F1', opacity: 0.3 } },
    formatter: (params: { name: string; value: number }[]) =>
      `${params[0].name}　Token <b>${params[0].value.toLocaleString()}</b>`,
  },
  grid: { left: 8, right: 8, top: 12, bottom: 0, containLabel: true },
  xAxis: {
    type: 'category',
    data: trendDays.value,
    axisLine: { lineStyle: { color: '#E4E4E7' } },
    axisLabel: { color: '#A1A1AA', fontSize: 11 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: '#A1A1AA', fontSize: 11 },
    splitLine: { lineStyle: { color: '#F4F4F5', type: 'dashed' } },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  series: [
    {
      name: 'Token 消耗',
      type: 'line',
      smooth: true,
      data: trendData.value,
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
}))

// ── 模型定价 CRUD ─────────────────────────────────────────────────────────────
const modelsLoading = ref(false)
const models = ref<ModelConfig[]>([])
const showAddModal = ref(false)
const addForm = ref<{ model_id: string } & ModelConfigBody>({
  model_id: '',
  input_cost_per_1k: 0,
  output_cost_per_1k: 0,
  context_window: 0,
})
const addSubmitting = ref(false)

const modelColumns = [
  { title: '模型 ID', dataIndex: 'model_id', key: 'model_id' },
  { title: '输入价格 ($/1K)', dataIndex: 'input_cost_per_1k', key: 'input' },
  { title: '输出价格 ($/1K)', dataIndex: 'output_cost_per_1k', key: 'output' },
  { title: '上下文窗口', dataIndex: 'context_window', key: 'ctx' },
  { title: '操作', key: 'action' },
]

async function loadModels() {
  modelsLoading.value = true
  try {
    models.value = await listModelConfigs()
  } finally {
    modelsLoading.value = false
  }
}

async function handleAddModel() {
  if (!addForm.value.model_id.trim()) {
    message.warning('请输入模型 ID')
    return
  }
  addSubmitting.value = true
  try {
    await upsertModelConfig(addForm.value.model_id.trim(), {
      input_cost_per_1k: addForm.value.input_cost_per_1k,
      output_cost_per_1k: addForm.value.output_cost_per_1k,
      context_window: addForm.value.context_window,
    })
    message.success('保存成功')
    showAddModal.value = false
    addForm.value = { model_id: '', input_cost_per_1k: 0, output_cost_per_1k: 0, context_window: 0 }
    await loadModels()
  } finally {
    addSubmitting.value = false
  }
}

function handleDeleteModel(modelId: string) {
  Modal.confirm({
    title: '确认删除',
    content: `删除模型配置 "${modelId}"？`,
    okType: 'danger',
    onOk: async () => {
      await deleteModelConfig(modelId)
      message.success('已删除')
      await loadModels()
    },
  })
}

// ── 租户 LLM 配置 ─────────────────────────────────────────────────────────────
const tenantConfigLoading = ref(false)
const tenantConfigSaving = ref(false)
const tenantForm = ref<TenantConfig>({
  tenant_id: appStore.tenantId,
  default_llm_provider: 'openai_llm',
  default_llm_model: '',
  allowed_models: [],
})

async function loadTenantConfig() {
  tenantConfigLoading.value = true
  try {
    const cfg = await getTenantConfig(appStore.tenantId)
    tenantForm.value = cfg
  } finally {
    tenantConfigLoading.value = false
  }
}

async function saveTenantConfig() {
  tenantConfigSaving.value = true
  try {
    await updateTenantConfig(appStore.tenantId, {
      default_llm_provider: tenantForm.value.default_llm_provider,
      default_llm_model: tenantForm.value.default_llm_model,
      allowed_models: tenantForm.value.allowed_models,
    })
    message.success('租户配置已更新')
  } finally {
    tenantConfigSaving.value = false
  }
}

// ── 加载全部数据 ───────────────────────────────────────────────────────────────
async function loadAll() {
  const today = dayjs().format('YYYY-MM-DD')
  const start7 = dayjs().subtract(6, 'day').format('YYYY-MM-DD')

  statsLoading.value = true
  trendLoading.value = true

  await Promise.allSettled([
    getAdminStats().then((s) => { stats.value = s }).finally(() => { statsLoading.value = false }),
    getTenantUsage(appStore.tenantId, start7, today, 'day').then((u) => {
      const days = u.by_day ?? []
      trendDays.value = days.map((d) => d.day.slice(5))  // "MM-DD"
      trendData.value = days.map((d) => d.input_tokens + d.output_tokens)
    }).finally(() => { trendLoading.value = false }),
    loadModels(),
    loadTenantConfig(),
  ])
}

onMounted(loadAll)
</script>

<template>
  <div class="space-y-6">
    <!-- 页头 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-800">管理配置</h1>
        <p class="mt-0.5 text-sm text-zinc-400">租户：{{ appStore.tenantId }}</p>
      </div>
      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
        @click="loadAll"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        刷新
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-white rounded-xl border border-zinc-100 p-5 shadow-sm"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-zinc-500">{{ card.label }}</span>
          <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', card.iconBg]">
            <component :is="card.icon" :class="['w-4 h-4', card.iconColor]" />
          </div>
        </div>
        <div v-if="statsLoading" class="h-7 w-20 bg-zinc-100 rounded animate-pulse" />
        <div v-else class="flex items-baseline gap-1">
          <span class="text-2xl font-semibold text-zinc-800">{{ card.value }}</span>
          <span class="text-sm text-zinc-400">{{ card.unit }}</span>
        </div>
      </div>
    </div>

    <!-- 7 天 Token 趋势 -->
    <div class="bg-white rounded-xl border border-zinc-100 p-5 shadow-sm">
      <h2 class="text-sm font-medium text-zinc-700 mb-4">近 7 天 Token 消耗</h2>
      <div v-if="trendLoading" class="h-40 flex items-center justify-center text-zinc-400 text-sm">
        加载中...
      </div>
      <VChart
        v-else
        :option="trendOption"
        class="h-40 w-full"
        autoresize
      />
    </div>

    <!-- 管理 Tabs -->
    <a-tabs>
      <!-- Tab 1：模型定价 -->
      <a-tab-pane key="models" tab="模型定价">
        <div class="flex justify-end mb-3">
          <button
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            @click="showAddModal = true"
          >
            <Plus class="w-3.5 h-3.5" />
            新增模型
          </button>
        </div>
        <a-table
          :columns="modelColumns"
          :data-source="models"
          :loading="modelsLoading"
          :pagination="false"
          row-key="model_id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <button
                class="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 transition-colors"
                @click="handleDeleteModel((record as ModelConfig).model_id)"
              >
                <Trash2 class="w-3 h-3" />
                删除
              </button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- Tab 2：租户配置 -->
      <a-tab-pane key="tenant" tab="租户 LLM 配置">
        <div v-if="tenantConfigLoading" class="py-8 flex justify-center text-zinc-400">加载中...</div>
        <a-form
          v-else
          :model="tenantForm"
          layout="vertical"
          class="max-w-lg"
        >
          <a-form-item label="LLM 引擎">
            <a-select v-model:value="tenantForm.default_llm_provider">
              <a-select-option value="openai_llm">openai_llm</a-select-option>
              <a-select-option value="ollama_llm">ollama_llm</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="默认模型（空 = 使用 settings 全局默认）">
            <a-input v-model:value="tenantForm.default_llm_model" placeholder="例：gpt-4o-mini" />
          </a-form-item>
          <a-form-item label="允许使用的模型白名单（空 = 不限制）">
            <a-select
              v-model:value="tenantForm.allowed_models"
              mode="tags"
              placeholder="输入模型名后回车"
            />
          </a-form-item>
          <a-form-item>
            <a-button
              type="primary"
              :loading="tenantConfigSaving"
              @click="saveTenantConfig"
            >
              保存
            </a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </div>

  <!-- 新增模型 Modal -->
  <a-modal
    v-model:open="showAddModal"
    title="新增 / 更新模型定价"
    :confirm-loading="addSubmitting"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleAddModel"
  >
    <a-form :model="addForm" layout="vertical" class="mt-4">
      <a-form-item label="模型 ID" required>
        <a-input v-model:value="addForm.model_id" placeholder="例：gpt-4o-mini" />
      </a-form-item>
      <a-form-item label="输入价格（美元 / 1K Token）">
        <a-input-number
          v-model:value="addForm.input_cost_per_1k"
          :min="0"
          :step="0.001"
          :precision="6"
          class="w-full"
        />
      </a-form-item>
      <a-form-item label="输出价格（美元 / 1K Token）">
        <a-input-number
          v-model:value="addForm.output_cost_per_1k"
          :min="0"
          :step="0.001"
          :precision="6"
          class="w-full"
        />
      </a-form-item>
      <a-form-item label="上下文窗口（Token 数）">
        <a-input-number
          v-model:value="addForm.context_window"
          :min="0"
          :step="1000"
          class="w-full"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
