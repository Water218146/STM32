# Hardware 模块 - 硬件抽象层

[根目录](../CLAUDE.md) > **Hardware**

## 模块职责

硬件抽象层封装 STM32F0xx 外设驱动，提供统一的硬件初始化和控制接口，隔离底层硬件细节。

## 入口与启动

### 初始化流程
在 `main.c` 中调用 `hardwire_init()`，执行顺序：
1. `Rcc_Init()` - 时钟系统初始化（48MHz）
2. `SysTick_Config()` - 系统滴答定时器（1ms）
3. `gpio_init()` - GPIO 端口配置
4. `NVIC_init()` - 中断控制器配置
5. `Rs485_Config()` - RS485 串口配置

## 对外接口

### 主初始化函数 (hardware.h)
```c
void hardwire_init(void);  // 硬件系统完整初始化
```

### GPIO 控制 (hardware_GPIO.h)
```c
void gpio_init(void);                      // GPIO 总初始化
void GPIO_LED_Configuretion(void);         // LED GPIO 配置
void GPIO_Input_Configuretion(void);       // 输入 GPIO 配置
```

### 时钟控制 (hardware_RCC.h)
```c
void Rcc_Init(void);  // 系统时钟配置（HSE 8MHz -> PLL 48MHz）
```

### 中断控制 (hardware_NVIC.h)
```c
void NVIC_init(void);       // 中断优先级配置
void EXTI8_Config(void);    // PA8 外部中断配置
```

### 串口控制 (hardware_uart.h)
```c
void Rs485_Config(uint32_t baudrate);  // RS485 配置
```

## 关键依赖与配置

### 系统时钟
- **时钟源**: HSE 外部晶振 8MHz
- **PLL 倍频**: 6 倍
- **系统频率**: 48MHz
- **AHB**: 48MHz (Div1)
- **APB**: 48MHz (Div1)

### 外设时钟使能
- GPIOA/B/C/D/F - AHB 总线
- USART1 - APB2 总线
- SYSCFG - APB2 总线（用于 EXTI）

### GPIO 配置汇总
| 外设 | GPIO | 模式 | 速度 | 上下拉 |
|------|------|------|------|--------|
| LED0-15 | 多个 | OUT | 50MHz | DOWN |
| 输入 | PB13 | IN | - | DOWN |
| USART1_TX | PA9 | AF1 | 50MHz | UP |
| USART1_RX | PA10 | AF1 | 50MHz | UP |
| USART1_DE | PA12 | AF1 | 50MHz | UP |
| EXTI8 | PA8 | IN | 50MHz | DOWN |

## 数据模型

### 中断优先级配置
| 中断源 | 优先级 | 功能 |
|--------|--------|------|
| USART1 | 0 | 串口接收 |
| TIM3 | 2 | 定时器3 |
| EXTI4_15 | 2 | 外部中断（含PA8） |

### RS485 配置
- **波特率**: 可配置（默认 115200）
- **数据位**: 8位
- **停止位**: 1位
- **校验**: 无
- **过采样**: 8倍（必须在 USART_Init 之前配置）
- **DE 极性**: 高电平发送
- **DE 断言时间**: 0x1f
- **DE 去断言时间**: 4
- **接收方式**: DMA + IDLE 中断

## USART 技术要点（重要！）

### IDLE 中断标志位清除

**已验证的正确方式**：
```c
// ✅ 必须使用标准库函数清除 IDLE 标志位
USART_ClearITPendingBit(USART1, USART_IT_IDLE);
```

**错误方式**（不能清除 IDLE 标志）：
```c
// ❌ 这种方式在 STM32F0 上不能清除 IDLE 标志位！
volatile uint32_t temp;
temp = USART1->ISR;   // 读 ISR
temp = USART1->RDR;   // 读 RDR
(void)temp;
```

**说明**：
- STM32F0 的 IDLE 标志位清除机制与 F1 不同
- 必须使用 `USART_ClearITPendingBit()` 或直接写 ICR 寄存器清除
- 读 ISR + 读 RDR 的方式只适用于清除 RXNE 等标志，不能清除 IDLE

### 8倍过采样配置顺序

**正确顺序**（已验证）：
```c
/* 1. 先配置 8 倍过采样（必须在 USART_Init 之前） */
USART_OverSampling8Cmd(USART1, ENABLE);

/* 2. 再配置 USART 参数 */
USART_InitStructure.USART_BaudRate = baudrate;
USART_InitStructure.USART_WordLength = USART_WordLength_8b;
USART_InitStructure.USART_StopBits = USART_StopBits_1;
USART_InitStructure.USART_Parity = USART_Parity_No;
USART_InitStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
USART_InitStructure.USART_Mode = USART_Mode_Rx | USART_Mode_Tx;
USART_Init(USART1, &USART_InitStructure);

/* 3. 配置 DE 信号 */
USART_DECmd(USART1, ENABLE);
USART_DEPolarityConfig(USART1, USART_DEPolarity_High);
USART_SetDEAssertionTime(USART1, 0x1f);
USART_SetDEDeassertionTime(USART1, 4);

/* 4. 使能 USART */
USART_Cmd(USART1, ENABLE);
```

## 测试与质量

### 硬件测试
- LED 闪烁测试
- 输入引脚读取测试
- 串口回环测试
- 外部中断响应测试

### 已知问题
1. 时钟配置代码中有 HSI 备份（已注释）
2. 部分中文注释存在编码问题

## 常见问题 (FAQ)

### Q: 如何修改系统时钟频率？
A: 在 `hardware_RCC.c` 中修改 PLL 倍频系数：
```c
RCC_PLLConfig(RCC_PLLSource_HSE, RCC_PLLMul_6);  // 8MHz * 6 = 48MHz
```

### Q: LED 为什么全部初始化为高电平？
A: 硬件使用低电平点亮，初始化为高电平确保全部熄灭。

### Q: RS485 的 DE 信号如何工作？
A: 使用 USART1 的硬件 DE 功能（PA12），自动控制收发切换。

### Q: 如何添加新的外部中断？
A: 参考 EXTI8_Config() 实现，步骤：
1. 配置 GPIO 为输入模式
2. 连接到 EXTI 线
3. 配置 EXTI 触发条件
4. 配置 NVIC 优先级

## 相关文件清单

### 源文件
- `hardware.c` - 主初始化
- `hardware_GPIO.c` - GPIO 配置
- `hardware_RCC.c` - 时钟配置
- `hardware_NVIC.c` - 中断配置
- `hardware_uart.c` - 串口配置

### 头文件
- `hardware.h`
- `hardware_GPIO.h`
- `hardware_RCC.h`
- `hardware_NVIC.h`
- `hardware_uart.h`

## 变更记录 (Changelog)

### 2026-01-30
- 创建模块文档
- 整理时钟配置信息
- 完成 GPIO 映射表
