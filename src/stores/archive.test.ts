import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useArchiveStore } from '@/stores/archive'
import type { ArchivedSessionVO } from '@/types/chat'

const chatApi = vi.hoisted(() => ({
  listArchivedSessions: vi.fn(),
  restoreSession: vi.fn(),
}))

const spacesApi = vi.hoisted(() => ({
  restoreSpace: vi.fn(),
}))

vi.mock('@/api/chat', () => chatApi)
vi.mock('@/api/spaces', () => spacesApi)

const archived = (
  id: string,
  archivedAt: string,
  spaceId = 'space-1',
  spaceName = '产品文档',
  spaceStatus: 'active' | 'archived' = 'active',
): ArchivedSessionVO => ({
  id,
  title: `会话 ${id}`,
  message_count: 2,
  archived_at: archivedAt,
  space: {
    space_id: spaceId,
    name: spaceName,
    status: spaceStatus,
  },
})

describe('archive store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    chatApi.restoreSession.mockResolvedValue(undefined)
    spacesApi.restoreSpace.mockResolvedValue(undefined)
  })

  it('groups sessions by original space and sorts by archive time', async () => {
    chatApi.listArchivedSessions.mockResolvedValue({
      items: [
        archived('older', '2026-08-20T08:00:00Z'),
        archived('other', '2026-08-22T08:00:00Z', 'space-2', '研发资料'),
        archived('newer', '2026-08-21T08:00:00Z'),
      ],
      total: 3,
    })
    const store = useArchiveStore()

    await store.fetchArchived()

    expect(store.groupedSessions.map(group => group.space.name)).toEqual([
      '研发资料',
      '产品文档',
    ])
    expect(store.groupedSessions[1].sessions.map(item => item.id)).toEqual([
      'newer',
      'older',
    ])
    expect(chatApi.listArchivedSessions).toHaveBeenCalledWith({
      query: undefined,
      space_id: undefined,
      limit: 50,
      offset: 0,
    })
  })

  it('does not remove an archived row when restore fails', async () => {
    const store = useArchiveStore()
    store.items = [archived('session-1', '2026-08-21T08:00:00Z')]
    store.total = 1
    chatApi.restoreSession.mockRejectedValue(new Error('SPACE_ARCHIVED'))

    await expect(store.restore('session-1')).rejects.toThrow('SPACE_ARCHIVED')

    expect(store.items).toHaveLength(1)
    expect(store.total).toBe(1)
  })

  it('removes a session only after restore succeeds', async () => {
    const store = useArchiveStore()
    store.items = [archived('session-1', '2026-08-21T08:00:00Z')]
    store.total = 1

    await store.restore('session-1')

    expect(chatApi.restoreSession).toHaveBeenCalledWith('session-1')
    expect(store.items).toEqual([])
    expect(store.total).toBe(0)
  })

  it('marks a space active only after server restore succeeds', async () => {
    const store = useArchiveStore()
    store.items = [archived(
      'session-1',
      '2026-08-21T08:00:00Z',
      'space-1',
      '产品文档',
      'archived',
    )]

    await store.restoreSpace('space-1')

    expect(spacesApi.restoreSpace).toHaveBeenCalledWith('space-1')
    expect(store.items[0].space.status).toBe('active')
  })

  it('keeps existing rows and exposes a retryable error on fetch failure', async () => {
    const store = useArchiveStore()
    store.items = [archived('session-1', '2026-08-21T08:00:00Z')]
    chatApi.listArchivedSessions.mockRejectedValue(new Error('network'))

    await expect(store.fetchArchived()).rejects.toThrow('network')

    expect(store.items).toHaveLength(1)
    expect(store.error).toBe('network')
    expect(store.loading).toBe(false)
  })
})
