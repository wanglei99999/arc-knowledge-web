import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import MessageBubble from '@/components/chat/MessageBubble.vue'
import type { AttachmentVO, MessageVO } from '@/types/chat'

function attachment(patch: Partial<AttachmentVO> = {}): AttachmentVO {
  return {
    attachment_id: 'attachment-1',
    client_id: 'client-1',
    document_id: null,
    file_name: 'report.pdf',
    mime_type: 'application/pdf',
    file_size: 1_024,
    status: 'pending_upload',
    ignored: false,
    error_message: null,
    ...patch,
  }
}

function userMessage(file: AttachmentVO): MessageVO {
  return {
    id: 'turn-1',
    role: 'user',
    content: '总结附件',
    created_at: '2026-08-31T00:00:00.000Z',
    processing_status: 'waiting_files',
    attachments: [file],
  }
}

describe('MessageBubble attachments', () => {
  it('shows upload progress inside the user message', () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: userMessage(attachment({ status: 'uploading', progress: 48 })),
      },
    })

    expect(wrapper.text()).toContain('report.pdf')
    expect(wrapper.text()).toContain('上传中 48%')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('48')
  })

  it('shows a failed attachment with its error and recovery actions', async () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: userMessage(attachment({
          document_id: 'document-1',
          status: 'failed',
          error_message: '索引失败',
        })),
      },
    })

    expect(wrapper.text()).toContain('索引失败')
    await wrapper.get('button[aria-label="重试 report.pdf"]').trigger('click')
    await wrapper.get('button[aria-label="忽略 report.pdf"]').trigger('click')

    expect(wrapper.emitted('retryAttachment')?.[0]).toEqual(['turn-1', 'attachment-1'])
    expect(wrapper.emitted('ignoreAttachment')?.[0]).toEqual(['turn-1', 'attachment-1'])
  })

  it('asks for the original file again when upload failed before a document was linked', async () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: userMessage(attachment({
          status: 'failed',
          error_message: '文件上传失败，请重试',
        })),
      },
    })
    const file = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await input.trigger('change')

    expect(wrapper.emitted('retryUpload')?.[0]).toEqual([
      'turn-1',
      'attachment-1',
      file,
    ])
    expect(wrapper.find('button[aria-label="重试 report.pdf"]').exists()).toBe(false)
  })

  it('shows an indexed attachment as complete without recovery actions', () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: userMessage(attachment({
          document_id: 'document-1',
          status: 'indexed',
        })),
      },
    })

    expect(wrapper.text()).toContain('已入库')
    expect(wrapper.find('button[aria-label="重试 report.pdf"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="忽略 report.pdf"]').exists()).toBe(false)
  })

  it('offers adding files or cancelling when every attachment is unavailable', async () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: userMessage(attachment({
          document_id: 'document-1',
          status: 'failed',
          error_message: '索引失败',
        })),
      },
    })
    const file = new File(['new'], 'replacement.pdf', { type: 'application/pdf' })
    const input = wrapper.get('input[aria-label="补充附件文件"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await input.trigger('change')
    await wrapper.get('button[aria-label="取消本轮"]').trigger('click')

    expect(wrapper.emitted('addAttachments')?.[0]).toEqual(['turn-1', [file]])
    expect(wrapper.emitted('cancelTurn')?.[0]).toEqual(['turn-1'])
  })

  it('hides attachment recovery actions after the turn is cancelled', () => {
    const message = userMessage(attachment({
      document_id: 'document-1',
      status: 'failed',
      error_message: '索引失败',
    }))
    message.processing_status = 'cancelled'
    const wrapper = mount(MessageBubble, { props: { message } })

    expect(wrapper.find('button[aria-label="重试 report.pdf"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="忽略 report.pdf"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="取消本轮"]').exists()).toBe(false)
  })

  it('offers regenerating the answer after answer generation fails', async () => {
    const message = userMessage(attachment({
      document_id: 'document-1',
      status: 'indexed',
    }))
    message.processing_status = 'answer_failed'
    message.processing_error = 'DeepSeek 暂时不可用'
    const wrapper = mount(MessageBubble, { props: { message } })

    expect(wrapper.text()).toContain('DeepSeek 暂时不可用')
    await wrapper.get('button[aria-label="重新生成回答"]').trigger('click')

    expect(wrapper.emitted('retryAnswer')?.[0]).toEqual(['turn-1'])
  })

})
