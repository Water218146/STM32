/**
 * WebCC1 终端管理系统 - 前端逻辑
 * 功能：WebSocket连接管理、消息收发、UI交互
 * 作者：Water21
 * 日期：2026-01-23
 */

// ==================== 全局状态管理 ====================
let ws = null;              // WebSocket连接实例
let isConnected = false;    // 连接状态标志
let username = '';          // 用户名
let userId = 0;             // 用户ID
let onlineCount = 0;        // 在线用户数
let currentMode = 'chat';   // 当前模式 'chat' | 'led'
let ledStates = {           // LED状态缓存
    1: false, 2: false, 3: false, 4: false,
    5: false, 6: false, 7: false, 8: false
};
let mcuDevices = new Map(); // MCU设备列表 Map<clientId, {name, serial, lastSeen}>

// 管理员用户列表（需要与服务器保持一致）
const ADMIN_USERS = ['water', 'testuser'];  // 可根据需要修改

// ==================== DOM元素引用 ====================
let elements = {};

/**
 * 初始化DOM元素引用
 */
function initElements() {
    elements = {
        // 连接配置
        serverUrl: document.getElementById('serverUrl'),
        connectBtn: document.getElementById('connectBtn'),
        disconnectBtn: document.getElementById('disconnectBtn'),

        // 状态指示
        connectionStatus: document.getElementById('connectionStatus'),
        statusDot: document.getElementById('statusDot'),
        usernameDisplay: document.getElementById('username'),
        onlineCountDisplay: document.getElementById('onlineCount'),
        logoutBtn: document.getElementById('logoutBtn'),

        // 消息区域
        messageContainer: document.getElementById('messageContainer'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),

        // 模式切换
        modeTabs: document.querySelectorAll('.mode-tab'),
        chatMode: document.getElementById('chatMode'),
        ledMode: document.getElementById('ledMode'),

        // LED控制
        ledIndicators: {},
        ledLog: document.getElementById('ledLog'),
        refreshLedBtn: document.getElementById('refreshLedStatus'),
        allLedOnBtn: document.getElementById('allLedOn'),
        allLedOffBtn: document.getElementById('allLedOff'),

        // MCU监视
        mcuMonitor: document.getElementById('mcuMonitor'),
        mcuDeviceList: document.getElementById('mcuDeviceList'),
        mcuStatusText: document.getElementById('mcuStatusText')
    };

    // 初始化LED指示器引用
    for (let i = 1; i <= 8; i++) {
        elements.ledIndicators[i] = document.getElementById(`led${i}`);
    }
}

// ==================== WebSocket连接管理 ====================

/**
 * 连接到WebSocket服务器
 */
function connect() {
    // 检查登录状态（防止异常情况下的未登录访问）
    const token = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');

    if (!token || !savedUsername) {
        addMessage({ message: '⚠️ 请先登录后再连接服务器' }, 'error');
        addMessage({ message: '📌 请点击页面右侧"登出"按钮，跳转到登录页面' }, 'system');
        return;
    }

    const serverUrl = elements.serverUrl.value.trim();

    // 验证输入
    if (!serverUrl) {
        addMessage({ message: '请输入服务器地址' }, 'error');
        return;
    }

    // 解析地址和端口
    let address, port;
    if (serverUrl.includes(':')) {
        // 格式：localhost:8080 或 127.0.0.1:8080
        const parts = serverUrl.split(':');
        address = parts[0];
        port = parts[1];
    } else {
        // 只有地址，没有端口，智能判断默认端口
        address = serverUrl;

        // 如果是本地地址，默认8080；如果是公网域名，默认80
        if (address === 'localhost' || address === '127.0.0.1' || address.startsWith('192.168.') || address.startsWith('10.')) {
            port = '8080';  // 本地/局域网默认8080
        } else {
            port = '80';    // 公网域名默认80（HTTP标准端口）
        }
    }

    // 验证解析结果
    if (!address || !port) {
        addMessage({ message: '地址格式错误，请使用格式：localhost:8080' }, 'error');
        return;
    }

    // 构造WebSocket URL
    const wsUrl = `ws://${address}:${port}`;

    try {
        // 创建WebSocket连接
        ws = new WebSocket(wsUrl);

        // 绑定事件监听器
        ws.onopen = onOpen;
        ws.onmessage = onMessage;
        ws.onclose = onClose;
        ws.onerror = onError;

        // 更新UI状态
        elements.connectBtn.disabled = true;
        addMessage({ message: `正在连接到 ${wsUrl}...` }, 'system');

    } catch (error) {
        addMessage({ message: `连接失败: ${error.message}` }, 'error');
        console.error('连接错误:', error);
    }
}

