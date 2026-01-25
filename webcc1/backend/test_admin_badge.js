/**
 * 测试管理员标识功能
 * 验证管理员用户在消息中显示特殊标识
 */

const WebSocket = require('ws');
const http = require('http');

console.log('==================================================');
console.log('管理员标识测试');
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
        // 步骤 1: 管理员 testuser 登录（临时使用 testuser 作为管理员）
        console.log('【步骤 1】管理员 testuser 登录...');
        const adminToken = await loginAndGetToken('testuser', '123456');
        console.log('✓ testuser 登录成功\n');

        // 步骤 2: 普通用户登录（如果不存在就注册）
        console.log('【步骤 2】普通用户 user2 登录...');
        let user2Token;
        try {
            user2Token = await loginAndGetToken('user2', '123456');
            console.log('✓ user2 登录成功\n');
        } catch {
            // 用户不存在，注册
            console.log('→ user2 不存在，注册新用户...');
            await new Promise((resolve) => {
                const data = JSON.stringify({ username: 'user2', password: '123456' });
                const options = {
                    hostname: 'localhost',
                    port: 8080,
                    path: '/api/register',
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
                            console.log('✓ user2 注册成功');
                        }
                        resolve();
                    });
                });
                req.write(data);
                req.end();
            });
            user2Token = await loginAndGetToken('user2', '123456');
            console.log('✓ user2 登录成功\n');
        }

        // 步骤 3: 连接 WebSocket
        console.log('【步骤 3】连接 WebSocket...\n');

        const adminClient = new WebSocket('ws://localhost:8080');
        const user2Client = new WebSocket('ws://localhost:8080');

        await Promise.all([
            new Promise((resolve) => {
                adminClient.on('open', () => {
                    console.log('✓ testuser (管理员) 已连接');
                    adminClient.send(JSON.stringify({ type: 'auth', token: adminToken }));
                });
                adminClient.on('message', (data) => {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'auth_success') {
                        console.log('✓ testuser 认证成功\n');
                        resolve();
                    }
                });
            }),
            new Promise((resolve) => {
                user2Client.on('open', () => {
                    console.log('✓ user2 已连接');
                    user2Client.send(JSON.stringify({ type: 'auth', token: user2Token }));
                });
                user2Client.on('message', (data) => {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'auth_success') {
                        console.log('✓ user2 认证成功\n');
                        resolve();
                    }
                });
            })
        ]);

        // 步骤 4: 测试消息发送
        console.log('【步骤 4】测试消息发送...\n');

        // user2 发送消息
        console.log('→ user2 发送: "大家好"');
        user2Client.send(JSON.stringify({ type: 'message', data: '大家好' }));

        await new Promise(resolve => setTimeout(resolve, 500));

        // testuser (管理员) 发送消息
        console.log('→ testuser (管理员) 发送: "欢迎加入"');
        adminClient.send(JSON.stringify({ type: 'message', data: '欢迎加入' }));

        // 等待接收消息
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n==================================================');
        console.log('✓ 测试完成！');
        console.log('==================================================');
        console.log('请检查网页显示：');
        console.log('  - testuser 的消息应显示: 🛡️ [管理员] testuser (金色)');
        console.log('  - user2 的消息应显示: 来自 user2 (普通)');
        console.log('==================================================');

        setTimeout(() => {
            adminClient.close();
            user2Client.close();
            process.exit(0);
        }, 3000);

    } catch (error) {
        console.error('\n✗ 测试失败:', error.message);
        process.exit(1);
    }
}

runTest();
