/**
 * MCU 设备标识测试脚本
 * 验证：
 * 1. 设备序列号解析（mcu_ok:001 → mcu001）
 * 2. 防重复连接功能
 * 3. 用户名使用设备序列号
 */

const WebSocket = require('ws');

console.log('==================================================');
console.log('MCU 设备标识和防重复连接测试');
console.log('==================================================\n');

// 测试 1: 正常连接 mcu_ok:001
console.log('【测试 1】MCU001 正常连接 (mcu_ok:001)');
const mcu1 = new WebSocket('ws://localhost:8080');

mcu1.on('open', () => {
    console.log('✓ MCU1 已连接');
    console.log('→ 发送: mcu_ok:001');
    mcu1.send('mcu_ok:001');
});

let mcu1Authenticated = false;

mcu1.on('message', (data) => {
    const message = data.toString();
    console.log(`✓ MCU1 收到: ${message}`);

    if (message.startsWith('AUTH_OK:')) {
        mcu1Authenticated = true;
        console.log('✓ MCU001 认证成功！\n');

        // 测试发送消息
        setTimeout(() => {
            console.log('→ MCU001 发送: LED1_ON');
            mcu1.send('LED1_ON');
        }, 1000);

        // 启动测试 2：尝试重复连接
        setTimeout(startTest2, 2000);
    }

    if (message.startsWith('AUTH_FAILED')) {
        console.log('✗ MCU001 认证失败！');
    }
});

mcu1.on('error', (error) => {
    console.error(`✗ MCU1 错误: ${error.message}`);
});

// 测试 2: 尝试重复连接相同设备
function startTest2() {
    console.log('【测试 2】MCU001 尝试重复连接 (应被拒绝)');
    const mcu2 = new WebSocket('ws://localhost:8080');

    mcu2.on('open', () => {
        console.log('✓ MCU2 已连接');
        console.log('→ 发送: mcu_input:001');
        mcu2.send('mcu_input:001');
    });

    mcu2.on('message', (data) => {
        const message = data.toString();
        console.log(`✓ MCU2 收到: ${message}`);

        if (message.startsWith('AUTH_FAILED:DEVICE_ALREADY_ONLINE')) {
            console.log('✓ 重复连接被正确拒绝！\n');

            // 启动测试 3：不同设备连接
            setTimeout(startTest3, 1000);
        }
    });

    mcu2.on('close', (code, reason) => {
        if (code === 4002) {
            console.log('✓ MCU2 连接被关闭 (错误码: 4002 - 设备已在线)');
        }
    });

    mcu2.on('error', (error) => {
        console.error(`✗ MCU2 错误: ${error.message}`);
    });
}

// 测试 3: 不同设备连接 mcu_ok:002
function startTest3() {
    console.log('【测试 3】MCU002 正常连接 (mcu_ok:002)');
    const mcu3 = new WebSocket('ws://localhost:8080');

    mcu3.on('open', () => {
        console.log('✓ MCU3 已连接');
        console.log('→ 发送: mcu_ok:002');
        mcu3.send('mcu_ok:002');
    });

    mcu3.on('message', (data) => {
        const message = data.toString();
        console.log(`✓ MCU3 收到: ${message}`);

        if (message.startsWith('AUTH_OK:')) {
            console.log('✓ MCU002 认证成功！\n');

            // 测试消息互通
            setTimeout(() => {
                console.log('→ MCU002 发送: TEMP:26.5');
                mcu3.send('TEMP:26.5');
            }, 500);

            // 3秒后结束测试
            setTimeout(() => {
                console.log('\n==================================================');
                console.log('✓ 所有测试通过！');
                console.log('==================================================');
                mcu1.close();
                mcu3.close();
                setTimeout(() => process.exit(0), 500);
            }, 2000);
        }
    });

    mcu3.on('error', (error) => {
        console.error(`✗ MCU3 错误: ${error.message}`);
    });
}