/**
 * 断开WebSocket连接
 */
function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
    }
    updateConnectionStatus(false);
}

/**
 * WebSocket连接成功回调
 */
function onOpen() {
    console.log('[WebSocket] 连接已建立');

    // 发送认证消息
    const token = localStorage.getItem('authToken');
    ws.send(JSON.stringify({
        type: 'auth',
        token: token
    }));

    updateConnectionStatus(true);
}

/**
 * WebSocket接收消息回调
 * @param {MessageEvent} event - 消息事件
 */
function onMessage(event) {
    const rawData = event.data;

    try {
        // 尝试解析为JSON
        const message = JSON.parse(rawData);
        console.log('[WebSocket] 收到JSON消息:', message);

        // JSON协议：系统消息处理
        switch (message.type) {
            case 'connection':
                handleConnectionMessage(message);
                break;

            case 'auth_success':
                // 认证成功
                username = message.data.username;
                elements.usernameDisplay.textContent = username;
                addMessage({ message: message.data.message }, 'system');

                // 更新在线人数
                console.log('[auth_success] 收到的在线人数:', message.data.onlineCount);
                if (message.data.onlineCount !== undefined) {
                    onlineCount = message.data.onlineCount;
                    updateOnlineCount();
                    console.log('[auth_success] 已更新在线人数为:', onlineCount);
                }

                // 如果是管理员，显示MCU监视窗口
                showMcuMonitorIfNeeded();
                break;

            case 'system':
                handleSystemMessage(message);
                break;

            case 'mcu_device_list':
                // MCU设备列表（管理员登录时推送）
                handleMcuDeviceList(message);
                break;

            case 'online_users_list':
                // 在线用户列表（登录时推送）
                handleOnlineUsersList(message);
                break;

            case 'error':
                addMessage({ message: message.data.message || message.data }, 'error');
                break;

            default:
                console.warn('[WebSocket] 未知消息类型:', message.type);
        }

    } catch (error) {
        // 解析失败：纯字符串消息
        console.log('[WebSocket] 收到纯字符串:', rawData);

        // 提取发送者和消息（格式：username:message）
        let from = null;
        let message = rawData;

        if (rawData.includes(':')) {
            const parts = rawData.split(':');
            from = parts[0];
            message = parts.slice(1).join(':');
        }

        // 判断是LED消息还是聊天消息
        if (message.startsWith('LED') || message.startsWith('STATUS:')) {
            // LED控制消息
            handleLedMessage(message);
        } else {
            // 普通聊天消息 - 添加角色判断
            const role = from ? getUserRole(from) : 'user';

            // 如果是 MCU 发送的消息，更新心跳时间
            if (from && from.startsWith('mcu')) {
                // 找到对应的 MCU 设备并更新心跳
                mcuDevices.forEach((device, clientId) => {
                    if (device.name === from) {
                        updateMcuHeartbeat(clientId);
                    }
                });
            }

            addMessage({
                from: from,
                role: role,  // 添加角色字段
                message: message,
                timestamp: Date.now()
            }, 'received');
        }
    }
}

/**
 * WebSocket连接关闭回调
 * @param {CloseEvent} event - 关闭事件
 */
function onClose(event) {
    console.log('[WebSocket] 连接已关闭', event.code, event.reason);
    updateConnectionStatus(false);

    // 显示断开消息
    if (event.wasClean) {
        addMessage({ message: '已断开连接' }, 'system');
    } else {
        addMessage({ message: '连接异常断开' }, 'error');
    }
}

/**
 * WebSocket错误回调
 * @param {Event} error - 错误事件
 */
function onError(error) {
    console.error('[WebSocket] 连接错误:', error);
    addMessage({ message: '连接失败，请检查服务器地址和端口' }, 'error');
    updateConnectionStatus(false);
}

// ==================== 消息处理函数 ====================

