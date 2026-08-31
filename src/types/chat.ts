export type MessageRole = 'user' | 'assistant'

export interface Citation {
  doc_id: string | null
  chunk_id?: string | null
  doc_name: string | null
  chunk_index: number
  content: string
  score: number
  source?: string
  rank?: number
}

export type AttachmentStatus =
  | 'pending_upload'
  | 'uploading'
  | 'ingesting'
  | 'indexed'
  | 'failed'
  | 'ignored'

export type TurnReadiness = 'ingesting' | 'blocked' | 'ready' | 'empty'

export type TurnProcessingStatus =
  | 'waiting_files'
  | 'answering'
  | 'completed'
  | 'answer_failed'
  | 'cancelled'

export type SessionNotification = 'completed_unread' | 'failed_unread'

export interface AttachmentVO {
  attachment_id: string
  client_id: string
  document_id: string | null
  file_name: string
  mime_type: string
  file_size: number
  status: AttachmentStatus
  ignored: boolean
  error_message: string | null
  progress?: number
}

export interface MessageVO {
  id: string
  turn_id?: string
  role: MessageRole
  content: string
  created_at: string
  citations?: Citation[]
  streaming?: boolean
  processing_status?: TurnProcessingStatus | null
  processing_error?: string | null
  attachments?: AttachmentVO[]
}

export interface ChatTurnVO {
  turn_id: string
  session_id: string
  space_id: string
  query: string
  readiness: TurnReadiness
  processing_status: TurnProcessingStatus
  processing_error: string | null
  attachments: AttachmentVO[]
  assistant: MessageVO | null
}

export type AttachmentDeclaration = Pick<
  AttachmentVO,
  'client_id' | 'file_name' | 'mime_type' | 'file_size'
>

export interface CreateChatTurnPayload {
  client_request_id: string
  session_id: string
  query: string
  attachments: AttachmentDeclaration[]
}

export interface SessionVO {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface ArchivedSessionVO {
  id: string
  title: string
  message_count: number
  archived_at: string
  space: {
    space_id: string
    name: string
    status: 'active' | 'archived'
  }
}

export interface ArchivedSessionPageVO {
  items: ArchivedSessionVO[]
  total: number
}

export interface ArchivedSessionListParams {
  query?: string
  space_id?: string
  limit: number
  offset: number
}
