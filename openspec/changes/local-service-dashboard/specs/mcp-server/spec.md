## ADDED Requirements

### Requirement: MCP Server 基础功能
系统 SHALL 实现符合 Model Context Protocol (MCP) 规范的服务端，同时支持 stdio 传输（用于 Claude Desktop 等客户端直接启动）和 Streamable HTTP 传输（绑定到 `http://127.0.0.1:<port>/mcp`）。

#### Scenario: 通过 stdio 启动 MCP Server
- **WHEN** 用户在 Claude Desktop 配置中注册本项目为 MCP Server（命令行启动模式）
- **THEN** 进程以 stdio 模式运行 MCP Server，响应 MCP 协议消息

#### Scenario: 通过 HTTP/SSE 访问 MCP Server
- **WHEN** 后端 API 服务运行时，AI 工具向 `http://127.0.0.1:<port>/mcp` 发起 MCP HTTP 请求
- **THEN** Server 按 MCP Streamable HTTP 规范返回响应

### Requirement: list_services 工具
系统 SHALL 暴露 `list_services` MCP 工具，让 AI 模型查询注册表中的所有服务。

#### Scenario: 查询全部服务
- **WHEN** AI 模型调用 `list_services` 工具，不传参数
- **THEN** 工具返回注册表中所有服务条目的 JSON 数组，包含 id、name、url、description、tags、isActive、source 字段

#### Scenario: 按标签过滤查询
- **WHEN** AI 模型调用 `list_services` 工具，传入 `{ "tags": ["dev"] }`
- **THEN** 工具返回仅包含指定标签的服务列表

### Requirement: add_service 工具
系统 SHALL 暴露 `add_service` MCP 工具，让 AI 模型向注册表添加服务。

#### Scenario: 添加新服务
- **WHEN** AI 模型调用 `add_service` 工具，传入 `{ "name": "My API", "url": "http://localhost:8080" }`
- **THEN** 工具创建服务条目，返回新条目的完整信息

#### Scenario: 缺少必填字段时返回错误
- **WHEN** AI 模型调用 `add_service` 工具，缺少 `name` 或 `url`
- **THEN** 工具返回 MCP 错误，说明缺失字段

### Requirement: remove_service 工具
系统 SHALL 暴露 `remove_service` MCP 工具，让 AI 模型从注册表删除指定服务。

#### Scenario: 删除已存在的服务
- **WHEN** AI 模型调用 `remove_service` 工具，传入有效的 `{ "id": "<uuid>" }`
- **THEN** 工具删除该服务条目，返回成功确认消息

#### Scenario: 删除不存在的服务
- **WHEN** AI 模型调用 `remove_service` 工具，传入不存在的 `id`
- **THEN** 工具返回 MCP 错误，说明服务未找到

### Requirement: scan_ports 工具
系统 SHALL 暴露 `scan_ports` MCP 工具，让 AI 模型触发端口扫描。

#### Scenario: 触发端口扫描
- **WHEN** AI 模型调用 `scan_ports` 工具（可选传入 `portRange`）
- **THEN** 工具启动扫描并返回扫描结果：发现的开放端口列表及对应推测服务类型

### Requirement: MCP 服务资源暴露
系统 SHALL 通过 MCP Resources 机制将服务注册表暴露为可订阅资源，让 AI 模型能感知服务变化。

#### Scenario: 读取服务注册表资源
- **WHEN** AI 模型通过 MCP 读取资源 `services://registry`
- **THEN** Server 返回当前注册表的 JSON 内容，包含所有服务的完整信息

### Requirement: MCP Server 配置说明
系统 SHALL 在 README 中提供 Claude Desktop 和其他 MCP 客户端的接入配置示例。

#### Scenario: Claude Desktop 配置示例可用
- **WHEN** 用户查阅项目文档
- **THEN** 文档包含完整的 `claude_desktop_config.json` 配置片段，说明如何将本项目注册为 MCP Server
