import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ArchivedChatsView from '@/views/settings/ArchivedChatsView.vue'
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

const archivedSession = (
  status: 'active' | 'archived' = 'active',
): ArchivedSessionVO => ({
  id: 'session-1',
  title: '旧版上传流程',
  message_count: 2,
  archived_at: '2026-08-21T09:30:00Z',
  space: {
    space_id: 'space-1',
    name: '产品文档',
    status,
  },
})

async function mountArchivedChats(
  items: ArchivedSessionVO[] = [archivedSession()],
) {
  chatApi.listArchivedSessions.mockResolvedValue({
    items,
    total: items.length,
  })
  const wrapper = mount(ArchivedChatsView)
  await flushPromises()
  return wrapper
}

describe('ArchivedChatsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    chatApi.restoreSession.mockResolvedValue(undefined)
    spacesApi.restoreSpace.mockResolvedValue(undefined)
  })

  it('renders archived sessions grouped by their original space', async () => {
    const wrapper = await mountArchivedChats()

    expect(wrapper.get('h1').text()).toBe('已归档聊天')
    expect(wrapper.text()).toContain('产品文档')
    expect(wrapper.text()).toContain('旧版上传流程')
    expect(wrapper.text()).toContain('2 条消息')
  })

  it('requires space restoration before session restoration', async () => {
    const wrapper = await mountArchivedChats([archivedSession('archived')])

    expect(
      wrapper.get('[aria-label="恢复会话 旧版上传流程"]').attributes('disabled'),
    ).toBeDefined()
    expect(wrapper.text()).toContain('先恢复空间')

    await wrapper.get('[aria-label="恢复空间 产品文档"]').trigger('click')
    await flushPromises()
    expect(spacesApi.restoreSpace).toHaveBeenCalledWith('space-1')
    expect(
      wrapper.get('[aria-label="恢复会话 旧版上传流程"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('distinguishes no archives from no search results', async () => {
    const empty = await mountArchivedChats([])
    expect(empty.text()).toContain('还没有归档聊天')
    empty.unmount()

    setActivePinia(createPinia())
    const searched = await mountArchivedChats()
    await searched.get('input[type="search"]').setValue('不存在')
    expect(searched.text()).toContain('没有匹配的归档聊天')
  })

  it('removes a restored session after server confirmation', async () => {
    const wrapper = await mountArchivedChats()

    await wrapper.get('[aria-label="恢复会话 旧版上传流程"]').trigger('click')
    await flushPromises()

    expect(chatApi.restoreSession).toHaveBeenCalledWith('session-1')
    expect(wrapper.text()).not.toContain('旧版上传流程')
  })
})
