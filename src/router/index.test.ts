import { describe, expect, it } from 'vitest'

import router from '@/router'

describe('personal settings routes', () => {
  it('registers archived chats under authenticated user settings', () => {
    const route = router.getRoutes().find(item => item.name === 'archived-chats')

    expect(route?.path).toBe('/settings/archived-chats')
    expect(route?.meta.requiresAuth).toBe(true)
  })
})
