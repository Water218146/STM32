# WebCC1 终端管理系统 - API 设计文档

> **版本**: v1.0.0
> **更新日期**: 2026-01-23
> **作者**: Water21

---

## 📡 WebSocket 连接

### 连接地址

```
ws://[服务器地址]:[端口]
```

**示例**：
- 本地开发：`ws://localhost:8080`
- 局域网访问：`ws://192.168.1.100:8080`
- 公网访问（未来）：`wss://example.com:443`

---

## 📦 消息协议

### 基础格式

所有 WebSocket 消息均采用 **JSON 格式**：

```json
{
  "type": "消息类型",
  "from": "发送者ID",
  "data": "消息数据（字符串或对象）",
  "timestamp": 1737628800000
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | String | ✅ | 消息类型，见下方枚举 |
| `from` | String | ✅ | 发送者 ID（客户端 ID 或 "server"） |
| `data` | String \| Object | ✅ | 消息内容，可以是字符串或对象 |
| `timestamp` | Number | ✅ | 消息时间戳（Unix 毫秒） |

### 预留扩展字段（v2.0+）

```json
{
  "room": "房间/分组ID（多终端管理）",
  "target": "目标客户端ID（定向发送）",
  "token": "认证令牌（用户认证）"
}
```

---

## 📋 消息类型枚举

### 1. `connection` - 连接成功消息

**方向**：服务器 → 客户端

**触发时机**：客户端成功连接到服务器时

**示例**：

```json
{
  "type": "connection",
  "from": "server",
  "data": {
    "clientId": "client_001",
    "message": "欢迎连接到终端管理系统"
  },
  "timestamp": 1737628800000
}
```

**data 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `clientId` | String | 服务器分配的唯一客户端 ID |
| `message` | String | 欢迎消息 |

---

### 2. `system` - 系统消息

**方向**：服务器 → 客户端（广播）

**触发时机**：
- 新客户端加入时
- 客户端断开连接时

**示例 - 客户端加入**：

```json
{
  "type": "system",
  "from": "server",
  "data": {
    "message": "客户端 client_002 已加入",
    "clientId": "client_002",
    "onlineCount": 3
  },
  "timestamp": 1737628810000
}
```

**示例 - 客户端离开**：

```json
{
  "type": "system",
  "from": "server",
  "data": {
    "message": "客户端 client_002 已断开连接",
    "clientId": "client_002",
    "onlineCount": 2
  },
  "timestamp": 1737628820000
}
```

**data 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `message` | String | 系统消息文本 |
| `clientId` | String | 相关的客户端 ID |
| `onlineCount` | Number | 当前在线用户数 |

---

### 3. `message` - 普通消息

**方向**：客户端 ↔ 服务器 ↔ 其他客户端

**流程**：
1. 客户端 A 发送消息到服务器
2. 服务器转发到所有其他客户端（不包括 A）

**示例 - 客户端发送**：

```json
{
  "type": "message",
  "data": "Hello, World!",
  "timestamp": 1737628830000
}
```

**示例 - 服务器转发**：

```json
{
  "type": "message",
  "from": "client_001",
  "data": "Hello, World!",
  "timestamp": 1737628830000
}
```

**data 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | String | 消息文本内容 |

---

### 4. `error` - 错误消息

**方向**：服务器 → 客户端

**触发时机**：
- 消息格式错误
- 其他服务器端错误

**示例**：

```json
{
  "type": "error",
  "from": "server",
  "data": {
    "message": "消息格式错误",
    "error": "Unexpected token in JSON"
  },
  "timestamp": 1737628840000
}
```

**data 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `message` | String | 用户友好的错误消息 |
| `error` | String | 详细的错误信息（可选） |

---

## 🔄 连接流程

### 完整连接流程图

```
┌─────────┐                                    ┌─────────┐
│ 客户端A │                                    │ 服务器  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. 建立 WebSocket 连接                      │
     ├─────────────────────────────────────────────>│
     │                                              │
     │  2. 服务器分配 clientId                      │
     │     发送 connection 消息                     │
     │<─────────────────────────────────────────────┤
     │  {type:"connection", data:{clientId:"client_001"}}
     │                                              │
     │  3. 广播给其他客户端                         │
     │     (system 消息：client_001 已加入)         │
     │                                              ├──> 客户端B
     │                                              ├──> 客户端C
     │                                              │
     │  4. 发送普通消息                             │
     ├─────────────────────────────────────────────>│
     │  {type:"message", data:"Hello"}              │
     │                                              │
     │  5. 服务器转发给其他客户端（排除自己）        │
     │                                              ├──> 客户端B
     │                                              ├──> 客户端C
     │                                              │
     │  6. 断开连接                                 │
     ├─────────────────────────────────────────────>│
     │                                              │
     │  7. 广播给其他客户端                         │
     │     (system 消息：client_001 已断开连接)     │
     │                                              ├──> 客户端B
     │                                              ├──> 客户端C
     │                                              │
