# ArcKnowledge Web — 学习文档

按顺序阅读，每篇文档对应一个核心概念或模块。
建议先读完 00（架构全貌），再按需深入某个模块。

---

## 阅读顺序

### Phase 1（v1.0）— 脚手架 + 布局框架

| 编号 | 文档 | 核心问题 | 对应代码 |
|------|------|---------|---------|
| [00](./00-overview.md) | 架构全貌 | 前端整体是怎么组织的？和后端怎么对接？ | `src/` 全局 |
| [01](./01-api-layer.md) | API 层设计 | Axios 怎么封装？接口怎么统一管理？ | `src/api/` + `src/utils/http.ts` |
| [02](./02-sse-streaming.md) | SSE 流式输出 | 流式对话怎么接收？token 逐字渲染怎么做？ | `src/utils/sse.ts` + `src/stores/chat.ts` |
| [03](./03-state-management.md) | 状态管理 | Pinia Store 怎么设计？会话状态怎么管理？ | `src/stores/` |

---

## Phase 进度

| Phase | 版本 | 状态 | 说明 |
|-------|------|------|------|
| Phase 1 | v1.0 | 📋 待实现 | 脚手架 + AppLayout + 路由 |
| Phase 2 | v2.0 | 📋 待实现 | 文档管理页 |
| Phase 3 | v3.0 | 📋 待实现 | 智能问答页（SSE 流式）|
| Phase 4 | v4.0 | 📋 待实现 | 概览大屏 |
