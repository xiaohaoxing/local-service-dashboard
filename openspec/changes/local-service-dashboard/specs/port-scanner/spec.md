## ADDED Requirements

### Requirement: 端口扫描执行
系统 SHALL 支持对本地回环地址（127.0.0.1）执行端口扫描，通过 TCP connect 探测端口是否有服务监听。扫描范围默认为 1–9999，每批并发 100 个连接，每个连接超时 200ms。

#### Scenario: 触发端口扫描
- **WHEN** 用户 POST `/api/scan`
- **THEN** 系统开始异步扫描，立即返回 202 状态码和扫描任务 ID

#### Scenario: 查询扫描状态
- **WHEN** 用户 GET `/api/scan/:taskId`
- **THEN** 系统返回扫描任务的状态（`pending` | `running` | `done`）、进度百分比和已发现的开放端口列表

#### Scenario: 扫描完成后返回结果
- **WHEN** 扫描任务完成
- **THEN** 任务状态变为 `done`，结果包含所有开放端口及对应的推测服务类型

### Requirement: 服务类型识别
系统 SHALL 维护一个内置的端口→服务类型映射表，对扫描发现的开放端口进行服务类型标注。

#### Scenario: 识别常见服务端口
- **WHEN** 扫描发现端口 3000
- **THEN** 系统将该端口标注为 `Vite / React Dev`，并附上推测的 URL `http://127.0.0.1:3000`

#### Scenario: 未知端口标注为 Unknown
- **WHEN** 扫描发现的端口不在映射表中
- **THEN** 系统将该端口标注为 `Unknown`，URL 为 `http://127.0.0.1:<port>`

### Requirement: 扫描结果转为服务条目
系统 SHALL 将扫描发现的新端口自动建议为服务条目（`source: "scanned"`），用户确认后加入注册表。

#### Scenario: 发现注册表中不存在的端口
- **WHEN** 扫描结果包含注册表中尚未登记的端口
- **THEN** 系统在扫描结果中标记该端口为 `new`，前端可显示"一键添加"入口

#### Scenario: 已登记的端口不重复添加
- **WHEN** 扫描发现的端口已在注册表中存在（以 URL 匹配）
- **THEN** 系统在扫描结果中标记该端口为 `existing`，不创建重复条目

### Requirement: 扫描配置
系统 SHALL 允许用户通过 API 配置扫描的端口范围。

#### Scenario: 自定义扫描范围
- **WHEN** 用户 POST `/api/scan` 并提供 `{ "portRange": { "start": 3000, "end": 9999 } }`
- **THEN** 系统仅扫描指定范围的端口
