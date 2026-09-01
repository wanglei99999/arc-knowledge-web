import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SessionRow from '@/components/layout/SessionRow.vue'
import type { SessionVO } from '@/types/chat'

const session: SessionVO = {
  id: 'session-1',
  title: '接入鉴权方案',
  created_at: '2026-08-30T00:00:00.000Z',
  updated_at: '2026-08-30T00:00:00.000Z',
  message_count: 2,
  pinned_at: null,
}

describe('SessionRow', () => {
  it('exposes archive as a named button and emits the session id', async () => {
    const wrapper = mount(SessionRow, {
      props: { session, active: false, busy: false },
    })

    await wrapper.get('[aria-label="归档会话 接入鉴权方案"]').trigger('click')

    expect(wrapper.emitted('archive')).toEqual([['session-1']])
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('disables archive while the session is busy', () => {
    const wrapper = mount(SessionRow, {
      props: { session, active: false, busy: true },
    })

    expect(
      wrapper.get('[aria-label^="归档会话"]').attributes('disabled'),
    ).toBeDefined()
  })

  it('opens from a dedicated named button', async () => {
    const wrapper = mount(SessionRow, {
      props: { session, active: true, busy: false },
    })

    await wrapper.get('[aria-label="打开会话 接入鉴权方案"]').trigger('click')

    expect(wrapper.emitted('open')).toEqual([['session-1']])
  })

  it('keeps the unread notification inside the row', () => {
    const wrapper = mount(SessionRow, {
      props: {
        session,
        active: false,
        busy: false,
        notification: 'completed_unread',
      },
    })

    expect(
      wrapper.find('[aria-label="会话已完成，有未读结果"]').exists(),
    ).toBe(true)
  })

  it('emits pin from a named button even while the session is busy', async () => {
    const wrapper = mount(SessionRow, {
      props: { session, active: false, busy: true },
    })

    const pinButton = wrapper.get('[aria-label="置顶会话 接入鉴权方案"]')
    expect(pinButton.findAll('svg')).toHaveLength(1)
    expect(pinButton.get('svg').classes()).toContain('lucide-pin-icon')
    expect(pinButton.get('svg').attributes('fill')).toBe('none')
    await pinButton.trigger('click')

    expect(wrapper.emitted('pin')).toEqual([['session-1']])
  })

  it('uses the same single pin button with a solid icon when pinned', async () => {
    const wrapper = mount(SessionRow, {
      props: {
        session: { ...session, pinned_at: '2026-09-01T02:30:00Z' },
        active: false,
        busy: false,
      },
    })

    expect(wrapper.find('[aria-label="已置顶"]').exists()).toBe(false)
    const pinButton = wrapper.get(
      '[aria-label="取消置顶会话 接入鉴权方案"]',
    )
    expect(pinButton.findAll('svg')).toHaveLength(1)
    expect(pinButton.get('svg').classes()).toContain('lucide-pin-icon')
    expect(pinButton.get('svg').attributes('fill')).toBe('currentColor')
    await pinButton.trigger('click')

    expect(wrapper.emitted('pin')).toEqual([['session-1']])
  })
})
