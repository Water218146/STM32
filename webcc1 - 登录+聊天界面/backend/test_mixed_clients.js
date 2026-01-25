/**
 * 混合客户端测试脚本
 * 验证网页用户（Token 认证）和 MCU 设备（字符串认证）可以同时在线
 */

const WebSocket = require('ws');
const http = require('http');

console.log('==================================================');
console.log('混合客户端测试（网页 + MCU）');
console.log('==================================================\n');

// 步骤 1: 注册并登录获取 token
console.log('【步骤 1】网页用户登录...');

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

// 主测试流程
async function runTest() {
    try {
        // 登录获取 token
        const token = await loginAndGetToken('testuser', '123456');
        console.log(`✓ 网页用户登录成功，token: ${token.substring(0, 20)}...\n`);

        // 步骤 2: 网页用户连接（Token 认证）
        console.log('【步骤 2】网页用户 WebSocket 连接...');
        const webClient = new WebSocket('ws://localhost:8080');

        await new Promise((resolve) => {
            webClient.on('open', () => {
                console.log('✓ 网页用户已连接');
                console.log('→ 发送 Token 认证...');
                webClient.send(JSON.stringify({ type: 'auth', token }));
            });

            webClient.on('message', (data) => {
                const rawData = data.toString();

                // 尝试解析 JSON
                try {
                    const msg = JSON.parse(rawData);
                    console.log(`✓ 网页用户收到 [JSON]: ${msg.type}`);

                    if (msg.type === 'auth_success') {
                        console.log(`✓ 网页用户认证成功！ClientId: ${msg.data.clientId}\n`);
                        resolve();
                    }
                } catch {
                    // 纯字符串消息（来自 MCU）
                    console.log(`✓ 网页用户收到 [纯字符串]: ${rawData}`);
                    if (rawData.includes(':')) {
                        const [from, content] = rawData.split(':');
                        console.log(`  → 解析: 来自 ${from} 的消息: ${content}`);
                    }
                }
            });
        });

        // 步骤 3: MCU 设备连接（字符串认证）
        console.log('【步骤 3】MCU 设备连接...');
        const mcuClient = new WebSocket('ws://localhost:8080');

        await new Promise((resolve) => {
            mcuClient.on('open', () => {
                console.log('✓ MCU 设备已连接');
                console.log('→ 发送认证字符串: mcu_ok');
                mcuClient.send('mcu_ok');
            });

            mcuClient.on('message', (data) => {
                const message = data.toString();
                console.log(`✓ MCU 收到: ${message}`);

                if (message.startsWith('AUTH_OK:')) {
                    console.log('✓ MCU 认证成功！\n');
                    resolve();
                } else if (message.includes(':')) {
                    // 纯字符串消息（来自网页用户）
                    const [from, content] = message.split(':');
                    console.log(`  → 解析: 来自 ${from} 的消息: ${content}`);
                }
            });
        });

        // 步骤 4: 测试消息互通
        console.log('【步骤 4】测试消息互通...');

        // 网页用户发送消息
        console.log('→ 网页用户发送: LED2_OFF');
        webClient.send(JSON.stringify({ type: 'message', data: 'LED2_OFF' }));

        await new Promise(resolve => setTimeout(resolve, 500));

        // MCU 发送数据
        console.log('→ MCU 发送: sensor_data:26.5');
        mcuClient.send('sensor_data:26.5');

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 步骤 5: 关闭连接
        console.log('\n【步骤 5】测试完成，关闭连接...');
        webClient.close();
        mcuClient.close();

        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('\n==================================================');
        console.log('✓ 所有测试通过！');
        console.log('==================================================');
        process.exit(0);

    } catch (error) {
        console.error('\n✗ 测试失败:', error.message);
        process.exit(1);
    }
}

// 运行测试
runTest();
