import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ChatInput from '@/components/chat/ChatInput.vue'
import { useSpacesStore } from '@/stores/spaces'

vi.mock('@/api/document', () => ({ uploadDocument: vi.fn() }))

describe('ChatInput while the current session is busy', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    const spacesStore = useSpacesStore()
    spacesStore.spaces = [{
      space_id: 'space-1',
      space_key: 'knowledge',
      name: '知识库',
      status: 'active',
      created_by: 'user-1',
    }]
    spacesStore.switchSpace('space-1')
  })

  it('keeps the textarea editable and exposes only the stop action', () => {
    const wrapper = mount(ChatInput, {
      props: {
        disabled: false,
        isStreaming: true,
        text: '下一条草稿',
      },
    })

    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[aria-label="停止生成"]').element.tagName).toBe('BUTTON')
    expect(wrapper.find('button[aria-label="发送"]').exists()).toBe(false)
  })

  it('keeps drafting enabled but disables send while files are processing', () => {
    const wrapper = mount(ChatInput, {
      props: {
        disabled: false,
        isStreaming: false,
        sendDisabled: true,
        text: '下一条草稿',
      },
    })

    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[aria-label="发送"]').attributes('disabled')).toBeDefined()
  })
})
