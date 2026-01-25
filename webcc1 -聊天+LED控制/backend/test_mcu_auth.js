/**
 * MCU 认证测试脚本
 * 模拟单片机通过 mcu_ok 或 mcu_input 字符串认证
 */

const WebSocket = require('ws');

console.log('==================================================');
console.log('MCU 认证测试脚本');
console.log('==================================================\n');

// 测试 1: mcu_ok 自动认证
console.log('【测试 1】模拟 MCU 自动认证 (mcu_ok)');
const mcu1 = new WebSocket('ws://localhost:8080');

mcu1.on('open', () => {
    console.log('✓ MCU1 已连接到服务器');
    console.log('→ 发送认证字符串: mcu_ok');
    mcu1.send('mcu_ok');
});

mcu1.on('message', (data) => {
    const message = data.toString();
    console.log(`✓ MCU1 收到消息: ${message}`);

    // 如果收到认证成功确认
    if (message.startsWith('AUTH_OK:')) {
        console.log('✓ MCU1 认证成功！\n');

        // 发送测试消息
        setTimeout(() => {
            console.log('→ MCU1 发送 LED 状态: LED1_ON');
            mcu1.send('LED1_ON');
        }, 1000);

        // 启动测试 2
        setTimeout(startTest2, 2000);
    }
});

mcu1.on('error', (error) => {
    console.error(`✗ MCU1 错误: ${error.message}`);
});

// 测试 2: mcu_input 手动认证
function startTest2() {
    console.log('【测试 2】模拟 MCU 手动认证 (mcu_input)');
    const mcu2 = new WebSocket('ws://localhost:8080');

    mcu2.on('open', () => {
        console.log('✓ MCU2 已连接到服务器');
        console.log('→ 发送认证字符串: mcu_input');
        mcu2.send('mcu_input');
    });

    mcu2.on('message', (data) => {
        const message = data.toString();
        console.log(`✓ MCU2 收到消息: ${message}`);

        // 如果收到认证成功确认
        if (message.startsWith('AUTH_OK:')) {
            console.log('✓ MCU2 认证成功！\n');

            // 发送传感器数据
            setTimeout(() => {
                console.log('→ MCU2 发送传感器数据: TEMP:25.3');
                mcu2.send('TEMP:25.3');
            }, 1000);

            // 5 秒后关闭所有连接并退出
            setTimeout(() => {
                console.log('\n==================================================');
                console.log('测试完成！关闭连接...');
                console.log('==================================================');
                mcu1.close();
                mcu2.close();
                setTimeout(() => process.exit(0), 500);
            }, 3000);
        }
    });

    mcu2.on('error', (error) => {
        console.error(`✗ MCU2 错误: ${error.message}`);
    });
}
