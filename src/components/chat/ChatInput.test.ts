import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ChatInput from '@/components/chat/ChatInput.vue'
import { useSpacesStore } from '@/stores/spaces'

const documentApi = vi.hoisted(() => ({ uploadDocument: vi.fn() }))

vi.mock('@/api/document', () => documentApi)

describe('ChatInput', () => {
  beforeEach(() => {
    documentApi.uploadDocument.mockReset()
    localStorage.clear()
    setActivePinia(createPinia())
    const spacesStore = useSpacesStore()
    spacesStore.spaces = [{
      space_id: 'space-1',
      space_key: 'knowledge',
      name: '知识库',
      status: 'active',
      created_by: 'user-1',
      capabilities: ['space.read', 'document.upload'],
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
  it('rejects attachment selection for viewers but still permits ordinary chat', async () => {
    useSpacesStore().spaces[0].capabilities = ['space.read']
    const wrapper = mount(ChatInput, { props: { disabled: false, isStreaming: false, text: '普通问题' } })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'secret.pdf', { type: 'application/pdf' })] })
    await input.trigger('change')
    expect(wrapper.text()).not.toContain('secret.pdf')
    await wrapper.get('button[aria-label="发送"]').trigger('click')
    expect(wrapper.emitted('send')?.[0]).toEqual(['普通问题', []])
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

  it('stages selected files locally instead of uploading them immediately', async () => {
    const wrapper = mount(ChatInput, {
      props: {
        disabled: false,
        isStreaming: false,
        text: '总结附件',
      },
    })
    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await input.trigger('change')

    expect(documentApi.uploadDocument).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('report.pdf')
    expect(wrapper.text()).toContain('待发送')
  })

  it('emits the question and staged files together, then clears the composer', async () => {
    const wrapper = mount(ChatInput, {
      props: {
        disabled: false,
        isStreaming: false,
        text: '总结附件',
      },
    })
    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })
    await input.trigger('change')

    await wrapper.get('button[aria-label="发送"]').trigger('click')

    expect(wrapper.emitted('send')?.[0]).toEqual(['总结附件', [file]])
    const textUpdates = wrapper.emitted('update:text') ?? []
    expect(textUpdates[textUpdates.length - 1]).toEqual([''])
    expect(wrapper.text()).not.toContain('report.pdf')
  })
})
