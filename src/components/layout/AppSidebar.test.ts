import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useChatStore } from '@/stores/chat'
import { useSpacesStore } from '@/stores/spaces'

const chatApi = vi.hoisted(() => ({
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  archiveSession: vi.fn().mockResolvedValue(undefined),
  restoreSession: vi.fn().mockResolvedValue(undefined),
  listMessages: vi.fn().mockResolvedValue([]),
  createChatTurn: vi.fn(),
  getChatTurn: vi.fn(),
  uploadTurnAttachment: vi.fn(),
}))

const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  notificationOpen: vi.fn(),
  notificationClose: vi.fn(),
}))

vi.mock('@/api/chat', () => chatApi)
vi.mock('@/utils/sse', () => ({
  streamChat: vi.fn(),
  streamTurnAnswer: vi.fn(),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/chat' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('ant-design-vue', () => ({
  Modal: { confirm: ui.confirm },
  message: { success: vi.fn(), error: vi.fn() },
  notification: {
    open: ui.notificationOpen,
    close: ui.notificationClose,
  },
}))

function setupSessions() {
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
  return chatStore
}

function mountSidebar() {
  return mount(AppSidebar, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
}

describe('AppSidebar session notifications', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    chatApi.listSessions.mockResolvedValue([])
    chatApi.archiveSession.mockResolvedValue(undefined)
    chatApi.restoreSession.mockResolvedValue(undefined)
  })

  it('renders completed and failed unread results with different accessible dots', () => {
    const chatStore = setupSessions()
    chatStore.notificationsBySession['session-complete'] = 'completed_unread'
    chatStore.notificationsBySession['session-failed'] = 'failed_unread'

    const wrapper = mountSidebar()

    const complete = wrapper.get('[aria-label="会话已完成，有未读结果"]')
    const failed = wrapper.get('[aria-label="会话处理失败"]')
    expect(complete.classes()).toContain('bg-accent-blue')
    expect(failed.classes()).toContain('bg-alert-ink')
  })

  it('archives without destructive confirmation and offers undo', async () => {
    setupSessions()
    const wrapper = mountSidebar()

    await wrapper
      .get('[aria-label="归档会话 已完成会话"]')
      .trigger('click')
    await Promise.resolve()

    expect(chatApi.archiveSession).toHaveBeenCalledWith('session-complete')
    expect(ui.confirm).not.toHaveBeenCalled()
    expect(ui.notificationOpen).toHaveBeenCalledOnce()

    const options = ui.notificationOpen.mock.calls[0][0]
    const undoButton = options.btn()
    await undoButton.props.onClick()

    expect(chatApi.restoreSession).toHaveBeenCalledWith('session-complete')
    expect(ui.notificationClose).toHaveBeenCalledWith(
      'session-archive-session-complete',
    )
  })
})
