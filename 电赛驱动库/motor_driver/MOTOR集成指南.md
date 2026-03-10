# A4950 电机驱动库集成指南

## 项目结构
```
Car_Xifeng/
├── APP/
│   ├── motor_driver.h      # 电机驱动库头文件
│   ├── motor_driver.c      # 电机驱动库源文件
│   ├── motor_example.c     # 使用示例
│   └── 集成指南.md        # 本文件
└── Core/
    ├── Inc/
    └── Src/
        └── main.c          # 主程序文件
```

## 快速集成步骤

### 1. 添加头文件包含
在 `Core/Src/main.c` 文件的包含区域添加：

```c
/* USER CODE BEGIN Includes */
#include "../../APP/motor_driver.h"
/* USER CODE END Includes */
```

### 2. 声明电机实体
在 `main.c` 的私有变量区域添加：

```c
/* USER CODE BEGIN PV */
Motor_t motor1;  // 左侧电机
Motor_t motor2;  // 右侧电机
/* USER CODE END PV */
```

### 3. 初始化电机
在 `main()` 函数的初始化区域添加：

```c
/* USER CODE BEGIN 2 */
// 创建电机1 - 左侧电机
Motor_Create(&motor1, 
             &htim1,           // TIM1定时器
             TIM_CHANNEL_2,    // 通道2 (PE11)
             GPIOE,            // GPIOE端口
             GPIO_PIN_9,       // PE9引脚
             GPIO_PIN_SET);    // 正转时输出高电平

// 创建电机2 - 右侧电机
Motor_Create(&motor2, 
             &htim1,           // TIM1定时器
             TIM_CHANNEL_4,    // 通道4 (PE14)
             GPIOE,            // GPIOE端口
             GPIO_PIN_13,      // PE13引脚
             GPIO_PIN_SET);    // 正转时输出高电平
/* USER CODE END 2 */
```

### 4. 主循环控制逻辑
在 `main()` 函数的主循环中添加控制逻辑：

```c
/* USER CODE BEGIN WHILE */
while (1)
{
    /* USER CODE END WHILE */
    
    /* USER CODE BEGIN 3 */
    // 示例：双电机前进
    Motor_SetSpeed(&motor1, 50);   // 左电机50%速度
    Motor_SetSpeed(&motor2, 50);   // 右电机50%速度
    HAL_Delay(2000);               // 前进2秒
    
    // 停止
    Motor_Stop(&motor1);
    Motor_Stop(&motor2);
    HAL_Delay(1000);               // 停止1秒
    
    // 示例：双电机后退
    Motor_SetSpeed(&motor1, -40);  // 左电机反转40%速度
    Motor_SetSpeed(&motor2, -40);  // 右电机反转40%速度
    HAL_Delay(2000);               // 后退2秒
    
    // 停止
    Motor_Stop(&motor1);
    Motor_Stop(&motor2);
    HAL_Delay(1000);               // 停止1秒
    /* USER CODE END 3 */
}
```

## 硬件连接说明

| 功能 | STM32引脚 | A4950连接 | 说明 |
|------|-----------|-----------|------|
| 电机1 PWM | PE11 (TIM1_CH2) | PWM1输入 | 控制电机1速度 |
| 电机1 方向 | PE9 | DIR1输入 | 控制电机1方向 |
| 电机2 PWM | PE14 (TIM1_CH4) | PWM2输入 | 控制电机2速度 |
| 电机2 方向 | PE13 | DIR2输入 | 控制电机2方向 |

## API函数使用说明

### 基础API
- `Motor_Create()` - 创建电机实体（自动启动PWM）
- `Motor_SetSpeed(motor, speed)` - 设置速度（-100到100）
- `Motor_Stop(motor)` - 停止电机

### 高级API
- `Motor_GetState(motor)` - 获取电机状态
- `Motor_Enable(motor, enable)` - 使能/失能电机

### A4950方向控制说明
- **正转模式（慢衰减）**：DIR=0, PWM=速度值
- **反转模式（快衰减）**：DIR=1, PWM=100-速度值
- 速度范围：-100 到 +100
- 正数：正转，负数：反转，0：停止

## 典型应用场景

### 1. 小车前进后退
```c
// 前进
Motor_SetSpeed(&motor1, 60);
Motor_SetSpeed(&motor2, 60);

// 后退
Motor_SetSpeed(&motor1, -60);
Motor_SetSpeed(&motor2, -60);
```

### 2. 小车转向
```c
// 左转（右轮快，左轮慢）
Motor_SetSpeed(&motor1, 30);   // 左轮慢
Motor_SetSpeed(&motor2, 80);   // 右轮快

// 右转（左轮快，右轮慢）
Motor_SetSpeed(&motor1, 80);   // 左轮快
Motor_SetSpeed(&motor2, 30);   // 右轮慢
```

### 3. 原地转向
```c
// 原地左转
Motor_SetSpeed(&motor1, -50);  // 左轮反转
Motor_SetSpeed(&motor2, 50);   // 右轮正转

// 原地右转
Motor_SetSpeed(&motor1, 50);   // 左轮正转
Motor_SetSpeed(&motor2, -50);  // 右轮反转
```

## 编译配置

1. 确保在Keil项目中添加了 `APP/motor_driver.c` 到源文件列表
2. 确保包含路径包含了 `APP/` 文件夹
3. 编译项目，如有错误请检查包含路径和函数调用

## 移植说明

### 移植到其他STM32项目
1. 复制 `motor_driver.h` 和 `motor_driver.c` 到新项目
2. 根据新项目的PWM配置修改 `Motor_Init()` 中的定时器句柄
3. 根据新项目的引脚配置修改 `Motor_Create()` 调用参数

### 移植到其他平台
1. 修改 `motor_driver.h` 中的包含文件
2. 替换HAL库函数调用为对应平台的函数
3. 修改GPIO和PWM控制函数

## 注意事项

1. **必须先调用 `Motor_Init()`** 才能使用其他功能
2. **电机实体指针不能为NULL**，使用前要正确初始化
3. **速度设置时会立即生效**，如需平滑变速请自行实现渐变逻辑  
4. **失能状态下无法设置速度**，设置前请确保电机已使能
5. **PWM频率为5kHz**，适合大多数直流电机，如需修改请调整TIM1配置

## 技术支持

如遇到问题，请检查：
1. 硬件连接是否正确
2. PWM定时器是否正确配置并启动
3. GPIO是否正确配置为输出模式
4. 函数调用参数是否正确