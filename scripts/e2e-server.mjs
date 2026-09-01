import { createServer } from 'vite'

const server = await createServer({
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
})

let closing = false

function close() {
  if (closing) return
  closing = true
  const forceExit = setTimeout(() => process.exit(0), 500)
  void server.close().then(() => {
    clearTimeout(forceExit)
    process.exit(0)
  })
}

process.once('SIGINT', close)
process.once('SIGTERM', close)
process.once('message', close)

await server.listen()
server.printUrls()
