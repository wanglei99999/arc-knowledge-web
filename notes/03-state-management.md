# 03 — 状态管理

## 为什么需要状态管理

组件树中有些数据需要跨层级共享：
- `tenant_id`：每个请求都要带，不能每个组件各自维护
- 当前会话 ID：ChatInput 发送消息，SessionList 要高亮当前项
- 流式状态 `isStreaming`：消息区、输入框、停止按钮都要感知

Pinia 把这些共享状态提到组件树之外统一管理。

---

## Store 划分

```
stores/
├── app.ts     # 全局应用状态
└── chat.ts    # 对话页状态
```

原则：**按页面 / 功能模块划分，不要把所有状态塞进一个 store**。

---

## app.ts — 全局状态

```typescript
// stores/app.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // MVP 阶段硬编码，后期接 JWT 登录后动态赋值
  const tenantId = ref('default')
  const userId   = ref('dev-user')

  // 侧边栏折叠状态（持久化到 localStorage）
  const sidebarCollapsed = ref(
    localStorage.getItem('sidebar-collapsed') === 'true'
  )

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed.value))
  }

  return { tenantId, userId, sidebarCollapsed, toggleSidebar }
})
```

---

## chat.ts — 对话状态

```typescript
// stores/chat.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SessionVO, MessageVO } from '@/types/chat'

export const useChatStore = defineStore('chat', () => {
  // 会话列表
  const sessions      = ref<SessionVO[]>([])
  const currentId     = ref<string | null>(null)
  const currentSession = computed(() =>
    sessions.value.find(s => s.session_id === currentId.value) ?? null
  )

  // 消息列表（当前会话）
  const messages    = ref<MessageVO[]>([])
  const isStreaming = ref(false)

  // 切换会话时加载消息
  async function selectSession(sessionId: string) {
    currentId.value = sessionId
    messages.value  = await fetchMessages(sessionId)   // 调 api/chat.ts
  }

  // 新建会话
  async function createSession() {
    const session = await apiCreateSession()
    sessions.value.unshift(session)
    await selectSession(session.session_id)
  }

  // 删除会话
  async function deleteSession(sessionId: string) {
    await apiDeleteSession(sessionId)
    sessions.value = sessions.value.filter(s => s.session_id !== sessionId)
    if (currentId.value === sessionId) {
      currentId.value = sessions.value[0]?.session_id ?? null
      messages.value  = []
    }
  }

  return {
    sessions, currentId, currentSession,
    messages, isStreaming,
    selectSession, createSession, deleteSession,
  }
})
```

---

## 数据流向图

```
用户点击"发送"
  → ChatInput 组件调用 chatStore.sendMessage(query)
  → chatStore 调用 utils/sse.ts 的 streamChat()
  → streamChat onDelta 回调 → messages 里最后一条 content 追加
  → Vue 响应式 → MessageBubble 自动重新渲染
  → streamChat onDone  → isStreaming = false
  → ChatInput 的发送按钮恢复可用
```

---

## 为什么不用 Vuex

Pinia 是 Vue 官方推荐的新一代状态管理库：
- 无 mutations，直接修改 state，代码更简洁
- TypeScript 支持更好，类型自动推断
- DevTools 支持完善
- Vuex 4 已进入维护模式，新项目统一用 Pinia

---

## 持久化

侧边栏折叠状态这类 UI 偏好需要持久化（刷新后保留）。
用 `localStorage` 直接存，不引入额外插件。

需要持久化的 store 字段不多，手动读写即可。
如果未来持久化字段多了，可以引入 `pinia-plugin-persistedstate`。
