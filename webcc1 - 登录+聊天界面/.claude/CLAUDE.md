# WebCC1 终端管理系统 - 项目提示词

## 项目信息
- **项目名称**: WebCC1 物联网设备管理平台
- **当前版本**: v1.1.0
- **创建日期**: 2026-01-23
- **项目路径**: D:\AAAWaterCode\webcc1\
- **当前阶段**: ✅ 基础通信 + LED控制 → 🔄 内网穿透优化

## 项目背景（重要！）

### 真实应用场景
这是一个**物联网设备管理平台**，用于单片机设备的远程通信和控制。

### 硬件架构
```
┌─────────────┐
│   单片机    │ (嵌入式设备)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  4G 模块    │ (移动网络，WebSocket 客户端)
└──────┬──────┘
       │
       ↓ (4G 网络，WebSocket 协议)
       │
┌──────▼──────────────────────────┐
│   WebCC1 服务器 (本项目)        │
│   - Node.js + WebSocket         │
│   - 监听 8080 端口              │
│   - 需要内网穿透实现公网访问    │
└──────┬──────────────────────────┘
       │
       ↓
┌──────▼──────┐
│  网页界面   │ (WebSocket 客户端，监控和控制)
└─────────────┘
```

### 核心需求
1. **单片机通过 4G 网络连接服务器**
   - 4G 模块固件已配置为 WebSocket 协议
   - 需要一个稳定的 WebSocket 服务器接收数据

2. **服务器需要公网可访问**
   - 单片机在任何地方都能连接（通过 4G 网络）
   - 需要内网穿透将本地服务器暴露到公网

3. **网页界面监控设备**
   - 实时查看单片机发送的数据
   - 可以通过网页向单片机发送指令

### 通信协议（重要！）

#### 双协议支持
系统支持两种消息格式，**服务器自动识别**：

1. **JSON协议**（系统消息）
   - 用途：连接通知、用户上下线、错误消息
   - 格式：`{"type":"...", "from":"...", "data":"..."}`
   - 处理：服务器保持JSON格式转发

2. **纯字符串协议**（用户消息/LED控制）
   - 用途：聊天消息、单片机LED控制指令
   - 格式：直接字符串如 `"123"` 或 `"LED1_ON"`
   - 处理：服务器透传，不包装JSON

#### 协议处理流程
```
客户端发送JSON {type:'message', data:'123'}
         ↓
服务器提取内容 '123'
         ↓
广播纯字符串 '123'
         ↓
其他客户端收到 '123'（前端临时包装对象显示）
```

#### 消息类型
- `connection` - 连接成功（JSON格式，服务器→客户端）
- `system` - 系统消息（JSON格式，用户加入/离开）
- `message` - 普通消息（**提取后透传纯字符串**）
- `error` - 错误消息（JSON格式）
- LED控制 - 纯字符串（如 `LED1_ON`, `LED2_OFF`）

### 当前进度
- ✅ **第一阶段完成**: WebSocket 服务器 + 双协议支持
- ✅ **LED控制系统**: 8路LED可视化控制界面
- ✅ **纯字符串透传**: 兼容单片机简单通信
- 🔄 **进行中**: 内网穿透配置优化
- ⏳ **待完成**: 单片机硬件接入测试

## 核心约束（必须遵守）

### 1. 前端无框架约束
- ❌ 禁止使用 React、Vue、Angular 等前端框架
- ✅ 使用原生 HTML、CSS、JavaScript
- **原因**: 降低复杂度，符合奥卡姆剃刀原则

### 2. CSS 独立文件约束
- ❌ 禁止在 HTML 中嵌入 `<style>` 标签
- ❌ 禁止使用内联样式
- ✅ 所有样式必须写在 `frontend/css/style.css`
- **原因**: 样式与结构分离，便于维护

