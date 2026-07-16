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

/**
 * `/search` 的 hits / chunks：后端自己也只标到 `list[dict]`
 * （retrieval_service.py:25-26），真实形状写在那两行的注释里，这里照抄。
 *
 * chunks 的注释末尾是 `...`——还有别的字段，但前端没用到。
 * 不写进来：把没验证过的字段列出来，就是拿类型冒充契约。
 */
export interface SearchHit {
  chunk_id: string
  document_id: string
  chunk_index: number
  score: number
  source?: 'vector' | 'keyword' | 'rrf' | 'rerank'
}

export interface SearchChunk {
  chunk_id: string
  content: string
  document_id: string
  chunk_index: number
}

export interface SearchListResult {
  query: string
  total: number
  hits: SearchHit[]
  chunks: SearchChunk[]
}

export interface SearchParams {
  q: string
  space_id: string
  top_k?: number
  score_threshold?: number
}

/** 检索页此前直接在视图里调 http.get 并现编了个 any 返回类型——全项目只有那一处这样 */
export function search(params: SearchParams): Promise<SearchListResult> {
  return http.get<SearchListResult>('/search', { params })
}
