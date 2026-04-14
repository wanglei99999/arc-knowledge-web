# 02 — SSE 流式输出

## 什么是 SSE

SSE（Server-Sent Events）是服务端向客户端推送数据的协议。
后端 `/chat` 接口返回 `text/event-stream`，每生成一个 token 就推一行：

```
data: {"delta": "你"}
data: {"delta": "好"}
data: {"delta": "，"}
data: {"delta": "有什么可以帮助你"}
data: [DONE]
```

前端的任务是：**边接收边把 delta 拼起来，实时渲染到界面上**。

---

## 为什么不用 EventSource

`EventSource` 是浏览器内置的 SSE 客户端，但有一个致命问题：
**只支持 GET 请求**，不能发送请求体。

我们的 `/chat` 是 `POST`（需要传 query、session_id 等参数），所以必须用 `fetch` + `ReadableStream`。

---

## 核心实现原理

```
fetch POST /chat
  → response.body (ReadableStream)
  → getReader()
  → 循环 reader.read()
  → 每次拿到一个 Uint8Array chunk
  → TextDecoder 解码成字符串
  → 按换行切割，找 "data: " 开头的行
  → 解析 JSON，取 delta 字段
  → 拼接到消息内容，触发响应式更新
```

---

## sse.ts 工具函数

```typescript
// utils/sse.ts

interface SSEOptions {
  url: string
  body: Record<string, unknown>
  headers?: Record<string, string>
  onDelta: (delta: string) => void   // 每收到一个 token 回调
  onDone?: () => void                // 流结束回调
  onError?: (err: Error) => void     // 错误回调
  signal?: AbortSignal               // 用于停止生成
}

export async function streamChat(options: SSEOptions): Promise<void> {
  const { url, body, headers, onDelta, onDone, onError, signal } = options

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': 'default',
      ...headers,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (!response.body) throw new Error('No response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''     // 最后一行可能不完整，留到下次

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone?.(); return }
      try {
        const { delta } = JSON.parse(data)
        if (delta) onDelta(delta)
      } catch { /* 忽略解析失败的行 */ }
    }
  }
}
```

---

## 在 Chat Store 里怎么用

```typescript
// stores/chat.ts

const controller = ref<AbortController | null>(null)

async function sendMessage(query: string) {
  // 1. 把用户消息加入列表
  messages.value.push({ role: 'user', content: query })

  // 2. 创建空的 AI 消息占位
  const aiMsg = reactive({ role: 'assistant', content: '', citations: [] })
  messages.value.push(aiMsg)
  isStreaming.value = true

  // 3. 创建 AbortController（用于停止生成）
  controller.value = new AbortController()

  try {
    await streamChat({
      url: `${baseURL}/chat`,
      body: { query, session_id: currentSessionId.value, space_id: 'default' },
      onDelta: (delta) => { aiMsg.content += delta },  // 响应式，自动触发渲染
      onDone:  () => { isStreaming.value = false },
      signal:  controller.value.signal,
    })
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      aiMsg.content = '生成失败，请重试'
    }
    isStreaming.value = false
  }
}

function stopGeneration() {
  controller.value?.abort()
}
```

---

## 停止生成按钮

用户点击"停止"时调用 `controller.abort()`，fetch 会抛出 `AbortError`，我们在 catch 里判断是 AbortError 就静默处理，不报错。

---

## Markdown 渲染时机

流式输出过程中，`aiMsg.content` 在不断增长。
直接用 `md-editor-v3` 的预览模式，它会响应式地重新渲染，无需额外处理。

代码块在流式过程中可能渲染不完整（``` 还没闭合），这是正常现象，流结束后会自动修正。
