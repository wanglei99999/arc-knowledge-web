import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { listSessions, createSession, deleteSession, listMessages } from '@/api/chat'
import { streamChat } from '@/utils/sse'
import type { SessionVO, MessageVO } from '@/types/chat'
import { useSpacesStore } from '@/stores/spaces'

export const useChatStore = defineStore('chat', () => {
  const spacesStore = useSpacesStore()
  const sessions = ref<SessionVO[]>([])
  const activeSessionId = ref<string | null>(null)
  const messages = ref<MessageVO[]>([])
  const sessionsLoading = ref(false)
  const messagesLoading = ref(false)
  const isStreaming = ref(false)
  let stopStream: (() => void) | null = null

  async function fetchSessions() {
    sessionsLoading.value = true
    try {
      sessions.value = await listSessions(spacesStore.currentSpace?.space_id)
      if (sessions.value.length && !activeSessionId.value) {
        await switchSession(sessions.value[0].id)
      }
    } finally {
      sessionsLoading.value = false
    }
  }

  async function switchSession(id: string) {
    if (isStreaming.value) stopStream?.()
    activeSessionId.value = id
    messagesLoading.value = true
    try {
      messages.value = await listMessages(id)
    } finally {
      messagesLoading.value = false
    }
  }

  async function newSession() {
    const session = await createSession('新会话', spacesStore.currentSpace?.space_id)
    sessions.value = [session, ...sessions.value]
    await switchSession(session.id)
  }

  async function removeSession(id: string) {
    await deleteSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (activeSessionId.value === id) {
      if (sessions.value.length) {
        await switchSession(sessions.value[0].id)
      } else {
        activeSessionId.value = null
        messages.value = []
      }
    }
  }

  function sendMessage(content: string) {
    if (!activeSessionId.value || isStreaming.value || !content.trim()) return

    const userMsg: MessageVO = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    }
    messages.value = [...messages.value, userMsg]

    const assistantMsg: MessageVO = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      streaming: true,
    }
    messages.value = [...messages.value, assistantMsg]
    isStreaming.value = true

    stopStream = streamChat(activeSessionId.value!, content, {
      onChunk(text) {
        // Find and update in place to avoid full re-render
        const idx = messages.value.findIndex(m => m.id === assistantMsg.id)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], content: messages.value[idx].content + text }
        }
      },
      onDone(fullText, citations) {
        const idx = messages.value.findIndex(m => m.id === assistantMsg.id)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], content: fullText, citations, streaming: false }
        }
        isStreaming.value = false
        stopStream = null

        // Update session title on first question
        const session = sessions.value.find(s => s.id === activeSessionId.value)
        if (session) {
          if (session.message_count === 0) {
            session.title = content.trim().slice(0, 24) + (content.trim().length > 24 ? '…' : '')
          }
          session.message_count += 2
          session.updated_at = new Date().toISOString()
        }
      },
      onError(err) {
        const idx = messages.value.findIndex(m => m.id === assistantMsg.id)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], content: '抱歉，回答生成失败，请重试。', streaming: false }
        }
        isStreaming.value = false
        stopStream = null
        message.error('生成失败：' + err.message)
      },
    })
  }

  function stopGeneration() {
    stopStream?.()
    stopStream = null
    const last = messages.value[messages.value.length - 1]
    if (last?.streaming) {
      messages.value[messages.value.length - 1] = { ...last, streaming: false }
    }
    isStreaming.value = false
  }

  watch(() => spacesStore.currentSpace?.space_id, async (newId, oldId) => {
    if (!newId || newId === oldId) return

    if (!oldId) {
      // 首次 space 加载：只刷新 sessions 列表，不清空已加载的消息
      sessions.value = await listSessions(newId)
      return
    }

    // 用户主动切换 space：全量重置
    activeSessionId.value = null
    messages.value = []
    await fetchSessions()
  })

  return {
    sessions,
    activeSessionId,
    messages,
    sessionsLoading,
    messagesLoading,
    isStreaming,
    fetchSessions,
    switchSession,
    newSession,
    removeSession,
    sendMessage,
    stopGeneration,
  }
})
