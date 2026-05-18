import http from '@/utils/http'
import type { SessionVO, MessageVO, Citation } from '@/types/chat'

interface SessionOut {
  session_id: string
  title: string | null
  summary: string | null
  message_count: number
}

interface MessageOut {
  message_id: string
  role: string
  content: string
  citations?: Citation[]
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
    citations: m.citations ?? [],
  }
}

export async function listSessions(spaceId?: string): Promise<SessionVO[]> {
  const params = spaceId ? { space_id: spaceId } : undefined
  const data = await http.get<SessionOut[]>('/sessions', { params })
  return data.map(toSessionVO)
}

export async function createSession(title = '新会话', spaceId?: string): Promise<SessionVO> {
  const data = await http.post<SessionOut>('/sessions', { title, space_id: spaceId })
  return toSessionVO(data)
}

export async function deleteSession(id: string): Promise<void> {
  await http.delete(`/sessions/${id}`)
}

export async function listMessages(sessionId: string): Promise<MessageVO[]> {
  const data = await http.get<MessageOut[]>(`/sessions/${sessionId}/messages`)
  return data.map(toMessageVO)
}
