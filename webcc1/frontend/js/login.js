/**
 * 登录注册页面逻辑
 */

// ==================== DOM元素 ====================
let elements = {};

function initElements() {
    elements = {
        // 模式切换
        modeTabs: document.querySelectorAll('.mode-tab'),
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),

        // 登录表单
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginBtn: document.getElementById('loginBtn'),

        // 注册表单
        regUsername: document.getElementById('regUsername'),
        regPassword: document.getElementById('regPassword'),
        regPasswordConfirm: document.getElementById('regPasswordConfirm'),
        registerBtn: document.getElementById('registerBtn'),

        // 消息提示
        messageBox: document.getElementById('messageBox')
    };
}

// ==================== 模式切换 ====================
function switchMode(mode) {
    // 更新Tab样式
    elements.modeTabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // 切换表单
    if (mode === 'login') {
        elements.loginForm.classList.add('active');
        elements.registerForm.classList.remove('active');
    } else {
        elements.loginForm.classList.remove('active');
        elements.registerForm.classList.add('active');
    }

    // 清空消息
    hideMessage();
}

// ==================== 消息显示 ====================
function showMessage(message, type) {
    elements.messageBox.textContent = message;
    elements.messageBox.className = `message-box show ${type}`;
}

function hideMessage() {
    elements.messageBox.classList.remove('show');
}

// ==================== 登录 ====================
async function login() {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value.trim();

    // 验证输入
    if (!username || !password) {
        showMessage('请输入用户名和密码', 'error');
        return;
    }

    // 禁用按钮
    elements.loginBtn.disabled = true;
    elements.loginBtn.textContent = '登录中...';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // 保存token到localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('userId', data.userId);

            showMessage('登录成功，正在跳转...', 'success');

            // 跳转到主页
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
            elements.loginBtn.disabled = false;
            elements.loginBtn.textContent = '登录';
        }
    } catch (error) {
        console.error('登录失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
        elements.loginBtn.disabled = false;
        elements.loginBtn.textContent = '登录';
    }
}

// ==================== 注册 ====================
async function register() {
    const username = elements.regUsername.value.trim();
    const password = elements.regPassword.value.trim();
    const passwordConfirm = elements.regPasswordConfirm.value.trim();

    // 验证输入
    if (!username || !password || !passwordConfirm) {
        showMessage('请填写所有字段', 'error');
        return;
    }

    if (username.length < 3 || username.length > 20) {
        showMessage('用户名长度必须在3-20个字符之间', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('密码长度至少6个字符', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showMessage('两次输入的密码不一致', 'error');
        return;
    }

    // 禁用按钮
    elements.registerBtn.disabled = true;
    elements.registerBtn.textContent = '注册中...';

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('注册成功！请登录', 'success');

            // 切换到登录模式并填充用户名
            setTimeout(() => {
                switchMode('login');
                elements.loginUsername.value = username;
                elements.loginPassword.value = '';
                elements.loginPassword.focus();
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('注册失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    } finally {
        elements.registerBtn.disabled = false;
        elements.registerBtn.textContent = '注册';
    }
}

// ==================== 事件监听 ====================
function initEventListeners() {
    // 模式切换
    elements.modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchMode(tab.dataset.mode);
        });
    });

    // 登录按钮
    elements.loginBtn.addEventListener('click', login);

    // 注册按钮
    elements.registerBtn.addEventListener('click', register);

    // 回车登录/注册
    elements.loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });

    elements.regPasswordConfirm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') register();
    });
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();

    // 如果已登录，直接跳转
    if (localStorage.getItem('authToken')) {
        window.location.href = '/';
    }
});
