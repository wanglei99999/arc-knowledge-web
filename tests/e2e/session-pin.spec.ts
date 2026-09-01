import { expect, test, type Page, type Route } from 'playwright/test'

interface SessionRecord {
  session_id: string
  title: string
  summary: string | null
  message_count: number
  pinned_at: string | null
  created_at: string
  updated_at: string
}

const apiOrigin = 'http://localhost:8000'

function corsHeaders() {
  return {
    'access-control-allow-headers': 'Authorization, Content-Type, X-Tenant-Id',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-origin': 'http://127.0.0.1:4173',
    'content-type': 'application/json',
  }
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  })
}

async function installPinApiMocks(page: Page) {
  let pinSequence = 0
  const sessions: SessionRecord[] = [
    {
      session_id: 'session-newer',
      title: '最近更新会话',
      summary: null,
      message_count: 4,
      pinned_at: null,
      created_at: '2026-08-20T01:00:00Z',
      updated_at: '2026-08-31T09:15:00Z',
    },
    {
      session_id: 'session-older',
      title: '较早更新会话',
      summary: null,
      message_count: 2,
      pinned_at: null,
      created_at: '2026-08-19T01:00:00Z',
      updated_at: '2026-08-25T09:15:00Z',
    },
  ]

  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'e2e-access-token')
    localStorage.setItem('refresh_token', 'e2e-refresh-token')
    localStorage.setItem('auth_email', 'lei@example.com')
    localStorage.setItem('current_space_id', 'space-1')
  })

  await page.route(`${apiOrigin}/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() })
      return
    }
    if (method === 'GET' && url.pathname === '/spaces') {
      await json(route, [{
        space_id: 'space-1',
        space_key: 'product-docs',
        name: '产品文档',
        status: 'active',
        created_by: 'user-1',
      }])
      return
    }
    if (method === 'GET' && url.pathname === '/sessions') {
      await json(route, [...sessions].sort((left, right) => {
        if (left.pinned_at && right.pinned_at) {
          return Date.parse(right.pinned_at) - Date.parse(left.pinned_at)
        }
        if (left.pinned_at) return -1
        if (right.pinned_at) return 1
        return Date.parse(right.updated_at) - Date.parse(left.updated_at)
      }))
      return
    }
    if (method === 'GET' && /^\/sessions\/[^/]+\/messages$/.test(url.pathname)) {
      await json(route, [])
      return
    }

    const pinMatch = url.pathname.match(/^\/sessions\/([^/]+)\/pin$/)
    if (method === 'POST' && pinMatch) {
      const session = sessions.find(item => item.session_id === pinMatch[1])
      if (!session) return json(route, { detail: 'Session not found' }, 404)
      if (!session.pinned_at) {
        pinSequence += 1
        session.pinned_at = `2026-09-01T02:${30 + pinSequence}:00Z`
      }
      await json(route, session)
      return
    }

    const unpinMatch = url.pathname.match(/^\/sessions\/([^/]+)\/unpin$/)
    if (method === 'POST' && unpinMatch) {
      const session = sessions.find(item => item.session_id === unpinMatch[1])
      if (!session) return json(route, { detail: 'Session not found' }, 404)
      session.pinned_at = null
      await json(route, session)
      return
    }

    await json(route, { detail: `Unhandled E2E request: ${method} ${url.pathname}` }, 500)
  })
}

test('multiple pins use server order and unpin restores updated order', async ({ page }) => {
  await installPinApiMocks(page)
  await page.goto('/chat')

  const sessionLinks = page.locator('button[aria-label^="打开会话 "]')
  await expect(sessionLinks).toHaveCount(2)
  await expect(sessionLinks.nth(0)).toHaveAccessibleName('打开会话 最近更新会话')

  await page.getByLabel('打开会话 较早更新会话').hover()
  await page.getByLabel('置顶会话 较早更新会话').click()

  await expect(sessionLinks.nth(0)).toHaveAccessibleName('打开会话 较早更新会话')
  await expect(page.getByLabel('已置顶')).toBeVisible()

  await page.getByLabel('打开会话 最近更新会话').hover()
  await page.getByLabel('置顶会话 最近更新会话').click()

  await expect(sessionLinks.nth(0)).toHaveAccessibleName('打开会话 最近更新会话')
  await expect(page.getByLabel('已置顶')).toHaveCount(2)

  await page.reload()
  await expect(page.getByLabel('已置顶')).toHaveCount(2)

  await page.getByLabel('打开会话 最近更新会话').hover()
  await page.getByLabel('取消置顶会话 最近更新会话').click()
  await expect(sessionLinks.nth(0)).toHaveAccessibleName('打开会话 较早更新会话')

  await page.getByLabel('打开会话 较早更新会话').hover()
  await page.getByLabel('取消置顶会话 较早更新会话').click()

  await expect(sessionLinks.nth(0)).toHaveAccessibleName('打开会话 最近更新会话')
  await expect(page.getByLabel('已置顶')).toHaveCount(0)
})
