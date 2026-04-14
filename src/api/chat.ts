// Mock implementation — replace with real HTTP calls when backend is ready
import type { SessionVO, MessageVO } from '@/types/chat'

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

const MOCK_SESSIONS: SessionVO[] = [
  {
    id: 'session-1',
    title: 'Vue 3 Composition API 介绍',
    created_at: '2026-04-14T10:00:00Z',
    updated_at: '2026-04-14T10:05:00Z',
    message_count: 4,
  },
  {
    id: 'session-2',
    title: 'Pinia 状态管理使用方式',
    created_at: '2026-04-14T11:00:00Z',
    updated_at: '2026-04-14T11:10:00Z',
    message_count: 2,
  },
]

const MOCK_MESSAGES: Record<string, MessageVO[]> = {
  'session-1': [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Vue 3 的 Composition API 和 Options API 有什么区别？',
      created_at: '2026-04-14T10:00:00Z',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: `## Composition API vs Options API\n\nVue 3 的 **Composition API** 和 **Options API** 是两种组织组件逻辑的方式：\n\n### Options API\n- 按选项类型（data、methods、computed）组织代码\n- 适合简单组件，易于上手\n\n### Composition API\n- 按逻辑功能组织代码，使用 \`setup()\` 或 \`<script setup>\`\n- 更好的代码复用（Composables）\n- 完整的 TypeScript 支持\n\n\`\`\`ts\n// Composition API 示例\nconst count = ref(0)\nconst doubled = computed(() => count.value * 2)\n\`\`\``,
      created_at: '2026-04-14T10:01:00Z',
      citations: [
        {
          doc_id: 'doc-1',
          doc_name: 'Vue3官方文档.pdf',
          chunk_index: 3,
          content: 'Composition API 是一组 API，允许我们使用导入的函数而不是声明选项的方式书写 Vue 组件，让逻辑复用和代码组织更加灵活。',
          score: 0.92,
        },
      ],
    },
    {
      id: 'msg-3',
      role: 'user',
      content: '什么时候应该使用 Composables？',
      created_at: '2026-04-14T10:03:00Z',
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: `## 何时使用 Composables\n\nComposables 适合以下场景：\n\n1. **逻辑复用** — 多个组件共享相同的状态逻辑\n2. **关注点分离** — 将复杂组件拆分为独立的逻辑单元\n3. **功能组合** — 组合多个小 Composable 构建复杂功能\n\n例如 \`useMousePosition\`、\`useFetch\`、\`useDebounce\` 等都是典型的 Composable。`,
      created_at: '2026-04-14T10:05:00Z',
      citations: [
        {
          doc_id: 'doc-1',
          doc_name: 'Vue3官方文档.pdf',
          chunk_index: 12,
          content: 'Composable 是一个利用 Vue 组合式 API 来封装和复用有状态逻辑的函数，本质上是将 setup() 中的逻辑提取到独立文件中。',
          score: 0.88,
        },
      ],
    },
  ],
  'session-2': [
    {
      id: 'msg-5',
      role: 'user',
      content: 'Pinia 和 Vuex 有什么不同？',
      created_at: '2026-04-14T11:00:00Z',
    },
    {
      id: 'msg-6',
      role: 'assistant',
      content: `## Pinia vs Vuex\n\n**Pinia** 是 Vue 官方推荐的状态管理库，相比 Vuex 有以下优势：\n\n- 更简单的 API，**无需 mutations**\n- 完整的 TypeScript 支持（无需类型声明补丁）\n- 模块自动拆分，无需嵌套模块\n- 轻量级（约 1KB）\n\n\`\`\`ts\nexport const useCounterStore = defineStore('counter', () => {\n  const count = ref(0)\n  function increment() { count.value++ }\n  return { count, increment }\n})\n\`\`\``,
      created_at: '2026-04-14T11:02:00Z',
      citations: [
        {
          doc_id: 'doc-2',
          doc_name: 'Pinia官方文档.md',
          chunk_index: 1,
          content: 'Pinia 是 Vue 的专属状态管理库，它允许你跨组件或页面共享状态，是 Vuex 的官方替代品。',
          score: 0.95,
        },
      ],
    },
  ],
}

export async function listSessions(): Promise<SessionVO[]> {
  await delay(300)
  return [...MOCK_SESSIONS]
}

export async function createSession(title = '新会话'): Promise<SessionVO> {
  await delay(200)
  const session: SessionVO = {
    id: `session-${Date.now()}`,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: 0,
  }
  MOCK_SESSIONS.unshift(session)
  MOCK_MESSAGES[session.id] = []
  return session
}

export async function deleteSession(id: string): Promise<void> {
  await delay(200)
  const idx = MOCK_SESSIONS.findIndex(s => s.id === id)
  if (idx !== -1) MOCK_SESSIONS.splice(idx, 1)
  delete MOCK_MESSAGES[id]
}

export async function listMessages(sessionId: string): Promise<MessageVO[]> {
  await delay(200)
  return [...(MOCK_MESSAGES[sessionId] ?? [])]
}
