// Mock SSE streaming — simulates character-by-character LLM output.
// Replace body of streamChat with real fetch + ReadableStream when backend is ready.

import type { Citation } from '@/types/chat'

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: (fullText: string, citations: Citation[]) => void
  onError: (err: Error) => void
}

const MOCK_ANSWERS = [
  `根据知识库中的文档，我找到了以下相关信息：\n\n## 回答\n\n这是一个基于 **RAG（检索增强生成）** 技术的智能问答系统。系统会：\n\n1. 对您的问题进行**语义理解**和向量化\n2. 从知识库中检索最相关的文档片段\n3. 结合上下文生成准确的回答\n\n如需了解更多细节，可以查看下方的引用来源。`,
  `感谢您的提问！\n\n根据知识库检索结果，相关内容如下：\n\n> 系统架构采用了**双服务设计**，包括 arc-knowledge-ai（后端）和 arc-knowledge-web（前端），两者通过 REST API 和 SSE 流式接口通信。\n\n### 技术栈\n\n| 层次 | 技术 |\n|------|------|\n| 前端 | Vue 3 + TypeScript + Vite |\n| 后端 | Python FastAPI |\n| 向量库 | Milvus |\n| 全文检索 | Elasticsearch |\n| 数据库 | PostgreSQL |\n\n以上是系统的核心组成部分。`,
  `这是个很好的问题！根据知识库中的内容：\n\n文档处理流程分为以下几个阶段：\n\n\`\`\`\n上传 → 解析 → 切片 → Embedding → 存储（Milvus + ES + PostgreSQL）\n\`\`\`\n\n每个阶段都有对应的状态追踪，您可以在文档管理页面查看实时处理状态。\n\n如果文档处理失败，系统会记录错误原因，方便排查问题。`,
]

const MOCK_CITATIONS: Citation[] = [
  {
    doc_id: 'doc-1',
    doc_name: '系统架构设计文档.pdf',
    chunk_index: 5,
    content: '系统采用双服务架构，前端使用 Vue 3，后端使用 Python FastAPI，通过 REST API 和 SSE 流式接口通信。文档处理流水线包含解析、切片、向量化三个阶段。',
    score: 0.91,
  },
  {
    doc_id: 'doc-2',
    doc_name: 'API接口文档.md',
    chunk_index: 2,
    content: '问答接口支持 SSE 流式输出，客户端通过 fetch + ReadableStream 接收流式 token，每个 data 事件携带一个 JSON chunk。',
    score: 0.85,
  },
]

export function streamChat(
  _sessionId: string,
  _question: string,
  callbacks: StreamCallbacks,
): () => void {
  const fullText = MOCK_ANSWERS[Math.floor(Math.random() * MOCK_ANSWERS.length)]
  let charIndex = 0
  let stopped = false

  const intervalId = setInterval(() => {
    if (stopped) return

    if (charIndex >= fullText.length) {
      clearInterval(intervalId)
      const citations = Math.random() > 0.3 ? MOCK_CITATIONS.slice(0, 2) : []
      callbacks.onDone(fullText, citations)
      return
    }

    // Push 3 characters per tick (~100 chars/sec at 30ms interval)
    const chunk = fullText.slice(charIndex, charIndex + 3)
    charIndex += 3
    callbacks.onChunk(chunk)
  }, 30)

  return () => {
    stopped = true
    clearInterval(intervalId)
  }
}
