# WebCC1 终端管理系统

<div align="center">

**基于 WebSocket 的前后端分离终端管理系统**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/water21/webcc1)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org)

</div>

---

## 📋 项目简介

WebCC1 是一个现代化的终端管理系统，采用前后端分离架构，基于 WebSocket 实现实时双向通信。本项目第一阶段实现了基础的 WebSocket 服务器和美观的 Web 前端界面，为后续的内网穿透、多终端管理功能打下坚实基础。

### ✨ 功能特性

- 🚀 **实时通信** - 基于 WebSocket 的低延迟双向通信
- 🎨 **现代化 UI** - 渐变紫色主题，卡片式布局，响应式设计
- 👥 **多客户端支持** - 支持多个客户端同时连接和消息转发
- 💓 **心跳检测** - 自动检测并清理断开的连接
- 📱 **移动端适配** - 完美支持移动设备访问
- 🔒 **安全设计** - HTML 转义防 XSS 攻击
- 📊 **在线统计** - 实时显示在线用户数量
- 🎯 **零框架依赖** - 前端纯原生实现，无第三方框架

### 🛠 技术栈

**后端**
- Node.js - 运行时环境
- Express - HTTP 服务器
- ws - WebSocket 库
- dotenv - 环境变量管理

**前端**
- HTML5 - 页面结构
- CSS3 - 样式设计（独立文件）
- JavaScript (ES6+) - 交互逻辑

---

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/water21/webcc1.git
   cd webcc1
   ```

2. **安装依赖**
   ```bash
   cd backend
   npm install
   ```

3. **配置环境变量**（可选）
   ```bash
   cp .env.example .env
   # 编辑 .env 文件修改配置
   ```

4. **启动服务器**
   ```bash
   npm start
   ```

5. **访问系统**

   打开浏览器访问：http://localhost:8080

---

## 📖 使用说明

### 连接服务器

1. 在浏览器打开 http://localhost:8080
2. 默认配置为 `localhost:8080`（可修改）
3. 点击"连接"按钮建立 WebSocket 连接
4. 连接成功后，状态指示器变为绿色，显示分配的客户端 ID

### 发送消息

1. 在底部输入框输入消息内容
2. 点击"发送"按钮或按 Enter 键发送
3. 发送的消息显示在右侧（紫色背景）
4. 接收的消息显示在左侧（白色卡片）

### 多客户端测试

1. 打开多个浏览器标签页（或不同浏览器）
2. 每个标签页都连接到服务器
3. 在任一标签页发送消息
4. 其他标签页会实时接收到消息
5. 每个客户端都有唯一的 ID（格式：client_001）

### 断开连接

点击"断开连接"按钮，或直接关闭浏览器标签页

---

## 📁 项目结构

```
D:\AAAWaterCode\webcc1\
├── backend\                  # 后端服务器
│   ├── server.js            # WebSocket 服务器核心代码
│   ├── package.json         # 项目依赖配置
│   ├── .env.example         # 环境变量模板
│   └── .gitignore           # Git 忽略文件
│
├── frontend\                 # 前端页面
│   ├── index.html           # 页面结构
│   ├── css\
│   │   └── style.css        # 样式文件（独立）
│   └── js\
│       └── app.js           # 前端逻辑
│
├── docs\                     # 项目文档
│   ├── PROJECT_PROMPT.md    # 工程提示词（AI 协作文档）
│   └── API_DESIGN.md        # API 设计文档
│
├── README.md                 # 项目说明文档
└── .gitignore               # Git 忽略文件
```

---

## 🔧 配置说明

### 环境变量

在 `backend/.env` 文件中配置（参考 `.env.example`）：

```bash
# 服务器端口
PORT=8080

# 监听地址（0.0.0.0 允许外部访问）
HOST=0.0.0.0

# 心跳检测间隔（毫秒）
WS_HEARTBEAT_INTERVAL=30000
```

---

## 🌐 WebSocket 协议

### 连接地址

```
ws://服务器地址:端口
```

### 消息格式

所有消息均为 JSON 格式：

```json
{
  "type": "消息类型",
  "from": "发送者ID",
  "data": "消息内容或数据对象",
  "timestamp": 1737628800000
}
```

### 消息类型

- `connection` - 连接成功消息
- `system` - 系统消息（用户加入/离开）
- `message` - 普通消息
- `error` - 错误消息

详细协议说明请参考：[docs/API_DESIGN.md](docs/API_DESIGN.md)

---

## 🎯 未来规划

### 第二阶段：内网穿透
- 集成 frp/ngrok 实现内网穿透
- 支持远程访问局域网终端
- 动态 URL 生成和管理

### 第三阶段：多终端管理
- 终端分组和路由
- 权限控制和访问管理
- 终端状态监控

### 第四阶段：数据持久化
- 消息历史记录
- 用户认证系统
- 配置文件管理

详细规划请参考：[docs/PROJECT_PROMPT.md](docs/PROJECT_PROMPT.md)

---

## 🐛 常见问题

### 1. 连接失败怎么办？

- 检查服务器是否已启动
- 确认服务器地址和端口正确
- 检查防火墙是否阻止连接

### 2. 消息没有转发？

- 确认多个客户端都已连接
- 查看浏览器控制台是否有错误
- 检查后端服务器日志

### 3. 如何修改端口？

编辑 `backend/.env` 文件：
```bash
PORT=你的端口号
```

### 4. 支持 HTTPS/WSS 吗？

当前版本仅支持 HTTP/WS。后续版本将支持 HTTPS/WSS。

---

## 📝 开发指南

### 代码规范

- **编码**: UTF-8
- **缩进**: 4 空格
- **命名**: 驼峰式（camelCase）
- **注释**: 详细的中文注释

### 扩展性设计

- 配置分离（.env 管理）
- URL 动态生成
- 协议适配（ws/wss）
- 消息协议预留扩展字段

详细架构说明请参考：[docs/PROJECT_PROMPT.md](docs/PROJECT_PROMPT.md)

---

## 👨‍💻 作者

**Water21**

- GitHub: [@water21](https://github.com/water21)
- Email: water21@example.com

---

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

---

<div align="center">

**⭐ 如果觉得项目不错，请给个 Star ⭐**

</div>
