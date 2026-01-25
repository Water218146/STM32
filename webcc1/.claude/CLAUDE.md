# WebCC1 终端管理系统 - 项目提示词

## 项目信息
- **项目名称**: WebCC1 物联网设备管理平台
- **当前版本**: v1.2.0
- **创建日期**: 2026-01-23
- **项目路径**: D:\AAAWaterCode\webcc1\
- **当前阶段**: ✅ 用户系统 + 聊天功能 → 🔄 MCU设备控制与管理

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
- ✅ **用户系统**: 登录/注册/Token认证/单点登录
- ✅ **聊天功能**: 实时消息收发/在线用户显示
- ✅ **MCU快速认证**: 特殊字符串通道（mcu_ok:xxx / input_mcu:xxx）
- ✅ **管理员功能**: MCU设备监控窗口/金色标识/设备列表推送
- ✅ **LED控制协议**: 8路LED可视化控制界面
- 🔄 **当前阶段**: MCU设备控制与管理
- ⏳ **待完成**: 数据持久化/历史记录/高级控制功能

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

## MCU控制协议设计（第二阶段核心）

### 协议分层架构
```
┌─────────────────────────────────────────────────────┐
│                   网页控制界面                        │
│  (LED控制、传感器显示、高级控制面板)                  │
└────────────────┬────────────────────────────────────┘
                 ↓ 纯字符串协议
┌─────────────────────────────────────────────────────┐
│              WebCC1 服务器                           │
│  - 协议自动识别（JSON vs 纯字符串）                  │
│  - 消息路由（管理员 vs 普通用户）                    │
│  - 设备管理（在线列表、心跳监控）                     │
└────────────────┬────────────────────────────────────┘
                 ↓ 纯字符串透传
┌─────────────────────────────────────────────────────┐
│                 MCU设备（单片机）                     │
│  - 快速认证（mcu_ok:xxx）                           │
│  - 简单字符串解析                                    │
│  - GPIO控制/传感器读取                              │
└─────────────────────────────────────────────────────┘
```

### 消息格式规范

#### 1. 认证消息（MCU → 服务器）
```
mcu_ok:001         # 上电自动认证，设备序列号=001
input_mcu:001      # 按键手动认证，设备序列号=001
```

**服务器响应**:
```
AUTH_OK:mcu_001:mcu001              # 认证成功
AUTH_FAILED:DEVICE_ALREADY_ONLINE   # 设备已在线，拒绝连接
AUTH_FAILED:ALREADY_AUTHENTICATED    # 重复认证请求
```

#### 2. LED控制消息（双向）
**控制命令（网页 → MCU）**:
```
LED1_ON        # 打开LED1
LED2_OFF       # 关闭LED2
LED_ALL_ON     # 全部打开
LED_ALL_OFF    # 全部关闭
LED_STATUS     # 查询状态
```

**状态返回（MCU → 网页）**:
```
LED1_ON           # LED1当前状态：亮
LED3_OFF          # LED3当前状态：灭
STATUS:11110000   # 8位状态串（1=亮，0=灭）
```

#### 3. 传感器数据（MCU → 网页）
```
TEMP:25.3        # 温度数据（℃）
HUMID:60.5       # 湿度数据（%）
DISTANCE:150     # 距离数据（cm）
VOLTAGE:3.7      # 电压数据（V）
LIGHT:500        # 光照数据（lux）
MOTION:1         # 运动检测（1=检测到，0=未检测）
```

#### 4. 控制命令（网页 → MCU）
```
RELAY1_ON        # 打开继电器1
RELAY2_OFF       # 关闭继电器2
MOTOR_FWD        # 电机正转
MOTOR_REV        # 电机反转
MOTOR_STOP       # 电机停止
SERVO:90         # 舵机旋转到90度
PWM:50           # PWM占空比50%
```

#### 5. 查询命令（网页 → MCU）
```
GET_TEMP         # 获取温度
GET_HUMID        # 获取湿度
GET_ALL          # 获取所有传感器数据
```

