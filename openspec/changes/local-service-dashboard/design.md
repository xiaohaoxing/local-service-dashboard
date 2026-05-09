## Context

开发者本地通常同时运行多个服务（如 Vite Dev Server、API 后端、Jupyter Notebook、数据库 GUI 等），没有统一的管理入口。本项目是一个全新的本地工具，包含：
- **后端 API 服务**：管理服务注册表、执行端口扫描、暴露 MCP Server
- **前端导航站**：React SPA，展示和管理本地服务列表
- **MCP Server**：符合 Model Context Protocol 标准的服务端，让 AI 模型能感知本地服务

技术栈约束：使用 Bun 作为运行时，后端用 Hono 框架，前端用 React + Vite，数据持久化用 SQLite（通过 `bun:sqlite`）。

## Goals / Non-Goals

**Goals:**
- 自动扫描本地常用端口范围，识别并展示运行中的服务
- 提供 Web UI 手动管理（增删改）服务条目及元信息（名称、URL、描述、图标、标签）
- 提供 REST API 供前端使用
- 暴露 MCP Server（stdio + HTTP/SSE 两种传输），让 AI 工具能查询和管理服务列表

**Non-Goals:**
- 远程/云端服务管理（仅限本地 localhost）
- 服务进程生命周期管理（启动/停止服务不在范围内）
- 用户认证与权限控制（本地工具，无需多用户隔离）
- 实时日志聚合或监控

## Decisions

### 1. 单仓库 Monorepo（Bun Workspaces）

**选择**：`packages/backend`（Hono API + MCP Server）+ `packages/frontend`（React + Vite）共享一个 `bun.lockb`。

**理由**：减少工具链复杂度；Bun workspaces 原生支持；前后端类型可通过共享 `packages/shared` 复用。

**备选**：独立仓库——增加跨仓库同步成本，不采用。

### 2. 数据存储：SQLite via bun:sqlite

**选择**：使用 Bun 内置的 `bun:sqlite`，将服务注册表持久化到 `~/.local/share/local-service-dashboard/services.db`（遵循 XDG 规范）。

**理由**：无需额外依赖；支持 SQL 查询；比 JSON 文件更健壮，避免并发写冲突。

**备选**：JSON 文件——并发安全性差，不采用。

### 3. MCP 传输方式：同时支持 stdio 和 Streamable HTTP

**选择**：MCP Server 既支持 stdio 模式（用于 Claude Desktop 等客户端直接启动），也支持 HTTP/SSE（用于已运行的后端服务）。

**理由**：stdio 模式是 MCP 的标准接入方式，支持最广泛；HTTP 模式适合后端常驻服务场景。后端服务启动时自动在 `/mcp` 路径挂载 MCP HTTP 端点。

### 4. 端口扫描策略：分批并发 TCP 探测

**选择**：扫描 `1-9999` 端口（可配置），每批 100 个并发 TCP connect，超时 200ms，扫描完成后与注册表对比，标记已发现但未登记的服务。

**理由**：全端口顺序扫描太慢（~65s），分批并发可控制系统资源占用；200ms 超时在本地回环接口足够。

**备选**：使用 `nmap` 外部命令——增加依赖，跨平台兼容性差，不采用。

### 5. 前端：React + Vite + TailwindCSS

**选择**：React 18 + Vite + TailwindCSS v4，不引入状态管理库（使用 React Query for server state）。

**理由**：轻量；Vite 开发体验好；TailwindCSS 快速构建导航站样式；React Query 处理 API 缓存和 refetch。

## Risks / Trade-offs

- **端口扫描可能触发本地防火墙告警** → 在 UI 中提示用户扫描行为；提供手动触发而非自动定时扫描
- **SQLite 单文件并发写限制** → 后端为单进程，使用 WAL 模式缓解读并发；MCP 调用通过同一进程序列化写入
- **MCP HTTP 端点无认证** → 仅绑定 `127.0.0.1`，不暴露到局域网；文档提示用户
- **端口识别准确性有限** → 维护一个常见端口→服务类型的映射表（如 3000→Vite, 8080→HTTP, 5432→Postgres），无法识别时标记为 Unknown

## Migration Plan

全新项目，无迁移需要。首次运行时自动初始化数据库文件。

## Open Questions

- 是否需要支持 HTTPS 服务（带自签名证书）的健康检查？
- 服务图标是否从 favicon 自动抓取，还是纯文字/emoji？