```

---

## 🛡️ 错误处理

### 客户端错误处理

1. **连接失败**
   - 显示错误提示："连接失败，请检查服务器地址和端口"
   - 恢复连接按钮状态

2. **消息发送失败**
   - 显示错误提示："发送失败"
   - 消息不清空，允许重新发送

3. **连接异常断开**
   - 显示提示："连接异常断开"
   - 自动清理状态，允许重新连接

### 服务器错误处理

1. **消息格式错误**
   - 发送 `error` 类型消息给客户端
   - 记录错误日志

2. **客户端无响应**
   - 心跳检测超时后自动断开连接
   - 广播离线消息

---

## 🔒 安全性考虑

### 当前版本（v1.0.0）

1. **XSS 防护**
   - 前端对所有用户输入进行 HTML 转义
   - 不使用 `innerHTML` 插入用户内容

2. **输入验证**
   - 服务器验证消息格式
   - 拒绝过大的消息（建议限制 500 字符）

3. **连接限制**
   - 心跳检测防止僵尸连接占用资源

### 未来版本（v2.0+）

1. **加密传输**
   - 升级到 WSS（WebSocket Secure）
   - HTTPS + WSS 全链路加密

2. **身份认证**
   - JWT Token 认证
   - 消息签名防篡改

3. **权限控制**
   - 基于角色的访问控制（RBAC）
   - API 频率限制（Rate Limiting）

---

## 📊 性能指标

### 当前版本（v1.0.0）

| 指标 | 数值 |
|------|------|
| 单服务器并发连接数 | ~5,000 |
| 消息延迟 | < 50ms（局域网） |
| 心跳间隔 | 30 秒 |
| 最大消息大小 | 建议 ≤ 500 字符 |

### 性能优化建议

1. **大规模部署**
   - 使用 Redis 做消息队列
   - 使用 Nginx 做负载均衡
   - 使用 PM2 多进程部署

2. **消息优化**
   - 启用消息压缩（gzip）
   - 批量发送消息（未来实现）

---

## 🧪 测试用例

### 测试工具

推荐使用以下工具测试 WebSocket API：

- **浏览器**：使用项目自带的 Web 界面
- **命令行**：使用 `wscat` 工具
  ```bash
  npm install -g wscat
  wscat -c ws://localhost:8080
  ```
- **编程测试**：使用 Node.js 的 `ws` 库

### 基础测试用例

#### 1. 连接测试

```bash
# 使用 wscat 连接
wscat -c ws://localhost:8080

# 预期：收到 connection 消息
< {"type":"connection","from":"server","data":{"clientId":"client_001","message":"欢迎连接到终端管理系统"},"timestamp":1737628800000}
```

#### 2. 消息发送测试

```bash
# 发送消息
> {"type":"message","data":"测试消息"}

# 预期：其他客户端收到
< {"type":"message","from":"client_001","data":"测试消息","timestamp":1737628810000}
```

#### 3. 多客户端测试

1. 打开两个 `wscat` 连接
2. 在连接 1 发送消息
3. 验证连接 2 收到消息，连接 1 不收到

#### 4. 断开连接测试

1. 关闭一个客户端
2. 验证其他客户端收到 `system` 消息

---

## 📚 SDK 示例（未来）

### JavaScript SDK

```javascript
// 未来可能提供的官方 SDK
const WebCC1Client = require('webcc1-client');

const client = new WebCC1Client('ws://localhost:8080');

client.on('connected', (data) => {
  console.log('已连接，客户端ID:', data.clientId);
});

client.on('message', (data) => {
  console.log('收到消息:', data);
});

client.send('Hello, World!');
```

---

## 📖 更新日志

### v1.0.0 (2026-01-23)

- ✅ 定义基础消息协议
- ✅ 实现 4 种消息类型
- ✅ 完成连接流程设计
- ✅ 添加错误处理机制

---

<div align="center">

**📡 WebCC1 API 文档 v1.0.0 📡**

*如有疑问或建议，请联系项目维护者*

</div>