/**
 * 处理连接消息
 * @param {Object} message - 连接消息
 */
function handleConnectionMessage(message) {
    const data = message.data;
    clientId = data.clientId;

    // 更新UI显示（如果元素存在）
    if (elements.clientIdDisplay) {
        elements.clientIdDisplay.textContent = clientId;
    }
    addMessage({ message: data.message }, 'system');

    // 更新在线数
    onlineCount = 1;
    updateOnlineCount();
}

/**
 * 处理系统消息
 * @param {Object} message - 系统消息
 */
function handleSystemMessage(message) {
    const data = message.data;
    addMessage({ message: data.message }, 'system');

    // 处理 MCU 设备连接/断开
    if (data.deviceType === 'mcu') {
        if (data.message.includes('已连接')) {
            // MCU 设备上线
            addMcuDevice(data.clientId, data.username, data.deviceSerial);
        } else if (data.message.includes('已断开连接')) {
            // MCU 设备离线
            removeMcuDevice(data.clientId);
        }
    }

    // 处理 MCU 重复连接/重复认证
    if (data.type === 'mcu_duplicate_blocked' || data.type === 'mcu_reauth_blocked') {
        // 可选：显示通知
        console.log('[MCU监控]', data.message);
    }

    // 检查是否被踢掉（重复登录）
    if (data.reason === 'duplicate_login') {
        // 显示警告
        addMessage({ message: '⚠️ 您的账户已在其他地方登录，已自动断开连接' }, 'error');

        // 断开连接
        if (ws && isConnected) {
            ws.close();
        }

        // 重置状态
        isConnected = false;
        updateConnectionStatus();
    }

    // 更新在线数
    if (data.onlineCount !== undefined) {
        onlineCount = data.onlineCount;
        updateOnlineCount();
    }
}

/**
 * 处理普通消息
 * @param {Object} message - 普通消息
 */
function handleNormalMessage(message) {
    const messageData = {
        from: message.from,
        role: message.role,  // 添加用户角色
        message: message.data,
        timestamp: message.timestamp
    };
    addMessage(messageData, 'received');
}

/**
 * 发送消息到服务器
 */
function sendMessage() {
    // 检查连接状态
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        addMessage({ message: '未连接到服务器' }, 'error');
        return;
    }

    // 获取并验证输入
    const content = elements.messageInput.value.trim();
    if (!content) {
        return;
    }

    // 构造消息对象
    const message = {
        type: 'message',
        data: content,
        timestamp: Date.now()
    };

    try {
        // 发送消息
        ws.send(JSON.stringify(message));

        // 显示发送的消息
        addMessage({ message: content }, 'sent');

        // 清空输入框
        elements.messageInput.value = '';

    } catch (error) {
        console.error('[发送] 发送消息失败:', error);
        addMessage({ message: '发送失败' }, 'error');
    }
}

// ==================== LED控制函数 ====================

/**
 * 处理LED协议消息
 * @param {string} rawData - 原始字符串消息
 */
function handleLedMessage(rawData) {
    // 添加到LED日志
    addLedLog(`收到: ${rawData}`);

    // 解析LED状态
    if (rawData.startsWith('LED') && rawData.includes('_')) {
        const parts = rawData.split('_');
        const ledNum = parseInt(parts[0].replace('LED', ''));
        const state = parts[1] === 'ON';

        if (ledNum >= 1 && ledNum <= 8) {
            updateLedIndicator(ledNum, state);
        }
    }

    // 解析STATUS消息
    if (rawData.startsWith('STATUS:')) {
        const statusStr = rawData.split(':')[1];
        for (let i = 0; i < 8 && i < statusStr.length; i++) {
            const state = statusStr[i] === '1';
            updateLedIndicator(i + 1, state);
        }
    }
}

/**
 * 发送LED控制命令（纯字符串）
 * @param {string} command - LED命令字符串
 */
function sendLedCommand(command) {
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        addLedLog('错误: 未连接到服务器');
        return;
    }

    // 直接发送字符串（不JSON包装）
    ws.send(command);
    addLedLog(`发送: ${command}`);
}

/**
 * 更新LED指示器显示
 * @param {number} ledNum - LED编号 (1-8)
 * @param {boolean} state - 状态 (true=亮, false=灭)
 */
