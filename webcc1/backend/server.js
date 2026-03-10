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
const axios = require('axios');

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

// ==================== 管理员数据管理 ====================
const ADMIN_DATA_FILE = path.join(__dirname, 'data', 'admins.json');

/**
 * 读取管理员数据
 */
function loadAdmins() {
    try {
        const data = fs.readFileSync(ADMIN_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[管理员系统] 读取管理员文件失败:', error.message);
        // 如果文件不存在，创建默认管理员
        const defaultAdmins = {
            admins: [
                {
                    username: 'water',
                    addedAt: new Date().toISOString(),
                    addedBy: 'system'
                }
            ],
            lastModified: new Date().toISOString()
        };
        saveAdmins(defaultAdmins);
        return defaultAdmins;
    }
}

/**
 * 保存管理员数据
 */
function saveAdmins(data) {
    data.lastModified = new Date().toISOString();
    fs.writeFileSync(ADMIN_DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * 检查用户是否是管理员
 * @param {string} username - 用户名
 * @returns {boolean} 是否是管理员
 */
function isAdmin(username) {
    const adminData = loadAdmins();
    return adminData.admins.some(admin => admin.username === username);
}

/**
 * 添加管理员
 * @param {string} username - 用户名
 * @param {string} addedBy - 添加者（默认'system'）
 * @returns {Object} 结果对象 {success, message}
 */
function addAdmin(username, addedBy = 'system') {
    const adminData = loadAdmins();

    // 检查是否已经是管理员
    if (adminData.admins.some(admin => admin.username === username)) {
        return { success: false, message: '该用户已经是管理员' };
    }

    // 检查用户是否存在
    const user = findUser(username);
    if (!user) {
        return { success: false, message: '用户不存在，请先注册' };
    }

    // 添加管理员
    adminData.admins.push({
        username: username,
        addedAt: new Date().toISOString(),
        addedBy: addedBy
    });

    saveAdmins(adminData);
    console.log(`[管理员系统] 添加管理员: ${username} (由 ${addedBy} 添加)`);

    return { success: true, message: '管理员添加成功' };
}

/**
 * 移除管理员
 * @param {string} username - 用户名
 * @param {string} removedBy - 移除者（默认'system'）
 * @returns {Object} 结果对象 {success, message}
 */
function removeAdmin(username, removedBy = 'system') {
    const adminData = loadAdmins();

    // 检查是否是管理员
    const adminIndex = adminData.admins.findIndex(admin => admin.username === username);
    if (adminIndex === -1) {
        return { success: false, message: '该用户不是管理员' };
    }

    // 防止删除最后一个管理员
    if (adminData.admins.length === 1) {
        return { success: false, message: '不能删除最后一个管理员' };
    }

    // 移除管理员
    adminData.admins.splice(adminIndex, 1);
    saveAdmins(adminData);

    console.log(`[管理员系统] 移除管理员: ${username} (由 ${removedBy} 移除)`);

    return { success: true, message: '管理员移除成功' };
}

/**
 * 获取所有管理员列表
 * @returns {Array} 管理员列表
 */
function getAdminList() {
    const adminData = loadAdmins();
    return adminData.admins;
}

/**
 * 获取管理员用户名数组（用于前端同步）
 * @returns {Array} 管理员用户名数组
 */
function getAdminUsernames() {
    const adminData = loadAdmins();
    return adminData.admins.map(admin => admin.username);
}

// ==================== 配置参数 ====================
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000;

// 智谱AI配置
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';
const ZHIPU_API_URL = process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || 'GLM-4-Flash';

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
 * GET /api/admins - 获取管理员列表（仅管理员可访问）
 */
app.get('/api/admins', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = validateToken(token);

    if (!user) {
        return res.json({ success: false, message: '认证失败' });
    }

    if (!isAdmin(user.username)) {
        return res.json({ success: false, message: '权限不足，仅管理员可访问' });
    }

    const admins = getAdminList();
    res.json({
        success: true,
        admins: admins,
        count: admins.length
    });
});

/**
 * POST /api/admins/add - 添加管理员（仅管理员可操作）
 */
app.post('/api/admins/add', (req, res) => {
    const { token, username } = req.body;
    const user = validateToken(token);

    if (!user) {
        return res.json({ success: false, message: '认证失败' });
    }

    if (!isAdmin(user.username)) {
        return res.json({ success: false, message: '权限不足，仅管理员可操作' });
    }

    const result = addAdmin(username, user.username);
    res.json(result);
});

/**
 * POST /api/admins/remove - 移除管理员（仅管理员可操作）
 */
app.post('/api/admins/remove', (req, res) => {
    const { token, username } = req.body;
    const user = validateToken(token);

    if (!user) {
        return res.json({ success: false, message: '认证失败' });
    }

    if (!isAdmin(user.username)) {
        return res.json({ success: false, message: '权限不足，仅管理员可操作' });
    }

    // 防止管理员删除自己
    if (username === user.username) {
        return res.json({ success: false, message: '不能删除自己的管理员权限' });
    }

    const result = removeAdmin(username, user.username);
    res.json(result);
});

/**
 * GET /api/admins/usernames - 获取管理员用户名列表（供前端同步）
 */
app.get('/api/admins/usernames', (req, res) => {
    const usernames = getAdminUsernames();
    res.json({
        success: true,
        admins: usernames
    });
});

/**
 * GET /api/test - 测试路由
 */
app.get('/api/test', (req, res) => {
    console.log('[测试] API路由正常工作');
    res.json({
        success: true,
        message: 'API路由正常',
        timestamp: new Date().toISOString(),
        zhipuApiConfigured: !!ZHIPU_API_KEY && ZHIPU_API_KEY !== 'your_api_key_here'
    });
});

/**
 * 从用户消息中提取所有LED编号
 * @param {string} message - 用户消息
 * @returns {number[]} LED编号数组
 */
function extractLedNumbers(message) {
    const numbers = [];
    const msg = message.toLowerCase();

    // 模式1：LED1和LED3 / led1和led3 / LED1，LED3
    const pattern1 = /led\s*(\d)/gi;
    let match;
    while ((match = pattern1.exec(msg)) !== null) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 6 && !numbers.includes(num)) {
            numbers.push(num);
        }
    }

    // 模式2：打开1和3号灯 / 关闭1,3,5号灯 / 开灯1 3 5
    if (numbers.length === 0) {
        const pattern2 = /[打开关闭开关亮灭].*?([1-6])/g;
        while ((match = pattern2.exec(msg)) !== null) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 6 && !numbers.includes(num)) {
                numbers.push(num);
            }
        }
    }

    // 模式3：1和3 / 1,3,5 / 1 3 5（纯数字）
    if (numbers.length === 0) {
        const pattern3 = /[1-6]/g;
        while ((match = pattern3.exec(msg)) !== null) {
            const num = parseInt(match[0]);
            if (num >= 1 && num <= 6 && !numbers.includes(num)) {
                numbers.push(num);
            }
        }
    }

    return numbers.sort();
}

