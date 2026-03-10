/**
 * 智谱AI API测试脚本
 * 用途：检查API密钥是否有效、网络是否连通
 * 使用：node test-ai-api.js
 */

require('dotenv').config();
const axios = require('axios');

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';
const ZHIPU_API_URL = process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || 'GLM-4-Flash';

console.log('='.repeat(60));
console.log('智谱AI API连接测试');
console.log('='.repeat(60));
console.log(`API地址: ${ZHIPU_API_URL}`);
console.log(`模型: ${ZHIPU_MODEL}`);
console.log(`密钥状态: ${ZHIPU_API_KEY ? `已配置 (${ZHIPU_API_KEY.substring(0, 10)}...)` : '❌ 未配置'}`);
console.log('='.repeat(60));

if (!ZHIPU_API_KEY || ZHIPU_API_KEY === 'your_api_key_here') {
    console.error('\n❌ 错误：API密钥未配置');
    console.log('\n请在 backend/.env 文件中配置 ZHIPU_API_KEY');
    console.log('获取地址：https://open.bigmodel.cn/\n');
    process.exit(1);
}

async function testAPI() {
    try {
        console.log('\n⏳ 正在发送测试请求...\n');

        const response = await axios.post(
            ZHIPU_API_URL,
            {
                model: ZHIPU_MODEL,
                messages: [
                    {
                        role: "user",
                        content: "你好，请回复'测试成功'"
                    }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${ZHIPU_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log('✅ API连接成功！\n');
        console.log('响应数据：');
        console.log('-'.repeat(60));
        console.log(`模型: ${response.data.model}`);
        console.log(`AI回复: ${response.data.choices[0].message.content}`);
        console.log(`Token使用: ${JSON.stringify(response.data.usage)}`);
        console.log('-'.repeat(60));
        console.log('\n🎉 测试通过！AI助手功能可以正常使用。\n');

    } catch (error) {
        console.error('\n❌ API连接失败！\n');

        if (error.response) {
            // 服务器返回错误
            console.log('错误详情：');
            console.log(`状态码: ${error.response.status}`);
            console.log(`错误信息: ${JSON.stringify(error.response.data, null, 2)}`);

            if (error.response.status === 401) {
                console.log('\n💡 可能原因：API密钥无效或已过期');
                console.log('解决方法：检查 .env 文件中的 ZHIPU_API_KEY 是否正确');
            } else if (error.response.status === 403) {
                console.log('\n💡 可能原因：账户余额不足或API权限不足');
            } else if (error.response.status === 429) {
                console.log('\n💡 可能原因：请求频率过高，触发限流');
            }
        } else if (error.request) {
            // 网络错误
            console.log('错误类型: 网络连接失败');
            console.log(`错误信息: ${error.message}`);
            console.log('\n💡 可能原因：');
            console.log('  1. 网络未连接或防火墙拦截');
            console.log('  2. API服务器地址错误');
            console.log('  3. 代理设置问题');
        } else {
            // 其他错误
            console.log(`错误信息: ${error.message}`);
        }

        console.log('\n');
        process.exit(1);
    }
}

testAPI();
