import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { message } from 'ant-design-vue'

import {
  addTurnAttachment,
  cancelChatTurn,
  createChatTurn,
  createSession,
  deleteSession,
  getChatTurn,
  ignoreTurnAttachment,
  listMessages,
  listSessions,
  retryTurnAttachment,
  uploadTurnAttachment,
} from '@/api/chat'
import { useSpacesStore } from '@/stores/spaces'
import { useAppStore } from '@/stores/app'
import type {
  AttachmentDeclaration,
  AttachmentVO,
  ChatTurnVO,
  MessageVO,
  SessionNotification,
  SessionVO,
} from '@/types/chat'
import { streamChat, streamTurnAnswer } from '@/utils/sse'

const NEW_SESSION_KEY = '__new__'

interface SessionRuntime {
  stopStream: (() => void) | null
  pollTimer: ReturnType<typeof setTimeout> | null
  pollInFlight: boolean
  answerRequested: boolean
  localFiles: Map<string, File>
}

interface PersistedChatRuntime {
  drafts: Record<string, string>
  notifications: Record<string, SessionNotification>
  pendingTurns: Record<string, string>
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value)
    && typeof value === 'object'
    && Object.values(value as Record<string, unknown>)
      .every(item => typeof item === 'string')
}

function readPersistedRuntime(key: string): PersistedChatRuntime {
  const empty: PersistedChatRuntime = {
    drafts: {},
    notifications: {},
    pendingTurns: {},
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!isStringRecord(parsed.drafts)
      || !isStringRecord(parsed.notifications)
      || !isStringRecord(parsed.pendingTurns)) return empty
    const notifications = Object.fromEntries(
      Object.entries(parsed.notifications).filter(([, value]) => (
        value === 'completed_unread' || value === 'failed_unread'
      )),
    ) as Record<string, SessionNotification>
    return {
      drafts: parsed.drafts,
      notifications,
      pendingTurns: parsed.pendingTurns,
    }
  } catch {
    return empty
  }
}

function localMessageId(role: MessageVO['role']): string {
  const suffix = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
  return `${role}-${suffix}`
}