### 3. 路径约束
- ✅ Windows 环境，使用反斜杠路径（`\`）
- ✅ 所有文件操作使用绝对路径

### 4. 编码约束
- ✅ 所有文件使用 UTF-8 编码
- ✅ 注释使用简体中文

## 技术栈

### 后端
- Node.js + Express（HTTP 服务器）
- ws 库（WebSocket）
- dotenv（环境变量）

### 前端
- 原生 HTML5
- 原生 CSS3（独立文件）
- 原生 JavaScript ES6+

## 架构设计

### 目录结构
```
D:\AAAWaterCode\webcc1\
├── backend\
│   ├── server.js          # WebSocket 服务器核心
│   ├── package.json       # 依赖配置
│   └── .env              # 环境变量
├── frontend\
│   ├── index.html        # 页面结构
│   ├── css\
│   │   └── style.css     # 样式文件
│   └── js\
│       └── app.js        # 前端逻辑
└── docs\
    ├── PROJECT_PROMPT.md  # 详细工程文档
    └── API_DESIGN.md      # API 文档
```

### 关键设计决策

**Q: 为什么前后端分离？**
A: 便于后续集成内网穿透（frp/ngrok），支持独立部署和扩展。

**Q: 为什么不用 socket.io？**
A: ws 库更轻量（~10KB vs ~200KB），性能更高，协议标准。

**Q: 为什么后端托管前端？**
A: 简化部署，避免跨域问题，单一端口对外服务。

## WebSocket 消息协议

### 消息格式
```json
{
  "type": "消息类型",
  "from": "发送者ID",
  "data": "消息内容或对象",
  "timestamp": 1737628800000
}
```

### 消息类型
- `connection` - 连接成功（服务器→客户端）
- `system` - 系统消息（用户加入/离开）
- `message` - 普通消息（客户端↔服务器）
- `error` - 错误消息

### 预留扩展字段（v2.0+）
- `room` - 房间/分组ID
- `target` - 目标客户端ID
- `token` - 认证令牌

## 协议处理机制（核心逻辑）

### 服务器端处理（server.js）

#### 1. 消息接收与识别
```javascript
ws.on('message', (data) => {
    const rawData = data.toString();

    try {
        const message = JSON.parse(rawData);  // 尝试解析JSON

        if (message.type === 'message') {
            // 普通聊天消息：提取内容后透传
            const content = message.data;
            broadcastRaw(content, clientId);  // 纯字符串广播
        } else {
            // 系统消息：保持JSON格式转发
            broadcast(createMessage(...), clientId);
        }
    } catch {
        // 解析失败：纯字符串（LED控制）
        broadcastRaw(rawData, clientId);  // 直接透传
    }
});
```

#### 2. 双函数策略
- **broadcast(message, excludeId)** - JSON序列化后广播（系统消息）
- **broadcastRaw(string, excludeId)** - 直接发送字符串（用户消息/LED）

### 前端处理（app.js）

#### 1. 消息接收与解析
```javascript
onMessage(event) {
    const rawData = event.data;

    try {
        const message = JSON.parse(rawData);  // JSON消息
        // 处理系统消息：connection, system, error
    } catch {
        // 纯字符串消息
        if (rawData.startsWith('LED')) {
            handleLedMessage(rawData);  // LED控制
        } else {
            // 临时包装对象显示聊天消息
            addMessage({ message: rawData, timestamp: Date.now() }, 'received');
        }
    }
}
```

#### 2. 发送消息格式
- **聊天模式**：`{type:'message', data:'内容'}` → 服务器提取 → 广播纯字符串
- **LED模式**：`'LED1_ON'` → 服务器直接转发 → 广播纯字符串

### LED控制协议

#### 控制命令（网页→单片机）
```
LED1_ON        # 打开LED1
LED2_OFF       # 关闭LED2
LED_ALL_ON     # 全部打开
LED_ALL_OFF    # 全部关闭
LED_STATUS     # 查询状态
```

#### 状态返回（单片机→网页）
```
LED1_ON           # LED1当前状态：亮
LED3_OFF          # LED3当前状态：灭
STATUS:11110000   # 8位状态串（1=亮，0=灭）
```

### 关键设计优势

1. **单片机友好**：收发纯字符串，无需JSON解析库
2. **自动识别**：服务器通过try-catch自动区分协议
3. **前端灵活**：临时包装对象，兼容显示逻辑
4. **日志简洁**：终端只显示消息内容，不显示JSON结构

## 代码规范

### 命名规范
- 变量/函数：驼峰式（camelCase）
- 常量：大写下划线（UPPER_SNAKE_CASE）
- 类名：帕斯卡式（PascalCase）

### 注释规范
```javascript
/**
 * 函数说明
 * @param {类型} 参数名 - 参数说明
 * @returns {类型} 返回值说明
 */