function updateLedIndicator(ledNum, state) {
    ledStates[ledNum] = state;
    const indicator = elements.ledIndicators[ledNum];

    if (indicator) {
        if (state) {
            indicator.classList.add('on');
        } else {
            indicator.classList.remove('on');
        }
    }
}

/**
 * 添加LED日志条目
 * @param {string} message - 日志消息
 */
function addLedLog(message) {
    if (!elements.ledLog) return;

    const logEntry = document.createElement('div');
    logEntry.className = 'led-log-entry';
    logEntry.textContent = `[${formatTime(Date.now())}] ${message}`;

    elements.ledLog.appendChild(logEntry);
    elements.ledLog.scrollTop = elements.ledLog.scrollHeight;
}

/**
 * 切换LED状态
 * @param {number} ledNum - LED编号
 */
function toggleLed(ledNum) {
    const currentState = ledStates[ledNum];
    const command = `LED${ledNum}_${currentState ? 'OFF' : 'ON'}`;
    sendLedCommand(command);
}

/**
 * 切换模式
 * @param {string} mode - 模式名称 'chat' | 'led'
 */
function switchMode(mode) {
    currentMode = mode;

    // 更新Tab样式
    elements.modeTabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // 切换内容显示
    if (mode === 'chat') {
        elements.chatMode.classList.add('active');
        elements.ledMode.classList.remove('active');
    } else {
        elements.chatMode.classList.remove('active');
        elements.ledMode.classList.add('active');

        // 切换到LED模式时自动刷新状态
        if (isConnected) {
            setTimeout(() => sendLedCommand('LED_STATUS'), 100);
        }
    }
}

// ==================== UI更新函数 ====================

/**
 * 更新连接状态UI
 * @param {boolean} connected - 连接状态
 */
function updateConnectionStatus(connected) {
    isConnected = connected;

    if (connected) {
        // 已连接状态
        elements.connectionStatus.textContent = '已连接';
        elements.statusDot.classList.add('connected');
        elements.connectBtn.disabled = true;
        elements.disconnectBtn.disabled = false;
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
    } else {
        // 未连接状态
        elements.connectionStatus.textContent = '未连接';
        elements.statusDot.classList.remove('connected');
        elements.connectBtn.disabled = false;
        elements.disconnectBtn.disabled = true;
        elements.messageInput.disabled = true;
        elements.sendBtn.disabled = true;
    }
}

/**
 * 更新在线用户数显示
 */
function updateOnlineCount() {
    elements.onlineCountDisplay.textContent = onlineCount;
}

/**
 * 添加消息到消息容器
 * @param {Object} messageData - 消息数据 {from, message, timestamp}
 * @param {string} type - 消息类型 system|sent|received|error
 */
function addMessage(messageData, type) {
    // 清除欢迎消息
    const welcomeMsg = elements.messageContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    // 创建消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // 根据消息类型构建内容
    if (type === 'received' && messageData.from) {
        // 接收消息：显示发送者
        const fromSpan = document.createElement('span');
        fromSpan.className = 'message-from';

        // 根据用户角色显示不同的标识
        if (messageData.role === 'admin') {
            // 管理员：🛡️ water（金色粗体）
            fromSpan.innerHTML = `🛡️ ${messageData.from}`;
            fromSpan.classList.add('admin-message');
        } else if (messageData.role === 'mcu') {
            // MCU设备：📶 mcu001（紫色）
            fromSpan.innerHTML = `📶 ${messageData.from}`;
            fromSpan.classList.add('mcu-message');
        } else {
            // 普通用户：来自 water（普通样式）
            fromSpan.textContent = `来自 ${messageData.from}`;
        }

        contentDiv.appendChild(fromSpan);
    }

    // 消息文本（HTML转义防XSS）
    const textSpan = document.createElement('span');
    textSpan.textContent = messageData.message;
    contentDiv.appendChild(textSpan);

    // 时间戳（如果有）
    if (messageData.timestamp) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = formatTime(messageData.timestamp);
        contentDiv.appendChild(timeSpan);
    }

    messageDiv.appendChild(contentDiv);
    elements.messageContainer.appendChild(messageDiv);

    // 自动滚动到底部
    scrollToBottom();
}

/**
 * 滚动消息容器到底部
 */
