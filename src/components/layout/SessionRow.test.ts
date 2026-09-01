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

  it('starts inline editing from the direct rename action', async () => {
    const wrapper = mount(SessionRow, {
      attachTo: document.body,
      props: { session, active: false, busy: false },
    })

    await wrapper
      .get('.session-direct-action[aria-label="重命名会话 接入鉴权方案"]')
      .trigger('click')

    const input = wrapper.get('[aria-label="会话标题"]')
    expect((input.element as HTMLInputElement).value).toBe('接入鉴权方案')
    expect(document.activeElement).toBe(input.element)
    wrapper.unmount()
  })

  it('opens the shared action menu on right click and can start renaming', async () => {
    const wrapper = mount(SessionRow, {
      attachTo: document.body,
      props: { session, active: false, busy: false },
    })

    await wrapper.get('.session-row').trigger('contextmenu')
    const menu = wrapper.get('[role="group"][aria-label="会话操作"]')
    await menu
      .get('[aria-label="重命名会话 接入鉴权方案"]')
      .trigger('click')

    expect(wrapper.find('[role="group"][aria-label="会话操作"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="会话标题"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('submits a trimmed title with Enter and exits after success', async () => {
    const wrapper = mount(SessionRow, {
      attachTo: document.body,
      props: { session, active: false, busy: false },
    })
    await wrapper
      .get('.session-direct-action[aria-label^="重命名会话"]')
      .trigger('click')
    const input = wrapper.get('[aria-label="会话标题"]')
    await input.setValue('  新的标题  ')
    await input.trigger('keydown', { key: 'Enter' })

    const emitted = wrapper.emitted('rename')
    expect(emitted?.[0]?.slice(0, 2)).toEqual(['session-1', '新的标题'])
    const complete = emitted?.[0]?.[2] as (saved: boolean) => void
    await wrapper.setProps({ session: { ...session, title: '新的标题' } })
    complete(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[aria-label="会话标题"]').exists()).toBe(false)
    expect(document.activeElement).toBe(
      wrapper.get('[aria-label="打开会话 新的标题"]').element,
    )
    wrapper.unmount()
  })

  it('auto-saves a changed title on blur', async () => {
    const wrapper = mount(SessionRow, {
      props: { session, active: false, busy: false },
    })
    await wrapper
      .get('.session-direct-action[aria-label^="重命名会话"]')
      .trigger('click')
    const input = wrapper.get('[aria-label="会话标题"]')
    await input.setValue('失焦保存')
    await input.trigger('blur')

    expect(wrapper.emitted('rename')?.[0]?.slice(0, 2)).toEqual([
      'session-1',
      '失焦保存',
    ])
  })

  it('keeps the draft and shows an error when saving fails', async () => {
    const wrapper = mount(SessionRow, {
      props: { session, active: false, busy: false },
    })
    await wrapper
      .get('.session-direct-action[aria-label^="重命名会话"]')
      .trigger('click')
    const input = wrapper.get('[aria-label="会话标题"]')
    await input.setValue('保留这个标题')
    await input.trigger('keydown', { key: 'Enter' })
    const complete = wrapper.emitted('rename')?.[0]?.[2] as (saved: boolean) => void
    complete(false)
    await wrapper.vm.$nextTick()

    expect((wrapper.get('[aria-label="会话标题"]').element as HTMLInputElement).value)
      .toBe('保留这个标题')
    expect(wrapper.get('[role="alert"]').text()).toContain('保存失败')
  })

  it('rejects an empty title and cancels editing with Escape', async () => {
    const wrapper = mount(SessionRow, {
      attachTo: document.body,
      props: { session, active: false, busy: false },
    })
    await wrapper
      .get('.session-direct-action[aria-label^="重命名会话"]')
      .trigger('click')
    const input = wrapper.get('[aria-label="会话标题"]')
    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('rename')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('不能为空')

    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[aria-label="会话标题"]').exists()).toBe(false)
    expect(document.activeElement).toBe(
      wrapper.get('[aria-label="打开会话 接入鉴权方案"]').element,
    )
    wrapper.unmount()
  })
})
