# 部署指南

## CloudStudio 部署步骤

### 1. 准备工作
- 确保项目文件已准备完毕
- 检查 `package.json` 配置
- 验证 `index.html` 可正常访问

### 2. 部署到 CloudStudio

#### 方法一：直接上传
1. 登录 CloudStudio 控制台
2. 创建新的静态网站项目
3. 上传项目文件（index.html, package.json, README.md等）
4. 配置域名和访问设置

#### 方法二：Git 部署
1. 将项目推送到 Git 仓库
```bash
git init
git add .
git commit -m "Initial commit: GD32 Demo Button Project"
git remote add origin <your-repo-url>
git push -u origin main
```

2. 在 CloudStudio 中连接 Git 仓库
3. 配置自动部署

### 3. 本地测试
```bash
# 安装依赖（可选）
npm install

# 启动本地服务器
npm start
# 或者
python -m http.server 8080
# 或者
live-server --port=8080
```

### 4. 访问地址
- 本地测试: http://localhost:8080
- CloudStudio: https://your-project.cloudstudio.net

### 5. 项目特点
- ✅ 纯静态网站，无需服务器端处理
- ✅ 响应式设计，支持移动端访问
- ✅ 包含项目文档和代码展示
- ✅ 模拟演示功能，展示项目效果
- ✅ 适合作为项目展示和文档网站

### 6. 注意事项
- 这是嵌入式项目的展示网站，不是实际的嵌入式代码运行环境
- 实际的STM32代码需要在硬件上运行，无法在Web环境执行
- 网站提供了项目说明、代码结构和模拟演示功能

### 7. 后续优化
- 可添加更多交互演示
- 集成代码高亮显示
- 添加项目视频演示
- 支持多语言版本