/**
 * 从用户消息中提取所有继电器编号
 * @param {string} message - 用户消息
 * @returns {number[]} 继电器编号数组
 */
function extractRelayNumbers(message) {
    const numbers = [];
    const msg = message.toLowerCase();

    // 模式1：继电器1和继电器3 / relay1和relay2
    const pattern1 = /(?:继电器|relay)\s*(\d)/gi;
    let match;
    while ((match = pattern1.exec(msg)) !== null) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 3 && !numbers.includes(num)) {
            numbers.push(num);
        }
    }

    // 模式2：打开1和2号继电器
    if (numbers.length === 0 && msg.includes('继电器')) {
        const pattern2 = /[1-3]/g;
        while ((match = pattern2.exec(msg)) !== null) {
            const num = parseInt(match[0]);
            if (num >= 1 && num <= 3 && !numbers.includes(num)) {
                numbers.push(num);
            }
        }
    }

    return numbers.sort();
}

// ==================== AI助手功能 ====================

// ==================== Function Calling工具定义 ====================

// 1. LED控制
const LED_CONTROL_TOOL = {
    type: "function",
    function: {
        name: "control_led",
        description: "控制LED灯的开关。可控制单个(1-6号)或全部(0)。",
        parameters: {
            type: "object",
            properties: {
                led_num: {
                    type: "integer",
                    description: "LED编号1-6，全部传0",
                    enum: [0, 1, 2, 3, 4, 5, 6]
                },
                action: {
                    type: "string",
                    description: "on(打开)或off(关闭)",
                    enum: ["on", "off"]
                }
            },
            required: ["led_num", "action"]
        }
    }
};

