# 多会话聊天运行时设计

## 目标

聊天任务不再依附当前页面。用户切换到其他会话后，原会话的上传、入库轮询和回答流继续执行；后台会话完成或失败时，侧栏分别显示蓝点或红点。

## 状态分层

- 后端状态：附件的 `status`、本轮的 `readiness` 和 `processing_status` 仍是事实来源。
- Vue 响应式状态：消息、本轮、草稿、是否流式以及未读通知均按 `session_id` 分桶。
- 非响应式运行时：每个会话独立保存轮询定时器、轮询锁、SSE 取消函数、回答启动锁和本地 `File`。
- `localStorage`：仅保存草稿、未读通知和待恢复的 `turn_id`；不保存 `File`、计时器、SSE 或消息正文。

## 关键规则

1. 同一会话串行：上一轮仍在上传、入库或回答时禁止再次发送，但输入框可以继续编辑草稿。
2. 不同会话并行：切换会话不取消原会话运行时，新会话可以独立发送。
3. `waiting_files + ready` 时只启动一次回答；`answering` 只轮询，避免刷新后重复请求回答。
4. 非当前会话 `completed` 显示蓝点，失败或阻塞显示红点；打开该会话即清除。
5. 刷新后根据持久化的 `turn_id` 恢复轮询。浏览器关闭会终止请求中的 SSE，但不会终止后端已启动的文档入库工作流。

## 文件边界

- `src/stores/chat.ts`：管理按会话分桶的响应式状态、运行时和持久化。
- `src/stores/chat.test.ts`：验证跨会话并发、会话内串行、通知和恢复行为。
- `src/components/layout/SessionNotificationDot.vue`：只负责把通知状态渲染成可访问的蓝/红点。
- `src/components/layout/SessionNotificationDot.test.ts`：验证用户可见的颜色语义和文本语义。
- `src/components/layout/AppSidebar.vue`：在会话行接入通知点，不承载业务状态机。

## 验证

先运行新增的 Store 和通知点测试，再运行全部 Vitest 测试及 `npm run build`。不在本任务中提交 Git。
