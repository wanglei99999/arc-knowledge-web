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

## Phase 3：智能问答页 ✅ 已实现（Mock 数据）

**目标**：能创建会话、流式对话、查看引用溯源。

- [x] 会话列表（Mock，待对接 `GET /sessions`）
- [x] 新建 / 删除会话
- [x] 消息气泡组件（用户 / AI 区分）
- [x] SSE 流式输出（Mock setTimeout，待对接真实 SSE）
- [x] Markdown 渲染 + 代码高亮（md-editor-v3 MdPreview）
- [x] 引用溯源折叠卡片（来源文档 + 原文片段）
- [x] 停止生成按钮
- [x] chat store（会话列表、流式消息状态）

---

## Phase 2.5：检索调试页 ✅ 已实现（Mock 数据）

**目标**：验证向量 / 全文 / 混合召回效果，展示各路分数明细。

- [x] 查询输入框（Enter 快捷搜索）
- [x] 检索模式选择（混合 / 向量 / 全文）
- [x] Top-K 参数控制
- [x] 结果卡片（排名 / 文档名 / 切片位置 / 相关度进度条）
- [x] 展开查看：切片原文 + 分数明细（向量分 / BM25 分 / RRF 融合分）
- [x] Mock 数据（6 条预置切片），待对接后端 `POST /search`

---

## Phase 4：概览大屏 ✅ 已实现（Mock 数据）

**目标**：展示平台核心指标，让管理员一眼掌握系统状态。

- [x] 4 个统计卡片（文档数 / 切片数 / 对话数 / 存储量）
- [x] 7 天对话趋势折线图（ECharts + vue-echarts）
- [x] 入库任务最近记录列表
- [x] 知识空间卡片列表
- [ ] 后端补充统计接口（待对接 arc-knowledge-ai）
