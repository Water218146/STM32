/**
 * 测试管理员标识显示
 * 验证前端是否正确显示管理员标识
 */

const WebSocket = require('ws');
const http = require('http');

console.log('==================================================');
console.log('管理员标识显示测试');
console.log('==================================================\n');
console.log('请打开网页 http://localhost:8080 查看效果\n');

async function login(username) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ username, password: '123456' });
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
        // 注册 testuser（如果不存在）
        console.log('【准备】确保测试用户存在...');
        try {
            await login('testuser');
        } catch {
            // 注册
            await new Promise((resolve) => {
                const data = JSON.stringify({ username: 'testuser', password: '123456' });
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
                    res.on('end', () => resolve());
                });
                req.write(data);
                req.end();
            });
        }

        // 普通用户连接
        console.log('【步骤 1】普通用户 user2 连接...');
        const user2Token = await login('user2');
        const user2Client = new WebSocket('ws://localhost:8080');

        await new Promise((resolve) => {
            user2Client.on('open', () => {
                user2Client.send(JSON.stringify({ type: 'auth', token: user2Token }));
            });
            user2Client.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'auth_success') {
                    console.log('✓ user2 已连接（普通用户）\n');
                    resolve();
                }
            });
        });

        // 管理员连接
        console.log('【步骤 2】管理员 testuser 连接...');
        const adminToken = await login('testuser');
        const adminClient = new WebSocket('ws://localhost:8080');

        await new Promise((resolve) => {
            adminClient.on('open', () => {
                adminClient.send(JSON.stringify({ type: 'auth', token: adminToken }));
            });
            adminClient.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'auth_success') {
                    console.log('✓ testuser 已连接（管理员）\n');
                    resolve();
                }
            });
        });

        // 发送测试消息
        console.log('【步骤 3】发送测试消息...\n');
        console.log('→ user2 发送: "我是普通用户"');
        user2Client.send(JSON.stringify({ type: 'message', data: '我是普通用户' }));

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('→ testuser 发送: "我是管理员"');
        adminClient.send(JSON.stringify({ type: 'message', data: '我是管理员' }));

        console.log('\n==================================================');
        console.log('✓ 测试完成！');
        console.log('==================================================');
        console.log('请检查网页显示：');
        console.log('  1. user2 应显示: 来自 user2');
        console.log('  2. testuser 应显示: 🛡️ [管理员] testuser（金色）');
        console.log('==================================================');
        console.log('\n按 Ctrl+C 退出...\n');

        // 保持连接
        process.on('SIGINT', () => {
            user2Client.close();
            adminClient.close();
            process.exit(0);
        });

    } catch (error) {
        console.error('\n✗ 测试失败:', error.message);
        process.exit(1);
    }
}

runTest();
