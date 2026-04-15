# arc-knowledge-web

ArcKnowledge 知识库管理平台前端，基于 Vue 3 + TypeScript 构建。

## 功能页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 概览大屏 | `/` | 统计卡片、7 天对话趋势图、最近入库记录、知识空间列表 |
| 文档管理 | `/documents` | 拖拽上传、文档列表、切片预览、删除文档 |
| 智能问答 | `/chat` | 会话管理、流式对话、Markdown 渲染、引用溯源 |
| 检索调试 | `/search` | 向量 / 全文 / 混合检索，查看各路召回分数明细 |

## 技术栈

- **框架**：Vue 3 + TypeScript + Vite 5
- **样式**：Tailwind CSS + shadcn-vue（`cn()` 工具函数）
- **组件库**：ant-design-vue 4（Table、Upload、Drawer、Modal 等复杂组件）
- **状态管理**：Pinia
- **路由**：Vue Router 4
- **HTTP**：Axios（统一 baseURL、X-Tenant-Id 注入）
- **图表**：ECharts 5 + vue-echarts（按需引入）
- **Markdown**：md-editor-v3 MdPreview（AI 回复渲染）
- **图标**：lucide-vue-next

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 3000）
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
├── api/            # 接口封装（document.ts / chat.ts）
├── components/
│   ├── chat/       # SessionList / MessageBubble / CitationCard / ChatInput
│   ├── document/   # UploadZone / StatusBadge
│   └── layout/     # AppLayout / AppSidebar / AppHeader
├── stores/         # Pinia store（app / chat）
├── types/          # TypeScript 类型定义
├── utils/          # http.ts（Axios 封装）/ sse.ts（流式输出）
└── views/
    ├── dashboard/  # 概览大屏
    ├── document/   # 文档管理
    ├── chat/       # 智能问答
    └── search/     # 检索调试
```

## 后端依赖

本项目配套后端为 [arc-knowledge-ai](https://github.com/wanglei99999/arc-knowledge-ai)（Python FastAPI）。

| 页面/模块 | 状态 | 接口 |
|----------|------|------|
| 文档管理 | ✅ 已对接 | `GET/POST/DELETE /documents` |
| 智能问答 | ✅ 已对接 | `GET/POST/DELETE /sessions`、`POST /chat`（SSE） |
| 检索调试 | ✅ 已对接 | `GET /search` |
| 概览大屏 | ⏳ Mock 数据 | 待后端提供统计接口 |
