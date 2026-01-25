# 智能终端管理系统

基于 WebSocket 的实时通信系统，后端集成静态文件服务。

## 项目结构

```
D:\AAAWaterCode\webcc\
├── backend\              # 后端目录
│   ├── server.js        # HTTP + WebSocket 服务器
│   ├── package.json     # 项目依赖配置
│   └── .env.example     # 环境变量示例
├── frontend\            # 前端目录
│   ├── index.html       # 主页面
│   ├── css\
│   │   └── style.css    # 样式文件
│   └── js\
│       └── app.js       # 前端逻辑
└── README.md            # 项目说明
```

## 功能特性

- **实时通信**: 基于 WebSocket 的双向通信
- **多客户端支持**: 支持多个客户端同时连接和通信
- **消息广播**: 客户端消息自动转发给所有其他客户端
- **连接管理**: 自动分配客户端ID，监控连接状态
- **静态文件服务**: 后端集成 HTTP 服务，无需单独部署前端
- **心跳检测**: 定时检测断开的连接

## 使用步骤

### 1. 安装依赖

```bash
cd D:\AAAWaterCode\webcc\backend
npm install
```

### 2. 启动服务器

```bash
npm start
```

### 3. 访问前端页面

在浏览器中打开: **http://localhost:8080**

### 4. 连接测试

1. 页面加载后默认填入 `localhost:8080`
2. 点击"连接"按钮
3. 打开多个浏览器窗口（或多个设备）模拟多客户端
4. 发送消息，验证是否在其他窗口收到

## 通信协议

### 消息格式

```javascript
{
  "type": "message",      // 消息类型
  "from": "client_id",    // 发送者ID
  "data": "消息内容",      // 实际数据
  "timestamp": 1234567890 // 时间戳
}
```

### 消息类型

| 类型 | 说明 |
|-----|------|
| `connection` | 客户端连接通知 |
| `disconnection` | 客户端断开通知 |
| `message` | 普通消息 |
| `system` | 系统消息 |
| `error` | 错误消息 |
| `ack` | 消息回执 |

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
PORT=8080
HOST=0.0.0.0
```

## 技术栈

- **后端**: Node.js + ws 库
- **前端**: 纯 HTML/CSS/JavaScript（无框架依赖）

## 开发说明

- 前端文件使用 UTF-8 编码
- 后端服务器支持 SIGINT 优雅退出（按 Ctrl+C）
- WebSocket 心跳检测间隔为 30 秒
- 静态文件缓存时间为 1 小时