function example() { }

// ==================== 模块分隔符 ====================
```

## 未来规划（物联网设备管理方向）

### 第二阶段：内网穿透（正在进行 🔄）
**目标**: 让单片机从任何地方通过 4G 网络连接服务器

**实施方案**:
- 选择内网穿透工具（cpolar / ngrok / frp）
- 配置隧道，将本地 8080 端口映射到公网
- 获取公网访问地址（如 `wss://abc123.cpolar.cn`）
- 前端显示公网地址，方便单片机配置
- 测试单片机通过 4G 网络连接

**关键点**:
- 单片机 4G 模块需要填写公网地址
- 协议可能需要升级到 WSS (WebSocket Secure)
- 确保穿透服务稳定性

### 第三阶段：设备管理功能
**目标**: 区分设备类型，实现设备管理

**功能设计**:
- 区分客户端类型（单片机 / 网页）
- 设备列表显示（在线设备、离线设备）
- 设备数据解析和展示
- 向指定设备发送指令
- 设备分组管理

### 第四阶段：数据持久化和监控
**目标**: 保存设备数据，实现历史查询和监控

**功能设计**:
- 数据库存储设备数据
- 历史数据查询
- 数据可视化（图表）
- 设备状态监控和告警
- 用户认证系统

## 当前功能

### 已实现 ✅

#### 核心通信
- WebSocket 服务器（监听 8080 端口）
- 多客户端连接管理
- **双协议支持**（JSON + 纯字符串）
- 实时消息透传（纯字符串广播）
- 心跳检测（30秒间隔）

#### LED控制系统
- **双模式界面**：聊天模式 ↔ LED控制模式
- **8路LED控制**：可视化指示器（点击切换）
- **批量控制**：全部打开/关闭、状态查询
- **实时日志**：显示发送/接收的LED指令
- **单片机兼容**：纯字符串协议，无需JSON解析

#### 用户界面
- 现代化 Web 界面（渐变紫色主题）
- 响应式设计（移动端适配）
- 选项卡切换（聊天/LED模式）
- 实时消息显示

### 访问方式
```
本地: http://localhost:8080
公网: http://aly.water21.top (需内网穿透)
```

## 常见开发任务

### 启动服务器
```bash
cd D:\AAAWaterCode\webcc1\backend
npm start
```

### 修改前端
编辑以下文件后刷新浏览器即可：
- `frontend/index.html` - 页面结构
- `frontend/css/style.css` - 样式
- `frontend/js/app.js` - 逻辑

### 修改后端
编辑 `backend/server.js` 后需要重启服务器：
1. Ctrl+C 停止服务器
2. `npm start` 重新启动

### 修改配置
编辑 `backend/.env` 文件：
```bash
PORT=8080
HOST=0.0.0.0
WS_HEARTBEAT_INTERVAL=30000
```

## 开发注意事项

### 扩展性设计
- 消息协议预留扩展字段
- 配置与代码分离（.env）
- 模块化代码结构

### 安全性
- HTML 转义防 XSS
- 输入验证
- 未来计划：HTTPS/WSS、JWT 认证

### 性能考虑
- 单服务器支持 ~5000 并发
- 消息延迟 < 50ms（局域网）
- 未来优化：Redis、负载均衡

## AI 协作指南

使用 AI 协助开发时：
1. ✅ 始终遵守核心约束
2. ✅ 保持代码风格一致
3. ✅ 添加详细中文注释
4. ✅ 考虑未来扩展性
5. ❌ 不盲目添加新依赖
6. ❌ 不过度设计

## 详细文档

如需更多信息，请参考：
- 详细工程文档：`docs/PROJECT_PROMPT.md`
- API 设计文档：`docs/API_DESIGN.md`
- 项目说明：`README.md`

---

**最后更新**: 2026-01-24
**项目状态**: ✅ v1.1.0 LED控制系统上线，双协议支持完成
**关键特性**: 纯字符串透传、单片机友好、双模式界面
