import { spawn } from 'node:child_process'

const rootUrl = 'http://127.0.0.1:4173'
const server = spawn(process.execPath, ['scripts/e2e-server.mjs'], {
  stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
})

async function waitForServer() {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(rootUrl)
      if (response.ok) return
    } catch {
      // Vite 仍在启动。
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`E2E server did not become ready at ${rootUrl}`)
}

async function stopServer() {
  if (server.exitCode !== null) return
  server.send('close')
  await Promise.race([
    new Promise(resolve => server.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 2_000)),
  ])
  if (server.exitCode === null) server.kill()
}

let exitCode = 1
try {
  await waitForServer()
  const runner = spawn(
    process.execPath,
    ['node_modules/playwright/cli.js', 'test', ...process.argv.slice(2)],
    { stdio: 'inherit' },
  )
  exitCode = await new Promise(resolve => {
    runner.once('exit', code => resolve(code ?? 1))
  })
} finally {
  await stopServer()
}

process.exitCode = exitCode
