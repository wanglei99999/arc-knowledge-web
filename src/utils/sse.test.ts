import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as sse from '@/utils/sse'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

function sseResponse(events: string[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event))
      }
      controller.close()
    },
  })
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body,
    text: async () => '',
  }
}

describe('chat SSE streams', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
    useAppStore().tenantId = 'tenant-1'
    useAuthStore().accessToken = 'token-1'
  })

  it('reports a safe SSE error without completing the stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'data: {"error":"附件尚未完成入库"}\n\n',
            'data: [DONE]\n\n',
          ]),
        ),
    )
    const onDone = vi.fn()
    const onError = vi.fn()
    let settle!: () => void
    const settled = new Promise<void>((resolve) => {
      settle = resolve
    })

    sse.streamChat('session-1', '问题', {
      onChunk: vi.fn(),
      onDone: (...args) => {
        onDone(...args)
        settle()
      },
      onError: (error) => {
        onError(error)
        settle()
      },
    })
    await settled

    expect(onError).toHaveBeenCalledWith(new Error('附件尚未完成入库'))
    expect(onDone).not.toHaveBeenCalled()
  })

  it('streams a turn answer through the shared parser and dedicated route', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"delta":"答案"}\n\n',
          'data: {"citations":[{"doc_id":"document-1","doc_name":"report.pdf","content":"依据","score":0.9}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      )
    vi.stubGlobal('fetch', fetchMock)
    const onChunk = vi.fn()
    const onDone = vi.fn()
    let settle!: () => void
    const settled = new Promise<void>((resolve) => {
      settle = resolve
    })
    const streamTurnAnswer = (
      sse as typeof sse & Record<string, (...args: any[]) => () => void>
    ).streamTurnAnswer

    streamTurnAnswer('turn-1', {
      onChunk,
      onDone: (...args) => {
        onDone(...args)
        settle()
      },
      onError: vi.fn(),
    })
    await settled

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/chat/turns/turn-1/answer',
      expect.objectContaining({
        method: 'POST',
        body: undefined,
        headers: expect.objectContaining({
          'X-Tenant-Id': 'tenant-1',
          Authorization: 'Bearer token-1',
        }),
      }),
    )
    expect(onChunk).toHaveBeenCalledWith('答案')
    expect(onDone).toHaveBeenCalledWith('答案', [
      expect.objectContaining({ doc_id: 'document-1' }),
    ])
  })
})
