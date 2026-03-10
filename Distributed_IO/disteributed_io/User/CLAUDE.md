# User 模块 - 用户层

[根目录](../CLAUDE.md) > **User**

## 模块职责

用户层包含系统主程序、中断服务函数和系统配置，是整个嵌入式系统的入口点和中断处理中心。

## 入口与启动

### 主程序入口 (main.c)
```c
int main(void)
{
    scheduler_init();   // 调度器初始化
    hardwire_init();    // 硬件初始化

    while (1) {
        scheduler_run(); // 主循环运行调度器
    }
}
```

### 系统启动流程
1. **复位处理**: 启动文件 `startup_stm32f051.s`
2. **系统初始化**: `SystemInit()` (system_stm32f0xx.c)
3. **主程序**: `main()` (main.c)
4. **主循环**: `scheduler_run()`

## 对外接口

### 系统时间
```c
extern uint32_t uwTick;  // 系统滴答计数（1ms递增）
```

### 中断服务函数
- `SysTick_Handler()` - 系统滴答中断（1ms）
- `USART1_IRQHandler()` - 串口1中断（在 uart_app.c 中实现）
- `EXTI4_15_IRQHandler()` - 外部中断（在 hardware_NVIC.c 中实现）
- `HardFault_Handler()` - 硬件错误处理
- `NMI_Handler()` - 不可屏蔽中断

### 断言处理
```c
void assert_failed(uint8_t* file, uint32_t line);
```

## 关键依赖与配置

### 系统配置文件 (stm32f0xx_conf.h)
标准外设库配置头文件，控制各外设模块的包含：
- STM32F0xx 各外设头文件
- 调试功能开关
- 断言检查配置

### 中断向量表
- **启动文件**: `startup_stm32f051.s`
- **向量表位置**: 0x00000000
- **堆栈大小**: 由启动文件定义
- **堆大小**: 由启动文件定义

### 系统滴答配置
- **时钟频率**: SystemCoreClock / 1000 = 48MHz / 1000 = 48kHz
- **中断周期**: 1ms
- **全局变量**: `uwTick` (32位无符号整数)

## 数据模型

### 系统状态
```c
__IO uint32_t uwTick;  // 系统时间计数器（ms）
```

### 全局变量导出
```c
extern uint32_t uwTick;       // 系统时间
extern uint8_t ucled[16];     // LED 状态数组
```

## 测试与质量

### 错误处理
- **硬错误**: 无限循环停止
- **断言失败**: 打印文件名和行号，进入无限循环
- **不可屏蔽中断**: 空处理

### 调试支持
- 支持 `USE_FULL_ASSERT` 断言检查
- 提供断言失败回调函数

## 常见问题 (FAQ)

### Q: uwTick 会溢出吗？
A: 32位计数器每 49.7 天溢出一次，大多数应用不受影响。需要注意时间差计算：

```c
// 正确的时间差计算
if (uwTick - last_time >= delay) {  // 自动处理溢出
    // ...
}
```

### Q: 如何修改 SysTick 周期？
A: 修改 `hardware.c` 中的初始化：
```c
SysTick_Config(SystemCoreClock / 1000);  // 1000Hz = 1ms
// 改为:
SysTick_Config(SystemCoreClock / 100);   // 10000Hz = 0.1ms
```

### Q: 为什么 HardFault_Handler 是死循环？
A: 硬件错误通常表示严重问题（如非法内存访问），死循环可以保持系统状态便于调试连接。

## 相关文件清单

### 源文件
- `main.c` - 主程序
- `stm32f0xx_it.c` - 中断服务函数

### 头文件
- `main.h` - 主程序头文件
- `stm32f0xx_conf.h` - 标准外设库配置
- `stm32f0xx_it.h` - 中断声明

### 相关文档
- `docs/堆栈详解.md` - 堆栈配置说明

## 变更记录 (Changelog)

### 2026-01-30
- 创建模块文档
- 整理系统启动流程
- 添加 uwTick 使用说明
