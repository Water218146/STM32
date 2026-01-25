/**
 * 简单测试：已认证 MCU 发送重复认证请求
 */

const WebSocket = require('ws');

console.log('==================================================');
console.log('MCU 重复认证测试');
console.log('==================================================\n');

console.log('【测试】MCU 连接后发送重复认证请求');
const mcu = new WebSocket('ws://localhost:8080');

let authSuccess = false;

mcu.on('open', () => {
    console.log('✓ MCU 已连接');
    console.log('→ 发送: mcu_ok:001');
    mcu.send('mcu_ok:001');
});

mcu.on('message', (data) => {
    const msg = data.toString();
    console.log(`✓ MCU 收到: ${msg}`);

    if (msg.startsWith('AUTH_OK:') && !authSuccess) {
        authSuccess = true;
        console.log('✓ MCU 认证成功！\n');

        // 等待1秒后发送重复认证请求
        setTimeout(() => {
            console.log('→ 已认证 MCU 发送: input_mcu:001');
            mcu.send('input_mcu:001');
        }, 1000);
    }

    if (msg.startsWith('AUTH_FAILED:ALREADY_AUTHENTICATED')) {
        console.log('✓ 收到拒绝: 重复认证被拒绝\n');
        console.log('==================================================');
        console.log('✓ 测试通过！');
        console.log('  - MCU 认证成功');
        console.log('  - 重复认证请求被拒绝');
        console.log('==================================================');
        mcu.close();
        setTimeout(() => process.exit(0), 500);
    }
});

mcu.on('error', (err) => {
    console.error(`✗ 错误: ${err.message}`);
});
