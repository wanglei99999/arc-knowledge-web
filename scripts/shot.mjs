// 给运行中的 dev server 截图。用系统已装的 Chrome（channel: 'chrome'），
// 不下载 Playwright 自带的 Chromium —— 版本一致，省 180MB。
//
// 用法：
//   node scripts/shot.mjs /chat --auth --out shot.png
//   node scripts/shot.mjs /login --out login.png
//   node scripts/shot.mjs /chat --auth --type "这个空间里有哪些文档？"
//   npm run shot -- /chat --auth
//
// Git Bash 注意：它会把 /chat 误转成 Windows 路径。传不带前导斜杠的路由即可：
//   npm run shot -- chat --auth      （脚本会自动补斜杠）
//
// 选项：
//   --out <file>      输出 PNG，默认 ./shot.png
//   --base <url>      基址，默认 http://localhost:3000
//   --auth            注入预览 token。登录后的页面守卫只看 token 有无（isLoggedIn = !!access_token），
//                     塞个假值即可渲染空态，无需真登录、无需后端。拉列表会失败（顶部飘红），预览环境正常。
//   --type <text>     加载后往第一个 textarea 里打字（验证「输入有字→引导卡淡出」这类交互）
//   --w <n> --h <n>   视口，默认 1440x900
//   --scale <n>       deviceScaleFactor，默认 1（截小组件调高到 2 更清晰）
//   --clip x,y,w,h    只截某区域
//   --full            整页截图（与 --clip 互斥）
//
// 注意：这是开发期视觉核对工具，不是 E2E 测试。真正的 E2E 用 Playwright test runner 另建。

import { chromium } from 'playwright'

const args = process.argv.slice(2)
const path = args.find((a) => !a.startsWith('--')) ?? '/'
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}
const has = (name) => args.includes(`--${name}`)

const base = flag('base', 'http://localhost:3000').replace(/\/$/, '')
const out = flag('out', 'shot.png')
const url = base + (path.startsWith('/') ? path : `/${path}`)
const viewport = { width: Number(flag('w', 1440)), height: Number(flag('h', 900)) }
const deviceScaleFactor = Number(flag('scale', 1))

const browser = await chromium.launch({ channel: 'chrome' })
try {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor })

  if (has('auth')) {
    await ctx.addInitScript(() => {
      localStorage.setItem('access_token', 'preview-token')
      localStorage.setItem('refresh_token', 'preview-token')
      localStorage.setItem('auth_email', 'preview@local')
    })
  }

  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch((e) => {
    console.error('goto 警告:', e.message) // 后端不在时 networkidle 仍会因失败请求触发，不阻断
  })
  await page.waitForTimeout(500)

  const typed = flag('type', '')
  if (typed) {
    await page.locator('textarea').first().fill(typed)
    await page.waitForTimeout(400) // 等过渡落定
  }

  const clip = flag('clip', '')
  const opts = has('full')
    ? { path: out, fullPage: true }
    : clip
      ? { path: out, clip: Object.fromEntries(['x', 'y', 'width', 'height'].map((k, i) => [k, Number(clip.split(',')[i])])) }
      : { path: out }

  await page.screenshot(opts)
  console.log(`截图 → ${out}  (${url}${typed ? `, typed: ${JSON.stringify(typed)}` : ''})`)
} finally {
  await browser.close()
}
