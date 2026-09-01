import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as chatApi from '@/api/chat'

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/utils/http', () => ({ default: http }))

const attachment = {
  attachment_id: 'attachment-1',
  client_id: 'client-1',
  file_name: 'report.pdf',
  mime_type: 'application/pdf',
  file_size: 4,
  document_id: 'document-1',
  status: 'ingesting',
  ignored: false,
  error_message: null,
}

const turn = {
  turn_id: 'turn-1',
  session_id: 'session-1',
  space_id: 'space-1',
  query: '请总结附件',
  readiness: 'ingesting',
  processing_status: 'waiting_files',
  processing_error: null,
  attachments: [attachment],
  assistant: null,
}

function api() {
  return chatApi as typeof chatApi &
    Record<string, (...args: any[]) => Promise<any>>
}

describe('chat turn API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a turn through the declared collection route', async () => {
    http.post.mockResolvedValue(turn)
    const payload = {
      client_request_id: 'request-1',
      session_id: 'session-1',
      query: '请总结附件',
      attachments: [
        {
          client_id: 'client-1',
          file_name: 'report.pdf',
          mime_type: 'application/pdf',
          file_size: 4,
        },
      ],
    }

    const result = await api().createChatTurn(payload)

    expect(http.post).toHaveBeenCalledWith('/chat/turns', payload)
    expect(result).toEqual(turn)
  })

  it('uploads multipart data, reports progress, then reloads the turn', async () => {
    http.put.mockResolvedValue({
      document_id: 'document-1',
      task_id: 'task-1',
      workflow_run_id: 'run-1',
    })
    http.get.mockResolvedValue(turn)
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    const promise = api().uploadTurnAttachment(
      'turn-1',
      'attachment-1',
      file,
      onProgress,
    )
    const [, formData, config] = http.put.mock.calls[0]
    config.onUploadProgress({ loaded: 2, total: 4 })
    const result = await promise

    expect(http.put).toHaveBeenCalledWith(
      '/chat/turns/turn-1/attachments/attachment-1',
      expect.any(FormData),
      expect.objectContaining({ onUploadProgress: expect.any(Function) }),
    )
    const uploadedFile = formData.get('file') as File
    expect(uploadedFile).toMatchObject({
      name: 'report.pdf',
      type: 'application/pdf',
      size: 4,
    })
    expect(onProgress).toHaveBeenCalledWith(50)
    expect(http.get).toHaveBeenCalledWith('/chat/turns/turn-1')
    expect(result).toEqual(turn)
  })

  it('loads one turn through its item route', async () => {
    http.get.mockResolvedValue(turn)

    await expect(api().getChatTurn('turn-1')).resolves.toEqual(turn)
    expect(http.get).toHaveBeenCalledWith('/chat/turns/turn-1')
  })

  it('adds an attachment declaration through the turn route', async () => {
    http.post.mockResolvedValue(turn)
    const declaration = {
      client_id: 'client-2',
      file_name: 'appendix.pdf',
      mime_type: 'application/pdf',
      file_size: 8,
    }

    await expect(
      api().addTurnAttachment('turn-1', declaration),
    ).resolves.toEqual(turn)
    expect(http.post).toHaveBeenCalledWith(
      '/chat/turns/turn-1/attachments',
      declaration,
    )
  })

  it('retries ingestion then reloads the authoritative turn', async () => {
    http.post.mockResolvedValue({
      document_id: 'document-1',
      task_id: 'task-2',
      workflow_run_id: 'run-2',
    })
    http.get.mockResolvedValue(turn)

    await expect(
      api().retryTurnAttachment('turn-1', 'attachment-1'),
    ).resolves.toEqual(turn)
    expect(http.post).toHaveBeenCalledWith(
      '/chat/turns/turn-1/attachments/attachment-1/retry',
    )
    expect(http.get).toHaveBeenCalledWith('/chat/turns/turn-1')
  })

  it('marks an attachment ignored with PATCH', async () => {
    http.patch.mockResolvedValue({
      ...turn,
      readiness: 'empty',
      attachments: [{ ...attachment, ignored: true, status: 'ignored' }],
    })

    const result = await api().ignoreTurnAttachment('turn-1', 'attachment-1')

    expect(http.patch).toHaveBeenCalledWith(
      '/chat/turns/turn-1/attachments/attachment-1',
      { ignored: true },
    )
    expect(result.attachments[0].status).toBe('ignored')
  })

  it('cancels a turn through its action route', async () => {
    http.post.mockResolvedValue({ ...turn, processing_status: 'cancelled' })

    const result = await api().cancelChatTurn('turn-1')

    expect(http.post).toHaveBeenCalledWith('/chat/turns/turn-1/cancel')
    expect(result.processing_status).toBe('cancelled')
  })

  it('preserves attachment processing fields when hydrating history', async () => {
    http.get.mockResolvedValue([
      {
        message_id: 'turn-1',
        role: 'user',
        content: '请总结附件',
        processing_status: 'waiting_files',
        processing_error: null,
        attachments: [attachment],
        citations: [],
      },
    ])

    const [message] = await chatApi.listMessages('session-1')

    expect(message).toMatchObject({
      id: 'turn-1',
      processing_status: 'waiting_files',
      processing_error: null,
      attachments: [attachment],
    })
  })

  it('maps archived sessions with their original space summary', async () => {
    http.get.mockResolvedValue({
      items: [{
        session_id: 'session-1',
        title: '旧版上传流程',
        message_count: 2,
        archived_at: '2026-08-21T09:30:00Z',
        space: {
          space_id: 'space-1',
          name: '产品文档',
          status: 'active',
        },
      }],
      total: 1,
    })

    const page = await api().listArchivedSessions({
      query: '上传',
      space_id: 'space-1',
      limit: 50,
      offset: 0,
    })

    expect(http.get).toHaveBeenCalledWith('/sessions/archived', {
      params: {
        query: '上传',
        space_id: 'space-1',
        limit: 50,
        offset: 0,
      },
    })
    expect(page).toEqual({
      items: [{
        id: 'session-1',
        title: '旧版上传流程',
        message_count: 2,
        archived_at: '2026-08-21T09:30:00Z',
        space: {
          space_id: 'space-1',
          name: '产品文档',
          status: 'active',
        },
      }],
      total: 1,
    })
  })

  it('uses session lifecycle action routes for archive and restore', async () => {
    http.post.mockResolvedValue(undefined)

    await api().archiveSession('session-1')
    await api().restoreSession('session-1')

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      '/sessions/session-1/archive',
    )
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      '/sessions/session-1/restore',
    )
  })

  it('preserves pin state and uses pin lifecycle routes', async () => {
    const pinnedSession = {
      session_id: 'session-1',
      title: '接入鉴权方案',
      summary: null,
      message_count: 2,
      pinned_at: '2026-09-01T02:30:00Z',
      created_at: '2026-08-20T01:00:00Z',
      updated_at: '2026-08-31T09:15:00Z',
    }
    http.get.mockResolvedValue([pinnedSession])
    http.post
      .mockResolvedValueOnce(pinnedSession)
      .mockResolvedValueOnce({ ...pinnedSession, pinned_at: null })

    const sessions = await api().listSessions('space-1')
    const pinned = await api().pinSession('session-1')
    const unpinned = await api().unpinSession('session-1')

    expect(sessions[0].pinned_at).toBe('2026-09-01T02:30:00Z')
    expect(sessions[0].created_at).toBe('2026-08-20T01:00:00Z')
    expect(sessions[0].updated_at).toBe('2026-08-31T09:15:00Z')
    expect(pinned.pinned_at).toBe('2026-09-01T02:30:00Z')
    expect(unpinned.pinned_at).toBeNull()
    expect(http.post).toHaveBeenNthCalledWith(1, '/sessions/session-1/pin')
    expect(http.post).toHaveBeenNthCalledWith(2, '/sessions/session-1/unpin')
  })

  it('renames a session with PATCH and hydrates the authoritative result', async () => {
    const renamedSession = {
      session_id: 'session-1',
      title: '新的标题',
      summary: null,
      message_count: 2,
      pinned_at: null,
      created_at: '2026-08-20T01:00:00Z',
      updated_at: '2026-08-31T09:15:00Z',
    }
    http.patch.mockResolvedValue(renamedSession)

    const result = await api().renameSession('session-1', '新的标题')

    expect(http.patch).toHaveBeenCalledWith('/sessions/session-1', {
      title: '新的标题',
    })
    expect(result).toEqual({
      id: 'session-1',
      title: '新的标题',
      message_count: 2,
      pinned_at: null,
      created_at: '2026-08-20T01:00:00Z',
      updated_at: '2026-08-31T09:15:00Z',
    })
  })
})
