import http from '@/utils/http'
import type {
  AttachmentDeclaration,
  AttachmentStatus,
  AttachmentVO,
  ChatTurnVO,
  Citation,
  CreateChatTurnPayload,
  MessageVO,
  SessionVO,
  TurnProcessingStatus,
  TurnReadiness,
} from '@/types/chat'

interface SessionOut {
  session_id: string
  title: string | null
  summary: string | null
  message_count: number
}

interface CitationOut {
  doc_id: string | null
  chunk_id?: string | null
  doc_name: string | null
  chunk_index?: number
  content: string
  score: number
  source?: string
  rank?: number
}

interface AttachmentOut {
  attachment_id: string
  client_id: string
  document_id: string | null
  file_name: string
  mime_type: string
  file_size: number
  status: string
  ignored: boolean
  error_message: string | null
}

interface AssistantOut {
  message_id: string
  content: string
  citations: CitationOut[]
}

interface ChatTurnOut {
  turn_id: string
  session_id: string
  space_id: string
  query: string
  readiness: string
  processing_status: string
  processing_error: string | null
  attachments: AttachmentOut[]
  assistant: AssistantOut | null
}

interface MessageOut {
  message_id: string
  role: string
  content: string
  processing_status?: string | null
  processing_error?: string | null
  attachments?: AttachmentOut[]
  citations?: CitationOut[]
}

function toSessionVO(s: SessionOut): SessionVO {
  const now = new Date().toISOString()
  return {
    id: s.session_id,
    title: s.title ?? '新会话',
    created_at: now,
    updated_at: now,
    message_count: s.message_count,
  }
}

function toMessageVO(m: MessageOut): MessageVO {
  return {
    id: m.message_id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    created_at: new Date().toISOString(),
    citations: (m.citations ?? []).map(toCitation),
    processing_status:
      (m.processing_status as TurnProcessingStatus | null) ?? null,
    processing_error: m.processing_error ?? null,
    attachments: (m.attachments ?? []).map(toAttachmentVO),
  }
}

function toCitation(citation: CitationOut): Citation {
  return {
    ...citation,
    chunk_index: citation.chunk_index ?? Math.max((citation.rank ?? 1) - 1, 0),
  }
}

function toAttachmentVO(attachment: AttachmentOut): AttachmentVO {
  return {
    ...attachment,
    status: attachment.status as AttachmentStatus,
  }
}

function toChatTurnVO(turn: ChatTurnOut): ChatTurnVO {
  return {
    ...turn,
    readiness: turn.readiness as TurnReadiness,
    processing_status: turn.processing_status as TurnProcessingStatus,
    attachments: turn.attachments.map(toAttachmentVO),
    assistant: turn.assistant
      ? {
          id: turn.assistant.message_id,
          role: 'assistant',
          content: turn.assistant.content,
          created_at: new Date().toISOString(),
          citations: turn.assistant.citations.map(toCitation),
        }
      : null,
  }
}

export async function listSessions(spaceId?: string): Promise<SessionVO[]> {
  const params = spaceId ? { space_id: spaceId } : undefined
  const data = await http.get<SessionOut[]>('/sessions', { params })
  return data.map(toSessionVO)
}

export async function createSession(
  title = '新会话',
  spaceId?: string,
): Promise<SessionVO> {
  const data = await http.post<SessionOut>('/sessions', {
    title,
    space_id: spaceId,
  })
  return toSessionVO(data)
}

export async function deleteSession(id: string): Promise<void> {
  await http.delete(`/sessions/${id}`)
}

export async function listMessages(sessionId: string): Promise<MessageVO[]> {
  const data = await http.get<MessageOut[]>(`/sessions/${sessionId}/messages`)
  return data.map(toMessageVO)
}

export async function createChatTurn(
  payload: CreateChatTurnPayload,
): Promise<ChatTurnVO> {
  const data = await http.post<ChatTurnOut>('/chat/turns', payload)
  return toChatTurnVO(data)
}

export async function getChatTurn(turnId: string): Promise<ChatTurnVO> {
  const data = await http.get<ChatTurnOut>(`/chat/turns/${turnId}`)
  return toChatTurnVO(data)
}

export async function uploadTurnAttachment(
  turnId: string,
  attachmentId: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<ChatTurnVO> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  await http.put(
    `/chat/turns/${turnId}/attachments/${attachmentId}`,
    formData,
    {
      onUploadProgress(event) {
        const total = event.total ?? file.size
        const progress =
          total > 0 ? Math.round((event.loaded / total) * 100) : 0
        onProgress(Math.min(Math.max(progress, 0), 100))
      },
    },
  )
  return getChatTurn(turnId)
}

export async function addTurnAttachment(
  turnId: string,
  attachment: AttachmentDeclaration,
): Promise<ChatTurnVO> {
  const data = await http.post<ChatTurnOut>(
    `/chat/turns/${turnId}/attachments`,
    attachment,
  )
  return toChatTurnVO(data)
}

export async function retryTurnAttachment(
  turnId: string,
  attachmentId: string,
): Promise<ChatTurnVO> {
  await http.post(`/chat/turns/${turnId}/attachments/${attachmentId}/retry`)
  return getChatTurn(turnId)
}

export async function ignoreTurnAttachment(
  turnId: string,
  attachmentId: string,
): Promise<ChatTurnVO> {
  const data = await http.patch<ChatTurnOut>(
    `/chat/turns/${turnId}/attachments/${attachmentId}`,
    { ignored: true },
  )
  return toChatTurnVO(data)
}

export async function cancelChatTurn(turnId: string): Promise<ChatTurnVO> {
  const data = await http.post<ChatTurnOut>(`/chat/turns/${turnId}/cancel`)
  return toChatTurnVO(data)
}
