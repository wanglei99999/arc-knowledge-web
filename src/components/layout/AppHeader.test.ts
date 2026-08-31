import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppHeader from '@/components/layout/AppHeader.vue'

vi.mock('@/api/auth', () => ({
  authApi: {
    logout: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/settings/archived-chats' }),
  useRouter: () => ({ push: vi.fn() }),
}))

describe('AppHeader personal settings', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth_email', 'lei@example.com')
    setActivePinia(createPinia())
  })

  it('labels the user menu and links to personal settings', async () => {
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :data-to="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.get('h1').text()).toBe('已归档聊天')
    await wrapper.get('[aria-label="用户菜单"]').trigger('click')
    expect(wrapper.text()).toContain('个人设置')
    expect(
      wrapper.find('a[data-to="/settings/archived-chats"]').exists(),
    ).toBe(true)
  })
})
