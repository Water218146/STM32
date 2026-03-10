# APP 模块 - 应用层

[根目录](../CLAUDE.md) > **APP**

## 模块职责

应用层模块实现项目的核心业务逻辑，包括任务调度、LED 控制、输入检测和串口通信等功能。

## 入口与启动

应用层通过 `scheduler.c` 中的调度器统一管理，主程序在 `main.c` 中调用：
- `scheduler_init()` - 初始化调度器
- `scheduler_run()` - 在主循环中运行调度器

## 对外接口

### 调度器接口 (scheduler.h)
```c
void scheduler_init(void);  // 初始化调度器
void scheduler_run(void);   // 运行调度器（在主循环中调用）
```

### 任务接口
- `led_task(void)` - LED 显示任务（1ms 周期）
- `input_task(void)` - 输入检测任务（1ms 周期）
- `uart_task(void)` - 串口通信任务（10ms 周期）

## 关键依赖与配置

### 依赖模块
- `Hardware/` - 硬件抽象层
- `User/` - 系统时间和中断

### 全局配置
- `mydefine.h` - 统一头文件包含
- `task_num` - 任务数量（自动计算）
- `ucled[16]` - LED 状态数组

### 调度器配置
当前注册的任务及其执行周期：

| 任务 | 周期 | 功能 |
|------|------|------|
| `led_task` | 1ms | LED 阵列扫描显示 |
| `input_task` | 1ms | 输入引脚状态检测 |
| `uart_task` | 10ms | 串口数据处理 |

## 数据模型

### LED 状态数组
```c
uint8_t ucled[16];  // 16个LED的状态，0=灭，1=亮
```

### LED 引脚映射
| LED索引 | GPIO | 引脚 | 端口 |
|---------|------|------|------|
| 0 | GPIO_Pin_15 | PC15 | GPIOC |
| 1 | GPIO_Pin_14 | PC14 | GPIOC |
| 2 | GPIO_Pin_13 | PC13 | GPIOC |
| 3 | GPIO_Pin_9 | PB9 | GPIOB |
| ... | ... | ... | ... |
| 15 | GPIO_Pin_7 | PF7 | GPIOF |

### 串口缓冲区
```c
#define UART1_BUFFER_SIZE 256
uint8_t uart1_buffer[UART1_BUFFER_SIZE];
uint16_t usart_buffer_index;
uint32_t last_recv_time;
```

## 测试与质量

### 当前测试方式
- 硬件在环测试
- LED 视觉反馈
- 串口调试输出

### 已知问题
1. 串口接收使用超时判断（10ms），可考虑使用 IDLE 中断优化
2. LED 控制使用直接位操作，未使用查表法优化
3. 缺少单元测试

## 常见问题 (FAQ)

### Q: 如何添加新任务？
A: 在 `scheduler.c` 的 `scheduler_task` 数组中添加任务：
```c
static task_t scheduler_task[] = {
    {led_task, 1, 0},
    {input_task, 1, 0},
    {uart_task, 10, 0},
    {your_new_task, 5, 0},  // 5ms 周期
};
```

### Q: LED 为什么使用低电平点亮？
A: 硬件设计采用共阳连接，低电平驱动。

### Q: 如何修改串口波特率？
A: 修改 `Hardware/hardware.c` 中的 `Rs485_Config(115200)` 参数。

## 相关文件清单

### 源文件
- `scheduler.c` - 调度器实现
- `led_app.c` - LED 控制
- `input_app.c` - 输入检测
- `uart_app.c` - 串口应用

### 头文件
- `scheduler.h`
- `led_app.h`
- `input_app.h`
- `uart_app.h`
- `mydefine.h` - 统一包含头文件

## 变更记录 (Changelog)

### 2026-01-30
- 创建模块文档
- 分析调度器机制
- 整理 LED 引脚映射
