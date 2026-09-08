import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import Page from './index.vue'
import { useAuthStore } from '@/stores/auth'
import { useSpacesStore } from '@/stores/spaces'
import { permissionsApi } from '@/api/permissions'
vi.mock('@/api/permissions', () => ({ permissionsApi: { directory: vi.fn().mockResolvedValue({ members: [], groups: [] }), grants: vi.fn().mockResolvedValue([]), members: vi.fn().mockResolvedValue([]), groups: vi.fn().mockResolvedValue([]), spaces: vi.fn().mockResolvedValue([]), audit: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/spaces', () => ({ listSpaces: vi.fn().mockResolvedValue([{ space_id: 's', name: 'Read only', capabilities: ['space.read'], effective_role: 'VIEWER', status: 'active' }]) }))
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
it('does not expose grants editing or public creation to an ordinary viewer', async () => {
  const wrapper = mount(Page)
  await flushPromises()
  expect(wrapper.text()).toContain('Read only')
  expect(wrapper.find('[data-test="save-grant"]').exists()).toBe(false)
  expect(wrapper.find('option[value="public"]').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('组织成员管理')
})
it('exposes organization metadata administration without implying private content access', async () => {
  useAuthStore().context = { user_id: 'u', email: 'a@b.com', tenant_id: 't', membership_id: 'm', tenant_name: 'Team', tenant_role: 'TENANT_ADMIN' }
  vi.mocked(permissionsApi.spaces).mockResolvedValue([{ space_id: 'archived', space_key: 'archived', name: 'Archived private', status: 'archived', created_by: null }])
  const wrapper = mount(Page)
  await flushPromises()
  expect(wrapper.text()).toContain('组织成员管理')
  expect(wrapper.text()).toContain('元数据不代表内容访问权限')
  expect(wrapper.text()).toContain('恢复空间')
  expect(wrapper.find('option[value="public"]').exists()).toBe(true)
  expect(useSpacesStore().currentSpace?.capabilities).not.toContain('space.manage')
})
