export type DocumentStatus =
  | 'pending'
  | 'parsing'
  | 'parsed'
  | 'chunking'
  | 'chunked'
  | 'embedding'
  | 'indexed'
  | 'failed'
  | 'stale'
  | 'deleting'
  | 'deleted'

export interface DocumentVO {
  id: string
  tenant_id: string
  space_id: string
  original_name: string
  mime_type: string
  status: DocumentStatus
  chunk_count: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ChunkVO {
  chunk_id: string
  content: string
  chunk_index: number
  token_count: number
  metadata: Record<string, unknown>
}

export interface DocumentListResult {
  items: DocumentVO[]
  total: number
}

export interface ChunkListResult {
  items: ChunkVO[]
  total: number
}
