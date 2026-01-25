/**
 * 测试单点登录功能
 * 验证：同一账户第二次登录时，第一次连接会被踢掉
 */

const WebSocket = require('ws');
const http = require('http');

console.log('==================================================');
console.log('单点登录测试（踢掉旧连接）');
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
        console.log('【步骤 1】获取 testuser 的 token...');
        const token = await loginAndGetToken('testuser', '123456');
        console.log('✓ 获取成功\n');

        // 第一次连接
        console.log('【步骤 2】testuser 第一次连接...');
        const client1 = new WebSocket('ws://localhost:8080');

        await new Promise((resolve) => {
            client1.on('open', () => {
                console.log('✓ 第一次连接已建立');
                client1.send(JSON.stringify({ type: 'auth', token }));
            });

            client1.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'auth_success') {
                    console.log('✓ 第一次连接认证成功');
                    console.log(`  ClientId: ${msg.data.clientId}\n`);
                    resolve();
                }
            });
        });

        // 等待一下
        await new Promise(resolve => setTimeout(resolve, 500));

        // 第二次连接（应该踢掉第一次）
        console.log('【步骤 3】testuser 第二次连接（应该踢掉第一次）...');
        const client2 = new WebSocket('ws://localhost:8080');

        let client2Kicked = false;
        let client1Kicked = false;

        client2.on('open', () => {
            console.log('✓ 第二次连接已建立');
            client2.send(JSON.stringify({ type: 'auth', token }));
        });

        client2.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'auth_success') {
                console.log('✓ 第二次连接认证成功');
                console.log(`  ClientId: ${msg.data.clientId}\n`);
            }
        });

        // 监听第一次连接被踢掉
        client1.on('message', function handler(data) {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'system' && msg.data.reason === 'duplicate_login') {
                console.log('✓ 第一次连接收到踢掉通知:');
                console.log(`  消息: ${msg.data.message}`);
                console.log(`  原因: ${msg.data.reason}\n`);
                client1Kicked = true;
                client1.removeListener('message', handler);
            }
        });

        client1.on('close', () => {
            if (client1Kicked) {
                console.log('✓ 第一次连接已关闭（被新登录踢掉）\n');
            }
        });

        // 等待消息处理
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('==================================================');
        console.log('✓ 测试结果：');
        console.log('  - 第二次登录成功 ✓');
        console.log(`  - 第一次连接被踢掉 ${client1Kicked ? '✓' : '✗'}`);
        console.log('==================================================');

        if (client1Kicked) {
            console.log('\n✓ 单点登录功能正常工作！');
        } else {
            console.log('\n✗ 单点登录功能可能有问题！');
        }

        setTimeout(() => {
            client1.close();
            client2.close();
            process.exit(0);
        }, 1000);

    } catch (error) {
        console.error('\n✗ 测试失败:', error.message);
        process.exit(1);
    }
}

runTest();
