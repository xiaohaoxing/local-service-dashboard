## Why

开发者本地通常运行多个服务（Web 应用、API、数据库管理工具等），但缺乏统一的入口来发现和访问这些服务。手动记忆端口号既繁琐又容易出错，同时 AI 助手也无法感知本地运行的服务上下文，无法提供有针对性的管理建议。

## What Changes

- 新增本地服务导航站 Web UI，聚合展示所有本地运行的服务及其访问链接
- 新增端口扫描功能，自动发现本地监听的服务并识别服务类型
- 新增手动服务管理功能，支持用户添加、编辑、删除服务条目和自定义元信息
- 新增 MCP (Model Context Protocol) Server，暴露本地服务列表给 AI 模型，支持模型查询和管理本地服务

## Capabilities

### New Capabilities

- `service-registry`: 服务注册表——存储和管理本地服务条目，包括名称、URL、描述、标签、状态等元数据
- `port-scanner`: 端口扫描——自动扫描本地端口，识别监听的服务并匹配已知服务类型
- `dashboard-ui`: 导航站 Web UI——展示服务列表、提供快速访问链接、支持搜索和过滤
- `mcp-server`: MCP Server——通过 Model Context Protocol 暴露服务列表和管理操作给 AI 模型

### Modified Capabilities

## Impact

- **新增服务**: 本地 Node.js/Bun 后端服务（提供 REST API + MCP Server）
- **新增前端**: React/Vue Web 应用作为导航站 UI
- **依赖**: 端口扫描库（如 `node-portscanner`）、MCP SDK（`@modelcontextprotocol/sdk`）
- **数据持久化**: 本地 JSON 文件或 SQLite 存储服务注册表
- **无破坏性变更**：全新项目，无现有代码受影响
