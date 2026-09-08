import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import http from './http'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { contextSignal, invalidateContext } from './context'
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
it('uses the selection token only for tenant selection and never adds a tenant header', async () => {
  useAuthStore().accessToken = 'old-access'
  let headers: Record<string, unknown> = {}
  http.defaults.adapter = async config => { headers = config.headers.toJSON(); return { data: {}, config, status: 200, statusText: 'OK', headers: {} } }
  await authApi.switchTenant('target', 'selection')
  expect(headers.Authorization).toBe('Bearer selection')
  expect(headers['X-Tenant-Id']).toBeUndefined()
})
it('prevents resource requests after invalidation but still revokes the refresh session on logout', async () => {
  invalidateContext()
  expect(contextSignal().aborted).toBe(true)
  const adapter = vi.fn(async (config) => ({ data: {}, config, status: 200, statusText: 'OK', headers: {} }))
  http.defaults.adapter = adapter
  await expect(http.get('/documents', { params: { space_id: 's' } })).rejects.toThrow()
  expect(adapter).not.toHaveBeenCalled()
  await expect(authApi.logout('refresh')).resolves.toEqual({})
})
