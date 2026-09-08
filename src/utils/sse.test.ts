import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as sse from '@/utils/sse'
import { useAuthStore } from '@/stores/auth'
import { useSpacesStore } from '@/stores/spaces'
import * as identityContext from './context'

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
  it('does not start a late stream after its identity was invalidated', () => {
    setActivePinia(createPinia())
    vi.spyOn(identityContext, 'contextSignal').mockReturnValue(AbortSignal.abort())
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore().accessToken = 'new-tenant-token'
    sse.streamTurnAnswer('old-turn', { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
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
  it('revalidates space access when a streaming endpoint returns forbidden', async () => {
    const spaces = useSpacesStore()
    spaces.spaces = [{ space_id: 's', space_key: 's', name: 'Private', created_by: null, status: 'active' }]
    spaces.switchSpace('s')
    vi.spyOn(spaces, 'fetchSpaces').mockImplementation(async () => { spaces.spaces = []; spaces.clearSpace() })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' }))
    await new Promise<void>(resolve => {
      sse.streamChat('session', 'question', { onChunk: vi.fn(), onDone: vi.fn(), onError: () => resolve() })
    })
    expect(spaces.currentSpace).toBeNull()
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-1',
        },
      }),
    )
    expect(onChunk).toHaveBeenCalledWith('答案')
    expect(onDone).toHaveBeenCalledWith('答案', [
      expect.objectContaining({ doc_id: 'document-1' }),
    ])
  })
})
