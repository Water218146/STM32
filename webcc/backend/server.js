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

// 所有路由都返回 index.html（支持前端路由）
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

/**
 * 生成客户端ID
 */
function generateClientId() {
    return `client_${++clientIdCounter}_${Date.now()}`;
}

/**
 * 广播消息给所有客户端
 */
function broadcast(message, excludeClient = null) {
    const messageStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

/**
 * 发送系统消息给指定客户端
 */
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

/**
 * 格式化时间戳
 */
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
