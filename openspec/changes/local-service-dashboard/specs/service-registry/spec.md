## ADDED Requirements

### Requirement: 服务条目的 CRUD 管理
系统 SHALL 提供完整的服务条目增删改查 API。每个服务条目包含以下字段：`id`（UUID）、`name`（显示名称）、`url`（访问地址，含协议和端口）、`description`（可选描述）、`tags`（标签数组）、`icon`（可选 emoji 或 URL）、`source`（`manual` | `scanned`）、`isActive`（当前是否可达）、`createdAt`、`updatedAt`。

#### Scenario: 添加手动服务条目
- **WHEN** 用户 POST `/api/services` 并提供 `name` 和 `url` 字段
- **THEN** 系统创建新服务条目，返回 201 状态码和完整条目对象（含生成的 `id`）

#### Scenario: 缺少必填字段时拒绝创建
- **WHEN** 用户 POST `/api/services` 但缺少 `name` 或 `url`
- **THEN** 系统返回 400 状态码和错误信息

#### Scenario: 更新服务条目
- **WHEN** 用户 PATCH `/api/services/:id` 并提供要更新的字段
- **THEN** 系统更新对应字段，更新 `updatedAt`，返回 200 和更新后的完整条目

#### Scenario: 删除服务条目
- **WHEN** 用户 DELETE `/api/services/:id`
- **THEN** 系统从注册表中删除该条目，返回 204 状态码

#### Scenario: 查询服务列表
- **WHEN** 用户 GET `/api/services`
- **THEN** 系统返回所有服务条目数组，支持 `?tags=` 和 `?source=` 查询参数过滤

#### Scenario: 获取单个服务条目
- **WHEN** 用户 GET `/api/services/:id`
- **THEN** 系统返回该服务的完整条目；若不存在则返回 404

### Requirement: 服务可达性检测
系统 SHALL 定期对注册表中所有服务发起 HTTP HEAD 请求，更新 `isActive` 状态。

#### Scenario: 服务可达时更新状态
- **WHEN** 后台健康检查对某服务的 URL 发起请求，收到 HTTP 响应（任意状态码）
- **THEN** 系统将该服务的 `isActive` 设置为 `true`

#### Scenario: 服务不可达时更新状态
- **WHEN** 后台健康检查对某服务的 URL 发起请求，连接超时或拒绝
- **THEN** 系统将该服务的 `isActive` 设置为 `false`

### Requirement: 数据持久化
系统 SHALL 将服务注册表持久化到本地 SQLite 数据库文件，路径为 `~/.local/share/local-service-dashboard/services.db`（遵循 XDG 规范）。

#### Scenario: 首次启动时初始化数据库
- **WHEN** 后端服务首次启动且数据库文件不存在
- **THEN** 系统自动创建数据库文件和所需表结构

#### Scenario: 重启后数据保留
- **WHEN** 后端服务重启
- **THEN** 之前添加的服务条目仍然可通过 API 查询到
