import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import Page from './index.vue'
import { Table, Drawer, Spin } from 'ant-design-vue'
import { useSpacesStore } from '@/stores/spaces'
import { listDocuments } from '@/api/document'
vi.mock('@/api/document', () => ({ listDocuments: vi.fn().mockResolvedValue({ items: [], total: 0 }), uploadDocument: vi.fn(), deleteDocument: vi.fn(), listChunks: vi.fn() }))
const style = window.getComputedStyle.bind(window)
beforeEach(() => {
  localStorage.clear(); setActivePinia(createPinia()); vi.clearAllMocks()
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {} }))
  vi.spyOn(window, 'getComputedStyle').mockImplementation(el => style(el))
})
it('does not fetch unscoped documents or expose upload with no selected space', async () => {
  const wrapper = mount(Page, { global: { components: { ATable: Table, ADrawer: Drawer, ASpin: Spin } } })
  await flushPromises()
  expect(listDocuments).not.toHaveBeenCalled()
  expect(wrapper.findComponent({ name: 'UploadZone' }).exists()).toBe(false)
})
it('discards document results that arrive after the selected space changes', async () => {
  const spaces = useSpacesStore()
  spaces.spaces = [{ space_id: 's', space_key: 's', name: 'Space', status: 'active', created_by: null, capabilities: ['space.read'] }]
  spaces.switchSpace('s')
  let resolve!: (data: any) => void
  vi.mocked(listDocuments).mockReturnValueOnce(new Promise(r => { resolve = r }))
  const wrapper = mount(Page, { global: { components: { ATable: Table, ADrawer: Drawer, ASpin: Spin } } })
  spaces.clearSpace()
  await flushPromises()
  resolve({ items: [], total: 999 })
  await flushPromises()
  expect(wrapper.text()).not.toContain('999')
})
