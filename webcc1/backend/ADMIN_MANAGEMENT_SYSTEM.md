# 管理员管理系统使用指南

**日期**: 2026-01-26
**版本**: v1.5.0
**状态**: ✅ 已完成

---

## 📋 系统概述

新的管理员管理系统使用独立的JSON文件存储管理员列表，支持动态添加/删除，无需修改代码或重启服务器。

---

## 📁 文件结构

```
backend/
├── data/
│   ├── users.json          # 用户数据
│   └── admins.json         # 管理员数据（新增）
└── server.js               # 服务器代码
```

---

## 📄 管理员数据文件格式

**位置**: `backend/data/admins.json`

```json
{
  "admins": [
    {
      "username": "water",
      "addedAt": "2026-01-23T00:00:00.000Z",
      "addedBy": "system"
    },
    {
      "username": "testuser",
      "addedAt": "2026-01-23T00:00:00.000Z",
      "addedBy": "system"
    },
    {
      "username": "一颗土豆",
      "addedAt": "2026-01-26T10:00:00.000Z",
      "addedBy": "system"
    }
  ],
  "lastModified": "2026-01-26T10:00:00.000Z"
}
```

**字段说明**：
- `username`: 管理员用户名（必须是已注册用户）
- `addedAt`: 添加时间（ISO格式）
- `addedBy`: 添加者用户名（system/管理员用户名）
- `lastModified`: 最后修改时间（自动更新）

---

## 🔧 手动添加/删除管理员

### 方法1：直接编辑JSON文件（推荐）

**步骤**：
1. 打开 `backend/data/admins.json`
2. 在 `admins` 数组中添加新对象：
   ```json
   {
     "username": "新管理员名称",
     "addedAt": "2026-01-26T10:00:00.000Z",
     "addedBy": "system"
   }
   ```
3. 保存文件
4. **无需重启服务器**，会自动生效

**删除管理员**：
- 直接删除对应的对象

**注意事项**：
- ⚠️ 保持JSON格式正确（逗号、引号）
- ⚠️ 至少保留一个管理员
- ⚠️ 用户必须已注册

---

### 方法2：使用API接口（程序化管理）

#### 获取管理员列表
```bash
GET /api/admins
Headers: Authorization: Bearer <token>
```

**响应**：
```json
{
  "success": true,
  "admins": [
    { "username": "water", "addedAt": "...", "addedBy": "system" }
  ],
  "count": 3
}
```

---

#### 添加管理员
```bash
POST /api/admins/add
Content-Type: application/json

{
  "token": "管理员token",
  "username": "新管理员用户名"
}
```

**响应**：
```json
{
  "success": true,
  "message": "管理员添加成功"
}
```

**错误情况**：
- `{ success: false, message: "该用户已经是管理员" }`
- `{ success: false, message: "用户不存在，请先注册" }`
- `{ success: false, message: "权限不足，仅管理员可操作" }`

---

#### 移除管理员
```bash
POST /api/admins/remove
Content-Type: application/json

{
  "token": "管理员token",
  "username": "要移除的管理员用户名"
}
```

**响应**：
```json
{
  "success": true,
  "message": "管理员移除成功"
}
```

**错误情况**：
- `{ success: false, message: "该用户不是管理员" }`
- `{ success: false, message: "不能删除最后一个管理员" }`
- `{ success: false, message: "不能删除自己的管理员权限" }`

---

#### 获取管理员用户名列表（前端同步）
```bash
GET /api/admins/usernames
```

**响应**：
```json
{
  "success": true,
  "admins": ["water", "testuser", "一颗土豆"]
}
```

**用途**：前端页面加载时自动调用，同步管理员列表

---

## 🔄 前端自动同步

### 页面加载时自动获取
```javascript
// frontend/js/app.js

// 页面加载时
document.addEventListener('DOMContentLoaded', async () => {
    // ...初始化代码...

    // 从服务器获取管理员列表
    await fetchAdminList();

    // ...其他初始化...
});
```

### 实时判断管理员身份
```javascript
// 判断用户角色（自动使用最新的管理员列表）
function getUserRole(username) {
    if (username.startsWith('mcu')) {
        return 'mcu';  // MCU设备
    }
    if (ADMIN_USERS.includes(username)) {
        return 'admin';  // 管理员
    }
    return 'user';  // 普通用户
}
```

---

## 🎯 管理员特权

管理员用户拥有以下特权：

### 1. 硬件控制权限
- ✅ 控制LED（1-6号及全部）
- ✅ 控制继电器（1-3号）
- ✅ 控制电机（正转/反转/停止）
- ✅ 控制PWM（0-100%占空比）

