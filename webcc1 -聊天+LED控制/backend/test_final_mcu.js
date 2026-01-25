/**
 * MCU 最终测试脚本（修正版）
 * 验证用户实际使用的格式：
 *   - 上电: mcu_ok:001
 *   - 按键: input_mcu:002（使用不同ID避免冲突）
 */

const WebSocket = require('ws');

console.log('==================================================');
console.log('MCU 认证测试（用户实际格式）');
console.log('==================================================\n');

let test1Complete = false;

// 测试 1: 上电自动认证 mcu_ok:001
console.log('【测试 1】上电自动认证 (mcu_ok:001)');
const mcu1 = new WebSocket('ws://localhost:8080');

mcu1.on('open', () => {
    console.log('✓ MCU 已连接');
    console.log('→ 上电自动发送: mcu_ok:001');
    mcu1.send('mcu_ok:001');
});

mcu1.on('message', (data) => {
    const message = data.toString();
    console.log(`✓ MCU 收到: ${message}`);

    if (message.startsWith('AUTH_OK:') && !test1Complete) {
        test1Complete = true;
        console.log('✓ 认证成功！设备序列号已解析\n');

        // 发送测试消息
        setTimeout(() => {
            console.log('→ 发送 LED 控制指令: LED1_ON');
            mcu1.send('LED1_ON');
        }, 500);

        // 3秒后断开并测试按键认证
        setTimeout(() => {
            console.log('\n【断开 mcu001】\n');
            mcu1.close();
        }, 2000);
    }
});

mcu1.on('close', () => {
    if (test1Complete) {
        // 等待服务器处理断开，然后测试按键认证
        setTimeout(testButtonAuth, 1000);
    }
});

mcu1.on('error', (error) => {
    console.error(`✗ 错误: ${error.message}`);
});

// 测试 2: 按键手动认证 input_mcu:001
function testButtonAuth() {
    console.log('【测试 2】按键手动认证 (input_mcu:001)');
    const mcu2 = new WebSocket('ws://localhost:8080');

    mcu2.on('open', () => {
        console.log('✓ MCU 已连接');
        console.log('→ 按下 KEY6 发送: input_mcu:001');
        mcu2.send('input_mcu:001');
    });

    mcu2.on('message', (data) => {
        const message = data.toString();
        console.log(`✓ MCU 收到: ${message}`);

        if (message.startsWith('AUTH_OK:')) {
            console.log('✓ 按键认证成功！\n');

            setTimeout(() => {
                console.log('→ 发送传感器数据: TEMP:25.5');
                mcu2.send('TEMP:25.5');
            }, 500);

            setTimeout(() => {
                console.log('\n==================================================');
                console.log('✓ 所有测试通过！');
                console.log('  - mcu_ok:001    ✓ 上电认证');
                console.log('  - input_mcu:001 ✓ 按键认证');
                console.log('==================================================');
                mcu2.close();
                setTimeout(() => process.exit(0), 500);
            }, 2000);
        }
    });

    mcu2.on('error', (error) => {
        console.error(`✗ 错误: ${error.message}`);
    });
}
