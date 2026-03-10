# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于 **RT-Thread v4.1.1** 的 STM32F407VE 嵌入式项目，由 RT-Thread Studio 生成的 BSP 工程模板。

- 目标芯片：STM32F407VE（Cortex-M4，168MHz）
- Flash：512KB @ 0x08000000，SRAM：128KB @ 0x20000000
- 控制台：UART1（PA9=TX，PA10=RX）

## 构建命令

项目使用 **SCons** 作为主构建系统，需要 Python 和 `arm-none-eabi-gcc` 工具链。

```bash
# 编译项目（生成 rt-thread.elf）
scons

# 清理构建产物
scons -c

# 修改内核配置（需要 menuconfig 工具）
menuconfig

# 指定并行编译
scons -j4
```

工具链路径在 `rtconfig.py` 中配置，修改 `EXEC_PATH` 指向本地 GCC 安装目录。

也可直接在 **RT-Thread Studio IDE** 中通过 CDT 构建（`.cproject` / `.project`）。

## 代码架构

```
applications/   # 用户业务逻辑层（在此添加新功能）
drivers/        # BSP 驱动层（RT-Thread 设备驱动注册）
cubemx/         # STM32CubeMX 生成的 HAL 初始化代码（勿手动修改）
rt-thread/      # RT-Thread 内核源码（勿修改）
libraries/      # CMSIS + STM32F4xx HAL 库（勿修改）
linkscripts/    # GNU LD 链接脚本
```

**分层原则：**
- `applications/` 调用 RT-Thread API（`rt_thread_create`、`rt_device_find` 等）
- `drivers/` 负责将硬件外设注册为 RT-Thread 设备对象
- `cubemx/` 仅做 HAL 层初始化，由 `drivers/drv_clk.c` 调用

## 关键配置文件

| 文件 | 用途 |
|------|------|
| `rtconfig.h` | 内核功能开关（由 menuconfig 生成，勿手动大幅修改） |
| `rtconfig.py` | GCC 工具链路径和编译参数 |
| `drivers/board.h` | 堆大小、Flash/SRAM 地址、控制台串口定义 |
| `cubemx/cubemx.ioc` | CubeMX 工程配置，重新生成 HAL 代码的源头 |
| `Kconfig` | menuconfig 配置菜单入口 |

## 当前内核配置要点

- 系统节拍：1000 Hz（1ms tick）
- 线程优先级：32 级
- 已启用：FinSH/MSH shell、串口框架（V1）、PIN 框架、小内存管理
- 串口环形缓冲区：64 字节（`RT_SERIAL_RB_BUFSZ`，按需调大）

## 添加新驱动的模式

参考 `drivers/drv_gpio.c` 或 `drivers/drv_usart.c`：
1. 在 `drivers/` 下新建 `drv_xxx.c/h`
2. 实现 `rt_hw_xxx_init()` 并用 `INIT_BOARD_EXPORT()` 或 `INIT_DEVICE_EXPORT()` 自动初始化
3. 在 `drivers/SConscript` 中添加源文件

## 注意事项

- `cubemx/Src/main.c` 中的 `HAL_Init()` 和 `SystemClock_Config()` 已被 RT-Thread 启动流程接管，不要在此添加业务逻辑
- 修改时钟配置需同步更新 `cubemx/` 和 `drivers/drv_clk.c`
- 链接脚本 `link.lds` 包含 RT-Thread 专用段（`FSymTab`、`rti_fn` 等），不可随意删减