### MCU代码模板（C语言参考）

```c
// ==================== MCU 快速认证 ====================
void mcu_authenticate() {
    char auth_cmd[32];
    sprintf(auth_cmd, "mcu_ok:%s", DEVICE_SERIAL);

    websocket_send(auth_cmd);

    // 等待响应（超时5秒）
    uint32_t start = HAL_GetTick();
    while (HAL_GetTick() - start < 5000) {
        char* response = websocket_receive();
        if (response && strncmp(response, "AUTH_OK", 7) == 0) {
            printf("[MCU] 认证成功！\n");
            return;
        }
        if (response && strncmp(response, "AUTH_FAILED", 11) == 0) {
            printf("[MCU] 认证失败：%s\n", response);
            return;
        }
    }
    printf("[MCU] 认证超时\n");
}

// ==================== 命令解析 ====================
void parse_command(char* cmd) {
    // LED控制
    if (strncmp(cmd, "LED", 3) == 0) {
        int led_num = atoi(cmd + 3);
        if (strstr(cmd, "_ON")) {
            HAL_GPIO_WritePin(LED_GPIO_Port, led_num, GPIO_PIN_SET);
            printf("[MCU] LED%d 打开\n", led_num);
        } else if (strstr(cmd, "_OFF")) {
            HAL_GPIO_WritePin(LED_GPIO_Port, led_num, GPIO_PIN_RESET);
            printf("[MCU] LED%d 关闭\n", led_num);
        }
    }
    // 状态查询
    else if (strcmp(cmd, "LED_STATUS") == 0) {
        char status[32];
        sprintf(status, "STATUS:%d%d%d%d%d%d%d%d",
            HAL_GPIO_ReadPin(LED1_GPIO_Port, LED1_Pin),
            HAL_GPIO_ReadPin(LED2_GPIO_Port, LED2_Pin),
            // ... 其他LED
        );
        websocket_send(status);
    }
    // 传感器查询
    else if (strcmp(cmd, "GET_TEMP") == 0) {
        float temp = read_temperature();
        char data[32];
        sprintf(data, "TEMP:%.1f", temp);
        websocket_send(data);
    }
}

// ==================== 主循环 ====================
void main_loop() {
    while (1) {
        // 处理WebSocket消息
        if (websocket_available()) {
            char* msg = websocket_receive();
            parse_command(msg);
        }

        // 定期发送传感器数据（每5秒）
        static uint32_t last_sensor_time = 0;
        if (HAL_GetTick() - last_sensor_time > 5000) {
            char data[64];
            sprintf(data, "TEMP:%.1f", read_temperature());
            websocket_send(data);
            last_sensor_time = HAL_GetTick();
        }

        // 保持连接（心跳）
        websocket_heartbeat();
    }
}
```

### 前端控制面板设计

#### MCU专用控制模式（新增）
```html
<!-- 添加到 index.html -->
<div class="mode-content" id="mcuMode">
    <section class="mcu-control-section">
        <h2 class="section-title">MCU设备控制</h2>

        <!-- 传感器数据显示 -->
        <div class="sensor-panel">
            <div class="sensor-card" id="tempSensor">
                <span class="sensor-icon">🌡️</span>
                <span class="sensor-value">--</span>
                <span class="sensor-unit">℃</span>
            </div>
            <div class="sensor-card" id="humidSensor">
                <span class="sensor-icon">💧</span>
                <span class="sensor-value">--</span>
                <span class="sensor-unit">%</span>
            </div>
        </div>

        <!-- 高级控制按钮 -->
        <div class="control-panel">
            <button class="btn btn-primary" id="relay1On">继电器1 打开</button>
            <button class="btn btn-secondary" id="relay1Off">继电器1 关闭</button>
            <button class="btn btn-primary" id="motorFwd">电机正转</button>
            <button class="btn btn-secondary" id="motorRev">电机反转</button>
        </div>

        <!-- 数据日志 -->
        <div class="data-log-container" id="mcuDataLog"></div>
    </section>
</div>
```

