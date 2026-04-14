# 00 — 架构全貌

## 系统位置

```
knowledge_base/
├── arc-knowledge-ai/     ← Python 后端（FastAPI + RAG）
├── arc-knowledge-web/    ← 本项目：Vue 3 前端
└── docs/                 ← 系统设计文档
```

前端是后端的唯一用户界面，所有数据通过 HTTP / SSE 接口获取，不直接访问数据库。

---

## 技术栈

```
Vue 3 + TypeScript + Vite 5
├── UI 基础层：shadcn-vue + Tailwind CSS
│   └── 高度可定制，每个组件源码在项目内，改到像素级别
├── 复杂组件：ant-design-vue 4.x
│   └── Table（排序/筛选/分页）、Upload（进度条）、Form
├── 状态管理：Pinia
├── 路由：Vue Router 4
├── 图表：Apache ECharts
├── HTTP 客户端：Axios（统一封装）
├── Markdown 渲染：md-editor-v3
├── 图标：lucide-vue-next
└── SSE 流式：原生 fetch stream（不用 EventSource）
```

---

## 整体布局结构

```
┌─────────────────────────────────────────────────────┐
│  AppSidebar（240px，深色）  │   AppHeader（顶栏）    │
│                             ├───────────────────────│
│  🏠 概览                    │                       │
│  📄 文档管理                │   <router-view />     │
│  💬 智能问答                │   （页面内容区）       │
│  🔍 检索调试                │                       │
│                             │                       │
└─────────────────────────────────────────────────────┘
```

---

## 页面结构

| 路由 | 页面 | 对应后端接口 |
|------|------|------------|
| `/` | 概览大屏 | `GET /admin/stats`（待补充）|
| `/documents` | 文档管理 | `POST /documents/upload` `GET /documents` `DELETE /documents/:id` |
| `/chat` | 智能问答 | `POST /chat`（SSE）`GET /sessions` `POST /sessions` |
| `/search` | 检索调试 | `GET /search` |

---

## 与后端的对接约定

**Base URL**：从 `.env` 读取
```
VITE_API_BASE_URL=http://localhost:8000
```

**请求头**：MVP 阶段硬编码租户（后期接 JWT）
```
X-Tenant-Id: default
```

**SSE 流式**：`POST /chat` 返回 `text/event-stream`
```
data: {"delta": "你"}
data: {"delta": "好"}
data: [DONE]
```
前端用 `fetch` + `ReadableStream` 逐行解析，不用 `EventSource`（EventSource 不支持 POST）。

---

## 目录结构

```
src/
├── api/                  # 接口定义（按模块拆分）
│   ├── document.ts       # 文档相关
│   ├── chat.ts           # 问答 + 会话
│   └── stats.ts          # 统计数据
├── components/           # 公共组件
│   ├── layout/           # AppLayout / AppSidebar / AppHeader
│   ├── document/         # UploadZone / DocumentCard / StatusBadge
│   ├── chat/             # SessionList / MessageBubble / CitationCard / ChatInput
│   └── dashboard/        # StatCard / TrendChart
├── views/                # 页面
│   ├── dashboard/
│   ├── document/
│   └── chat/
├── stores/               # Pinia
│   ├── app.ts            # 全局状态（tenant_id、侧边栏）
│   └── chat.ts           # 会话列表、流式消息
├── router/               # 路由配置
├── utils/
│   ├── http.ts           # Axios 封装
│   ├── sse.ts            # SSE 流式解析
│   └── format.ts         # 文件大小、时间格式化
└── types/                # TypeScript 类型定义
    ├── document.ts
    ├── chat.ts
    └── stats.ts
```

---

## 设计风格

```
背景色：
  侧边栏  #0F0F0F（深黑）
  内容区  #FAFAFA（浅灰白）
  卡片    #FFFFFF

主色调：靛蓝 #6366F1
状态色：
  成功  #22C55E（绿）
  处理中 #3B82F6（蓝）
  失败  #EF4444（红）

圆角：卡片 12px，按钮 8px
阴影：0 1px 3px rgba(0,0,0,0.08)
字体：Inter + 思源黑体
```
