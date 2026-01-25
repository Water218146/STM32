/**
 * WebCC1 终端管理系统 - WebSocket服务器
 * 功能：提供WebSocket连接管理、消息转发、心跳检测
 * 作者：Water21
 * 日期：2026-01-23
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// ==================== 用户数据管理 ====================
const USER_DATA_FILE = path.join(__dirname, 'data', 'users.json');

// 确保data目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// 初始化用户数据文件
if (!fs.existsSync(USER_DATA_FILE)) {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify({ users: [], nextId: 1 }, null, 2));
}

/**
 * 读取用户数据
 */
function loadUsers() {
    const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * 保存用户数据
 */
function saveUsers(data) {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * 查找用户
 */
function findUser(username) {
    const data = loadUsers();
    return data.users.find(u => u.username === username);
}

/**
 * 创建新用户
 */
function createUser(username, password) {
    const data = loadUsers();

    // 检查用户名是否已存在
    if (data.users.find(u => u.username === username)) {
        return { success: false, message: '用户名已存在' };
    }

    const newUser = {
        id: data.nextId++,
        username,
        password,
        createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    saveUsers(data);

    return { success: true, userId: newUser.id };
}

/**
 * 生成简单token
 */
function generateToken(userId, username) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${username}_${userId}_${timestamp}_${random}`;
}

/**
 * 验证token
 */
function validateToken(token) {
    if (!token) return null;

    // 格式：username_userId_timestamp_random
    const parts = token.split('_');
    if (parts.length !== 4) return null;

    const username = parts[0];
    const userId = parseInt(parts[1]);
    const timestamp = parseInt(parts[2]);

    // 检查token是否过期（24小时）
    const now = Date.now();
    if (now - timestamp > 24 * 60 * 60 * 1000) {
        return null;
    }

    // 验证用户是否存在
    const user = findUser(username);
    if (user && user.id === userId) {
        return { id: user.id, username: user.username };
    }

    return null;
}

// ==================== 配置参数 ====================
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000;

// 管理员用户列表（支持多个管理员）
const ADMIN_USERS = (process.env.ADMIN_USERS || 'water,testuser').split(',').map(u => u.trim());  // 临时添加 testuser 用于测试

// ==================== 创建服务器 ====================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ==================== 客户端管理 ====================
// 存储所有连接的客户端：Map<clientId, ClientInfo>
// ClientInfo = { ws, username, type, deviceId }
const clients = new Map();
let webIdCounter = 1;    // 网页客户端计数器
let mcuIdCounter = 1;    // MCU客户端计数器

// ==================== 中间件 ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== API路由 ====================

/**
 * POST /api/register - 用户注册
 */
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
        return res.json({ success: false, message: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
        return res.json({ success: false, message: '用户名长度必须在3-20个字符之间' });
    }

    if (password.length < 6) {
        return res.json({ success: false, message: '密码长度至少6个字符' });
    }

    // 创建用户
    const result = createUser(username, password);
    if (result.success) {
        console.log(`新用户注册: ${username}`);
        res.json({ success: true, message: '注册成功' });
    } else {
        res.json(result);
    }
});

/**
 * POST /api/login - 用户登录
 */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
        return res.json({ success: false, message: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = findUser(username);
    if (!user || user.password !== password) {
        return res.json({ success: false, message: '用户名或密码错误' });
    }

    // 生成token
    const token = generateToken(user.id, user.username);

    console.log(`用户登录: ${username}`);
    res.json({
        success: true,
        message: '登录成功',
        token,
        userId: user.id,
        username: user.username
    });
});

/**
 * POST /api/logout - 用户登出
 */
app.post('/api/logout', (req, res) => {
    console.log('用户登出');
    res.json({ success: true, message: '登出成功' });
});

/**
 * 生成唯一的客户端ID
 * @param {string} type - 客户端类型 'web' | 'mcu'
 * @returns {string} 格式：web_001 或 mcu_001
 */
function generateClientId(type = 'web') {
    if (type === 'mcu') {
        return `mcu_${String(mcuIdCounter++).padStart(3, '0')}`;
    } else {
        return `web_${String(webIdCounter++).padStart(3, '0')}`;
    }
}

/**
 * 广播消息到所有客户端（可排除特定客户端）
 * @param {Object} message - 消息对象
 * @param {string} excludeClientId - 要排除的客户端ID
 */
function broadcast(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clients.forEach((client, clientId) => {
        // 跳过排除的客户端
        if (clientId === excludeClientId) {
            return;
        }

        // 只发送给连接状态正常的客户端
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(messageStr);
            sentCount++;
        }
    });

    if (sentCount > 0) {
        console.log(`已转发给 ${sentCount} 个客户端`);
    }
}

/**
 * 发送消息给管理员
 * @param {Object} message - 消息对象
 */
function sendToAdmin(message) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clients.forEach((client) => {
        // 只发送给管理员用户
        if (ADMIN_USERS.includes(client.username) && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(messageStr);
            sentCount++;
        }
    });

    if (sentCount > 0) {
        console.log(`已发送给管理员 (${sentCount}个客户端)`);
    } else {
        console.log(`警告: 管理员不在线`);
    }
}

/**
 * 检查用户是否是管理员
 * @param {string} username - 用户名
 * @returns {boolean} 是否是管理员
 */
function isAdmin(username) {
    return ADMIN_USERS.includes(username);
}

/**
 * 获取用户角色
 * @param {string} username - 用户名
 * @returns {string} 'admin' | 'user' | 'mcu'
 */
function getUserRole(username) {
    if (username.startsWith('mcu')) {
        return 'mcu';
    }
    return isAdmin(username) ? 'admin' : 'user';
}

/**
 * 透传原始字符串到所有客户端（不做JSON包装）
 * @param {string} rawData - 原始字符串数据
 * @param {string} excludeClientId - 要排除的客户端ID
 */
function broadcastRaw(rawData, excludeClientId = null) {
    let sentCount = 0;

    clients.forEach((client, clientId) => {
        if (clientId === excludeClientId) {
            return;
        }

        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(rawData);  // 直接发送原始字符串，不JSON包装
            sentCount++;
        }
    });

    if (sentCount > 0) {
        console.log(`已转发给 ${sentCount} 个客户端`);
    }
}

/**
 * 创建标准消息对象
 * @param {string} type - 消息类型
 * @param {string} from - 发送者ID
 * @param {any} data - 消息数据
 * @returns {Object} 标准消息对象
 */
function createMessage(type, from, data) {
    return {
        type,
        from,
        role: getUserRole(from),  // 添加用户角色字段
        data,
        timestamp: Date.now()
    };
}

// ==================== 静态文件服务 ====================
// 托管前端文件
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 根路径返回index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ==================== WebSocket连接处理 ====================
wss.on('connection', (ws) => {
    // 初始状态：未认证、未分配ID
    ws.authenticated = false;
    ws.username = null;
    ws.userId = null;
    ws.clientId = null;      // 新增：clientId
    ws.type = null;           // 新增：客户端类型 'web' | 'mcu'
    ws.deviceId = null;       // 新增：设备ID（MCU用）
    ws.isAlive = true;

    console.log('新WebSocket连接，等待认证');

    // ==================== 消息接收处理 ====================
    ws.on('message', (data) => {
        const rawData = data.toString();

        // ==================== MCU快速认证通道 ====================
        // 支持格式：
        //   1. mcu_ok:001      - 上电自动认证（设备ID: 001）
        //   2. input_mcu:001   - 按键手动认证（设备ID: 001）
        if (!ws.authenticated) {
            const mcuAuthMatch = rawData.match(/^(mcu_ok|input_mcu):(.+)$/);

            if (mcuAuthMatch) {
                const authMethod = mcuAuthMatch[1];  // mcu_ok 或 mcu_input
                const deviceSerial = mcuAuthMatch[2]; // 设备序列号，如 "001"

                // 生成用户名：mcu + 设备序列号（如 "mcu001"）
                const mcuUsername = `mcu${deviceSerial}`;

                // ==================== 先清理已断开的连接 ====================
                // 在检查重复连接前，先清理所有已断开但还在 Map 中的记录
                clients.forEach((client, clientId) => {
                    if (client.ws.readyState !== WebSocket.OPEN) {
                        console.log(`清理已断开的连接: ${client.username} (${clientId})`);
                        clients.delete(clientId);
                    }
                });

                // 检查该设备是否已在线（防重复连接）
                // 同时检查用户名和 WebSocket 连接状态
                const existingClient = Array.from(clients.values()).find(
                    client => client.type === 'mcu'
                           && client.username === mcuUsername
                           && client.ws.readyState === WebSocket.OPEN  // 连接必须还活着
                );

                if (existingClient) {
                    // 设备已在线，拒绝新连接
                    console.log(`拒绝连接: ${mcuUsername} 已经在线 (连接: ${existingClient.clientId})`);

                    ws.send(`AUTH_FAILED:DEVICE_ALREADY_ONLINE:${mcuUsername}`);

                    // 通知管理员重复连接尝试
                    const duplicateMessage = createMessage('system', 'server', {
                        message: `设备 ${mcuUsername} 尝试重复连接，已拒绝`,
                        deviceSerial: deviceSerial,
                        username: mcuUsername,
                        onlineCount: clients.size,
                        type: 'mcu_duplicate_blocked'
                    });
                    sendToAdmin(duplicateMessage);

                    ws.close(4002, 'Device already online');
                    return;
                }

                // 设备未在线，允许连接
                ws.clientId = generateClientId('mcu');
                ws.authenticated = true;
                ws.username = mcuUsername;      // 使用设备序列号作为用户名
                ws.type = 'mcu';
                ws.deviceId = deviceSerial;     // 存储设备序列号

                // 存储客户端信息
                clients.set(ws.clientId, {
                    ws: ws,
                    username: mcuUsername,
                    type: 'mcu',
                    deviceId: deviceSerial
                });

                console.log(`MCU设备已连接: ${ws.clientId} (设备: ${mcuUsername}, 触发: ${authMethod})`);
                console.log(`在线: ${clients.size}`);

                // 发送认证成功确认（纯字符串格式，单片机友好）
                ws.send(`AUTH_OK:${ws.clientId}:${mcuUsername}`);

                // 广播 MCU 加入系统消息（只发给管理员 water）
                const joinMessage = createMessage('system', 'server', {
                    message: `MCU设备 ${mcuUsername} 已连接`,
                    clientId: ws.clientId,
                    deviceSerial: deviceSerial,
                    username: mcuUsername,
                    deviceType: 'mcu',
                    onlineCount: clients.size
                });
                sendToAdmin(joinMessage);

                return;  // 直接返回，不继续处理
            }
        }

        try {
            // 尝试解析为JSON（网页用户认证 / 系统消息）
            const message = JSON.parse(rawData);

            // ==================== 网页用户 Token 认证 ====================
            if (message.type === 'auth' && !ws.authenticated) {
                const user = validateToken(message.token);

                if (user) {
                    // 检查该用户是否已在线（防止同一账户多设备登录）
                    const existingClient = Array.from(clients.entries()).find(
                        ([clientId, client]) => client.type === 'web' && client.username === user.username
                    );

                    if (existingClient) {
                        // 用户已在线，踢掉旧连接
                        const [oldClientId, oldClient] = existingClient;
                        console.log(`踢掉旧连接: ${user.username} (旧: ${oldClientId})`);

                        // 通知旧连接被踢掉
                        oldClient.ws.send(JSON.stringify(createMessage('system', 'server', {
                            message: '您已在其他地方登录',
                            reason: 'duplicate_login',
                            kickedBy: 'new_login'
                        })));
                        oldClient.ws.close(4003, 'Logged in from another location');

                        // 从客户端列表移除
                        clients.delete(oldClientId);
                    }

                    // 生成网页专用 clientId
                    ws.clientId = generateClientId('web');
                    ws.authenticated = true;
                    ws.username = user.username;
                    ws.userId = user.id;
                    ws.type = 'web';

                    // 存储客户端信息
                    clients.set(ws.clientId, {
                        ws: ws,
                        username: user.username,
                        type: 'web',
                        deviceId: null
                    });

                    console.log(`${user.username} 已连接: ${ws.clientId} (在线: ${clients.size})`);

                    // 发送认证成功消息
                    ws.send(JSON.stringify(createMessage('auth_success', 'server', {
                        username: user.username,
                        clientId: ws.clientId,
                        message: `欢迎，${user.username}`,
                        onlineCount: clients.size  // 添加在线人数
                    })));

                    // ==================== 发送在线用户列表 ====================
                    // 收集所有在线用户（排除MCU设备）
                    const onlineUsers = Array.from(clients.values())
                        .filter(client => client.type === 'web')
                        .map(client => ({
                            clientId: client.clientId,
                            username: client.username,
                            type: client.type
                        }));

                    const userListMessage = createMessage('online_users_list', 'server', {
                        users: onlineUsers,
                        onlineCount: clients.size,
                        message: `当前在线用户: ${onlineUsers.length} 人，MCU设备: ${clients.size - onlineUsers.length} 台`
                    });
                    ws.send(JSON.stringify(userListMessage));
                    console.log(`发送在线用户列表给 ${user.username}: ${onlineUsers.length} 人在线`);

                    // ==================== 如果是管理员，发送当前在线的MCU设备列表 ====================
                    if (isAdmin(user.username)) {
                        // 查找所有在线的 MCU 设备
                        const onlineMCUs = Array.from(clients.values())
                            .filter(client => client.type === 'mcu')
                            .map(client => ({
                                clientId: client.clientId,
                                username: client.username,
                                deviceSerial: client.deviceId
                            }));

                        if (onlineMCUs.length > 0) {
                            // 发送 MCU 设备列表给管理员
                            const mcuListMessage = createMessage('mcu_device_list', 'server', {
                                devices: onlineMCUs,
                                message: `当前有 ${onlineMCUs.length} 台 MCU 设备在线`
                            });
                            ws.send(JSON.stringify(mcuListMessage));
                            console.log(`发送 ${onlineMCUs.length} 台在线MCU设备给管理员 ${user.username}`);
                        }
                    }

                    // 广播新用户加入
                    const joinMessage = createMessage('system', 'server', {
                        message: `${user.username} 已加入`,
                        username: user.username,
                        clientId: ws.clientId,
                        onlineCount: clients.size
                    });
                    broadcast(joinMessage, ws.clientId);
                } else {
                    ws.send(JSON.stringify(createMessage('error', 'server', {
                        message: '认证失败，token无效'
                    })));
                    ws.close(4001, 'Invalid token');
                }
                return;
            }

            // 未认证的连接不处理其他消息
            if (!ws.authenticated) {
                ws.send(JSON.stringify(createMessage('error', 'server', {
                    message: '请先认证'
                })));
                return;
            }

            // 普通消息处理
            if (message.type === 'message') {
                const content = message.data;
                console.log(`来自 ${ws.username} (${ws.clientId}): ${content}`);

                // 广播时添加用户名前缀
                const messageWithUser = `${ws.username}:${content}`;
                broadcastRaw(messageWithUser, ws.clientId);
            } else {
                // 系统消息保持JSON格式
                const forwardMessage = createMessage(
                    message.type,
                    ws.username,
                    message.data || message
                );
                broadcast(forwardMessage, ws.clientId);
            }

        } catch (error) {
            // ==================== 检查已认证 MCU 的重复认证请求 ====================
            // 如果已认证的 MCU 发送 input_mcu:xxx 或 mcu_ok:xxx
            if (ws.authenticated && ws.type === 'mcu') {
                const reAuthMatch = rawData.match(/^(mcu_ok|input_mcu):(.+)$/);

                if (reAuthMatch) {
                    const deviceSerial = reAuthMatch[2];
                    const expectedUsername = `mcu${deviceSerial}`;

                    // 检查是否与当前认证的设备相同
                    if (ws.username === expectedUsername) {
                        // 该设备已认证，拒绝重复认证请求
                        console.log(`拒绝重复认证请求: ${ws.username} 已在线`);

                        // 通知 MCU 本身（纯字符串）
                        ws.send(`AUTH_FAILED:ALREADY_AUTHENTICATED:${ws.username}`);

                        // 通知管理员 water
                        const adminMessage = createMessage('system', 'server', {
                            message: `设备 ${ws.username} 尝试重复认证，已拒绝`,
                            deviceSerial: deviceSerial,
                            username: ws.username,
                            clientId: ws.clientId,
                            type: 'mcu_reauth_blocked'
                        });
                        sendToAdmin(adminMessage);

                        return;  // 不继续处理
                    }
                }
            }

            // 纯字符串消息（LED控制 / MCU数据）
            if (!ws.authenticated) return;

            console.log(`来自 ${ws.username} (${ws.clientId}): ${rawData}`);

            // 广播时添加用户名前缀
            const messageWithUser = `${ws.username}:${rawData}`;
            broadcastRaw(messageWithUser, ws.clientId);
        }
    });

    // ==================== 心跳响应 ====================
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // ==================== 连接关闭处理 ====================
    ws.on('close', () => {
        if (ws.authenticated && ws.clientId) {
            console.log(`${ws.username} (${ws.clientId}) 已断开 (在线: ${clients.size - 1})`);

            // 从客户端列表移除
            clients.delete(ws.clientId);

            // 广播用户/设备离开
            const leaveMessage = createMessage('system', 'server', {
                message: `${ws.username} 已断开连接`,
                username: ws.username,
                clientId: ws.clientId,
                type: ws.type,
                onlineCount: clients.size
            });
            broadcast(leaveMessage);
        }
    });

    // ==================== 错误处理 ====================
    ws.on('error', (error) => {
        if (ws.username && ws.clientId) {
            console.error(`${ws.username} (${ws.clientId}) 错误: ${error.message}`);
        }
    });
});

// ==================== 心跳检测 ====================
const heartbeatInterval = setInterval(() => {
    let disconnectedCount = 0;

    wss.clients.forEach((ws) => {
        // 检查客户端是否还活着
        if (ws.isAlive === false) {
            // 客户端无响应，终止连接
            const username = ws.username || 'unknown';
            const clientId = ws.clientId || 'unknown';
            console.log(`${username} (${clientId}) 无响应，已断开`);
            ws.terminate();

            if (ws.clientId) {
                clients.delete(ws.clientId);
            }
            disconnectedCount++;
            return;
        }

        // 重置状态并发送ping
        ws.isAlive = false;
        ws.ping();
    });

    // 只在有清理时才输出日志
    if (disconnectedCount > 0) {
        console.log(`清理了 ${disconnectedCount} 个无响应连接`);
    }
}, WS_HEARTBEAT_INTERVAL);

// ==================== 启动服务器 ====================
server.listen(PORT, HOST, () => {
    console.log('='.repeat(50));
    console.log('WebCC1 终端管理系统 - 服务器已启动');
    console.log('='.repeat(50));
    console.log(`HTTP服务器: http://${HOST}:${PORT}`);
    console.log(`WebSocket服务器: ws://${HOST}:${PORT}`);
    console.log(`心跳检测间隔: ${WS_HEARTBEAT_INTERVAL}ms`);
    console.log(`当前时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('='.repeat(50));
});

// ==================== 优雅关闭 ====================
process.on('SIGTERM', () => {
    console.log('[服务器] 收到SIGTERM信号，准备关闭...');

    // 停止心跳检测
    clearInterval(heartbeatInterval);

    // 关闭WebSocket服务器
    wss.close(() => {
        console.log('[服务器] WebSocket服务器已关闭');

        // 关闭HTTP服务器
        server.close(() => {
            console.log('[服务器] HTTP服务器已关闭');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('\n[服务器] 收到SIGINT信号，准备关闭...');

    // 停止心跳检测
    clearInterval(heartbeatInterval);

    // 关闭WebSocket服务器
    wss.close(() => {
        console.log('[服务器] WebSocket服务器已关闭');

        // 关闭HTTP服务器
        server.close(() => {
            console.log('[服务器] HTTP服务器已关闭');
            process.exit(0);
        });
    });
});
