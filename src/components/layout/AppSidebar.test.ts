import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useChatStore } from '@/stores/chat'
import { useSpacesStore } from '@/stores/spaces'

vi.mock('@/api/chat', () => ({
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  listMessages: vi.fn().mockResolvedValue([]),
  createChatTurn: vi.fn(),
  getChatTurn: vi.fn(),
  uploadTurnAttachment: vi.fn(),
}))
vi.mock('@/utils/sse', () => ({
  streamChat: vi.fn(),
  streamTurnAnswer: vi.fn(),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/chat' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('ant-design-vue', () => ({
  Modal: { confirm: vi.fn() },
  message: { success: vi.fn(), error: vi.fn() },
}))

describe('AppSidebar session notifications', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('renders completed and failed unread results with different accessible dots', () => {
    const spacesStore = useSpacesStore()
    spacesStore.spaces = [{
      space_id: 'space-1',
      space_key: 'knowledge',
      name: '知识库',
      status: 'active',
      created_by: 'user-1',
    }]
    spacesStore.switchSpace('space-1')
    const chatStore = useChatStore()
    chatStore.sessions = [
      {
        id: 'session-complete',
        title: '已完成会话',
        created_at: '2026-08-30T00:00:00.000Z',
        updated_at: '2026-08-30T00:00:00.000Z',
        message_count: 2,
      },
      {
        id: 'session-failed',
        title: '失败会话',
        created_at: '2026-08-30T00:00:00.000Z',
        updated_at: '2026-08-30T00:00:00.000Z',
        message_count: 1,
      },
    ]
    chatStore.notificationsBySession['session-complete'] = 'completed_unread'
    chatStore.notificationsBySession['session-failed'] = 'failed_unread'

    const wrapper = mount(AppSidebar, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    const complete = wrapper.get('[aria-label="会话已完成，有未读结果"]')
    const failed = wrapper.get('[aria-label="会话处理失败"]')
    expect(complete.classes()).toContain('bg-accent-blue')
    expect(failed.classes()).toContain('bg-alert-ink')
  })
})
