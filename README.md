# Incipit Web

Incipit 知识库管理平台前端，基于 Vue 3 + TypeScript 构建。仓库名 `arc-knowledge-web` 作为历史工程名继续保留。

## 功能页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 概览大屏 | `/` | 统计卡片、7 天对话趋势图、最近入库记录、知识空间列表 |
| 文档管理 | `/documents` | 拖拽上传、文档列表、切片预览、删除文档 |
| 智能问答 | `/chat` | 会话管理、流式对话、Markdown 渲染、引用溯源 |
| 检索调试 | `/search` | 向量 / 全文 / 混合检索，查看各路召回分数明细 |
| 管理配置 | `/admin` | 真实统计、Token 用量、模型定价与租户 LLM 配置 |
| 归档会话 | `/settings/archived-chats` | 按知识空间查找、筛选和恢复归档会话 |

## 技术栈

- **框架**：Vue 3 + TypeScript + Vite 5
- **样式**：Tailwind CSS + shadcn-vue（`cn()` 工具函数）
- **组件库**：ant-design-vue 4（Table、Upload、Drawer、Modal 等复杂组件）
- **状态管理**：Pinia
- **路由**：Vue Router 4
- **HTTP**：Axios（统一 baseURL、Bearer Token、自动刷新认证与开发租户上下文）
- **图表**：ECharts 5 + vue-echarts（按需引入）
- **Markdown**：md-editor-v3 MdPreview（AI 回复渲染）
- **图标**：lucide-vue-next

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 3300）
npm run dev

# 构建
npm run build
```

开发服务器会将 `/api/*` 请求代理到 `http://localhost:8000`（arc-knowledge-ai 后端）。

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

```bash
cp .env.example .env
```

## 项目结构

```
src/
├── api/            # 接口封装（auth / document / chat / search / spaces / admin）
├── components/
│   ├── chat/       # SessionList / MessageBubble / CitationCard / ChatInput
│   ├── document/   # UploadZone / StatusBadge
│   └── layout/     # AppLayout / AppSidebar / AppHeader
├── stores/         # Pinia store（app / auth / chat / archive / spaces）
├── types/          # TypeScript 类型定义
├── utils/          # http.ts（Axios 封装）/ sse.ts（流式输出）
└── views/
    ├── auth/       # 登录与注册
    ├── dashboard/  # 概览大屏（演示数据）
    ├── document/   # 文档管理
    ├── chat/       # 智能问答
    ├── search/     # 检索调试
    ├── admin/      # 管理配置与真实运营数据
    └── settings/   # 用户设置与归档会话
```

## 后端依赖

本项目配套后端为 [arc-knowledge-ai](https://github.com/wanglei99999/arc-knowledge-ai)（Python FastAPI）。

| 页面/模块 | 状态 | 接口 |
|----------|------|------|
| 文档管理 | ✅ 已对接 | `GET/POST/DELETE /documents` |
| 智能问答 | ✅ 已对接 | `/sessions`、`POST /chat`、`/chat/turns`（SSE + 附件生命周期） |
| 检索调试 | ✅ 已对接 | `GET /search`、`POST /search/debug` |
| 管理配置 | ✅ 已对接 | `/admin/stats`、租户用量、模型定价与租户配置接口 |
| 会话归档 | ✅ 已对接 | `/sessions/archived`、归档、恢复、置顶与重命名接口 |
| 概览大屏 | 🎭 演示数据 | 有意保留 Mock 展示；真实统计统一在 `/admin` 页面呈现 |

## 当前质量状态

截至 2026-09-04：

- `npm run test`：14 个测试文件、102 个测试通过。
- `npm run build`：Vue TypeScript 检查与 Vite 生产构建通过。
- GitHub Actions 会执行单元测试、Chromium Playwright 回归、生产构建和镜像校验。
- Playwright 当前主要覆盖 Mock API 下的会话归档和置顶；真实后端的上传 → 入库 → 检索 → 回答 → 引用仍是后续自动化收口项。