export const useChatStore = defineStore('chat', () => {
  const spacesStore = useSpacesStore()
  const appStore = useAppStore()
  const storageKey = `arc-chat-runtime:v1:${appStore.tenantId}:${appStore.userId}`
  const persisted = readPersistedRuntime(storageKey)

  const sessions = ref<SessionVO[]>([])
  const activeSessionId = ref<string | null>(null)
  const messagesBySession = ref<Record<string, MessageVO[]>>({})
  const turnsBySession = ref<Record<string, ChatTurnVO | null>>({})
  const draftsBySession = ref<Record<string, string>>({ ...persisted.drafts })
  const notificationsBySession = ref<Record<string, SessionNotification>>({
    ...persisted.notifications,
  })
  const pendingTurnsBySession = ref<Record<string, string>>({
    ...persisted.pendingTurns,
  })
  const streamingBySession = ref<Record<string, boolean>>({})
  const submittingBySession = ref<Record<string, boolean>>({})
  const sessionsLoading = ref(false)
  const messagesLoading = ref(false)
  const pendingNew = ref(false)

  // AbortController、定时器和 File 都不属于界面状态，不能进入 Pinia/localStorage。
  const runtimeBySession = new Map<string, SessionRuntime>()
  const retryHydrationInFlight = new Set<string>()

  const activeStateKey = computed(() => activeSessionId.value ?? NEW_SESSION_KEY)
  const messages = computed(() => messagesBySession.value[activeStateKey.value] ?? [])
  const activeDraft = computed({
    get: () => draftsBySession.value[activeStateKey.value] ?? '',
    set: (value: string) => setDraft(activeStateKey.value, value),
  })
  const activeTurn = computed(() => (
    activeSessionId.value ? turnsBySession.value[activeSessionId.value] ?? null : null
  ))
  const isStreaming = computed(() => (
    activeSessionId.value
      ? Boolean(streamingBySession.value[activeSessionId.value])
      : false
  ))
  const sessionBusy = computed(() => (
    activeSessionId.value ? isSessionBusy(activeSessionId.value) : false
  ))

  function persistRuntime() {
    const value: PersistedChatRuntime = {
      drafts: draftsBySession.value,
      notifications: notificationsBySession.value,
      pendingTurns: pendingTurnsBySession.value,
    }
    localStorage.setItem(storageKey, JSON.stringify(value))
  }

  function sessionNotification(sessionId: string): SessionNotification | undefined {
    return notificationsBySession.value[sessionId]
  }

  function clearSessionNotification(sessionId: string) {
    if (!notificationsBySession.value[sessionId]) return
    delete notificationsBySession.value[sessionId]
    persistRuntime()
  }

  function markSessionNotification(
    sessionId: string,
    notification: SessionNotification,
  ) {
    if (activeSessionId.value === sessionId) return
    notificationsBySession.value[sessionId] = notification
    persistRuntime()
  }

  function clearPendingTurn(sessionId: string) {
    if (!pendingTurnsBySession.value[sessionId]) return
    delete pendingTurnsBySession.value[sessionId]
    persistRuntime()
  }

  function runtimeOf(sessionId: string): SessionRuntime {
    let runtime = runtimeBySession.get(sessionId)
    if (!runtime) {
      runtime = {
        stopStream: null,
        pollTimer: null,
        pollInFlight: false,
        answerRequested: false,
        localFiles: new Map(),
      }
      runtimeBySession.set(sessionId, runtime)
    }
    return runtime
  }

  function isSessionBusy(sessionId: string): boolean {
    const turnStatus = turnsBySession.value[sessionId]?.processing_status
    return Boolean(submittingBySession.value[sessionId])
      || Boolean(streamingBySession.value[sessionId])
      || turnStatus === 'waiting_files'
      || turnStatus === 'answering'
  }

  function setSessionMessages(sessionId: string, next: MessageVO[]) {
    messagesBySession.value[sessionId] = next
  }

  function patchMessage(
    sessionId: string,
    messageId: string,
    patch: Partial<MessageVO>,
  ) {
    setSessionMessages(
      sessionId,
      (messagesBySession.value[sessionId] ?? []).map(item => (
        item.id === messageId ? { ...item, ...patch } : item
      )),
    )
  }

  function setDraft(sessionId: string, value: string) {
    draftsBySession.value[sessionId] = value
    persistRuntime()
  }

  function turnMessage(turn: ChatTurnVO): MessageVO {
    return {
      id: turn.turn_id,
      role: 'user',
      content: turn.query,
      created_at: new Date().toISOString(),
      processing_status: turn.processing_status,
      processing_error: turn.processing_error,
      attachments: turn.attachments,
    }
  }

  function applyTurn(sessionId: string, turn: ChatTurnVO) {
    turnsBySession.value[sessionId] = turn
    const current = messagesBySession.value[sessionId] ?? []
    const turnIndex = current.findIndex(item => item.id === turn.turn_id)
    const temporaryIndex = current.findIndex(item => (
      item.role === 'user'
      && item.content === turn.query
      && item.processing_status === 'waiting_files'
      && item.id.startsWith('user-')
    ))
    const index = turnIndex === -1 ? temporaryIndex : turnIndex
    const next = [...current]
    if (index === -1) next.push(turnMessage(turn))
    else next[index] = turnMessage(turn)

    if (turn.assistant) {
      const assistantIndex = next.findIndex(item => item.id === turn.assistant!.id)
      if (assistantIndex === -1) next.push(turn.assistant)
      else next[assistantIndex] = turn.assistant
    }
    setSessionMessages(sessionId, next)
  }

  function patchTurnAttachment(
    sessionId: string,
    attachmentId: string,
    patch: Partial<AttachmentVO>,
  ) {
    const turn = turnsBySession.value[sessionId]
    if (!turn) return
    applyTurn(sessionId, {
      ...turn,
      attachments: turn.attachments.map(item => (
        item.attachment_id === attachmentId ? { ...item, ...patch } : item
      )),
    })
  }

  function pollDelay(): number {
    return 2_000 + Math.round((Math.random() - 0.5) * 500)
  }

  function clearPoll(runtime: SessionRuntime) {
    if (runtime.pollTimer) clearTimeout(runtime.pollTimer)
    runtime.pollTimer = null
  }

  function finishTurnRuntime(sessionId: string) {
    const runtime = runtimeBySession.get(sessionId)
    if (!runtime) return
    clearPoll(runtime)
    runtime.stopStream = null
    runtime.pollInFlight = false
    runtime.answerRequested = false
    runtime.localFiles.clear()
    streamingBySession.value[sessionId] = false
  }

  function schedulePoll(sessionId: string, turnId: string) {
    const runtime = runtimeOf(sessionId)
    if (runtime.pollTimer) return
    runtime.pollTimer = setTimeout(() => {
      runtime.pollTimer = null
      void pollTurn(sessionId, turnId)
    }, pollDelay())
  }

  function continueTurn(sessionId: string, turn: ChatTurnVO) {
    if (turn.processing_status === 'completed') {
      finishTurnRuntime(sessionId)
      clearPendingTurn(sessionId)
      markSessionNotification(sessionId, 'completed_unread')
      return
    }
    if (turn.processing_status === 'cancelled') {
      finishTurnRuntime(sessionId)
      clearPendingTurn(sessionId)
      return
    }
    if (turn.processing_status === 'answer_failed'
      || turn.readiness === 'blocked'
      || turn.readiness === 'empty') {
      finishTurnRuntime(sessionId)
      markSessionNotification(sessionId, 'failed_unread')
      return
    }
    if (turn.processing_status === 'waiting_files' && turn.readiness === 'ready') {
      startTurnAnswer(sessionId, turn)
      return
    }
    schedulePoll(sessionId, turn.turn_id)
  }

  async function pollTurn(sessionId: string, turnId: string) {
    const runtime = runtimeOf(sessionId)
    if (runtime.pollInFlight) return
    runtime.pollInFlight = true
    try {
      const turn = await getChatTurn(turnId)
      applyTurn(sessionId, turn)
      continueTurn(sessionId, turn)
    } catch {
      schedulePoll(sessionId, turnId)
    } finally {
      runtime.pollInFlight = false
    }
  }

  function startTurnAnswer(
    sessionId: string,
    currentTurn: ChatTurnVO,
  ): boolean {
    const runtime = runtimeOf(sessionId)
    if (runtime.answerRequested || runtime.stopStream) return false
    runtime.answerRequested = true
    clearPoll(runtime)

    const answeringTurn: ChatTurnVO = {
      ...currentTurn,
      processing_status: 'answering',
      processing_error: null,
    }
    applyTurn(sessionId, answeringTurn)
    const assistantMessage: MessageVO = {
      id: localMessageId('assistant'),
      turn_id: currentTurn.turn_id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      streaming: true,
    }
    setSessionMessages(sessionId, [
      ...(messagesBySession.value[sessionId] ?? []),
      assistantMessage,
    ])
    streamingBySession.value[sessionId] = true

    runtime.stopStream = streamTurnAnswer(currentTurn.turn_id, {
      onChunk(text) {
        const current = messagesBySession.value[sessionId]
          ?.find(item => item.id === assistantMessage.id)
        if (current) {
          patchMessage(sessionId, assistantMessage.id, {
            content: current.content + text,
          })
        }
      },
      onDone(fullText, citations) {
        applyTurn(sessionId, {
          ...answeringTurn,
          processing_status: 'completed',
          assistant: {
            ...assistantMessage,
            content: fullText,
            citations,
            streaming: false,
          },
        })
        finishTurnRuntime(sessionId)
        clearPendingTurn(sessionId)
        markSessionNotification(sessionId, 'completed_unread')
      },
      onError(error) {
        patchMessage(sessionId, assistantMessage.id, {
          content: '抱歉，回答生成失败，请重试。',
          streaming: false,
          processing_status: 'answer_failed',
          processing_error: error.message,
        })
        applyTurn(sessionId, {
          ...answeringTurn,
          processing_status: 'answer_failed',
          processing_error: error.message,
        })
        finishTurnRuntime(sessionId)
        markSessionNotification(sessionId, 'failed_unread')
        message.error(`生成失败：${error.message}`)
      },
    })
    return true
  }

  async function fetchSessions() {
    sessionsLoading.value = true
    try {
      sessions.value = await listSessions(spacesStore.currentSpace?.space_id)
      if (sessions.value.length && !activeSessionId.value) {
        await switchSession(sessions.value[0].id)
      }
      await resumePendingTurns()
    } finally {
      sessionsLoading.value = false
    }
  }

  async function switchSession(id: string) {
    // 切换只改变“正在观看谁”，不改变任何会话的后台运行时。
    pendingNew.value = false
    activeSessionId.value = id
    clearSessionNotification(id)
    messagesLoading.value = true
    try {
      if (!isSessionBusy(id)) {
        setSessionMessages(id, await listMessages(id))
      }
    } finally {
      messagesLoading.value = false
    }
  }

  function newSession() {
    if (pendingNew.value) return
    pendingNew.value = true
    activeSessionId.value = null
    setSessionMessages(NEW_SESSION_KEY, [])
  }

  async function removeSession(id: string) {
    await deleteSession(id)
    runtimeBySession.get(id)?.stopStream?.()
    runtimeBySession.delete(id)
    delete messagesBySession.value[id]
    delete draftsBySession.value[id]
    delete notificationsBySession.value[id]
    delete pendingTurnsBySession.value[id]
    delete streamingBySession.value[id]
    delete submittingBySession.value[id]
    persistRuntime()
    sessions.value = sessions.value.filter(session => session.id !== id)

    if (activeSessionId.value === id) {
      if (sessions.value.length) {
        await switchSession(sessions.value[0].id)
      } else {
        activeSessionId.value = null
      }
    }
  }

  async function ensureActiveSession(): Promise<string | null> {
    if (activeSessionId.value) return activeSessionId.value
    if (!pendingNew.value) return null

    try {
      const session = await createSession(
        '新会话',
        spacesStore.currentSpace?.space_id,
      )
      sessions.value = [session, ...sessions.value]
      pendingNew.value = false
      activeSessionId.value = session.id
      return session.id
    } catch {
      pendingNew.value = true
      message.error('创建会话失败，请重试')
      return null
    }
  }

  async function sendMessage(content: string) {
    const question = content.trim()
    if (!question) return

    const sessionId = await ensureActiveSession()
    if (!sessionId || isSessionBusy(sessionId)) return

    const userMessage: MessageVO = {
      id: localMessageId('user'),
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    }
    const assistantMessage: MessageVO = {
      id: localMessageId('assistant'),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      streaming: true,
    }
    setSessionMessages(sessionId, [
      ...(messagesBySession.value[sessionId] ?? []),
      userMessage,
      assistantMessage,
    ])
    streamingBySession.value[sessionId] = true

    const runtime = runtimeOf(sessionId)
    runtime.stopStream = streamChat(sessionId, question, {
      onChunk(text) {
        const current = messagesBySession.value[sessionId]
          ?.find(item => item.id === assistantMessage.id)
        if (current) {
          patchMessage(sessionId, assistantMessage.id, {
            content: current.content + text,
          })
        }
      },
      onDone(fullText, citations) {
        patchMessage(sessionId, assistantMessage.id, {
          content: fullText,
          citations,
          streaming: false,
        })
        streamingBySession.value[sessionId] = false
        runtime.stopStream = null
        markSessionNotification(sessionId, 'completed_unread')

        const session = sessions.value.find(item => item.id === sessionId)
        if (session) {
          if (session.message_count === 0) {
            session.title = question.slice(0, 24) + (question.length > 24 ? '…' : '')
          }
          session.message_count += 2
          session.updated_at = new Date().toISOString()
        }
      },
      onError(error) {
        patchMessage(sessionId, assistantMessage.id, {
          content: '抱歉，回答生成失败，请重试。',
          streaming: false,
        })
        streamingBySession.value[sessionId] = false
        runtime.stopStream = null
        markSessionNotification(sessionId, 'failed_unread')
        message.error(`生成失败：${error.message}`)
      },
    })
  }

  async function submitTurn(content: string, files: File[]) {
    const query = content.trim()
    if (!query || files.length === 0) return

    const sessionId = await ensureActiveSession()
    if (!sessionId || isSessionBusy(sessionId)) return
    submittingBySession.value[sessionId] = true

    const clientRequestId = crypto.randomUUID()
    const declarations: AttachmentDeclaration[] = files.map(file => ({
      client_id: crypto.randomUUID(),
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
    }))
    const runtime = runtimeOf(sessionId)
    runtime.answerRequested = false
    runtime.localFiles = new Map(
      declarations.map((declaration, index) => [declaration.client_id, files[index]]),
    )

    const optimisticMessage: MessageVO = {
      id: localMessageId('user'),
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
      processing_status: 'waiting_files',
      processing_error: null,
      attachments: declarations.map(declaration => ({
        attachment_id: declaration.client_id,
        ...declaration,
        document_id: null,
        status: 'pending_upload',
        ignored: false,
        error_message: null,
        progress: 0,
      })),
    }
    setSessionMessages(sessionId, [
      ...(messagesBySession.value[sessionId] ?? []),
      optimisticMessage,
    ])

    let created: ChatTurnVO
    try {
      created = await createChatTurn({
        client_request_id: clientRequestId,
        session_id: sessionId,
        query,
        attachments: declarations,
      })
    } catch (error) {
      setSessionMessages(
        sessionId,
        (messagesBySession.value[sessionId] ?? []).filter(item => item.id !== optimisticMessage.id),
      )
      runtime.localFiles.clear()
      submittingBySession.value[sessionId] = false
      message.error('创建附件消息失败，请重试')
      return
    }

    applyTurn(sessionId, created)
    submittingBySession.value[sessionId] = false
    pendingTurnsBySession.value[sessionId] = created.turn_id
    persistRuntime()
    await Promise.allSettled(created.attachments.map(async item => {
      const file = runtime.localFiles.get(item.client_id)
      if (!file) return
      patchTurnAttachment(sessionId, item.attachment_id, {
        status: 'uploading',
        progress: 0,
      })
      const uploaded = await uploadTurnAttachment(
        created.turn_id,
        item.attachment_id,
        file,
        progress => patchTurnAttachment(
          sessionId,
          item.attachment_id,
          { status: 'uploading', progress },
        ),
      )
      applyTurn(sessionId, uploaded)
    }))

    try {
      const latest = await getChatTurn(created.turn_id)
      applyTurn(sessionId, latest)
      continueTurn(sessionId, latest)
    } catch {
      schedulePoll(sessionId, created.turn_id)
    }
  }

  function findTurnContext(turnId: string) {
    const entry = Object.entries(turnsBySession.value)
      .find(([, turn]) => turn?.turn_id === turnId)
    if (!entry || !entry[1]) return null
    return { sessionId: entry[0], turn: entry[1] }
  }

  function findMessageSessionId(messageId: string): string | null {
    const entry = Object.entries(messagesBySession.value)
      .find(([, messages]) => messages.some(message => message.id === messageId))
    return entry?.[0] ?? null
  }

  async function retryAnswer(turnId: string) {
    let context = findTurnContext(turnId)
    if (!context) {
      const sessionId = findMessageSessionId(turnId)
      if (!sessionId
        || isSessionBusy(sessionId)
        || retryHydrationInFlight.has(turnId)) return
      retryHydrationInFlight.add(turnId)
      try {
        const turn = await getChatTurn(turnId)
        if (turn.session_id !== sessionId || isSessionBusy(sessionId)) return
        applyTurn(sessionId, turn)
        context = { sessionId, turn }
      } catch {
        message.error('读取本轮状态失败，请稍后再试')
        return
      } finally {
        retryHydrationInFlight.delete(turnId)
      }
    }

    if (!context
      || context.turn.processing_status !== 'answer_failed'
      || context.turn.readiness !== 'ready') return
    if (isSessionBusy(context.sessionId)) return

    const started = startTurnAnswer(context.sessionId, context.turn)
    if (!started) return
    setSessionMessages(
      context.sessionId,
      (messagesBySession.value[context.sessionId] ?? []).filter(message => !(
        message.role === 'assistant'
        && message.processing_status === 'answer_failed'
        && message.turn_id === turnId
      )),
    )
  }

  async function retryAttachment(turnId: string, attachmentId: string) {
    const context = findTurnContext(turnId)
    const attachment = context?.turn.attachments
      .find(item => item.attachment_id === attachmentId)
    if (!context || !attachment || attachment.status !== 'failed') return

    if (!attachment.document_id) {
      message.error('上传失败的附件需要重新选择原文件')
      return
    }

    patchTurnAttachment(context.sessionId, attachmentId, {
      status: 'ingesting',
      error_message: null,
    })
    try {
      const updated = await retryTurnAttachment(turnId, attachmentId)
      applyTurn(context.sessionId, updated)
      continueTurn(context.sessionId, updated)
    } catch {
      patchTurnAttachment(context.sessionId, attachmentId, {
        status: 'failed',
        error_message: attachment.error_message || '入库重试失败，请稍后再试',
      })
      message.error('附件入库重试失败，请稍后再试')
    }
  }

  async function retryUpload(turnId: string, attachmentId: string, file: File) {
    const context = findTurnContext(turnId)
    const attachment = context?.turn.attachments
      .find(item => item.attachment_id === attachmentId)
    if (!context
      || !attachment
      || attachment.status !== 'failed'
      || attachment.document_id) return

    patchTurnAttachment(context.sessionId, attachmentId, {
      status: 'uploading',
      progress: 0,
      error_message: null,
    })
    try {
      const updated = await uploadTurnAttachment(
        turnId,
        attachmentId,
        file,
        progress => patchTurnAttachment(
          context.sessionId,
          attachmentId,
          { status: 'uploading', progress },
        ),
      )
      applyTurn(context.sessionId, updated)
      continueTurn(context.sessionId, updated)
    } catch {
      patchTurnAttachment(context.sessionId, attachmentId, {
        status: 'failed',
        progress: 0,
        error_message: '文件上传失败，请重新选择原文件',
      })
      message.error('附件上传失败，请重新选择原文件')
    }
  }

  async function ignoreAttachment(turnId: string, attachmentId: string) {
    const context = findTurnContext(turnId)
    const attachment = context?.turn.attachments
      .find(item => item.attachment_id === attachmentId)
    if (!context || !attachment || attachment.status !== 'failed') return

    patchTurnAttachment(context.sessionId, attachmentId, {
      status: 'ignored',
      ignored: true,
      error_message: null,
    })
    try {
      const updated = await ignoreTurnAttachment(turnId, attachmentId)
      applyTurn(context.sessionId, updated)
      continueTurn(context.sessionId, updated)
    } catch {
      applyTurn(context.sessionId, context.turn)
      message.error('忽略附件失败，请稍后再试')
    }
  }

  async function addAttachments(turnId: string, files: File[]) {
    const context = findTurnContext(turnId)
    if (!context
      || !files.length
      || context.turn.processing_status !== 'waiting_files') return

    let latest = context.turn
    for (const file of files) {
      const declaration: AttachmentDeclaration = {
        client_id: crypto.randomUUID(),
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
      }
      let attachmentId: string | null = null
      try {
        const declared = await addTurnAttachment(turnId, declaration)
        applyTurn(context.sessionId, declared)
        const attachment = declared.attachments
          .find(item => item.client_id === declaration.client_id)
        if (!attachment) throw new Error('新增附件占位不存在')
        attachmentId = attachment.attachment_id
        patchTurnAttachment(context.sessionId, attachmentId, {
          status: 'uploading',
          progress: 0,
        })
        latest = await uploadTurnAttachment(
          turnId,
          attachmentId,
          file,
          progress => patchTurnAttachment(
            context.sessionId,
            attachmentId!,
            { status: 'uploading', progress },
          ),
        )
        applyTurn(context.sessionId, latest)
      } catch {
        if (attachmentId) {
          patchTurnAttachment(context.sessionId, attachmentId, {
            status: 'failed',
            progress: 0,
            error_message: '补充附件上传失败，请重新选择',
          })
        }
        message.error(`补充附件 ${file.name} 失败`)
      }
    }
    continueTurn(context.sessionId, latest)
  }

  async function cancelTurn(turnId: string) {
    const context = findTurnContext(turnId)
    if (!context || !['waiting_files', 'answer_failed'].includes(
      context.turn.processing_status,
    )) return

    try {
      const cancelled = await cancelChatTurn(turnId)
      applyTurn(context.sessionId, cancelled)
      continueTurn(context.sessionId, cancelled)
    } catch {
      message.error('取消本轮失败，请稍后再试')
    }
  }

  async function resumePendingTurns() {
    await Promise.all(Object.entries(pendingTurnsBySession.value).map(
      async ([sessionId, turnId]) => {
        try {
          const turn = await getChatTurn(turnId)
          applyTurn(sessionId, turn)
          continueTurn(sessionId, turn)
        } catch {
          schedulePoll(sessionId, turnId)
        }
      },
    ))
  }

  function stopGeneration() {
    const sessionId = activeSessionId.value
    if (!sessionId) return

    const runtime = runtimeBySession.get(sessionId)
    runtime?.stopStream?.()
    if (runtime) runtime.stopStream = null

    const sessionMessages = messagesBySession.value[sessionId] ?? []
    const last = sessionMessages[sessionMessages.length - 1]
    if (last?.streaming) {
      patchMessage(sessionId, last.id, { streaming: false })
    }
    streamingBySession.value[sessionId] = false
  }

  watch(() => spacesStore.currentSpace?.space_id, async (newId, oldId) => {
    if (!newId || newId === oldId) return

    if (!oldId) {
      sessions.value = await listSessions(newId)
      await resumePendingTurns()
      return
    }

    pendingNew.value = false
    activeSessionId.value = null
    await fetchSessions()
  })

  return {
    sessions,
    activeSessionId,
    messages,
    messagesBySession,
    turnsBySession,
    activeTurn,
    activeDraft,
    draftsBySession,
    notificationsBySession,
    sessionsLoading,
    messagesLoading,
    isStreaming,
    sessionBusy,
    pendingNew,
    fetchSessions,
    switchSession,
    newSession,
    removeSession,
    sendMessage,
    submitTurn,
    retryAnswer,
    retryAttachment,
    retryUpload,
    ignoreAttachment,
    addAttachments,
    cancelTurn,
    resumePendingTurns,
    stopGeneration,
    isSessionBusy,
    setDraft,
    sessionNotification,
    clearSessionNotification,
  }
})
