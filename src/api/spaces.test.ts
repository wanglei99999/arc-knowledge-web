import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as spacesApi from '@/api/spaces'

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/utils/http', () => ({ default: http }))

describe('spaces API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('restores a space through its lifecycle action route', async () => {
    http.post.mockResolvedValue(undefined)

    await spacesApi.restoreSpace('space-1')

    expect(http.post).toHaveBeenCalledWith('/spaces/space-1/restore')
  })
})