function scrollToBottom() {
    elements.messageContainer.scrollTop = elements.messageContainer.scrollHeight;
}

// ==================== 工具函数 ====================

/**
 * 获取用户角色
 * @param {string} username - 用户名
 * @returns {string} 'admin' | 'mcu' | 'user'
 */
function getUserRole(username) {
    if (!username) return 'user';
    if (username.startsWith('mcu')) return 'mcu';
    if (ADMIN_USERS.includes(username)) return 'admin';
    return 'user';
}

/**
 * 格式化时间戳为 HH:MM:SS
 * @param {number} timestamp - 时间戳（毫秒）
 * @returns {string} 格式化的时间字符串
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * 登出
 */
function logout() {
    console.log('[登出] 开始执行登出流程...');

    // 清除本地存储
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    console.log('[登出] 已清除本地存储');

    // 关闭WebSocket
    if (ws && isConnected) {
        ws.close();
        console.log('[登出] 已关闭WebSocket连接');
    }

    // 重置状态
    isConnected = false;
    username = '';
    userId = 0;
    mcuDevices.clear();

    console.log('[登出] 跳转到登录页面');

    // 跳转到登录页面
    window.location.href = '/login.html';
}

// ==================== MCU监视功能 ====================

/**
 * 显示MCU监视窗口（仅管理员）
 */
function showMcuMonitorIfNeeded() {
    if (ADMIN_USERS.includes(username)) {
        elements.mcuMonitor.style.display = 'block';
        updateMcuMonitorStatus();
    }
}

/**
 * 处理MCU设备列表消息（管理员登录时推送）
 * @param {Object} message - MCU设备列表消息
 */
function handleMcuDeviceList(message) {
    const devices = message.data.devices;
    console.log(`[MCU监控] 收到 ${devices.length} 台在线MCU设备`, devices);

    // 清空现有列表
    mcuDevices.clear();

    // 添加每个设备到列表
    devices.forEach(device => {
        mcuDevices.set(device.clientId, {
            name: device.username,
            serial: device.deviceSerial,
            lastSeen: Date.now() // 使用当前时间作为初始心跳时间
        });
    });

    // 更新界面
    updateMcuMonitorUI();
    updateMcuMonitorStatus();

    // 添加系统消息
    addMessage({ message: `已加载 ${devices.length} 台 MCU 设备` }, 'system');
}

/**
 * 处理在线用户列表消息（登录时推送）
 * @param {Object} message - 在线用户列表消息
 */
function handleOnlineUsersList(message) {
    const users = message.data.users;
    const count = message.data.onlineCount;

    console.log(`[在线用户] 收到在线用户列表: ${users.length} 人，总在线: ${count}`, users);

    // 更新在线人数（包括所有用户和MCU设备）
    if (count !== undefined) {
        onlineCount = count;
        updateOnlineCount();
        console.log(`[在线用户] 已更新在线人数为: ${onlineCount}`);
    }

    // 可选：显示在线用户列表
    if (users.length > 0) {
        const usernames = users.map(u => u.username).join(', ');
        console.log(`[在线用户] 当前在线用户: ${usernames}`);
    }
}

/**
 * 添加MCU设备到监视列表
 * @param {string} clientId - 客户端ID
 * @param {string} deviceName - 设备名称
 * @param {string} deviceSerial - 设备序列号
 */
function addMcuDevice(clientId, deviceName, deviceSerial) {
    mcuDevices.set(clientId, {
        name: deviceName,
        serial: deviceSerial,
        lastSeen: Date.now()
    });

    updateMcuMonitorUI();
    updateMcuMonitorStatus();
}

/**
 * 从监视列表移除MCU设备
 * @param {string} clientId - 客户端ID
 */
function removeMcuDevice(clientId) {
    mcuDevices.delete(clientId);
    updateMcuMonitorUI();
    updateMcuMonitorStatus();
}

/**
 * 更新MCU设备心跳时间
 * @param {string} clientId - 客户端ID
 */
function updateMcuHeartbeat(clientId) {
    if (mcuDevices.has(clientId)) {
        const device = mcuDevices.get(clientId);
        device.lastSeen = Date.now();
        mcuDevices.set(clientId, device);
    }
}

/**
 * 更新MCU监视界面
 */
