# GD32F470VE 嵌入式项目开发指南

## 项目概述

这是一个基于 **GD32F470VE** 微控制器（Cortex-M4 内核）的嵌入式项目，使用 Keil µVision MDK-ARM 开发环境。项目实现了按键检测、LED 控制和任务调度的基础功能框架。

## 关键架构信息

### 硬件配置
- **目标芯片**: GD32F470VE (兼容 STM32F429xx)
- **内存配置**: IRAM(0x20000000, 192KB) + IRAM2(0x10000000, 64KB), IROM(0x08000000, 512KB)
- **工具链**: ARM-ADS V5.06 + GigaDevice GD32F4xx DFP

### 项目结构模式
```
MDK-ARM/                     # Keil 项目根目录
├── GD32_Demo_01.uvprojx    # 主项目文件
├── startup_stm32f429xx.s   # 启动文件
├── GD32_Demo_01/           # 构建输出目录
├── ../Core/Src/            # HAL 层和系统代码
├── ../APP/                 # 应用层代码
└── ../Components/          # 可复用组件
```

### 应用层架构
项目采用**模块化分层设计**：

1. **调度器核心** (`scheduler.c/h`): 实现任务循环调度
2. **按键管理** (`key_app.c/h`): 集成 `ebtn` 库进行按键检测和事件处理
3. **LED 控制** (`led_app.c/h`): LED 状态管理和效果控制
4. **全局定义** (`mydefine.h`): 项目级常量和宏定义

## 开发工作流程

### 构建和调试
```powershell
# 在 Keil µVision 中构建项目
# 主要构建输出在 GD32_Demo_01/ 目录
# .axf 文件用于调试，.hex 文件用于烧录
```

### 关键开发约定

1. **HAL 库兼容性**: 虽然使用 GD32F470VE，项目采用 STM32F4xx HAL 库（兼容模式）
2. **中断服务程序**: 所有 IRQ 处理器定义在 `startup_stm32f429xx.s` 和 `stm32f4xx_it.c`
3. **外设初始化**: GPIO 配置在 `gpio.c`，时钟配置遵循 STM32F4xx 标准

### 第三方组件集成

**EBTN 按键库**: 
- 位置: `../Components/ebtn/`
- 用途: 提供按键去抖动、多击检测、长按识别等功能
- 初始化: 通过静态数组 `static_buttons[]` 和 `static_combos[]` 配置
- 集成: 在 `key_app.c` 中封装原始按键读取逻辑

### 内存和性能约定

- **堆栈配置**: Stack_Size=0x800, Heap_Size=0x400 (在 startup 文件中定义)
- **编译优化**: 使用 ARM Compiler V5.06，面向 Cortex-M4.fp.sp
- **调试信息**: 构建输出包含 .map 文件和符号信息用于调试

## AI 助手最佳实践

### 修改代码时
1. **理解分层**: 区分 HAL 层（../Drivers/）、应用层（../APP/）和组件层（../Components/）
2. **保持兼容**: 修改时确保与 GD32F470VE 和 STM32F4xx HAL 的兼容性
3. **检查依赖**: 应用层代码依赖 `mydefine.h` 中的全局定义

### 添加新功能时
1. **遵循模块化**: 新功能优先作为独立 .c/.h 文件对放在 ../APP/ 目录
2. **集成调度器**: 新任务通过 `scheduler.c` 集成到主循环
3. **更新项目文件**: 新文件需要在 `GD32_Demo_01.uvprojx` 中注册到相应组

### 调试和测试
- 使用 Keil 内置调试器和 GD32F470VE 的 JTAG/SWD 接口
- 关键状态通过 LED 指示（`led_app.c` 中定义的模式）
- 按键事件通过串口或 LED 反馈进行验证

## 常见开发场景

- **添加新按键**: 扩展 `static_buttons[]` 数组和对应的 GPIO 配置
- **新增 LED 效果**: 在 `led_app.c` 中添加新的状态机状态
- **增加定时任务**: 通过 `scheduler.c` 添加周期性任务
- **外设集成**: 新外设初始化放在 HAL 层，应用接口封装在 ../APP/ 层