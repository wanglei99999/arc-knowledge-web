export type MessageRole = 'user' | 'assistant'

export interface Citation {
  doc_id: string
  doc_name: string
  chunk_index: number
  content: string
  score: number
}

export interface MessageVO {
  id: string
  role: MessageRole
  content: string
  created_at: string
  citations?: Citation[]
  streaming?: boolean
}

export interface SessionVO {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}