### 2. AI助手特权
- ✅ AI助手可以直接执行控制命令
- ✅ 返回JSON格式的控制卡片

### 3. 监控权限
- ✅ 查看MCU设备监控窗口
- ✅ 接收MCU设备连接/断开通知
- ✅ 查看MCU设备列表和心跳状态

### 4. 界面标识
- ✅ 🛡️ 金色用户名
- ✅ MCU监控面板可见

---

## 🔒 权限控制

### 添加/删除管理员的权限
- ✅ 只有**现有管理员**才能添加/删除其他管理员
- ✅ 不能删除自己
- ✅ 不能删除最后一个管理员

### 普通用户
- ❌ 无法控制硬件
- ❌ AI助手会拒绝控制请求
- ❌ 看不到MCU监控窗口
- ✅ 可以正常聊天和查询状态

---

## 🧪 测试验证

### 测试1：手动添加管理员
1. 编辑 `backend/data/admins.json`
2. 添加新管理员对象
3. **无需重启服务器**
4. 刷新网页（`Ctrl+Shift+R`）
5. 登录新管理员账号
6. 验证金色名字和控制权限

### 测试2：使用API添加管理员
```javascript
// 管理员登录后，在浏览器控制台执行
const token = localStorage.getItem('authToken');

fetch('/api/admins/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        token: token,
        username: 'newadmin'
    })
})
.then(res => res.json())
.then(data => console.log(data));
```

### 测试3：验证管理员权限
```
管理员账号: 打开LED1
预期: ✅ 直接执行 + 显示控制卡片

普通用户: 打开LED1
预期: ❌ 提示"只有管理员才能控制硬件设备"
```

---

## 🚀 代码改进清单

| 文件 | 修改内容 | 状态 |
|------|---------|------|
| `backend/data/admins.json` | 创建管理员数据文件 | ✅ |
| `backend/server.js` | 添加管理员管理函数 | ✅ |
| `backend/server.js` | 删除旧的ADMIN_USERS常量 | ✅ |
| `backend/server.js` | 修改isAdmin函数使用JSON | ✅ |
| `backend/server.js` | 修改sendToAdmin使用新isAdmin | ✅ |
| `backend/server.js` | 添加管理员管理API（4个接口） | ✅ |
| `frontend/js/app.js` | 改为动态获取管理员列表 | ✅ |
| `frontend/js/app.js` | 页面加载时调用fetchAdminList | ✅ |

---

## 📚 新增的管理函数

### 后端函数（server.js）

```javascript
loadAdmins()              // 读取管理员数据
saveAdmins(data)          // 保存管理员数据
isAdmin(username)         // 检查是否是管理员（已重写）
addAdmin(username, addedBy) // 添加管理员
removeAdmin(username, removedBy) // 移除管理员
getAdminList()            // 获取管理员详细列表
getAdminUsernames()       // 获取管理员用户名数组
```

### 前端函数（app.js）

```javascript
fetchAdminList()          // 从服务器获取管理员列表
getUserRole(username)     // 自动使用最新管理员列表判断角色
```

---

## 🎯 优势对比

### 旧系统（.env配置）
```bash
ADMIN_USERS=water,testuser,一颗土豆
```
- ❌ 需要修改代码
- ❌ 需要重启服务器
- ❌ 前后端需要手动同步
- ❌ 无法记录管理员历史
- ❌ 无法追踪谁添加的

### 新系统（admins.json）
```json
{
  "admins": [
    { "username": "water", "addedAt": "...", "addedBy": "system" }
  ]
}
```
- ✅ 独立数据文件
- ✅ **无需重启服务器**
- ✅ 前端自动同步
- ✅ 记录添加时间
- ✅ 追踪添加者
- ✅ 支持API管理
- ✅ 防止误删（保护措施）

---

## ✅ 当前管理员

根据 `admins.json` 文件，当前管理员为：
1. **water** - 系统默认管理员
2. **testuser** - 测试管理员
3. **一颗土豆** - 新添加的管理员

---

## 🔄 迁移说明

### .env文件可选清理
可以删除 `.env` 中的 `ADMIN_USERS` 配置（已不再使用）：
```bash
# 这一行可以删除（已弃用）
ADMIN_USERS=water,testuser,一颗土豆
```

新系统完全使用 `admins.json` 管理，`.env` 中的配置不再生效。

---

**最后更新**: 2026-01-26
**修改人**: Claude Code AI
**状态**: ✅ 管理员系统重构完成
