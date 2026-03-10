# AI助手问题诊断清单

## ✅ 已确认正常
- [x] 智谱AI API密钥配置正确
- [x] 独立测试脚本能成功调用智谱API
- [x] axios依赖已安装

## 🔍 需要检查的问题

### 1. 服务器是否正确加载了AI路由？

**检查方法**：
在服务器启动时，应该能看到类似日志：
```
WebCC1 终端管理系统 - 服务器已启动
HTTP服务器: http://0.0.0.0:8080
```

**测试**：
重启服务器，观察启动日志是否正常。

---

### 2. 前端请求是否到达后端？

**检查方法**：
在AI助手界面输入"你好"后，服务器终端应该显示：
```
[AI Chat] 收到请求: { hasToken: true, message: '你好', historyLength: 0 }
[AI Chat] 用户验证成功: water
[AI Chat] API配置正常，准备调用智谱AI
[AI Chat] 正在调用智谱API...
[AI Chat] 智谱API响应成功
```

**如果没有任何日志**：
- 说明请求没有到达后端
- 可能是前端URL错误或服务器未启动

**如果有日志但报错**：
- 查看具体错误信息
- 根据错误类型排查

---

### 3. 浏览器控制台错误

**检查步骤**：
1. 打开浏览器（http://localhost:8080）
2. 按F12打开开发者工具
3. 切换到Console标签
4. 在AI助手输入"你好"
5. 查看控制台日志

**期望看到的日志**：
```
[AI] 发送请求: { message: '你好', token: '已配置' }
[AI] 收到响应: 200 OK
[AI] 响应数据: { success: true, response: '...', needsConfirm: false }
```

**常见错误**：
- `404 Not Found` → 路由未定义，检查server.js
- `500 Internal Server Error` → 后端代码错误，查看服务器日志
- `Failed to fetch` → 服务器未运行或端口错误

---

### 4. 浏览器网络请求详情

**检查步骤**：
1. 开发者工具切换到Network（网络）标签
2. 在AI助手输入"你好"
3. 找到 `/api/ai/chat` 请求
4. 点击该请求，查看详细信息

**检查项**：
- **Request URL**: 应该是 `http://localhost:8080/api/ai/chat`
- **Status Code**: 应该是 `200 OK`
- **Request Headers**: 包含 `Content-Type: application/json`
- **Request Payload**:
  ```json
  {
    "token": "water_1_1737954321000_abc123",
    "message": "你好",
    "conversationHistory": []
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "response": "你好！...",
    "needsConfirm": false
  }
  ```

---

## 🛠️ 快速修复步骤

### 步骤1：重启服务器
```bash
# 在服务器终端按 Ctrl+C 停止
# 然后重新启动
cd D:\AAAWaterCode\webcc1\backend
npm start
```

### 步骤2：清除浏览器缓存
```
按 Ctrl+Shift+R 强制刷新页面
或清除浏览器缓存后重新登录
```

### 步骤3：查看完整日志

**服务器端**：
- 启动服务器时的完整输出
- 发送AI消息时的日志

**浏览器端**：
- Console标签的所有日志
- Network标签的请求详情

---

## 📝 日志收集模板

请提供以下信息以便进一步诊断：

### 1. 服务器启动日志
```
（粘贴 npm start 的完整输出）
```

### 2. 发送AI消息时的服务器日志
```
（粘贴发送"你好"时终端的输出）
```

### 3. 浏览器控制台日志
```
（粘贴Console标签的完整输出）
```

### 4. 网络请求详情
```
Request URL:
Status Code:
Response:
```

---

## 🎯 可能的原因和解决方案

| 问题现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| 前端显示"网络错误" | fetch请求失败 | 检查服务器是否运行 |
| 服务器无日志输出 | 路由未定义或代码未生效 | 确认server.js已保存并重启 |
| 401/403错误 | Token验证失败 | 重新登录获取新Token |
| 500错误 | 后端代码异常 | 查看服务器错误堆栈 |
| CORS错误 | 跨域问题 | 检查前后端地址是否一致 |

---

## 🔧 临时测试方案

如果问题难以定位，可以先用这个简化版本测试：

```bash
# 在backend目录创建test-route.js
node test-route.js
```

然后访问：http://localhost:8080/api/test

应该返回：`{ test: 'ok' }`

如果这个也失败，说明Express路由配置有问题。
