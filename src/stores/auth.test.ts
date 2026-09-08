import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { authApi } from '@/api/auth'
vi.mock('@/api/auth', () => ({ authApi: { login: vi.fn(), context: vi.fn(), tenants: vi.fn(), switchTenant: vi.fn(), logout: vi.fn() } }))
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); vi.clearAllMocks() })
it('keeps tenant selection credentials out of access-token storage and resource identity', async () => {
  vi.mocked(authApi.login).mockResolvedValue({ selection_token: 'selection', memberships: [{ tenant_id: 't', tenant_name: 'Team', membership_id: 'm', tenant_role: 'MEMBER' }] } as never)
  const store = useAuthStore()
  await store.login({ email: 'a@b.com', password: 'password' })
  expect(store.isLoggedIn).toBe(false)
  expect(localStorage.getItem('access_token')).toBeNull()
  expect((store as any).memberships[0].tenant_id).toBe('t')
})
it('hydrates server membership context before considering login complete', async () => {
  vi.mocked(authApi.login).mockResolvedValue({ access_token: 'access', refresh_token: 'refresh', token_type: 'bearer' })
  ;(authApi as any).context.mockResolvedValue({ user_id: 'u', email: 'a@b.com', tenant_id: 't', membership_id: 'm', tenant_name: 'Team', tenant_role: 'MEMBER' })
  const store = useAuthStore()
  await store.login({ email: 'a@b.com', password: 'password' })
  expect((store as any).context.membership_id).toBe('m')
  expect((store as any).isAdmin).toBe(false)
})
