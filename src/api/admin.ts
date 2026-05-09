import http from '@/utils/http'

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  document_count: number
  chunk_count: number
  session_count: number
  storage_bytes: number
}

export function getAdminStats(): Promise<AdminStats> {
  return http.get('/admin/stats')
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export interface UsageDay {
  day: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

export interface TenantUsage {
  tenant_id: string
  period: { start: string; end: string }
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  by_model: {
    model: string
    input_tokens: number
    output_tokens: number
    cost_usd: number
  }[]
  by_day?: UsageDay[]
}

export function getTenantUsage(
  tenantId: string,
  start: string,
  end: string,
  groupBy?: 'day',
): Promise<TenantUsage> {
  return http.get(`/admin/tenants/${tenantId}/usage`, {
    params: { start, end, group_by: groupBy },
  })
}

// ── Model Config ──────────────────────────────────────────────────────────────

export interface ModelConfig {
  model_id: string
  input_cost_per_1k: number
  output_cost_per_1k: number
  context_window: number
  updated_at: string
}

export interface ModelConfigBody {
  input_cost_per_1k: number
  output_cost_per_1k: number
  context_window: number
}

export function listModelConfigs(): Promise<ModelConfig[]> {
  return http.get('/admin/models')
}

export function upsertModelConfig(modelId: string, body: ModelConfigBody): Promise<ModelConfig> {
  return http.post(`/admin/models/${modelId}`, body)
}

export function deleteModelConfig(modelId: string): Promise<{ status: string }> {
  return http.delete(`/admin/models/${modelId}`)
}

// ── Tenant Config ─────────────────────────────────────────────────────────────

export interface TenantConfig {
  tenant_id: string
  default_llm_provider: string
  default_llm_model: string
  allowed_models: string[]
}

export interface TenantConfigBody {
  default_llm_provider: string
  default_llm_model: string
  allowed_models: string[]
}

export function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  return http.get(`/admin/tenants/${tenantId}/config`)
}

export function updateTenantConfig(tenantId: string, body: TenantConfigBody): Promise<{ status: string; tenant_id: string; config: TenantConfig }> {
  return http.put(`/admin/tenants/${tenantId}/config`, body)
}
