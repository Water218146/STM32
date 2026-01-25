# 智能终端管理系统 - 从零到部署完整教程

本文档详细记录了从制作一个静态 HTML 网页到实现外网可访问的完整过程。

## 目录

- [项目概述](#项目概述)
- [环境准备](#环境准备)
- [后端服务器搭建](#后端服务器搭建)
- [前端页面制作](#前端页面制作)
- [本地测试与调试](#本地测试与调试)
- [内网穿透配置](#内网穿透配置)
- [完整文件清单](#完整文件清单)
- [常见问题解决](#常见问题解决)

---

## 项目概述

### 项目目标

搭建一个基于 WebSocket 的实时通信系统，实现：
- 多客户端实时消息通信
- 前后端分离架构
- 外网可访问（通过内网穿透）

### 技术栈

- **后端**: Node.js + Express + WebSocket (ws)
- **前端**: 纯 HTML/CSS/JavaScript
- **内网穿透**: OpenFRP
- **域名**: 阿里云域名 + CNAME 解析

### 最终效果

- 本地访问: `http://localhost:8080`
- 外网访问: `https://www.water21.top`

---

## 环境准备

### 1. 安装 Node.js

下载并安装 Node.js: https://nodejs.org/

验证安装：
```bash
node -v
npm -v
```

### 2. 准备代码编辑器

推荐使用 VS Code: https://code.visualstudio.com/

### 3. 创建项目目录

```bash
# 在 D:\AAAWaterCode\ 下创建项目目录
mkdir webcc
cd webcc

# 创建子目录
mkdir backend
mkdir frontend
mkdir frontend\css
mkdir frontend\js
```

项目结构：
```
webcc\
├── backend\          # 后端目录
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend\         # 前端目录
│   ├── index.html
│   ├── css\
│   │   └── style.css
│   └── js\
│       └── app.js
└── README.md
```

---

## 后端服务器搭建

### 步骤 1: 创建 package.json

**文件**: `backend/package.json`

```json
{
  "name": "webcc-backend",
  "version": "1.0.0",
  "description": "WebSocket 服务器 - 智能终端管理系统",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "ws": "^8.16.0",
    "express": "^4.18.2",
    "dotenv": "^16.3.1"
  }
}
```

### 步骤 2: 创建服务器代码

**文件**: `backend/server.js`

```javascript
/**
 * WebSocket 服务器 - 智能终端管理系统
 * 功能：静态文件服务、客户端连接管理、消息广播、连接状态日志
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// 配置
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const FRONTEND_DIR = path.join(__dirname, '../frontend');

// 创建 Express 应用
const app = express();

// 静态文件服务
app.use(express.static(FRONTEND_DIR));

// 所有路由都返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 存储所有客户端连接
const clients = new Map();
let clientIdCounter = 0;

// 生成客户端ID
function generateClientId() {
    return `client_${++clientIdCounter}_${Date.now()}`;
}

// 广播消息给所有客户端
function broadcast(message, excludeClient = null) {
    const messageStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// 发送系统消息给指定客户端
function sendSystemMessage(client, type, text) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
            type: type,
            from: 'server',
            data: text,
            timestamp: Date.now()
        }));
    }
}

// 格式化时间戳
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
}

// 客户端连接处理
wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    const clientIp = req.socket.remoteAddress;

    // 存储客户端信息
    clients.set(ws, {
        id: clientId,
        ip: clientIp,
        connectTime: Date.now()
    });

    console.log(`[${formatTime(Date.now())}] 客户端连接: ${clientId} (IP: ${clientIp})`);
    console.log(`当前在线客户端数: ${wss.clients.size}`);

    // 发送欢迎消息
    sendSystemMessage(ws, 'connection', `欢迎连接！您的客户端ID: ${clientId}`);

    // 通知其他客户端
    broadcast({
        type: 'system',
        from: 'server',
        data: `客户端 ${clientId} 已加入`,
        timestamp: Date.now()
    }, ws);

    // 消息处理
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log(`[${formatTime(message.timestamp || Date.now())}] ${clientId}: ${message.data || data}`);

            broadcast({
                type: 'message',
                from: clientId,
                data: message.data || data,
                timestamp: message.timestamp || Date.now()
            }, ws);

            // 回执
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ack',
                    from: 'server',
                    data: '消息已发送',
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            console.error(`消息解析错误: ${error.message}`);
            sendSystemMessage(ws, 'error', '消息格式错误，请发送JSON格式');
        }
    });

    // 连接关闭
    ws.on('close', (code, reason) => {
        const clientInfo = clients.get(ws);
        console.log(`[${formatTime(Date.now())}] 客户端断开: ${clientInfo?.id || 'unknown'} (代码: ${code})`);
        console.log(`当前在线客户端数: ${wss.clients.size - 1}`);

        broadcast({
            type: 'system',
            from: 'server',
            data: `客户端 ${clientInfo?.id || 'unknown'} 已断开`,
            timestamp: Date.now()
        });
        clients.delete(ws);
    });

    // 错误处理
    ws.on('error', (error) => {
        console.error(`客户端错误 [${clientId}]: ${error.message}`);
    });

    // 心跳检测
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

// 定期心跳检测
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// 启动服务器
server.listen(PORT, HOST, () => {
    console.log('=================================');
    console.log('服务器已启动');
    console.log(`前端页面:  http://localhost:${PORT}`);
    console.log(`WebSocket:  ws://localhost:${PORT}`);
    console.log('=================================');
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    wss.clients.forEach((client) => {
        client.close();
    });
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
```

### 步骤 3: 安装依赖

```bash
cd D:\AAAWaterCode\webcc\backend
npm install
```

安装完成后会生成 `node_modules` 目录和 `package-lock.json` 文件。

---

## 前端页面制作

### 步骤 1: 创建 HTML 页面

**文件**: `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能终端管理系统</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <!-- 头部 -->
        <header class="header">
            <h1>智能终端管理系统</h1>
            <div class="status-indicator">
                <span class="status-dot" id="statusDot"></span>
                <span class="status-text" id="statusText">未连接</span>
            </div>
        </header>

        <!-- 连接配置区域 -->
        <section class="connection-panel">
            <div class="input-group">
                <label for="serverAddress">服务器地址</label>
                <input type="text" id="serverAddress" value="localhost" placeholder="例如: localhost">
            </div>
            <div class="input-group">
                <label for="serverPort">端口</label>
                <input type="number" id="serverPort" value="8080" placeholder="例如: 8080">
            </div>
            <button class="btn btn-primary" id="connectBtn">连接</button>
        </section>

        <!-- 客户端信息 -->
        <section class="client-info" id="clientInfo" style="display: none;">
            <span>客户端ID: <strong id="clientId">-</strong></span>
        </section>

        <!-- 消息显示区域 -->
        <section class="messages-panel">
            <div class="messages-header">
                <h2>消息记录</h2>
                <button class="btn btn-small" id="clearBtn">清空</button>
            </div>
            <div class="messages-container" id="messagesContainer">
                <div class="message system">
                    <span class="message-prefix">[系统]</span>
                    <span class="message-content">欢迎使用智能终端管理系统</span>
                </div>
            </div>
        </section>

        <!-- 消息发送区域 -->
        <section class="send-panel">
            <div class="input-group">
                <input type="text" id="messageInput" placeholder="输入消息..." disabled>
                <button class="btn btn-send" id="sendBtn" disabled>发送</button>
            </div>
        </section>

        <!-- 在线用户统计 -->
        <footer class="footer">
            <span id="onlineCount">在线用户: 0</span>
        </footer>
    </div>

    <script src="js/app.js"></script>
</body>
</html>
```

### 步骤 2: 创建样式文件

**文件**: `frontend/css/style.css`

```css
/* 全局样式 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.container {
    width: 100%;
    max-width: 800px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
}

/* 头部 */
.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #ef4444;
    transition: background-color 0.3s ease;
}

.status-dot.connected {
    background-color: #10b981;
    box-shadow: 0 0 8px #10b981;
}

/* 连接面板 */
.connection-panel {
    padding: 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.input-group {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 120px;
}

.input-group label {
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 4px;
}

.input-group input {
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.95rem;
}

/* 按钮 */
.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-end;
}

.btn-primary {
    background: #667eea;
    color: white;
}

.btn-primary.connected {
    background: #ef4444;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 消息面板 */
.messages-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.messages-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
}

.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    background: #fafafa;
}

.message {
    margin-bottom: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    max-width: 80%;
}

.message.system {
    background: #e0f2fe;
    align-self: center;
}

.message.received {
    background: #ffffff;
    border: 1px solid #e2e8f0;
}

.message.sent {
    background: #667eea;
    align-self: flex-end;
    margin-left: auto;
}

.message.sent .message-content {
    color: white;
}

/* 响应式设计 */
@media (max-width: 600px) {
    .header {
        flex-direction: column;
        gap: 12px;
    }

    .connection-panel {
        flex-direction: column;
    }
}
```

### 步骤 3: 创建前端逻辑

**文件**: `frontend/js/app.js`

```javascript
(function() {
    'use strict';

    // DOM 元素
    const elements = {
        serverAddress: document.getElementById('serverAddress'),
        serverPort: document.getElementById('serverPort'),
        connectBtn: document.getElementById('connectBtn'),
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        clientInfo: document.getElementById('clientInfo'),
        clientId: document.getElementById('clientId'),
        messagesContainer: document.getElementById('messagesContainer'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        clearBtn: document.getElementById('clearBtn'),
        onlineCount: document.getElementById('onlineCount')
    };

    // WebSocket 连接
    let ws = null;
    let isConnected = false;

    // 格式化时间戳
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN');
    }

    // 添加消息到显示区域
    function addMessage(type, content, sender = '', timestamp = Date.now()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        let html = '';

        if (type === 'system') {
            html = `
                <span class="message-prefix">[系统]</span>
                <span class="message-content">${escapeHtml(content)}</span>
            `;
        } else if (type === 'received') {
            html = `
                <span class="message-sender">${escapeHtml(sender)}</span>
                <span class="message-content">${escapeHtml(content)}</span>
            `;
        } else if (type === 'sent') {
            html = `<span class="message-content">${escapeHtml(content)}</span>`;
        }

        html += `<span class="message-time">${formatTime(timestamp)}</span>`;
        messageDiv.innerHTML = html;

        elements.messagesContainer.appendChild(messageDiv);
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    // 转义 HTML 特殊字符
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 更新连接状态
    function updateConnectionStatus(connected) {
        isConnected = connected;

        if (connected) {
            elements.statusDot.classList.add('connected');
            elements.statusText.textContent = '已连接';
            elements.connectBtn.textContent = '断开';
            elements.connectBtn.classList.add('connected');
            elements.messageInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.clientInfo.style.display = 'block';
            elements.serverAddress.disabled = true;
            elements.serverPort.disabled = true;
        } else {
            elements.statusDot.classList.remove('connected');
            elements.statusText.textContent = '未连接';
            elements.connectBtn.textContent = '连接';
            elements.connectBtn.classList.remove('connected');
            elements.messageInput.disabled = true;
            elements.sendBtn.disabled = true;
            elements.clientInfo.style.display = 'none';
            elements.serverAddress.disabled = false;
            elements.serverPort.disabled = false;
        }
    }

    // 连接到 WebSocket 服务器
    function connect() {
        const address = elements.serverAddress.value.trim();
        const port = elements.serverPort.value.trim();
        const wsUrl = `ws://${address}:${port}`;

        addMessage('system', `正在连接到 ${wsUrl}...`);

        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = function() {
                updateConnectionStatus(true);
            };

            ws.onmessage = function(event) {
                try {
                    const message = JSON.parse(event.data);

                    switch (message.type) {
                        case 'connection':
                            const match = message.data.match(/客户端ID:\s*(.+)/);
                            if (match) {
                                elements.clientId.textContent = match[1];
                            }
                            addMessage('system', message.data);
                            break;

                        case 'system':
                            addMessage('system', message.data);
                            break;

                        case 'message':
                            addMessage('received', message.data, message.from, message.timestamp);
                            break;
                    }
                } catch (error) {
                    // 非JSON消息
                    addMessage('system', event.data);
                }
            };

            ws.onclose = function(event) {
                updateConnectionStatus(false);
                addMessage('system', `连接已关闭 (代码: ${event.code})`);
            };

            ws.onerror = function(error) {
                addMessage('system', '连接错误，请检查服务器地址和端口');
            };

        } catch (error) {
            addMessage('system', `连接失败: ${error.message}`);
        }
    }

    // 断开连接
    function disconnect() {
        if (ws) {
            ws.close();
        }
        ws = null;
        updateConnectionStatus(false);
    }

    // 发送消息
    function sendMessage() {
        const content = elements.messageInput.value.trim();

        if (!content || !ws || ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const message = {
            type: 'message',
            data: content,
            timestamp: Date.now()
        };

        try {
            ws.send(JSON.stringify(message));
            addMessage('sent', content, '', message.timestamp);
            elements.messageInput.value = '';
            elements.messageInput.focus();
        } catch (error) {
            addMessage('system', `发送失败: ${error.message}`);
        }
    }

    // 事件监听器
    elements.connectBtn.addEventListener('click', function() {
        if (isConnected) {
            disconnect();
        } else {
            connect();
        }
    });

    elements.sendBtn.addEventListener('click', sendMessage);

    elements.messageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    elements.clearBtn.addEventListener('click', function() {
        elements.messagesContainer.innerHTML = '';
        addMessage('system', '消息记录已清空');
    });

    // 初始化
    updateConnectionStatus(false);

})();
```

---

## 本地测试与调试

### 步骤 1: 启动服务器

```bash
cd D:\AAAWaterCode\webcc\backend
npm start
```

成功启动后会显示：
```
=================================
服务器已启动
前端页面:  http://localhost:8080
WebSocket:  ws://localhost:8080
=================================
```

### 步骤 2: 本地访问

在浏览器中打开：`http://localhost:8080`

### 步骤 3: 功能测试

1. 点击"连接"按钮
2. 打开多个浏览器窗口
3. 发送消息，验证是否在其他窗口收到

### 常见问题排查

#### 端口被占用

```bash
# 检查端口占用
netstat -ano | findstr :8080

# 杀掉占用进程
taskkill /F /PID <进程ID>
```

#### 页面显示 "Upgrade Required"

说明 ws 库还在拦截请求，确保：
1. 已安装 express：`npm install express`
2. 删除 node_modules 后重新安装
3. 重启服务器

---

## 内网穿透配置

### 概述

内网穿透可以让外网访问你本地的服务。我们使用 **OpenFRP** 免费服务。

### 步骤 1: 注册 OpenFRP 账号

访问：https://console.openfrp.net/dashboard

注册并登录账号。

### 步骤 2: 创建隧道

1. 点击"创建隧道"
2. 填写配置：

| 配置项 | 值 |
|-------|-----|
| 隧道名称 | water（或其他名称） |
| 隧道类型 | HTTP |
| 本地地址 | 127.0.0.1 |
| 本地端口 | 8080 |
| 绑定域名 | www.water21.top |
| 选择节点 | 香港-5（或其他节点） |

3. 点击"创建"

### 步骤 3: 获取 CNAME 地址

创建后会显示：
- **CNAME地址**: `cn-hk-bgp-5.ofalias.net`

记下这个地址，后面配置 DNS 会用到。

### 步骤 4: 域名 DNS 解析

如果你还没有域名，需要先购买一个域名（如阿里云、腾讯云等）。

#### 在阿里云配置 DNS 解析

1. 登录 [阿里云 DNS 控制台](https://dc.console.aliyun.com/next/index)
2. 找到你的域名（如 `water21.top`）
3. 点击"解析设置"
4. 点击"添加记录"

填写解析记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| CNAME | www | cn-hk-bgp-5.ofalias.net | 10分钟 |

5. 点击"确认"保存

#### DNS 解析说明

- **CNAME**: 将域名指向另一个域名（而不是 IP）
- **主机记录 www**: 表示 `www.water21.top`
- **记录值**: OpenFRP 提供的 CNAME 地址

### 步骤 5: 等待 DNS 生效

DNS 解析通常需要 **5-10 分钟**生效。

可以用以下命令检查：

```bash
# Windows
nslookup www.water21.top

# 或访问在线工具
# https://tool.chinaz.com/dns/
```

### 步骤 6: 下载 frpc 客户端

在 OpenFRP 控制台：
1. 找到你创建的隧道
2. 点击"下载配置"或"获取令牌"
3. 下载对应系统的 frpc 客户端
4. 下载配置文件

### 步骤 7: 启动 frpc 客户端

将下载的配置文件放在 frpc 同目录下，运行：

```bash
# Windows
frpc.exe -c config.ini

# 或使用启动器（OpenFRP 提供图形界面）
```

### 步骤 8: 验证外网访问

在浏览器中打开：`https://www.water21.top`

如果成功，你会看到你的网站！

### 完整访问流程

```
外网用户浏览器
    ↓
https://www.water21.top
    ↓ (DNS 解析到 CNAME)
cn-hk-bgp-5.ofalias.net (OpenFRP 服务器)
    ↓ (frp 隧道转发)
你的本地电脑 (127.0.0.1:8080)
    ↓
本地 Express 服务器提供网页
```

---

## 完整文件清单

### 后端文件

```
backend/
├── package.json         # 项目配置和依赖
├── server.js            # 服务器主文件
├── .env.example         # 环境变量示例
├── node_modules/        # 依赖包（npm install 生成）
└── package-lock.json    # 依赖锁定文件
```

### 前端文件

```
frontend/
├── index.html           # 主页面
├── css/
│   └── style.css        # 样式文件
└── js/
    └── app.js           # 前端逻辑
```

---

## 常见问题解决

### 1. 端口被占用

**症状**: 启动服务器失败，提示端口已被使用

**解决**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :8080

# 杀掉进程
taskkill /F /PID <进程ID>
```

### 2. 页面显示 "Upgrade Required"

**症状**: 浏览器只显示 "Upgrade Required"

**原因**: 旧代码还在运行，或 express 未安装

**解决**:
```bash
# 1. 杀掉所有 node 进程
taskkill /F /IM node.exe

# 2. 确保安装了 express
npm install express

# 3. 重新启动
npm start
```

### 3. 外网无法访问

**检查清单**:
- [ ] 本地服务器是否运行（访问 localhost:8080）
- [ ] frpc 客户端是否运行
- [ ] DNS 解析是否生效（nslookup 检查）
- [ ] OpenFRP 隧道状态是否正常
- [ ] 域名是否已验证（在 OpenFRP 控制台）

### 4. WebSocket 连接失败

**检查清单**:
- [ ] 服务器地址和端口是否正确
- [ ] 本地是否已启动服务器
- [ ] 防火墙是否阻止了连接

### 5. 如何让服务器后台运行

**方法 1: 使用 PM2（推荐）**

```bash
# 安装 PM2
npm install -g pm2

# 启动服务器
pm2 start server.js --name webcc

# 查看状态
pm2 list

# 查看日志
pm2 logs webcc

# 停止服务器
pm2 stop webcc

# 重启服务器
pm2 restart webcc
```

**方法 2: 使用 nohup（Linux/Mac）**

```bash
nohup node server.js &
```

---

## 日常使用流程

### 启动服务

1. **启动本地服务器**:
   ```bash
   cd D:\AAAWaterCode\webcc\backend
   npm start
   ```

2. **启动 frpc 客户端**:
   - 运行下载的 frpc 程序
   - 或使用 OpenFRP 图形启动器

### 访问网站

- **本地**: `http://localhost:8080`
- **外网**: `https://www.water21.top`

### 停止服务

1. 在终端按 `Ctrl + C` 停止本地服务器
2. 关闭 frpc 客户端

---

## 总结

通过本教程，你已经完成了：

1. ✅ 搭建了一个基于 Express + WebSocket 的服务器
2. ✅ 创建了一个实时通信的前端界面
3. ✅ 配置了内网穿透实现外网访问
4. ✅ 绑定了自定义域名

这是一个完整的前后端分离项目，包含了：
- 静态文件服务
- WebSocket 实时通信
- 域名解析
- 内网穿透

继续学习可以探索的方向：
- 使用 PM2 管理进程
- 配置 HTTPS 证书
- 添加用户认证
- 数据库存储消息历史

---

**文档版本**: 1.0
**更新日期**: 2026-01-20
