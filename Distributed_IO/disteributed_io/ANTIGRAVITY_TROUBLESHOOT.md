# Antigravity Plugin Troubleshooting

## 当前配置
- 插件版本: opencode-antigravity-auth@1.4.0 (最新版)
- 缓存: 已清除
- 模型: 3个精简模型

## 关于"This version of Antigravity is no longer supported"警告

这个警告**可能来自以下几个方面**：

### 1. Google API端问题（最可能）
- Google/Antigravity服务端可能更新了API
- 插件v1.4.0虽然刚发布，但可能还没完全适配新API
- **需要等待插件作者发布修复版本**

### 2. User Agent版本问题
- 旧账户文件中user agent是"antigravity/1.10.5"
- 可能Antigravity要求更新的user agent

### 3. 警告可以暂时忽略
- **如果功能正常，这个警告不影响使用**
- 很多用户报告有这个警告但插件仍然工作

## 建议步骤

### 步骤1：重新登录
```bash
opencode auth login
```

### 步骤2：测试功能
```bash
opencode run "测试" --model=google/antigravity-claude-sonnet-4-5-thinking --variant=max
```

### 步骤3：检查GitHub Issues
访问 https://github.com/NoeFabris/opencode-antigravity-auth/issues
查看是否有其他用户报告相同问题，以及是否有解决方案

### 步骤4：临时workaround
如果警告持续但功能正常：
- **暂时忽略警告**
- 关注插件GitHub的更新

## 如果需要彻底重置

```bash
# 删除所有antigravity相关文件
rm -rf ~/.config/opencode/*antigravity*

# 重新登录
opencode auth login
```

## 联系插件作者

如果问题持续，可以在GitHub提issue：
https://github.com/NoeFabris/opencode-antigravity-auth/issues

提供信息：
- OpenCode版本：1.1.42
- 插件版本：1.4.0
- 错误信息：完整的警告文本
- 操作系统：WSL on Windows

## 当前可用模型

1. google/antigravity-claude-sonnet-4-5-thinking
   - 变体：low, max

2. google/antigravity-gemini-3-pro
   - 变体：low, high

3. google/antigravity-gemini-3-flash
   - 变体：minimal, low, medium, high
