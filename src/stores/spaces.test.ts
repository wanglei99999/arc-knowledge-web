import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSpacesStore } from './spaces'
import { listSpaces } from '@/api/spaces'
vi.mock('@/api/spaces', () => ({ listSpaces: vi.fn() }))
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
it('clears the selected space when its access is revoked', async () => {
  const store = useSpacesStore()
  store.switchSpace('private')
  vi.mocked(listSpaces).mockResolvedValue([])
  await store.fetchSpaces()
  expect(localStorage.getItem('current_space_id')).toBe('')
  expect(store.currentSpace).toBeNull()
})
