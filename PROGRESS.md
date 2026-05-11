# ArcKnowledge Web — 开发进度

> 每个 Phase 完成后更新此文件。

---

## Phase 1：脚手架 + 布局框架 ✅ 已实现

**目标**：搭建项目骨架，跑通路由与整体布局，能在浏览器看到完整的导航结构。

- [x] 项目初始化（Vite + Vue 3 + TypeScript）
- [x] Tailwind CSS + shadcn-vue 接入
- [x] ant-design-vue 按需引入
- [x] AppLayout（深色侧边栏 + 顶栏）
- [x] Vue Router 路由配置（四个页面）
- [x] Axios 封装（统一 baseURL、错误拦截）
- [x] Pinia 初始化（app store）
- [x] .env 环境变量配置

---

## Phase 2：文档管理页 ✅ 已实现

**目标**：能上传文档、查看入库状态、预览切片、删除文档。

- [x] 文档列表接口对接（`GET /documents`）
- [x] 拖拽上传区组件（支持多文件、进度条）
- [x] 文档列表 Table（文件名 / 格式 / 切片数 / 状态 / 操作）
- [x] 状态 Badge（处理中 / 成功 / 失败）
- [x] 切片预览抽屉（点击文档名展开）
- [x] 删除确认弹窗
- [x] 上传成功 / 失败 Toast 提示

---

## Phase 3：智能问答页 ✅ 已对接真实后端

**目标**：能创建会话、流式对话、查看引用溯源。

- [x] 会话列表（`GET /sessions` 真实接口）
- [x] 新建 / 删除会话（`POST /DELETE /sessions`）
- [x] 消息气泡组件（用户 / AI 区分）
- [x] SSE 流式输出（`fetch + ReadableStream`，对接 `POST /chat`）
- [x] Markdown 渲染 + 代码高亮（md-editor-v3 MdPreview）
- [x] 引用溯源折叠卡片（来源文档 + 切片编号 + 相关度 + 原文片段）
- [x] 停止生成按钮（AbortController）
- [x] chat store（会话列表、流式消息状态）

---

## Phase 2.5：检索调试页 ✅ 已对接真实后端

**目标**：验证向量 / 全文 / 混合召回效果，展示召回分数。

- [x] 查询输入框（Enter 快捷搜索）
- [x] 检索模式选择（混合 / 向量 / 全文，UI 保留）
- [x] Top-K 参数控制
- [x] 结果卡片（排名 / 文档 ID / 切片位置 / 相关度进度条）
- [x] 展开查看：切片原文 + 来源 badge（向量检索 / 关键词检索）
- [x] 对接后端 `GET /search`，合并 hits + chunks

---

## Phase 4：概览大屏 ✅ 已实现（Mock 数据）

**目标**：展示平台核心指标，让管理员一眼掌握系统状态。保留 Mock 数据用于演示，真实数据由 /admin 页承载（见 ADR-044）。

- [x] 4 个统计卡片（文档数 / 切片数 / 对话数 / 存储量，Mock）
- [x] 7 天对话趋势折线图（ECharts + vue-echarts，Mock）
- [x] 入库任务最近记录列表
- [x] 知识空间卡片列表

---

## Phase 5：Admin 管理页 ✅ 已实现（真实数据）

**目标**：运营管理入口，展示真实系统数据，提供模型定价和租户配置管理。

- [x] `src/api/admin.ts`：Admin API 函数层（getAdminStats / getTenantUsage / listModelConfigs / upsertModelConfig / deleteModelConfig / getTenantConfig / updateTenantConfig）
- [x] 顶部真实统计卡片（文档数 / 切片数 / 会话数 / 存储量，对接 `GET /admin/stats`）
- [x] 7 天 Token 消耗趋势图（对接 `GET /admin/tenants/{id}/usage?group_by=day`）
- [x] 模型定价 CRUD（表格展示 + 新增弹窗 + 删除确认）
- [x] 租户 LLM 配置表单（provider 下拉 + model 输入 + allowed_models 标签）
- [x] 侧边栏"管理配置"导航入口，路由 `/admin`