## 未来规划（物联网设备管理方向）

### 第二阶段：MCU设备控制与管理（当前阶段 🔄）
**目标**: 完善MCU设备控制功能，实现精细化管理

#### 2.1 MCU通信协议设计
**控制命令（网页→MCU）**:
```
LED1_ON           # 打开LED1
LED2_OFF          # 关闭LED2
LED_ALL_ON        # 全部打开
LED_ALL_OFF       # 全部关闭
LED_STATUS        # 查询LED状态
RELAY1_ON         # 打开继电器1
RELAY2_OFF        # 关闭继电器2
MOTOR_FORWARD     # 电机正转
MOTOR_REVERSE     # 电机反转
MOTOR_STOP        # 电机停止
SENSOR_GET_TEMP   # 获取温度传感器数据
SENSOR_GET_HUMID  # 获取湿度传感器数据
```

**数据返回（MCU→网页）**:
```
LED1_ON              # LED1当前状态：亮
STATUS:11110000      # 8位LED状态串（1=亮，0=灭）
TEMP:25.3            # 温度传感器数据（℃）
HUMID:60.5           # 湿度传感器数据（%）
DISTANCE:150         # 距离传感器数据（cm）
VOLTAGE:3.7          # 电压数据（V）
```

#### 2.2 已实现的MCU功能
- ✅ **MCU快速认证通道**: `mcu_ok:xxx` / `input_mcu:xxx`
- ✅ **设备序列号管理**: 自动生成用户名（mcu001, mcu002...）
- ✅ **重复连接检测**: 防止同一MCU设备重复登录
- ✅ **管理员监控窗口**: 显示在线MCU设备列表
- ✅ **心跳状态监控**: 实时显示MCU设备在线/离线状态
- ✅ **设备列表推送**: 管理员登录时自动推送在线MCU列表
- ✅ **消息路由优化**: MCU消息只广播给管理员用户

#### 2.3 待实现的MCU功能
**高级控制面板**:
- PWM占空比调节（0-100%）
- 定时任务设置（定时开关、循环执行）
- 场景模式切换（回家模式、离家模式等）
- 设备分组控制（批量控制同类型设备）

**数据可视化**:
- 传感器数据实时图表（温度、湿度曲线）
- 历史数据查询与导出
- 设备状态统计报表

**设备管理**:
- 设备信息编辑（名称、位置、备注）
- 设备固件升级（OTA）
- 设备日志记录（操作日志、错误日志）
- 告警规则设置（温度超限、离线告警）

#### 2.4 MCU接入流程
```
单片机上电初始化
    ↓
连接 4G 网络
    ↓
连接 WebSocket 服务器 (ws://www.water21.top:80)
    ↓
发送认证字符串: mcu_ok:001
    ↓
收到认证成功: AUTH_OK:mcu_001:mcu001
    ↓
正常收发数据
```

#### 2.5 单片机代码示例（参考）
```c
// MCU 快速认证示例（C语言）
void mcu_authenticate() {
    char auth_cmd[32];
    sprintf(auth_cmd, "mcu_ok:%s", device_serial);  // device_serial = "001"

    websocket_send(auth_cmd);

    // 等待响应
    char* response = websocket_receive();
    if (strncmp(response, "AUTH_OK", 7) == 0) {
        printf("认证成功！\n");
    }
}

// 解析控制指令示例
void parse_command(char* cmd) {
    if (strncmp(cmd, "LED1_ON", 7) == 0) {
        HAL_GPIO_WritePin(LED1_GPIO_Port, LED1_Pin, GPIO_PIN_SET);
    } else if (strncmp(cmd, "LED1_OFF", 8) == 0) {
        HAL_GPIO_WritePin(LED1_GPIO_Port, LED1_Pin, GPIO_PIN_RESET);
    }
}

// 发送传感器数据示例
void send_sensor_data() {
    char data[64];
    sprintf(data, "TEMP:%.1f", read_temperature());
    websocket_send(data);
}
```

