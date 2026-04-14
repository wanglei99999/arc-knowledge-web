# 01 — API 层设计

## 为什么要封装 Axios

直接用 `axios.get(url)` 的问题：
- 每个请求都要手动带 Header（`X-Tenant-Id`）
- 错误处理逻辑散落各处
- baseURL 写死在业务代码里

封装后只需关心"调什么接口、传什么参数、拿什么数据"。

---

## 封装结构

```
utils/http.ts     ← Axios 实例 + 拦截器
api/document.ts   ← 文档相关接口
api/chat.ts       ← 问答 + 会话接口
api/stats.ts      ← 统计数据接口
```

---

## http.ts 核心逻辑

```typescript
// 1. 创建实例，固定 baseURL 和超时时间
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30_000,
})

// 2. 请求拦截：自动注入租户 Header
http.interceptors.request.use((config) => {
  config.headers['X-Tenant-Id'] = useAppStore().tenantId  // 从 Pinia 读
  return config
})

// 3. 响应拦截：统一处理错误
http.interceptors.response.use(
  (res) => res.data,           // 直接返回 data，业务层不用 .data.data
  (error) => {
    const msg = error.response?.data?.detail ?? '请求失败'
    // 全局 Toast 提示
    message.error(msg)
    return Promise.reject(error)
  }
)
```

---

## 接口定义规范

每个模块一个文件，函数命名用动词：

```typescript
// api/document.ts
export const uploadDocument = (file: File, spaceId: string) => ...
export const listDocuments   = (spaceId: string) => ...
export const deleteDocument  = (documentId: string) => ...
export const getDocument     = (documentId: string) => ...

// api/chat.ts
export const listSessions    = () => ...
export const createSession   = () => ...
export const deleteSession   = (sessionId: string) => ...
export const getMessages     = (sessionId: string) => ...
// 注意：sendMessage 走 SSE，不走这里，在 utils/sse.ts 里单独处理

// api/stats.ts
export const getDashboardStats = () => ...
export const getIngestionLogs  = (limit?: number) => ...
```

---

## 文件上传的特殊处理

文件上传需要 `multipart/form-data`，Axios 会自动处理，但要正确构造 FormData：

```typescript
export const uploadDocument = (file: File, spaceId: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('space_id', spaceId)
  return http.post<DocumentVO>('/documents/upload', form)
  // 注意：不要手动设置 Content-Type，让浏览器自动带 boundary
}
```

---

## 类型定义位置

所有接口的请求/响应类型定义在 `types/` 目录：

```typescript
// types/document.ts
export interface DocumentVO {
  id: string
  original_name: string
  mime_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunk_count: number
  error_message: string | null
  created_at: string
}
```

业务组件直接 import 类型，不在组件内重复定义。