// 2. 继电器控制
const RELAY_CONTROL_TOOL = {
    type: "function",
    function: {
        name: "control_relay",
        description: "控制继电器的开关。可控制1-3号继电器。",
        parameters: {
            type: "object",
            properties: {
                relay_num: {
                    type: "integer",
                    description: "继电器编号1-3",
                    enum: [1, 2, 3]
                },
                action: {
                    type: "string",
                    description: "on(打开)或off(关闭)",
                    enum: ["on", "off"]
                }
            },
            required: ["relay_num", "action"]
        }
    }
};

// 3. 电机控制
const MOTOR_CONTROL_TOOL = {
    type: "function",
    function: {
        name: "control_motor",
        description: "控制电机运动。可正转、反转或停止。",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    description: "电机动作：forward(正转)、reverse(反转)、stop(停止)",
                    enum: ["forward", "reverse", "stop"]
                }
            },
            required: ["action"]
        }
    }
};

// 4. PWM控制
const PWM_CONTROL_TOOL = {
    type: "function",
    function: {
        name: "control_pwm",
        description: "设置PWM占空比。范围0-100。",
        parameters: {
            type: "object",
            properties: {
                duty_cycle: {
                    type: "integer",
                    description: "占空比百分比，0-100",
                    minimum: 0,
                    maximum: 100
                }
            },
            required: ["duty_cycle"]
        }
    }
};

// 5. 设备状态查询（改进版）
const QUERY_DEVICE_STATUS_TOOL = {
    type: "function",
    function: {
        name: "query_device_status",
        description: "查询设备当前状态。可查询LED、继电器、电机、传感器或全部。",
        parameters: {
            type: "object",
            properties: {
                device_type: {
                    type: "string",
                    description: "设备类型：led, relay, motor, sensor, all",
                    enum: ["led", "relay", "motor", "sensor", "all"]
                }
            },
            required: ["device_type"]
        }
    }
};

// 工具列表
const AI_TOOLS = [
    LED_CONTROL_TOOL,
    RELAY_CONTROL_TOOL,
    MOTOR_CONTROL_TOOL,
    PWM_CONTROL_TOOL,
    QUERY_DEVICE_STATUS_TOOL
];

/**
 * POST /api/ai/chat - AI对话
 */
