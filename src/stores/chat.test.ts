import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useChatStore } from '@/stores/chat'
import { useSpacesStore } from '@/stores/spaces'
import type { ChatTurnVO, Citation, SessionVO } from '@/types/chat'
import type { StreamCallbacks } from '@/utils/sse'

const chatApi = vi.hoisted(() => ({
  listSessions: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  listMessages: vi.fn(),
  createChatTurn: vi.fn(),
  getChatTurn: vi.fn(),
  uploadTurnAttachment: vi.fn(),
  addTurnAttachment: vi.fn(),
  retryTurnAttachment: vi.fn(),
  ignoreTurnAttachment: vi.fn(),
  cancelChatTurn: vi.fn(),
}))

const streams = vi.hoisted(() => ({
  chat: new Map<string, { callbacks: StreamCallbacks; cancel: ReturnType<typeof vi.fn> }>(),
  turn: new Map<string, { callbacks: StreamCallbacks; cancel: ReturnType<typeof vi.fn> }>(),
}))

const streamApi = vi.hoisted(() => ({
  chat: vi.fn(),
  turn: vi.fn(),
}))

vi.mock('@/api/chat', () => chatApi)
vi.mock('@/utils/sse', () => ({
  streamChat: streamApi.chat.mockImplementation((sessionId: string, _question: string, callbacks: StreamCallbacks) => {
    const cancel = vi.fn()
    streams.chat.set(sessionId, { callbacks, cancel })
    return cancel
  }),
  streamTurnAnswer: streamApi.turn.mockImplementation((turnId: string, callbacks: StreamCallbacks) => {
    const cancel = vi.fn()
    streams.turn.set(turnId, { callbacks, cancel })
    return cancel
  }),
}))
vi.mock('ant-design-vue', () => ({ message: { error: vi.fn() } }))

const session = (id: string): SessionVO => ({
  id,
  title: `会话 ${id}`,
  created_at: '2026-08-30T00:00:00.000Z',
  updated_at: '2026-08-30T00:00:00.000Z',
  message_count: 0,
})

const attachment = {
  attachment_id: 'attachment-1',
  client_id: 'client-file',
  document_id: 'document-1',
  file_name: 'report.pdf',
  mime_type: 'application/pdf',
  file_size: 4,
  status: 'ingesting' as const,
  ignored: false,
  error_message: null,
}

const turn = (patch: Partial<ChatTurnVO> = {}): ChatTurnVO => ({
  turn_id: 'turn-1',
  session_id: 'session-a',
  space_id: 'space-1',
  query: '总结附件',
  readiness: 'ingesting',
  processing_status: 'waiting_files',
  processing_error: null,
  attachments: [attachment],
  assistant: null,
  ...patch,
})

function setupStore() {
  setActivePinia(createPinia())
  const spacesStore = useSpacesStore()
  spacesStore.spaces = [{
    space_id: 'space-1',
    space_key: 'knowledge',
    name: '知识库',
    status: 'active',
    created_by: 'user-1',
  }]
  spacesStore.switchSpace('space-1')
  const store = useChatStore()
  store.sessions = [session('session-a'), session('session-b')]
  return store
}

function mockTurnIds() {
  const ids = ['request-1', 'client-file']
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => (
    (ids.shift() ?? 'fallback-id') as `${string}-${string}-${string}-${string}-${string}`
  ))
}