### 第三阶段：数据持久化和监控
**目标**: 保存设备数据，实现历史查询和监控

**功能设计**:
- 数据库选择：SQLite / MongoDB
- 数据存储：设备状态、传感器数据、操作日志
- 历史查询：按时间范围、设备类型查询
- 数据可视化：ECharts图表展示
- 告警系统：邮件/短信/微信告警

### 第四阶段：高级功能扩展
**目标**: 提升系统稳定性和用户体验

**功能设计**:
- HTTPS/WSS 加密通信
- 设备远程OTA升级
- 多用户权限管理
- 设备分组/场景联动
- 移动端APP支持

### 第五阶段：内网穿透优化（已完成 ✅）
**目标**: 让单片机从任何地方通过 4G 网络连接服务器

**实施方案**:
- 使用 frp 内网穿透
- 香港节点 → 日本节点（稳定性优化）
- 公网域名：www.water21.top
- 映射端口：8080

**当前状态**: ✅ 已完成配置，服务器可通过公网访问

## 当前功能

### 已实现 ✅

#### 核心通信
- WebSocket 服务器（监听 8080 端口）
- 多客户端连接管理
- **双协议支持**（JSON + 纯字符串）
- 实时消息透传（纯字符串广播）
- 心跳检测（30秒间隔）

#### 用户系统
- **登录/注册页面**: 独立登录界面（/login.html）
- **Token认证**: 24小时有效期，自动过期检测
- **单点登录**: 同一账户踢掉旧连接（防止多设备登录）
- **登录状态检查**: 页面加载时自动检查，未登录跳转
- **在线用户列表**: 登录后自动推送在线用户信息

#### 聊天功能
- **实时消息收发**: WebSocket双向通信
- **在线人数显示**: 实时更新在线用户数
- **用户角色区分**:
  - 管理员：🛡️ 金色标识（water, testuser）
  - MCU设备：📶 紫色标识（mcu001, mcu002...）
  - 普通用户：默认样式

#### MCU管理系统
- **快速认证通道**:
  - `mcu_ok:001` - 上电自动认证
  - `input_mcu:001` - 按键手动认证
- **设备序列号管理**: 自动生成用户名（mcu001, mcu002...）
- **重复连接检测**: 防止同一MCU设备重复登录（含连接状态验证）
- **管理员监控窗口**:
  - 仅管理员可见
  - 显示在线MCU设备列表
  - 实时心跳状态监控（60秒超时检测）
  - 设备离线自动标记
- **设备列表推送**: 管理员登录时自动推送在线MCU列表
- **消息路由优化**: MCU连接消息只发送给管理员

#### LED控制系统
- **双模式界面**: 聊天模式 ↔ LED控制模式
- **8路LED控制**: 可视化指示器（点击切换）
- **批量控制**: 全部打开/关闭、状态查询
- **实时日志**: 显示发送/接收的LED指令
- **单片机兼容**: 纯字符串协议，无需JSON解析

#### 用户界面
- 现代化 Web 界面（渐变紫色主题）
- 响应式设计（移动端适配）
- 选项卡切换（聊天/LED模式）
- 实时消息显示

### 访问方式
```
本地: http://localhost:8080
公网: http://www.water21.top (frp内网穿透 - 日本节点)
公网WebSocket: ws://www.water21.top:80
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
**项目状态**: ✅ v1.2.0 用户系统和MCU管理完成，进入MCU控制开发阶段
**关键特性**:
- 用户登录/注册/Token认证
- MCU快速认证通道（mcu_ok / input_mcu）
- 管理员MCU监控窗口
- 在线用户列表实时推送
- 单点登录（踢掉旧连接）
- LED控制系统
- 纯字符串透传（单片机友好）
