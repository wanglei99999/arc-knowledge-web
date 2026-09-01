import { expect, test, type Page, type Route } from 'playwright/test'

interface SessionRecord {
  session_id: string
  title: string
  summary: string | null
  message_count: number
  archived_at?: string
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

async function installArchiveApiMocks(page: Page) {
  const active: SessionRecord[] = [
    {
      session_id: 'session-1',
      title: '接入鉴权方案',
      summary: null,
      message_count: 4,
      pinned_at: '2026-09-01T02:30:00Z',
      created_at: '2026-08-20T01:00:00Z',
      updated_at: '2026-08-31T09:15:00Z',
    },
  ]
  const archived: SessionRecord[] = []

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
      await json(route, active)
      return
    }

    if (method === 'GET' && url.pathname === '/sessions/archived') {
      await json(route, {
        items: archived.map(session => ({
          session_id: session.session_id,
          title: session.title,
          message_count: session.message_count,
          archived_at: session.archived_at,
          space: {
            space_id: 'space-1',
            name: '产品文档',
            status: 'active',
          },
        })),
        total: archived.length,
      })
      return
    }

    const archiveMatch = url.pathname.match(/^\/sessions\/([^/]+)\/archive$/)
    if (method === 'POST' && archiveMatch) {
      const index = active.findIndex(item => item.session_id === archiveMatch[1])
      if (index >= 0) {
        archived.unshift({
          ...active.splice(index, 1)[0],
          archived_at: '2026-09-01T01:00:00Z',
          pinned_at: null,
        })
      }
      await route.fulfill({ status: 204, headers: corsHeaders() })
      return
    }

    const restoreMatch = url.pathname.match(/^\/sessions\/([^/]+)\/restore$/)
    if (method === 'POST' && restoreMatch) {
      const index = archived.findIndex(item => item.session_id === restoreMatch[1])
      if (index >= 0) {
        const [restored] = archived.splice(index, 1)
        delete restored.archived_at
        restored.pinned_at = null
        active.unshift(restored)
      }
      await route.fulfill({ status: 204, headers: corsHeaders() })
      return
    }

    if (method === 'GET' && /^\/sessions\/[^/]+\/messages$/.test(url.pathname)) {
      await json(route, [])
      return
    }

    await json(route, { detail: `Unhandled E2E request: ${method} ${url.pathname}` }, 500)
  })
}

test('archive in sidebar and restore from personal settings', async ({ page }) => {
  await installArchiveApiMocks(page)
  await page.goto('/chat')

  const archiveButton = page.getByLabel('归档会话 接入鉴权方案')
  await expect(archiveButton).toBeVisible()
  await archiveButton.click()
  await expect(archiveButton).toHaveCount(0)

  await page.getByRole('button', { name: '用户菜单' }).click()
  await page.getByRole('link', { name: '个人设置' }).click()

  await expect(page).toHaveURL(/\/settings\/archived-chats$/)
  await expect(
    page.getByRole('main').getByRole('heading', { name: '已归档聊天', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('产品文档', { exact: true }).last()).toBeVisible()

  const restoreButton = page.getByLabel('恢复会话 接入鉴权方案')
  await expect(restoreButton).toBeVisible()
  await restoreButton.click()
  await expect(restoreButton).toHaveCount(0)
  await expect(page.getByLabel(/^取消置顶会话 /)).toHaveCount(0)
  await expect(page.getByLabel('置顶会话 接入鉴权方案')).toHaveCount(1)
})