describe('chat store multi-session runtime', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    streams.chat.clear()
    streams.turn.clear()
    vi.clearAllMocks()
    streamApi.chat.mockImplementation((sessionId: string, _question: string, callbacks: StreamCallbacks) => {
      const cancel = vi.fn()
      streams.chat.set(sessionId, { callbacks, cancel })
      return cancel
    })
    streamApi.turn.mockImplementation((turnId: string, callbacks: StreamCallbacks) => {
      const cancel = vi.fn()
      streams.turn.set(turnId, { callbacks, cancel })
      return cancel
    })
    chatApi.listMessages.mockResolvedValue([])
    chatApi.listSessions.mockResolvedValue([session('session-a'), session('session-b')])
  })

  it('keeps session A streaming after the user switches to session B', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    await store.sendMessage('A 的问题')
    const streamA = streams.chat.get('session-a')!

    await store.switchSession('session-b')

    expect(streamA.cancel).not.toHaveBeenCalled()
    expect(store.isSessionBusy('session-a')).toBe(true)
    expect(store.isSessionBusy('session-b')).toBe(false)
  })

  it('routes concurrent stream chunks to their own session message lists', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    await store.sendMessage('问题 A')
    await store.switchSession('session-b')
    await store.sendMessage('问题 B')

    streams.chat.get('session-a')!.callbacks.onChunk('回答 A')
    streams.chat.get('session-b')!.callbacks.onChunk('回答 B')

    expect(store.messagesBySession['session-a'].slice(-1)[0]?.content).toBe('回答 A')
    expect(store.messagesBySession['session-b'].slice(-1)[0]?.content).toBe('回答 B')
    expect(store.messages.slice(-1)[0]?.content).toBe('回答 B')
  })

  it('serializes one session without blocking a different session', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    await store.sendMessage('第一条')
    await store.sendMessage('同会话第二条')

    expect(streams.chat.size).toBe(1)
    expect(store.messagesBySession['session-a']).toHaveLength(2)

    await store.switchSession('session-b')
    await store.sendMessage('另一会话的问题')
    expect(streams.chat.size).toBe(2)
  })

  it('keeps an editable draft for each session while another session is busy', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    await store.sendMessage('正在回答')

    store.setDraft('session-a', 'A 的下一条草稿')
    store.setDraft('session-b', 'B 的草稿')

    expect(store.draftsBySession).toEqual({
      'session-a': 'A 的下一条草稿',
      'session-b': 'B 的草稿',
    })
    expect(store.isSessionBusy('session-a')).toBe(true)
    expect(store.sessionBusy).toBe(true)
  })

  it('exposes the draft belonging to the session currently being viewed', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    store.activeDraft = 'A 的草稿'

    await store.switchSession('session-b')
    expect(store.activeDraft).toBe('')
    store.activeDraft = 'B 的草稿'

    await store.switchSession('session-a')
    expect(store.activeDraft).toBe('A 的草稿')
  })

  it('marks the captured session complete even when another session is active', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    await store.sendMessage('问题 A')
    await store.switchSession('session-b')

    const citations: Citation[] = []
    streams.chat.get('session-a')!.callbacks.onDone('A 的完整回答', citations)

    expect(store.messagesBySession['session-a'].slice(-1)[0]).toMatchObject({
      content: 'A 的完整回答',
      streaming: false,
    })
    expect(store.isSessionBusy('session-a')).toBe(false)
    expect(store.activeSessionId).toBe('session-b')
  })

  it('creates a turn, uploads its declared file, and keeps the session busy', async () => {
    const store = setupStore()
    mockTurnIds()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    chatApi.createChatTurn.mockResolvedValue(turn())
    chatApi.uploadTurnAttachment.mockImplementation(
      async (_turnId: string, _attachmentId: string, _file: File, onProgress: (value: number) => void) => {
        onProgress(50)
        return turn()
      },
    )
    chatApi.getChatTurn.mockResolvedValue(turn())
    await store.switchSession('session-a')

    await store.submitTurn('总结附件', [file])

    expect(store.turnsBySession['session-a']).toEqual(turn())
    expect(store.messagesBySession['session-a'][0]).toMatchObject({
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      processing_status: 'waiting_files',
      attachments: [attachment],
    })
    expect(store.isSessionBusy('session-a')).toBe(true)
    expect(chatApi.uploadTurnAttachment).toHaveBeenCalledWith(
      'turn-1',
      'attachment-1',
      file,
      expect.any(Function),
    )
  })

  it('starts exactly one answer stream when polling reports the turn ready', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const store = setupStore()
    mockTurnIds()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    chatApi.createChatTurn.mockResolvedValue(turn())
    chatApi.uploadTurnAttachment.mockResolvedValue(turn())
    chatApi.getChatTurn
      .mockResolvedValueOnce(turn())
      .mockResolvedValue(turn({ readiness: 'ready' }))
    await store.switchSession('session-a')
    await store.submitTurn('总结附件', [file])

    await vi.advanceTimersByTimeAsync(2_000)
    await vi.advanceTimersByTimeAsync(6_000)

    expect(streamApi.turn).toHaveBeenCalledTimes(1)
    expect(streams.turn.has('turn-1')).toBe(true)
    expect(store.turnsBySession['session-a']!.processing_status).toBe('answering')
  })

  it('claims the session before creating a turn so a double submit cannot create two turns', async () => {
    const store = setupStore()
    mockTurnIds()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    let resolveCreate!: (value: ChatTurnVO) => void
    chatApi.createChatTurn.mockReturnValue(new Promise(resolve => {
      resolveCreate = resolve
    }))
    chatApi.uploadTurnAttachment.mockResolvedValue(turn())
    chatApi.getChatTurn.mockResolvedValue(turn())
    await store.switchSession('session-a')

    const first = store.submitTurn('总结附件', [file])
    await Promise.resolve()
    const second = store.submitTurn('重复提交', [file])

    expect(chatApi.createChatTurn).toHaveBeenCalledTimes(1)
    resolveCreate(turn())
    await Promise.all([first, second])
    expect(chatApi.createChatTurn).toHaveBeenCalledTimes(1)
  })

  it('continues polling an attachment turn after another session is opened', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const store = setupStore()
    mockTurnIds()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    chatApi.createChatTurn.mockResolvedValue(turn())
    chatApi.uploadTurnAttachment.mockResolvedValue(turn())
    chatApi.getChatTurn.mockResolvedValue(turn())
    await store.switchSession('session-a')
    await store.submitTurn('总结附件', [file])

    await store.switchSession('session-b')
    await vi.advanceTimersByTimeAsync(2_000)

    expect(chatApi.getChatTurn).toHaveBeenCalledWith('turn-1')
    expect(store.activeSessionId).toBe('session-b')
    expect(store.isSessionBusy('session-a')).toBe(true)
  })

  it('adds a blue unread notification when a background session completes', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    await store.sendMessage('问题 A')
    await store.switchSession('session-b')

    streams.chat.get('session-a')!.callbacks.onDone('回答完成', [])

    expect(store.sessionNotification('session-a')).toBe('completed_unread')
    expect(store.sessionNotification('session-b')).toBeUndefined()
  })

  it('adds a red unread notification when a background session fails', async () => {
    const store = setupStore()
    await store.switchSession('session-a')
    await store.sendMessage('问题 A')
    await store.switchSession('session-b')

    streams.chat.get('session-a')!.callbacks.onError(new Error('模型不可用'))

    expect(store.sessionNotification('session-a')).toBe('failed_unread')
  })

  it('clears a notification when its session is opened and persists the result', async () => {
    const firstStore = setupStore()
    await firstStore.switchSession('session-a')
    await firstStore.sendMessage('问题 A')
    await firstStore.switchSession('session-b')
    streams.chat.get('session-a')!.callbacks.onDone('回答完成', [])
    expect(firstStore.sessionNotification('session-a')).toBe('completed_unread')

    const restoredStore = setupStore()
    expect(restoredStore.sessionNotification('session-a')).toBe('completed_unread')

    await restoredStore.switchSession('session-a')
    const reopenedStore = setupStore()
    expect(reopenedStore.sessionNotification('session-a')).toBeUndefined()
  })

  it('restores drafts in a new store instance', () => {
    const firstStore = setupStore()
    firstStore.setDraft('session-a', '刷新后仍保留')

    const restoredStore = setupStore()

    expect(restoredStore.draftsBySession['session-a']).toBe('刷新后仍保留')
  })

  it('restores an answering turn by polling without requesting its answer twice', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const firstStore = setupStore()
    mockTurnIds()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    chatApi.createChatTurn.mockResolvedValue(turn())
    chatApi.uploadTurnAttachment.mockResolvedValue(turn())
    chatApi.getChatTurn.mockResolvedValueOnce(turn())
    await firstStore.switchSession('session-a')
    await firstStore.submitTurn('总结附件', [file])
    vi.clearAllTimers()

    chatApi.getChatTurn.mockResolvedValue(
      turn({ readiness: 'ready', processing_status: 'answering' }),
    )
    const restoredStore = setupStore()
    await restoredStore.fetchSessions()

    expect(chatApi.getChatTurn).toHaveBeenLastCalledWith('turn-1')
    expect(restoredStore.turnsBySession['session-a']!.processing_status).toBe('answering')
    expect(streamApi.turn).not.toHaveBeenCalled()
  })

  it('adds a red notification when background attachment processing is blocked', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const store = setupStore()
    mockTurnIds()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    chatApi.createChatTurn.mockResolvedValue(turn())
    chatApi.uploadTurnAttachment.mockResolvedValue(turn())
    chatApi.getChatTurn
      .mockResolvedValueOnce(turn())
      .mockResolvedValue(turn({
        readiness: 'blocked',
        attachments: [{
          ...attachment,
          status: 'failed',
          error_message: '解析失败',
        }],
      }))
    await store.switchSession('session-a')
    await store.submitTurn('总结附件', [file])
    await store.switchSession('session-b')

    await vi.advanceTimersByTimeAsync(2_000)

    expect(store.sessionNotification('session-a')).toBe('failed_unread')
  })

  it('retries a failed indexed document and resumes turn polling', async () => {
    vi.useFakeTimers()
    const store = setupStore()
    const failedAttachment = {
      ...attachment,
      status: 'failed' as const,
      error_message: '索引失败',
    }
    const failedTurn = turn({
      readiness: 'blocked',
      attachments: [failedAttachment],
    })
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'waiting_files',
      attachments: [failedAttachment],
    }]
    const ingestingTurn = turn({
      attachments: [{
        ...attachment,
        status: 'ingesting',
        error_message: null,
      }],
    })
    chatApi.retryTurnAttachment.mockResolvedValue(ingestingTurn)

    await store.retryAttachment('turn-1', 'attachment-1')

    expect(chatApi.retryTurnAttachment).toHaveBeenCalledWith('turn-1', 'attachment-1')
    expect(store.messagesBySession['session-a'][0].attachments?.[0]).toMatchObject({
      status: 'ingesting',
      error_message: null,
    })
    expect(store.isSessionBusy('session-a')).toBe(true)
  })

  it('ignores a failed attachment and synchronizes the user message', async () => {
    const store = setupStore()
    const failedAttachment = {
      ...attachment,
      status: 'failed' as const,
      error_message: '索引失败',
    }
    const failedTurn = turn({
      readiness: 'blocked',
      attachments: [failedAttachment],
    })
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'waiting_files',
      attachments: [failedAttachment],
    }]
    const ignoredTurn = turn({
      readiness: 'empty',
      attachments: [{
        ...attachment,
        status: 'ignored',
        ignored: true,
        error_message: null,
      }],
    })
    chatApi.ignoreTurnAttachment.mockResolvedValue(ignoredTurn)

    await store.ignoreAttachment('turn-1', 'attachment-1')

    expect(chatApi.ignoreTurnAttachment).toHaveBeenCalledWith('turn-1', 'attachment-1')
    expect(store.messagesBySession['session-a'][0].attachments?.[0]).toMatchObject({
      status: 'ignored',
      ignored: true,
      error_message: null,
    })
  })

  it('re-uploads a newly selected file after upload failed before document linking', async () => {
    vi.useFakeTimers()
    const store = setupStore()
    const failedUpload = {
      ...attachment,
      document_id: null,
      status: 'failed' as const,
      error_message: '文件上传失败，请重试',
    }
    const failedTurn = turn({
      readiness: 'blocked',
      attachments: [failedUpload],
    })
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'waiting_files',
      attachments: [failedUpload],
    }]
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    const ingestingTurn = turn({
      attachments: [{
        ...attachment,
        status: 'ingesting',
        error_message: null,
      }],
    })
    chatApi.uploadTurnAttachment.mockImplementation(
      async (_turnId: string, _attachmentId: string, _file: File, onProgress: (value: number) => void) => {
        onProgress(60)
        return ingestingTurn
      },
    )

    await store.retryUpload('turn-1', 'attachment-1', file)

    expect(chatApi.uploadTurnAttachment).toHaveBeenCalledWith(
      'turn-1',
      'attachment-1',
      file,
      expect.any(Function),
    )
    expect(store.messagesBySession['session-a'][0].attachments?.[0]).toMatchObject({
      status: 'ingesting',
      error_message: null,
    })
  })

  it('adds a replacement attachment to the existing turn and uploads it', async () => {
    vi.useFakeTimers()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'client-added' as `${string}-${string}-${string}-${string}-${string}`,
    )
    const store = setupStore()
    const failedAttachment = {
      ...attachment,
      status: 'failed' as const,
      error_message: '索引失败',
    }
    const failedTurn = turn({
      readiness: 'blocked',
      attachments: [failedAttachment],
    })
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'waiting_files',
      attachments: [failedAttachment],
    }]
    const file = new File(['data'], 'replacement.pdf', { type: 'application/pdf' })
    const addedAttachment = {
      attachment_id: 'attachment-2',
      client_id: 'client-added',
      document_id: null,
      file_name: 'replacement.pdf',
      mime_type: 'application/pdf',
      file_size: 4,
      status: 'pending_upload' as const,
      ignored: false,
      error_message: null,
    }
    chatApi.addTurnAttachment.mockResolvedValue(turn({
      readiness: 'blocked',
      attachments: [failedAttachment, addedAttachment],
    }))
    chatApi.uploadTurnAttachment.mockResolvedValue(turn({
      readiness: 'blocked',
      attachments: [failedAttachment, {
        ...addedAttachment,
        document_id: 'document-2',
        status: 'ingesting',
      }],
    }))

    await store.addAttachments('turn-1', [file])

    expect(chatApi.addTurnAttachment).toHaveBeenCalledWith('turn-1', {
      client_id: 'client-added',
      file_name: 'replacement.pdf',
      mime_type: 'application/pdf',
      file_size: 4,
    })
    expect(chatApi.uploadTurnAttachment).toHaveBeenCalledWith(
      'turn-1',
      'attachment-2',
      file,
      expect.any(Function),
    )
    expect(store.messagesBySession['session-a'][0].attachments?.[1]).toMatchObject({
      attachment_id: 'attachment-2',
      status: 'ingesting',
    })
  })

  it('cancels an unrecoverable turn and unlocks its session', async () => {
    const store = setupStore()
    const failedAttachment = {
      ...attachment,
      status: 'failed' as const,
      error_message: '索引失败',
    }
    const failedTurn = turn({
      readiness: 'blocked',
      attachments: [failedAttachment],
    })
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'waiting_files',
      attachments: [failedAttachment],
    }]
    chatApi.cancelChatTurn.mockResolvedValue(turn({
      readiness: 'blocked',
      processing_status: 'cancelled',
      attachments: [failedAttachment],
    }))

    expect(store.isSessionBusy('session-a')).toBe(true)
    await store.cancelTurn('turn-1')

    expect(chatApi.cancelChatTurn).toHaveBeenCalledWith('turn-1')
    expect(store.messagesBySession['session-a'][0].processing_status).toBe('cancelled')
    expect(store.isSessionBusy('session-a')).toBe(false)
  })

  it('writes an answer stream failure back to the original user turn', async () => {
    const store = setupStore()
    mockTurnIds()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    const readyTurn = turn({ readiness: 'ready' })
    chatApi.createChatTurn.mockResolvedValue(turn())
    chatApi.uploadTurnAttachment.mockResolvedValue(turn())
    chatApi.getChatTurn.mockResolvedValue(readyTurn)
    await store.switchSession('session-a')

    await store.submitTurn('总结附件', [file])
    streams.turn.get('turn-1')!.callbacks.onError(new Error('DeepSeek 暂时不可用'))

    expect(store.messagesBySession['session-a'][0]).toMatchObject({
      id: 'turn-1',
      role: 'user',
      processing_status: 'answer_failed',
      processing_error: 'DeepSeek 暂时不可用',
    })
    expect(store.isSessionBusy('session-a')).toBe(false)
  })

  it('starts only one new answer stream when retry is requested repeatedly', async () => {
    const store = setupStore()
    const failedTurn = turn({
      readiness: 'ready',
      processing_status: 'answer_failed',
      processing_error: 'DeepSeek 暂时不可用',
    })
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'answer_failed',
      processing_error: 'DeepSeek 暂时不可用',
      attachments: failedTurn.attachments,
    }]

    store.retryAnswer('turn-1')
    store.retryAnswer('turn-1')

    expect(streamApi.turn).toHaveBeenCalledTimes(1)
    expect(store.messagesBySession['session-a'][0]).toMatchObject({
      processing_status: 'answering',
      processing_error: null,
    })
    expect(store.isSessionBusy('session-a')).toBe(true)

    streams.turn.get('turn-1')!.callbacks.onDone('重试后的回答', [])

    expect(store.messagesBySession['session-a'][0].processing_status).toBe('completed')
    expect(store.messagesBySession['session-a'].slice(-1)[0]).toMatchObject({
      role: 'assistant',
      content: '重试后的回答',
      streaming: false,
    })
    expect(store.isSessionBusy('session-a')).toBe(false)
  })

  it('retries a historical failed turn after messages reload without a turn cache', async () => {
    const store = setupStore()
    const failedTurn = turn({
      readiness: 'ready',
      processing_status: 'answer_failed',
      processing_error: 'DeepSeek 暂时不可用',
    })
    chatApi.listMessages.mockResolvedValue([{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'answer_failed',
      processing_error: 'DeepSeek 暂时不可用',
      attachments: failedTurn.attachments,
    }])
    chatApi.getChatTurn.mockResolvedValue(failedTurn)
    await store.switchSession('session-a')

    await store.retryAnswer('turn-1')

    expect(store.messagesBySession['session-a'][0]).toMatchObject({
      id: 'turn-1',
      processing_status: 'answering',
      processing_error: null,
    })
    expect(streamApi.turn).toHaveBeenCalledTimes(1)
    expect(chatApi.createChatTurn).not.toHaveBeenCalled()
    expect(chatApi.uploadTurnAttachment).not.toHaveBeenCalled()
  })

  it('coalesces repeated historical retries before turn hydration completes', async () => {
    const store = setupStore()
    const failedTurn = turn({
      readiness: 'ready',
      processing_status: 'answer_failed',
      processing_error: 'DeepSeek 暂时不可用',
    })
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'answer_failed',
      processing_error: 'DeepSeek 暂时不可用',
      attachments: failedTurn.attachments,
    }]
    let resolveFirst!: (value: ChatTurnVO) => void
    let resolveSecond!: (value: ChatTurnVO) => void
    chatApi.getChatTurn
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve }))

    const firstRetry = store.retryAnswer('turn-1')
    const secondRetry = store.retryAnswer('turn-1')
    resolveFirst(failedTurn)
    await firstRetry
    streams.turn.get('turn-1')!.callbacks.onDone('第一次重试已完成', [])
    resolveSecond(failedTurn)
    await secondRetry

    expect(chatApi.getChatTurn).toHaveBeenCalledTimes(1)
    expect(streamApi.turn).toHaveBeenCalledTimes(1)
    expect(store.messagesBySession['session-a'][0].processing_status).toBe('completed')
  })

  it('removes only the failed assistant placeholder belonging to the retried turn', async () => {
    const store = setupStore()
    const failedTurn = turn({
      readiness: 'ready',
      processing_status: 'answer_failed',
      processing_error: '目标回答失败',
    })
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'assistant-older',
      role: 'assistant',
      content: '更早一轮回答失败',
      created_at: '2026-08-30T00:00:00.000Z',
      processing_status: 'answer_failed',
      turn_id: 'turn-older',
    }, {
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'answer_failed',
      processing_error: '目标回答失败',
      attachments: failedTurn.attachments,
    }, {
      id: 'assistant-target',
      role: 'assistant',
      content: '目标回答失败',
      created_at: '2026-08-31T00:00:01.000Z',
      processing_status: 'answer_failed',
      turn_id: 'turn-1',
    }]

    await store.retryAnswer('turn-1')

    expect(store.messagesBySession['session-a'].some(
      message => message.id === 'assistant-older',
    )).toBe(true)
    expect(store.messagesBySession['session-a'].some(
      message => message.id === 'assistant-target',
    )).toBe(false)
  })

  it('keeps the failed placeholder when another stream owns the session runtime', async () => {
    const store = setupStore()
    const failedTurn = turn({
      readiness: 'ready',
      processing_status: 'answer_failed',
      processing_error: '目标回答失败',
    })
    await store.switchSession('session-a')
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'answer_failed',
      processing_error: '目标回答失败',
      attachments: failedTurn.attachments,
    }, {
      id: 'assistant-target',
      role: 'assistant',
      content: '目标回答失败',
      created_at: '2026-08-31T00:00:01.000Z',
      processing_status: 'answer_failed',
      turn_id: 'turn-1',
    }]
    await store.sendMessage('正在处理的另一个问题')

    await store.retryAnswer('turn-1')

    expect(store.messagesBySession['session-a'].some(
      message => message.id === 'assistant-target',
    )).toBe(true)
    expect(streamApi.turn).not.toHaveBeenCalled()
  })

  it('does not retry an old answer while a new attachment turn is being submitted', async () => {
    const store = setupStore()
    mockTurnIds()
    const failedTurn = turn({
      readiness: 'ready',
      processing_status: 'answer_failed',
      processing_error: '目标回答失败',
    })
    await store.switchSession('session-a')
    store.turnsBySession['session-a'] = failedTurn
    store.messagesBySession['session-a'] = [{
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'answer_failed',
      processing_error: '目标回答失败',
      attachments: failedTurn.attachments,
    }, {
      id: 'assistant-target',
      role: 'assistant',
      content: '目标回答失败',
      created_at: '2026-08-31T00:00:01.000Z',
      processing_status: 'answer_failed',
      turn_id: 'turn-1',
    }]
    const newTurn = turn({
      turn_id: 'turn-2',
      query: '新的附件问题',
    })
    let resolveCreate!: (value: ChatTurnVO) => void
    chatApi.createChatTurn.mockReturnValue(new Promise(resolve => {
      resolveCreate = resolve
    }))
    chatApi.uploadTurnAttachment.mockResolvedValue(newTurn)
    chatApi.getChatTurn.mockResolvedValue(newTurn)
    const file = new File(['data'], 'new.pdf', { type: 'application/pdf' })

    const submission = store.submitTurn('新的附件问题', [file])
    await Promise.resolve()
    await Promise.resolve()
    expect(store.sessionBusy).toBe(true)

    await store.retryAnswer('turn-1')

    expect(streamApi.turn).not.toHaveBeenCalled()
    expect(store.messagesBySession['session-a'].some(
      message => message.id === 'assistant-target',
    )).toBe(true)

    resolveCreate(newTurn)
    await submission
  })
})