function updateMcuMonitorUI() {
    const deviceList = elements.mcuDeviceList;

    if (mcuDevices.size === 0) {
        deviceList.innerHTML = '<div class="no-device">暂无 MCU 设备在线</div>';
        return;
    }

    let html = '';
    mcuDevices.forEach((device, clientId) => {
        const lastSeenTime = formatTime(device.lastSeen);
        const isOnline = (Date.now() - device.lastSeen) < 60000; // 60秒内有心跳视为在线

        html += `
            <div class="device-item">
                <div class="device-info">
                    <span class="device-icon">📶</span>
                    <div>
                        <span class="device-name">${device.name}</span>
                        <span class="device-id">(${device.serial})</span>
                    </div>
                </div>
                <div class="device-status">
                    <div class="status-dot ${isOnline ? '' : 'offline'}"></div>
                    <span class="status-text">${isOnline ? '在线' : '离线'}</span>
                    <span class="last-seen">心跳: ${lastSeenTime}</span>
                </div>
            </div>
        `;
    });

    deviceList.innerHTML = html;
}

/**
 * 更新MCU监视状态文本
 */
function updateMcuMonitorStatus() {
    const count = mcuDevices.size;
    const statusText = elements.mcuStatusText;

    if (count === 0) {
        statusText.textContent = '未连接';
        statusText.className = 'monitor-status offline';
    } else {
        statusText.textContent = `${count} 台设备在线`;
        statusText.className = 'monitor-status online';
    }
}

/**
 * 定期检查MCU设备心跳状态
 */
setInterval(() => {
    if (mcuDevices.size > 0) {
        const now = Date.now();
        let hasChanges = false;

        mcuDevices.forEach((device, clientId) => {
            // 超过60秒无心跳视为离线
            if (now - device.lastSeen > 60000) {
                hasChanges = true;
            }
        });

        // 如果有状态变化，更新界面
        if (hasChanges) {
            updateMcuMonitorUI();
        }
    }
}, 10000); // 每10秒检查一次

// ==================== 事件监听器 ====================

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // 连接按钮
    elements.connectBtn.addEventListener('click', connect);

    // 断开连接按钮
    elements.disconnectBtn.addEventListener('click', disconnect);

    // 发送按钮
    elements.sendBtn.addEventListener('click', sendMessage);

    // 输入框回车发送
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 模式切换
    elements.modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            switchMode(mode);
        });
    });

    // LED控制按钮
    if (elements.refreshLedBtn) {
        elements.refreshLedBtn.addEventListener('click', () => {
            sendLedCommand('LED_STATUS');
        });
    }

    if (elements.allLedOnBtn) {
        elements.allLedOnBtn.addEventListener('click', () => {
            sendLedCommand('LED_ALL_ON');
        });
    }

    if (elements.allLedOffBtn) {
        elements.allLedOffBtn.addEventListener('click', () => {
            sendLedCommand('LED_ALL_OFF');
        });
    }

    // LED点击切换
    document.querySelectorAll('.led-item').forEach(item => {
        item.addEventListener('click', () => {
            const ledNum = parseInt(item.dataset.led);
            toggleLed(ledNum);
        });
    });

    // 登出按钮
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', logout);
    }

    // 页面卸载时关闭连接
    window.addEventListener('beforeunload', () => {
        if (ws && isConnected) {
            ws.close();
        }
    });
}

// ==================== 初始化 ====================

/**
 * 检查用户登录状态
 * @returns {boolean} 是否已登录
 */
function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');

    if (!token || !savedUsername) {
        console.log('[登录检查] 用户未登录，跳转到登录页面');
        // 保存当前页面URL，登录成功后可以跳转回来
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = '/login.html';
        return false;
    }

    return true;
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('[系统] WebCC1 终端管理系统已启动');

    // 初始化DOM元素引用
    initElements();

    // 检查登录状态（未登录会自动跳转）
    if (!checkLoginStatus()) {
        return;  // 未登录，已跳转，不再执行后续代码
    }

    // 加载用户信息
    username = localStorage.getItem('username') || '';
    userId = parseInt(localStorage.getItem('userId') || '0');

    // 显示用户名
    if (username) {
        elements.usernameDisplay.textContent = username;
    }

    // 初始化事件监听器
    initEventListeners();

    console.log('[系统] 初始化完成，等待用户操作');
});
