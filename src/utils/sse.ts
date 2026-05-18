import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useSpacesStore } from '@/stores/spaces'
import type { Citation } from '@/types/chat'

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: (fullText: string, citations: Citation[]) => void
  onError: (err: Error) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function streamChat(
  sessionId: string,
  question: string,
  callbacks: StreamCallbacks,
): () => void {
  const controller = new AbortController()
  const appStore = useAppStore()
  const authStore = useAuthStore()
  const spacesStore = useSpacesStore()

  ;(async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Id': appStore.tenantId,
      }
      if (authStore.accessToken) {
        headers['Authorization'] = `Bearer ${authStore.accessToken}`
      }

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          query: question,
          space_id: spacesStore.currentSpace?.space_id ?? '',
          session_id: sessionId,
          top_k: 10,
          score_threshold: 0.0,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`HTTP ${res.status}: ${text}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Response body is empty')

      const decoder = new TextDecoder()
      let buffer = ''
      const parts: string[] = []
      let citations: Citation[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE 以 \n\n 分隔每个事件
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith('data:')) continue

          const payload = line.slice(5).trim()
          if (payload === '[DONE]') {
            callbacks.onDone(parts.join(''), citations)
            return
          }

          try {
            const json = JSON.parse(payload)
            if (typeof json.delta === 'string') {
              parts.push(json.delta)
              callbacks.onChunk(json.delta)
            } else if (Array.isArray(json.citations)) {
              citations = json.citations
            }
          } catch {
            // 忽略非 JSON 行
          }
        }
      }

      // 流正常结束但未收到 [DONE]
      callbacks.onDone(parts.join(''), citations)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  })()

  return () => controller.abort()
}
