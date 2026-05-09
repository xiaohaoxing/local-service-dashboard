## 1. 项目脚手架

- [x] 1.1 初始化 Bun monorepo，创建根 `package.json` 配置 workspaces（`packages/*`）
- [x] 1.2 创建 `packages/backend`：初始化 `package.json`，安装 `hono`、`@hono/node-server`、`@modelcontextprotocol/sdk`
- [x] 1.3 创建 `packages/frontend`：用 Vite + React + TypeScript 初始化，安装 TailwindCSS v4 和 `@tanstack/react-query`
- [x] 1.4 创建 `packages/shared`：定义共享 TypeScript 类型（`ServiceEntry`、`ScanResult`、`ScanTask`）
- [x] 1.5 配置根 `bun run dev` 并发启动前后端

## 2. 后端：数据库与服务注册表

- [x] 2.1 实现 `db.ts`：使用 `bun:sqlite` 初始化 SQLite 数据库（路径 `~/.local/share/local-service-dashboard/services.db`），开启 WAL 模式
- [x] 2.2 创建 `services` 表 schema：`id TEXT PRIMARY KEY`、`name`、`url`、`description`、`tags TEXT`（JSON）、`icon`、`source`、`isActive INTEGER`、`createdAt`、`updatedAt`
- [x] 2.3 实现 `ServiceRepository`：封装 CRUD 操作（`findAll`、`findById`、`create`、`update`、`delete`），`tags` 字段序列化/反序列化 JSON
- [x] 2.4 实现 `GET /api/services` 路由：支持 `?tags=` 和 `?source=` 查询参数
- [x] 2.5 实现 `GET /api/services/:id` 路由：不存在时返回 404
- [x] 2.6 实现 `POST /api/services` 路由：验证必填字段，创建条目返回 201
- [x] 2.7 实现 `PATCH /api/services/:id` 路由：部分更新，更新 `updatedAt`
- [x] 2.8 实现 `DELETE /api/services/:id` 路由：返回 204

## 3. 后端：健康检查

- [x] 3.1 实现 `healthChecker.ts`：每 30 秒对所有服务的 URL 发起 HTTP HEAD 请求（超时 3s），更新 `isActive` 状态
- [x] 3.2 在后端启动时注册健康检查定时器，进程退出时清理

## 4. 后端：端口扫描

- [x] 4.1 实现 `portScanner.ts`：通过 Bun TCP socket 分批（100 并发）扫描指定范围端口，超时 200ms
- [x] 4.2 创建 `PORT_SERVICE_MAP`：内置端口→服务类型映射（3000:Vite/React、3001:React Dev、4000:Phoenix、5000:Flask、5173:Vite、8000:Django/HTTP、8080:HTTP、8888:Jupyter、5432:PostgreSQL、3306:MySQL、6379:Redis、27017:MongoDB 等）
- [x] 4.3 实现扫描任务管理（内存 Map）：生成任务 ID、跟踪状态和进度
- [x] 4.4 实现 `POST /api/scan` 路由：接受可选 `portRange`，返回 202 和 `taskId`
- [x] 4.5 实现 `GET /api/scan/:taskId` 路由：返回任务状态、进度和结果
- [x] 4.6 扫描完成后对比注册表，在结果中标记 `new` / `existing`

## 5. MCP Server

- [x] 5.1 创建 `packages/mcp` 或在 backend 中添加 `mcpServer.ts`，使用 `@modelcontextprotocol/sdk` 初始化 MCP Server，配置 server 名称和版本
- [x] 5.2 注册 `list_services` 工具：接受可选 `tags` 参数，返回注册表服务列表
- [x] 5.3 注册 `add_service` 工具：接受 `name`、`url`、`description`（可选）、`tags`（可选），调用 ServiceRepository 创建条目
- [x] 5.4 注册 `remove_service` 工具：接受 `id`，调用 ServiceRepository 删除条目，不存在时返回 MCP 错误
- [x] 5.5 注册 `scan_ports` 工具：接受可选 `portRange`，同步执行扫描（超时 30s），返回发现的端口列表
- [x] 5.6 注册 `services://registry` 资源：返回当前注册表的 JSON 快照
- [x] 5.7 实现 stdio 传输模式：当进程以 `--mcp-stdio` 参数启动时，使用 `StdioServerTransport`
- [x] 5.8 在 Hono 后端挂载 MCP HTTP 端点：`POST /mcp`（Streamable HTTP transport）

## 6. 前端：基础架构

- [x] 6.1 配置 Vite 代理：`/api` → `http://localhost:3001`（后端端口）
- [x] 6.2 配置 React Query `QueryClient`，在 `main.tsx` 中包裹 `QueryClientProvider`
- [x] 6.3 创建 API 客户端函数：`fetchServices`、`createService`、`updateService`、`deleteService`、`startScan`、`getScanStatus`
- [x] 6.4 设置 TailwindCSS v4，配置基础主题（深色/浅色）

## 7. 前端：服务列表页面

- [x] 7.1 实现 `ServiceCard` 组件：显示名称、URL 链接、描述、标签、在线状态指示点、图标（emoji 或首字母缩写）
- [x] 7.2 实现主页 `App.tsx`：使用 React Query 查询并展示服务卡片网格，支持 loading 和 error 状态
- [x] 7.3 实现空状态组件：无服务时显示引导提示
- [x] 7.4 实现搜索框：客户端实时过滤服务名称和描述
- [x] 7.5 实现标签过滤器：点击标签切换过滤状态

## 8. 前端：服务管理表单

- [x] 8.1 实现 `ServiceFormModal` 组件：模态弹窗包含 name、url、description、tags（可输入多个）、icon 字段
- [x] 8.2 实现表单校验：name 和 url 为必填，url 需符合 URL 格式
- [x] 8.3 添加"新增服务"按钮，触发空表单弹窗，提交后刷新列表
- [x] 8.4 在服务卡片添加"编辑"按钮，打开预填充数据的弹窗
- [x] 8.5 在服务卡片添加"删除"按钮，带二次确认对话框

## 9. 前端：端口扫描 UI

- [x] 9.1 实现 `ScanPanel` 组件：包含"扫描本地端口"按钮和进度条
- [x] 9.2 触发扫描后轮询 `GET /api/scan/:taskId`（每 1s），更新进度百分比
- [x] 9.3 扫描完成后展示结果列表：端口号、推测服务类型、状态（new/existing）
- [x] 9.4 对 `new` 类型的结果显示"添加"按钮，点击后打开预填充的 `ServiceFormModal`

## 10. 文档与配置

- [x] 10.1 编写 `README.md`：项目简介、快速启动命令（`bun install && bun run dev`）
- [x] 10.2 在 README 中添加 Claude Desktop MCP 配置示例（`claude_desktop_config.json` 片段）
- [x] 10.3 在 README 中说明 MCP HTTP 端点地址和可用工具列表