app.post('/api/ai/chat', async (req, res) => {
    console.log('[AI Chat] 收到请求:', {
        hasToken: !!req.body.token,
        message: req.body.message,
        model: req.body.model,
        historyLength: req.body.conversationHistory?.length || 0
    });

    const { token, message, conversationHistory = [], model } = req.body;

    // Token验证
    const user = validateToken(token);
    if (!user) {
        console.log('[AI Chat] Token验证失败');
        return res.json({ success: false, message: '认证失败' });
    }

    console.log('[AI Chat] 用户验证成功:', user.username);

    if (!ZHIPU_API_KEY) {
        console.log('[AI Chat] API密钥未配置');
        return res.json({ success: false, message: 'AI服务未配置' });
    }

    if (!ZHIPU_API_KEY || ZHIPU_API_KEY === 'your_api_key_here') {
        console.log('[AI Chat] API密钥无效');
        return res.json({ success: false, message: 'AI服务未配置或密钥无效' });
    }

    // 使用前端传入的模型，或使用环境变量默认模型
    const selectedModel = model || ZHIPU_MODEL;
    console.log('[AI Chat] 使用模型:', selectedModel);
    console.log('[AI Chat] API配置正常，准备调用智谱AI');

    try {
        // 构造消息
        const messages = [
            {
                role: "system",
                content: `你是WebCC1物联网开发平台的AI助手，具备以下能力：

【当前用户信息】
- 用户名: ${user.username}
- 权限角色: ${getUserRole(user.username)}
- 是否管理员: ${isAdmin(user.username) ? '是' : '否'}

【核心功能】
1. 💬 日常对话：回答用户问题，提供技术支持
2. 🎛️ 设备控制：为管理员执行硬件控制指令
3. 📊 状态查询：查询当前所有设备状态

【可用工具】
你可以调用以下Function Calling工具来执行实际操作：

1. control_led(led_num, action) - 控制LED灯（1-6号或0=全部）
   单个示例：control_led(1, "on") → 打开LED1

   ⚠️ **重要：批量操作规则**
   - 如果用户说"关闭LED1和LED3" → 你必须调用2次工具
     第1次：control_led(1, "off")
     第2次：control_led(3, "off")

   - 如果用户说"打开LED1、2、5" → 你必须调用3次工具
     第1次：control_led(1, "on")
     第2次：control_led(2, "on")
     第3次：control_led(5, "on")

   - 如果用户说"关闭所有LED" → 调用1次即可
     control_led(0, "off")

2. control_relay(relay_num, action) - 控制继电器（1-3号）
   示例：control_relay(2, "off") → 关闭继电器2
   **批量操作**：控制多个继电器时，每个继电器调用一次工具

3. control_motor(action) - 控制电机
   action可选："forward"(正转)、"reverse"(反转)、"stop"(停止)

4. control_pwm(duty_cycle) - 设置PWM占空比（0-100）
   示例：control_pwm(75) → 设置PWM为75%

5. query_device_status(device_type) - 查询设备状态
   device_type可选："led"、"relay"、"motor"、"sensor"、"all"

【操作规则】
✅ 管理员用户（water, testuser）：
   - 可以调用所有控制工具
   - 直接执行，无需确认

❌ 普通用户：
   - 只能查询状态
   - 请求控制时礼貌拒绝并说明权限不足

【重要说明】
- 你拥有实际执行权限，不只是提供建议
- 当用户请求控制设备时，直接调用对应工具并立即执行
- 不需要告诉用户"我无法控制"，你确实可以控制
- 执行后自动返回操作结果，无需再次确认`
            },
            ...conversationHistory,
            { role: "user", content: message }
        ];

        // 调用智谱API
        console.log('[AI Chat] 正在调用智谱API...');
        const response = await axios.post(
            ZHIPU_API_URL,
            {
                model: selectedModel,
                messages: messages,
                tools: AI_TOOLS,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${ZHIPU_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log('[AI Chat] 智谱API响应成功');
        const aiMessage = response.data.choices[0].message;

        // 检查函数调用
        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            console.log(`[AI Chat] 检测到 ${aiMessage.tool_calls.length} 个工具调用`);

            // ==================== 智能批量操作扩展 ====================
            // GLM-4-Flash模型在一次响应中只能返回1个tool_call
            // 如果AI只返回了1个LED控制调用，检查用户消息是否包含多个LED编号
            if (aiMessage.tool_calls.length === 1) {
                const toolCall = aiMessage.tool_calls[0];
                const functionName = toolCall.function.name;

                if (functionName === 'control_led') {
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    // 从用户消息中提取所有LED编号（使用正则表达式）
                    const ledNumbers = extractLedNumbers(message);

                    // 如果检测到多个LED编号，扩展tool_calls
                    if (ledNumbers.length > 1 && functionArgs.led_num !== 0) {
                        console.log(`[智能扩展] 检测到批量LED操作，编号: ${ledNumbers.join(', ')}`);

                        // 清空原有的tool_calls
                        aiMessage.tool_calls = [];

                        // 为每个LED生成一个tool_call
                        ledNumbers.forEach((ledNum, index) => {
                            aiMessage.tool_calls.push({
                                id: `call_${Date.now()}_${index}`,
                                type: 'function',
                                function: {
                                    name: 'control_led',
                                    arguments: JSON.stringify({
                                        led_num: ledNum,
                                        action: functionArgs.action
                                    })
                                }
                            });
                        });

                        console.log(`[智能扩展] 已扩展为 ${aiMessage.tool_calls.length} 个工具调用`);
                    }
                }

                // 继电器批量操作扩展
                if (functionName === 'control_relay') {
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    const relayNumbers = extractRelayNumbers(message);

                    if (relayNumbers.length > 1) {
                        console.log(`[智能扩展] 检测到批量继电器操作，编号: ${relayNumbers.join(', ')}`);

                        aiMessage.tool_calls = [];
                        relayNumbers.forEach((relayNum, index) => {
                            aiMessage.tool_calls.push({
                                id: `call_${Date.now()}_${index}`,
                                type: 'function',
                                function: {
                                    name: 'control_relay',
                                    arguments: JSON.stringify({
                                        relay_num: relayNum,
                                        action: functionArgs.action
                                    })
                                }
                            });
                        });

                        console.log(`[智能扩展] 已扩展为 ${aiMessage.tool_calls.length} 个工具调用`);
                    }
                }
            }

            // 权限检查（控制类操作需要管理员权限）
            const controlFunctions = ['control_led', 'control_relay', 'control_motor', 'control_pwm'];
            for (const toolCall of aiMessage.tool_calls) {
                const functionName = toolCall.function.name;
                if (controlFunctions.includes(functionName) && !isAdmin(user.username)) {
                    return res.json({
                        success: true,
                        response: '抱歉，只有管理员（water, testuser）才能控制硬件设备。您当前是普通用户权限。\n\n如需控制设备，请联系管理员。',
                        needsConfirm: false
                    });
                }
            }

            // ==================== 批量执行所有操作（不需要确认） ====================
            const executionResults = [];
            const controlCards = [];
            const toolResponseMessages = [];

            // 延迟函数（防止粘包）
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

            for (let i = 0; i < aiMessage.tool_calls.length; i++) {
                const toolCall = aiMessage.tool_calls[i];
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`[AI Chat] 执行操作: ${functionName}`, functionArgs);

                let result;
                if (functionName === 'control_led') {
                    result = executeLedControl(functionArgs, user.username);
                    // 批量操作时添加延迟（避免粘包）
                    if (i < aiMessage.tool_calls.length - 1) {
                        await delay(30);  // 30ms延迟
                    }
                } else if (functionName === 'control_relay') {
                    result = executeRelayControl(functionArgs, user.username);
                    if (i < aiMessage.tool_calls.length - 1) {
                        await delay(30);
                    }
                } else if (functionName === 'control_motor') {
                    result = executeMotorControl(functionArgs, user.username);
                } else if (functionName === 'control_pwm') {
                    result = executePwmControl(functionArgs, user.username);
                } else if (functionName === 'query_device_status') {
                    result = await queryDeviceStatus(functionArgs);
                } else {
                    result = { success: false, message: '未知的操作类型' };
                }

                console.log(`[AI Chat] 执行结果:`, result);
                executionResults.push(result);

                // 生成控制卡片
                const controlCard = generateControlCard(functionName, functionArgs, result);
                if (controlCard) {
                    controlCards.push(controlCard);
                }

                // 构造tool响应消息（用于智谱API的最终回复）
                toolResponseMessages.push({
                    role: "tool",
                    content: JSON.stringify(result),
                    tool_call_id: toolCall.id
                });
            }

            // 调用智谱API获取最终回复（带执行结果）
            const assistantToolCalls = aiMessage.tool_calls.map(tc => ({
                id: tc.id,
                type: "function",
                function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments
                }
            }));

            const finalMessages = [
                {
                    role: "system",
                    content: `你是WebCC1物联网开发平台的AI助手。当前用户: ${user.username}`
                },
                ...conversationHistory,
                { role: "user", content: message },
                {
                    role: "assistant",
                    content: null,
                    tool_calls: assistantToolCalls
                },
                ...toolResponseMessages
            ];

            const finalResponse = await axios.post(
                ZHIPU_API_URL,
                {
                    model: selectedModel,
                    messages: finalMessages
                },
                {
                    headers: {
                        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const finalReply = finalResponse.data.choices[0].message.content;

            // 如果有多个卡片，返回数组；如果只有一个，返回单个对象
            return res.json({
                success: true,
                response: finalReply,
                controlCard: controlCards.length === 1 ? controlCards[0] : null,
                controlCards: controlCards.length > 1 ? controlCards : null,  // 多个卡片
                needsConfirm: false
            });
        }

        // 普通回复
        return res.json({
            success: true,
            response: aiMessage.content,
            needsConfirm: false
        });

    } catch (error) {
        console.error('[AI Chat] 错误详情:');
        console.error('- 错误消息:', error.message);
        if (error.response) {
            console.error('- 响应状态:', error.response.status);
            console.error('- 响应数据:', JSON.stringify(error.response.data));
        } else if (error.request) {
            console.error('- 网络请求失败，未收到响应');
        }
        return res.json({ success: false, message: `AI服务错误: ${error.message}` });
    }
});

/**
 * POST /api/ai/execute - 执行AI操作
 */
app.post('/api/ai/execute', async (req, res) => {
    const { token, functionName, functionArgs, toolCallId, model } = req.body;

    const user = validateToken(token);
    if (!user) {
        return res.json({ success: false, message: '认证失败' });
    }

    // 权限检查（控制类操作需要管理员权限）
    const controlFunctions = ['control_led', 'control_relay', 'control_motor', 'control_pwm'];
    if (controlFunctions.includes(functionName) && !isAdmin(user.username)) {
        return res.json({ success: false, message: '权限不足' });
    }

    // 使用前端传入的模型，或使用环境变量默认模型
    const selectedModel = model || ZHIPU_MODEL;

    try {
        let result;
        if (functionName === 'control_led') {
            result = executeLedControl(functionArgs, user.username);
        } else if (functionName === 'control_relay') {
            result = executeRelayControl(functionArgs, user.username);
        } else if (functionName === 'control_motor') {
            result = executeMotorControl(functionArgs, user.username);
        } else if (functionName === 'control_pwm') {
            result = executePwmControl(functionArgs, user.username);
        } else if (functionName === 'query_device_status') {
            result = await queryDeviceStatus(functionArgs);
        } else {
            return res.json({ success: false, message: '未知的操作类型' });
        }

        // 调用智谱获取最终回复
        const messages = [
            { role: "user", content: "执行操作" },
            {
                role: "assistant",
                content: null,
                tool_calls: [{
                    id: toolCallId,
                    type: "function",
                    function: {
                        name: functionName,
                        arguments: JSON.stringify(functionArgs)
                    }
                }]
            },
            {
                role: "tool",
                content: JSON.stringify(result),
                tool_call_id: toolCallId
            }
        ];

        const response = await axios.post(
            ZHIPU_API_URL,
            {
                model: selectedModel,
                messages: messages
            },
            {
                headers: {
                    'Authorization': `Bearer ${ZHIPU_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.json({
            success: true,
            result: result,
            response: response.data.choices[0].message.content
        });

    } catch (error) {
        console.error('[AI Execute] 错误:', error.message);
        return res.json({ success: false, message: '执行失败' });
    }
});

/**
 * POST /api/device/status - 查询设备状态（供AI调用）
 * 从前端缓存读取，不直接查询MCU
 */
app.post('/api/device/status', (req, res) => {
    const { token, device_type } = req.body;

    // Token验证
    const user = validateToken(token);
    if (!user) {
        return res.json({ success: false, message: '认证失败' });
    }

    // 构造设备状态响应（基于协议格式）
    const deviceStatus = {
        led: {
            LED1: 'unknown', LED2: 'unknown', LED3: 'unknown',
            LED4: 'unknown', LED5: 'unknown', LED6: 'unknown'
        },
        relay: {
            RELAY1: 'unknown', RELAY2: 'unknown', RELAY3: 'unknown'
        },
        motor: {
            status: 'unknown'  // FWD/REV/STOP
        },
        sensor: {
            TEMP: 'unknown',
            HUMID: 'unknown',
            LIGHT: 'unknown',
            VOLTAGE: 'unknown'
        }
    };

    // 根据device_type返回对应状态
    let result;
    if (device_type === 'all') {
        result = deviceStatus;
    } else if (deviceStatus[device_type]) {
        result = { [device_type]: deviceStatus[device_type] };
    } else {
        return res.json({ success: false, message: '无效的设备类型' });
    }

    return res.json({
        success: true,
        status: result,
        message: '设备状态来自前端缓存，实际状态由MCU实时上报更新',
        note: '如需最新状态，MCU会自动推送STATUS消息'
    });
});

/**
 * 生成操作描述
 */
function generateActionDescription(functionName, args) {
    if (functionName === 'control_led') {
        if (args.led_num === 0) {
            return `${args.action === 'on' ? '打开' : '关闭'}全部LED`;
        }
        return `${args.action === 'on' ? '打开' : '关闭'}LED${args.led_num}`;
    } else if (functionName === 'control_relay') {
        return `${args.action === 'on' ? '打开' : '关闭'}继电器${args.relay_num}`;
    } else if (functionName === 'control_motor') {
        const actionMap = {
            'forward': '正转',
            'reverse': '反转',
            'stop': '停止'
        };
        return `电机${actionMap[args.action]}`;
    } else if (functionName === 'control_pwm') {
        return `设置PWM占空比为${args.duty_cycle}%`;
    } else if (functionName === 'query_device_status') {
        const typeMap = {
            'led': 'LED',
            'relay': '继电器',
            'motor': '电机',
            'sensor': '传感器',
            'all': '所有设备'
        };
        return `查询${typeMap[args.device_type] || '设备'}状态`;
    }
    return '执行操作';
}

/**
 * 生成控制卡片JSON格式（供前端展示）
 */
function generateControlCard(functionName, args, result) {
    const timestamp = Date.now();
    const status = result.success ? 'success' : 'failed';

    // 根据functionName只生成对应的卡片，避免访问不存在的属性
    switch (functionName) {
        case 'control_led':
            return {
                type: 'LED控制',
                device: args.led_num === 0 ? '全部LED' : `LED${args.led_num}`,
                action: args.action === 'on' ? '打开' : '关闭',
                icon: '💡',
                command: result.command || (args.led_num === 0
                    ? (args.action === 'on' ? 'LED_ALL_ON' : 'LED_ALL_OFF')
                    : `LED${args.led_num}_${args.action.toUpperCase()}`),
                status: status,
                timestamp: timestamp
            };

        case 'control_relay':
            return {
                type: '继电器控制',
                device: `继电器${args.relay_num}`,
                action: args.action === 'on' ? '打开' : '关闭',
                icon: '🔌',
                command: result.command || `RELAY${args.relay_num}_${args.action.toUpperCase()}`,
                status: status,
                timestamp: timestamp
            };

        case 'control_motor':
            return {
                type: '电机控制',
                device: '电机',
                action: { forward: '正转', reverse: '反转', stop: '停止' }[args.action] || args.action,
                icon: '⚙️',
                command: result.command || `MOTOR_${args.action.toUpperCase()}`,
                status: status,
                timestamp: timestamp
            };

        case 'control_pwm':
            return {
                type: 'PWM控制',
                device: 'PWM输出',
                action: `设置占空比${args.duty_cycle}%`,
                icon: '🎚️',
                command: result.command || `PWM:${args.duty_cycle}`,
                status: status,
                timestamp: timestamp
            };

        case 'query_device_status':
            return {
                type: '状态查询',
                device: {
                    'led': 'LED设备',
                    'relay': '继电器',
                    'motor': '电机',
                    'sensor': '传感器',
                    'all': '所有设备'
                }[args.device_type] || '设备',
                action: '查询状态',
                icon: '📊',
                command: `QUERY_${args.device_type.toUpperCase()}`,
                status: status,
                data: result.status || null,
                timestamp: timestamp
            };

        default:
            return null;
    }
}

/**
 * 执行LED控制
 */
function executeLedControl(args, username) {
    const { led_num, action } = args;
    const command = led_num === 0
        ? (action === 'on' ? 'LED_ALL_ON' : 'LED_ALL_OFF')
        : `LED${led_num}_${action.toUpperCase()}`;

    // 添加发送者用户名前缀
    const messageWithUser = `${username}:${command}`;
    broadcastRaw(messageWithUser);

    return { success: true, command: command, sender: username };
}

/**
 * 执行继电器控制
 */
function executeRelayControl(args, username) {
    const { relay_num, action } = args;
    const command = `RELAY${relay_num}_${action.toUpperCase()}`;

    const messageWithUser = `${username}:${command}`;
    broadcastRaw(messageWithUser);

    return { success: true, command: command, sender: username };
}

/**
 * 执行电机控制
 */
function executeMotorControl(args, username) {
    const { action } = args;
    const actionMap = {
        'forward': 'FWD',
        'reverse': 'REV',
        'stop': 'STOP'
    };
    const command = `MOTOR_${actionMap[action]}`;

    const messageWithUser = `${username}:${command}`;
    broadcastRaw(messageWithUser);

    return { success: true, command: command, sender: username };
}

/**
 * 执行PWM控制
 */
function executePwmControl(args, username) {
    const { duty_cycle } = args;
    const command = `PWM:${duty_cycle}`;

    const messageWithUser = `${username}:${command}`;
    broadcastRaw(messageWithUser);

    return { success: true, command: command, sender: username };
}

/**
 * 查询设备状态
 */
async function queryDeviceStatus(args) {
    const { device_type } = args;

    // 构造设备状态响应（基于协议格式）
    const deviceStatus = {
        led: {
            LED1: 'unknown', LED2: 'unknown', LED3: 'unknown',
            LED4: 'unknown', LED5: 'unknown', LED6: 'unknown'
        },
        relay: {
            RELAY1: 'unknown', RELAY2: 'unknown', RELAY3: 'unknown'
        },
        motor: {
            status: 'unknown'  // FWD/REV/STOP
        },
        sensor: {
            TEMP: 'unknown',
            HUMID: 'unknown',
            LIGHT: 'unknown',
            VOLTAGE: 'unknown'
        }
    };

    // 根据device_type返回对应状态
    let result;
    if (device_type === 'all') {
        result = deviceStatus;
    } else if (deviceStatus[device_type]) {
        result = { [device_type]: deviceStatus[device_type] };
    } else {
        return { success: false, message: '无效的设备类型' };
    }

    return {
        success: true,
        status: result,
        message: '设备状态来自前端缓存，实际状态由MCU实时上报更新',
        note: '如需最新状态，MCU会自动推送STATUS消息'
    };
}

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
        if (isAdmin(client.username) && client.ws.readyState === WebSocket.OPEN) {
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

    // 添加换行符作为消息分隔符（防止粘包）
    const messageWithDelimiter = rawData + '\n';

    clients.forEach((client, clientId) => {
        if (clientId === excludeClientId) {
            return;
        }

        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(messageWithDelimiter);  // 发送带分隔符的消息
            sentCount++;
        }
    });

    // 只打印控制命令的转发，不打印MCU状态数据
    const isMcuStatusData = /^[^:]+:(STATUS|VOLTAGE|TEMP|HUMID|LIGHT|DISTANCE|MOTION):/i.test(rawData);
    if (sentCount > 0 && !isMcuStatusData) {
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

                // 只打印非MCU状态数据的消息（过滤STATUS、VOLTAGE等上报数据）
                const isMcuStatusData = /^(STATUS|VOLTAGE|TEMP|HUMID|LIGHT|DISTANCE|MOTION):/i.test(content);
                if (!isMcuStatusData) {
                    console.log(`来自 ${ws.username} (${ws.clientId}): ${content}`);
                }

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

            // 只打印非MCU状态数据的消息（过滤STATUS、VOLTAGE等上报数据）
            const isMcuStatusData = /^(STATUS|VOLTAGE|TEMP|HUMID|LIGHT|DISTANCE|MOTION):/i.test(rawData);
            if (!isMcuStatusData) {
                console.log(`来自 ${ws.username} (${ws.clientId}): ${rawData}`);
            }

            // ==================== 处理粘包：按换行符分割多条消息 ====================
            // 兼容 \n 和 \r\n 两种换行符
            const messages = rawData.split(/\r?\n/).filter(msg => msg.trim().length > 0);

            messages.forEach(singleMessage => {
                // 广播时添加用户名前缀
                const messageWithUser = `${ws.username}:${singleMessage}`;
                broadcastRaw(messageWithUser, ws.clientId);
            });
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
