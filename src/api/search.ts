import http from '@/utils/http'

export interface DebugSearchRequest {
  query: string
  space_id?: string
  top_k?: number
  score_threshold?: number
  query_rewrite_enabled?: boolean
  rerank_enabled?: boolean
  vector_top_k?: number
  keyword_top_k?: number
  rrf_k?: number
  include_answer?: boolean
}

export interface DebugHit {
  chunk_id: string
  document_id: string
  doc_name: string
  chunk_index: number
  content: string
  score: number
  source: 'vector' | 'keyword' | 'rrf' | 'rerank'
}

export interface DebugResult {
  query_text: string
  rewritten_queries: string[]
  intent_is_valid: boolean
  vector_hits: DebugHit[]
  keyword_hits: DebugHit[]
  rrf_hits: DebugHit[]
  final_hits: DebugHit[]
  timings_ms: Record<string, number>
  params: DebugSearchRequest
  answer: string | null
}

export function debugSearch(req: DebugSearchRequest): Promise<DebugResult> {
  return http.post<DebugResult>('/search/debug', req)
}
