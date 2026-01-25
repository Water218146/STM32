document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('server-address');
    const portInput = document.getElementById('server-port');
    const connectBtn = document.getElementById('connect-btn');
    const statusSpan = document.getElementById('connection-status');
    const messageLog = document.getElementById('message-log');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');

    let socket = null;

    connectBtn.addEventListener('click', toggleConnection);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function toggleConnection() {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            // Disconnect
            socket.close();
        } else {
            // Connect
            const address = addressInput.value.trim();
            const port = portInput.value.trim();

            if (!address || !port) {
                log('System', '请输入有效的地址和端口', 'error');
                return;
            }

            const url = `ws://${address}:${port}`;
            log('System', `正在连接到 ${url}...`, 'system');
            updateStatus('connecting');

            try {
                socket = new WebSocket(url);
                initSocketEvents();
            } catch (error) {
                log('System', `创建连接失败: ${error.message}`, 'error');
                updateStatus('disconnected');
            }
        }
    }

    function initSocketEvents() {
        socket.onopen = () => {
            log('System', '服务器已连接', 'system');
            updateStatus('connected');
        };

        socket.onmessage = (event) => {
            log('RX', event.data, 'received');
        };

        socket.onclose = (event) => {
            log('System', `连接断开 (Code: ${event.code})`, 'system');
            updateStatus('disconnected');
            socket = null;
        };

        socket.onerror = (error) => {
            log('System', '发生错误 (查看控制台详细信息)', 'error');
            console.error('WebSocket Error:', error);
        };
    }

    function sendMessage() {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            log('System', '未连接到服务器', 'error');
            return;
        }

        const msg = messageInput.value;
        if (msg) {
            socket.send(msg);
            log('TX', msg, 'sent');
            messageInput.value = '';
        }
    }

    function updateStatus(state) {
        statusSpan.className = 'status ' + state;

        if (state === 'connected') {
            statusSpan.textContent = '已连接';
            connectBtn.textContent = '断开连接';
            connectBtn.classList.add('connected');
            sendBtn.disabled = false;
            addressInput.disabled = true;
            portInput.disabled = true;
        } else if (state === 'disconnected') {
            statusSpan.textContent = '未连接';
            connectBtn.textContent = '连接服务器';
            connectBtn.classList.remove('connected');
            sendBtn.disabled = true;
            addressInput.disabled = false;
            portInput.disabled = false;
        } else if (state === 'connecting') {
            statusSpan.textContent = '连接中...';
            connectBtn.disabled = true;
        }

        if (state !== 'connecting') {
            connectBtn.disabled = false;
        }
    }

    function log(source, message, type) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;

        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] [${source}] ${message}`;

        messageLog.appendChild(entry);
        messageLog.scrollTop = messageLog.scrollHeight;
    }
});
