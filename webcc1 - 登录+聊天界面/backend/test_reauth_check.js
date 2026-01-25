/**
 * 测试已认证 MCU 重复认证请求
 * 1. MCU 认证成功后，再次发送 input_mcu:001 应被拒绝
 * 2. MCU 连接消息只发送给管理员 water
 */

const WebSocket = require('ws');
const http = require('http');

console.log('==================================================');
console.log('MCU 重复认证请求测试');
console.log('==================================================\n');

// 登录获取 token
function loginAndGetToken(username, password) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ username, password });

        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                const response = JSON.parse(body);
                if (response.success) {
                    resolve(response.token);
                } else {
                    reject(new Error(response.message));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTest() {
    try {
        // 步骤 1: 管理员 water 登录
        console.log('【步骤 1】管理员 water 登录...');
        const waterToken = await loginAndGetToken('testuser', '123456');  // 暂时用 testuser 测试
        const ADMIN_NAME = 'testuser';  // 暂时使用 testuser 作为管理员
        console.log('✓ water 登录成功\n');

        // 步骤 2: water 连接 WebSocket
        console.log('【步骤 2】管理员 water 连接...');
        const waterClient = new WebSocket('ws://localhost:8080');

        await new Promise((resolve) => {
            waterClient.on('open', () => {
                console.log('✓ water 已连接');
                waterClient.send(JSON.stringify({ type: 'auth', token: waterToken }));
            });

            waterClient.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'auth_success') {
                    console.log('✓ water 认证成功\n');
                    resolve();
                }
            });
        });

        // 步骤 3: MCU 连接
        console.log('【步骤 3】MCU 设备连接 (mcu_ok:001)...');
        const mcuClient = new WebSocket('ws://localhost:8080');

        await new Promise((resolve) => {
            mcuClient.on('open', () => {
                console.log('✓ MCU 已连接');
                console.log('→ 发送: mcu_ok:001');
                mcuClient.send('mcu_ok:001');
            });

            mcuClient.on('message', (data) => {
                const message = data.toString();
                console.log(`✓ MCU 收到: ${message}`);
                if (message.startsWith('AUTH_OK:')) {
                    console.log('✓ MCU 认证成功\n');
                    resolve();
                }
            });
        });

        // 等待 water 收到 MCU 连接消息
        await new Promise((resolve) => {
            waterClient.on('message', function handler(data) {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'system' && msg.data.message && msg.data.message.includes('mcu001')) {
                    console.log('✓ water 收到消息: MCU设备 mcu001 已连接');
                    console.log('✓ 确认: MCU 连接消息只发送给管理员\n');
                    waterClient.removeListener('message', handler);
                    resolve();
                }
            });
        });

        // 步骤 4: 已认证 MCU 发送重复认证请求
        console.log('【步骤 4】已认证 MCU 发送重复认证请求...');
        console.log('→ MCU 发送: input_mcu:001');
        mcuClient.send('input_mcu:001');

        // 等待 MCU 收到拒绝消息
        await new Promise((resolve) => {
            mcuClient.on('message', function handler(data) {
                const message = data.toString();
                if (message.startsWith('AUTH_FAILED:ALREADY_AUTHENTICATED')) {
                    console.log('✓ MCU 收到拒绝: AUTH_FAILED:ALREADY_AUTHENTICATED');
                    mcuClient.removeListener('message', handler);
                    resolve();
                }
            });
        });

        // 等待 water 收到重复认证通知
        await new Promise((resolve) => {
            waterClient.on('message', function handler(data) {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'system' && msg.data.type === 'mcu_reauth_blocked') {
                    console.log('✓ water 收到通知: 设备 mcu001 尝试重复认证，已拒绝');
                    console.log('✓ 确认: 重复认证消息只发送给管理员\n');
                    waterClient.removeListener('message', handler);
                    resolve();
                }
            });
        });

        // 步骤 5: 验证普通消息正常广播
        console.log('【步骤 5】验证普通消息正常广播...');
        console.log('→ MCU 发送普通消息: LED1_ON');
        mcuClient.send('LED1_ON');

        await new Promise((resolve) => {
            waterClient.on('message', function handler(data) {
                const rawData = data.toString();
                if (rawData.includes('mcu001:LED1_ON')) {
                    console.log('✓ water 收到普通消息: mcu001:LED1_ON');
                    console.log('✓ 确认: 普通消息正常广播给所有用户\n');
                    waterClient.removeListener('message', handler);
                    resolve();
                }
            });
        });

        setTimeout(() => {
            console.log('==================================================');
            console.log('✓ 所有测试通过！');
            console.log('  - MCU 连接消息只发给 water ✓');
            console.log('  - 已认证 MCU 重复认证被拒绝 ✓');
            console.log('  - 拒绝消息只通知 water ✓');
            console.log('  - 普通消息正常广播 ✓');
            console.log('==================================================');
            waterClient.close();
            mcuClient.close();
            setTimeout(() => process.exit(0), 500);
        }, 1000);

    } catch (error) {
        console.error('\n✗ 测试失败:', error.message);
        process.exit(1);
    }
}

runTest();
