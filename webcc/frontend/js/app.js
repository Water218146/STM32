/**
 * 智能终端管理系统 - 前端逻辑
 * 功能：WebSocket 连接管理、消息收发、界面状态更新
 */

(function() {
    'use strict';

    // DOM 元素
    const elements = {
        serverAddress: document.getElementById('serverAddress'),
        serverPort: document.getElementById('serverPort'),
        quickAddress: document.getElementById('quickAddress'),
        connectBtn: document.getElementById('connectBtn'),
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        clientInfo: document.getElementById('clientInfo'),
        clientId: document.getElementById('clientId'),
        messagesContainer: document.getElementById('messagesContainer'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        clearBtn: document.getElementById('clearBtn'),
        onlineCount: document.getElementById('onlineCount'),
        manualMode: document.getElementById('manualMode'),
        quickMode: document.getElementById('quickMode')
    };

    // WebSocket 连接
    let ws = null;
    let isConnected = false;
    let currentMode = 'manual'; // 'manual' 或 'quick'

    /**
     * 格式化时间戳
     */
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * 添加消息到显示区域
     * @param {string} type - 消息类型
     * @param {string} content - 消息内容
     * @param {string} sender - 发送者
     * @param {number} timestamp - 时间戳
     */
    function addMessage(type, content, sender = '', timestamp = Date.now()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        let html = '';

        if (type === 'system' || type === 'error') {
            html = `
                <span class="message-prefix">[${type === 'error' ? '错误' : '系统'}]</span>
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

        // 滚动到底部
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    /**
     * 转义 HTML 特殊字符
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 更新连接状态显示
     */
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
            // 禁用当前模式的输入框
            if (currentMode === 'manual') {
                elements.serverAddress.disabled = true;
                elements.serverPort.disabled = true;
            } else {
                elements.quickAddress.disabled = true;
            }
        } else {
            elements.statusDot.classList.remove('connected');
            elements.statusText.textContent = '未连接';
            elements.connectBtn.textContent = '连接';
            elements.connectBtn.classList.remove('connected');
            elements.messageInput.disabled = true;
            elements.sendBtn.disabled = true;
            elements.clientInfo.style.display = 'none';
            elements.clientId.textContent = '-';
            // 启用当前模式的输入框
            if (currentMode === 'manual') {
                elements.serverAddress.disabled = false;
                elements.serverPort.disabled = false;
            } else {
                elements.quickAddress.disabled = false;
            }
        }
    }

    /**
     * 连接到 WebSocket 服务器
     */
    function connect() {
        let wsUrl;
        let displayUrl;

        if (currentMode === 'manual') {
            // 手动模式：使用地址 + 端口
            const address = elements.serverAddress.value.trim();
            const port = elements.serverPort.value.trim();

            if (!address || !port) {
                addMessage('error', '请输入服务器地址和端口');
                return;
            }

            wsUrl = `ws://${address}:${port}`;
            displayUrl = wsUrl;
        } else {
            // 快速模式：只输入域名，自动使用 8080 端口
            const domain = elements.quickAddress.value.trim();

            if (!domain) {
                addMessage('error', '请输入域名');
                return;
            }

            wsUrl = `ws://${domain}:8080`;
            displayUrl = `ws://${domain}`; // 显示时省略端口
        }

        addMessage('system', `正在连接到 ${displayUrl}...`);

        try {
            ws = new WebSocket(wsUrl);

            // 连接成功
            ws.onopen = function() {
                updateConnectionStatus(true);
            };

            // 收到消息
            ws.onmessage = function(event) {
                try {
                    const message = JSON.parse(event.data);

                    switch (message.type) {
                        case 'connection':
                            // 服务器发送的连接确认消息
                            const match = message.data.match(/客户端ID:\s*(.+)/);
                            if (match) {
                                elements.clientId.textContent = match[1];
                            }
                            addMessage('system', message.data);
                            break;

                        case 'system':
                            // 系统消息
                            addMessage('system', message.data);
                            break;

                        case 'message':
                            // 其他客户端的消息
                            addMessage('received', message.data, message.from, message.timestamp);
                            break;

                        case 'error':
                            // 错误消息
                            addMessage('error', message.data);
                            break;

                        case 'ack':
                            // 消息回执，已在发送时处理
                            break;

                        default:
                            addMessage('system', `未知消息类型: ${message.type}`);
                    }
                } catch (error) {
                    // 非JSON消息
                    addMessage('received', event.data, 'server');
                }
            };

            // 连接关闭
            ws.onclose = function(event) {
                updateConnectionStatus(false);
                addMessage('system', `连接已关闭 (代码: ${event.code})`);
            };

            // 连接错误
            ws.onerror = function(error) {
                addMessage('error', '连接错误，请检查服务器地址和端口');
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            addMessage('error', `连接失败: ${error.message}`);
        }
    }

    /**
     * 断开 WebSocket 连接
     */
    function disconnect() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
        }
        ws = null;
        updateConnectionStatus(false);
    }

    /**
     * 发送消息
     */
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
            addMessage('error', `发送失败: ${error.message}`);
        }
    }

    // 事件监听器

    // 模式切换
    document.querySelectorAll('input[name="connectMode"]').forEach(function(radio) {
        radio.addEventListener('change', function(e) {
            currentMode = e.target.value;

            if (currentMode === 'manual') {
                elements.manualMode.style.display = 'flex';
                elements.quickMode.style.display = 'none';
            } else {
                elements.manualMode.style.display = 'none';
                elements.quickMode.style.display = 'block';
            }
        });
    });

    // 连接按钮
    elements.connectBtn.addEventListener('click', function() {
        if (isConnected) {
            disconnect();
        } else {
            connect();
        }
    });

    // 发送按钮
    elements.sendBtn.addEventListener('click', sendMessage);

    // 输入框回车发送
    elements.messageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // 清空按钮
    elements.clearBtn.addEventListener('click', function() {
        elements.messagesContainer.innerHTML = '';
        addMessage('system', '消息记录已清空');
    });

    // 地址输入框回车连接
    elements.serverAddress.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !isConnected) {
            connect();
        }
    });

    // 页面卸载时关闭连接
    window.addEventListener('beforeunload', function() {
        if (ws) {
            ws.close();
        }
    });

    // 初始化
    updateConnectionStatus(false);

})();
