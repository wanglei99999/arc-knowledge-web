# Multi-session Chat Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让上传、入库与回答在切换会话后继续运行，并用持久化蓝/红点提示后台结果。

**Architecture:** `chat` Store 把界面状态按 `session_id` 分桶，并用独立的 `Map<string, SessionRuntime>` 保存不可序列化的计时器、SSE 和 `File`。侧栏只消费 Store 暴露的通知查询，不理解聊天状态机。

**Tech Stack:** Vue 3、Pinia、TypeScript、Vitest、Vue Test Utils、Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-08-30-multi-session-chat-runtime-design.md`

## Global Constraints

- 切换会话不得取消其他会话的上传、轮询或 SSE。
- 同一会话忙碌时不能再次发送，但草稿仍可写入。
- 未经用户明确要求不得提交 Git。
- 不修改现有 `src/auto-imports.d.ts` 与 `src/components.d.ts` 假变更。

---

### Task 1: 按会话隔离普通聊天运行时

**Files:**
- Create: `src/stores/chat.test.ts`
- Modify: `src/stores/chat.ts`

**Interfaces:**
- Produces: `messagesBySession`、`draftsBySession`、`isSessionBusy(sessionId)`、`setDraft(sessionId, value)`。
- Preserves: 页面现有的 `messages`、`isStreaming`、`sendMessage()` 和 `stopGeneration()` 调用方式。

- [ ] **Step 1: Write the failing tests** — 验证切换会话不停止 A 的流、A/B 消息互不污染、同会话忙时拒绝二次发送而其他会话可发送。
- [ ] **Step 2: Run tests to verify RED** — `npm run test -- src/stores/chat.test.ts`，应因缺少按会话状态而失败。
- [ ] **Step 3: Implement minimal per-session state** — 用响应式 record 保存消息和流状态，用运行时 Map 保存每个会话的取消函数。
- [ ] **Step 4: Run tests to verify GREEN** — 同一命令应通过。

### Task 2: 接入附件本轮状态机与恢复

**Files:**
- Modify: `src/stores/chat.test.ts`
- Modify: `src/stores/chat.ts`

**Interfaces:**
- Produces: `submitTurn(content, files)`、`activeTurn`、`turnsBySession`、`resumePendingTurns()`。
- Consumes: `createChatTurn()`、`uploadTurnAttachment()`、`getChatTurn()`、`streamTurnAnswer()`。

- [ ] **Step 1: Write the failing tests** — 验证附件声明与上传、轮询变为 ready 后恰好启动一次回答、answering 恢复时不重复回答。
- [ ] **Step 2: Run tests to verify RED** — 聚焦 Store 测试，确认缺失接口导致预期失败。
- [ ] **Step 3: Implement upload/poll/answer lifecycle** — 每会话独立轮询锁与回答锁，完成或终态时清理运行时。
- [ ] **Step 4: Run tests to verify GREEN** — 聚焦 Store 测试全部通过。

### Task 3: 持久化草稿、待恢复本轮及未读通知

**Files:**
- Modify: `src/stores/chat.test.ts`
- Modify: `src/stores/chat.ts`

**Interfaces:**
- Produces: `sessionNotification(sessionId)`、`clearSessionNotification(sessionId)`。
- Persists: tenant/user 作用域下的 drafts、notifications、pendingTurns。

- [ ] **Step 1: Write the failing tests** — 验证后台成功蓝点、失败红点、打开清除以及新 Store 实例从 localStorage 恢复。
- [ ] **Step 2: Run tests to verify RED** — 聚焦 Store 测试，确认通知和恢复尚不存在。
- [ ] **Step 3: Implement validated persistence** — 只读写可序列化状态，损坏 JSON 安全回退。
- [ ] **Step 4: Run tests to verify GREEN** — 聚焦 Store 测试全部通过。

### Task 4: 侧栏通知点

**Files:**
- Create: `src/components/layout/SessionNotificationDot.vue`
- Create: `src/components/layout/SessionNotificationDot.test.ts`
- Modify: `src/components/layout/AppSidebar.vue`

**Interfaces:**
- Consumes: `SessionNotification = 'completed_unread' | 'failed_unread'`。
- Produces: 蓝色完成点、红色失败点及读屏文本。

- [ ] **Step 1: Write the failing component test** — 蓝/红状态必须分别暴露“已完成/处理失败”的可访问标签。
- [ ] **Step 2: Run test to verify RED** — 测试因组件不存在而失败。
- [ ] **Step 3: Implement component and sidebar integration** — 会话标题后、删除按钮前渲染状态点。
- [ ] **Step 4: Run focused tests to verify GREEN** — Store 与组件测试均通过。

### Task 5: 全量验证

**Files:**
- Verify only.

- [ ] **Step 1: Run all unit tests** — `npm run test`。
- [ ] **Step 2: Run typecheck and production build** — `npm run build`。
- [ ] **Step 3: Review diff and Git status** — 确认只包含 Task 08 文件和原有两个假变更，不提交。
