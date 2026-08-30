import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ChatInput from '@/components/chat/ChatInput.vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import { useChatStore } from '@/stores/chat'
import type { MessageVO } from '@/types/chat'
import ChatView from '@/views/chat/index.vue'

describe('chat view send routing', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('routes a message with files through submitTurn', async () => {
    const store = useChatStore()
    store.activeSessionId = 'session-1'
    const submitTurn = vi.spyOn(store, 'submitTurn').mockResolvedValue()
    const sendMessage = vi.spyOn(store, 'sendMessage').mockResolvedValue()
    const wrapper = mount(ChatView)
    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })

    wrapper.getComponent(ChatInput).vm.$emit('send', '总结附件', [file])
    await nextTick()

    expect(submitTurn).toHaveBeenCalledWith('总结附件', [file])
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('keeps a message without files on the normal chat path', async () => {
    const store = useChatStore()
    store.activeSessionId = 'session-1'
    const submitTurn = vi.spyOn(store, 'submitTurn').mockResolvedValue()
    const sendMessage = vi.spyOn(store, 'sendMessage').mockResolvedValue()
    const wrapper = mount(ChatView)

    wrapper.getComponent(ChatInput).vm.$emit('send', '普通问题', [])
    await nextTick()

    expect(sendMessage).toHaveBeenCalledWith('普通问题')
    expect(submitTurn).not.toHaveBeenCalled()
  })

  it('forwards attachment recovery actions from a message to the store', async () => {
    const store = useChatStore()
    store.activeSessionId = 'session-1'
    const failedMessage: MessageVO = {
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'waiting_files',
      attachments: [{
        attachment_id: 'attachment-1',
        client_id: 'client-1',
        document_id: 'document-1',
        file_name: 'report.pdf',
        mime_type: 'application/pdf',
        file_size: 4,
        status: 'failed',
        ignored: false,
        error_message: '索引失败',
      }],
    }
    store.messagesBySession['session-1'] = [failedMessage]
    const retry = vi.spyOn(store, 'retryAttachment').mockResolvedValue()
    const ignore = vi.spyOn(store, 'ignoreAttachment').mockResolvedValue()
    const wrapper = mount(ChatView)
    const bubble = wrapper.getComponent(MessageBubble)

    bubble.vm.$emit('retryAttachment', 'turn-1', 'attachment-1')
    bubble.vm.$emit('ignoreAttachment', 'turn-1', 'attachment-1')
    await nextTick()

    expect(retry).toHaveBeenCalledWith('turn-1', 'attachment-1')
    expect(ignore).toHaveBeenCalledWith('turn-1', 'attachment-1')
  })

  it('forwards turn-level add and cancel actions to the store', async () => {
    const store = useChatStore()
    store.activeSessionId = 'session-1'
    const failedMessage: MessageVO = {
      id: 'turn-1',
      role: 'user',
      content: '总结附件',
      created_at: '2026-08-31T00:00:00.000Z',
      processing_status: 'waiting_files',
      attachments: [{
        attachment_id: 'attachment-1',
        client_id: 'client-1',
        document_id: 'document-1',
        file_name: 'report.pdf',
        mime_type: 'application/pdf',
        file_size: 4,
        status: 'failed',
        ignored: false,
        error_message: '索引失败',
      }],
    }
    store.messagesBySession['session-1'] = [failedMessage]
    const add = vi.spyOn(store, 'addAttachments').mockResolvedValue()
    const cancel = vi.spyOn(store, 'cancelTurn').mockResolvedValue()
    const wrapper = mount(ChatView)
    const bubble = wrapper.getComponent(MessageBubble)
    const file = new File(['new'], 'replacement.pdf', { type: 'application/pdf' })

    bubble.vm.$emit('addAttachments', 'turn-1', [file])
    bubble.vm.$emit('cancelTurn', 'turn-1')
    await nextTick()

    expect(add).toHaveBeenCalledWith('turn-1', [file])
    expect(cancel).toHaveBeenCalledWith('turn-1')
  })
})
