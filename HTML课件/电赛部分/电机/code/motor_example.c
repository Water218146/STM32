/**
 ******************************************************************************
 * @file    motor_example.c
 * @brief   电机驱动库使用示例
 * @author  XiFeng
 * @date    2025-06-20
 ******************************************************************************
 * @attention
 * 
 * 此文件展示了如何使用电机驱动库控制两个电机
 * 
 ******************************************************************************
 */

/* Includes ------------------------------------------------------------------*/
#include "motor_driver.h"

/* Private variables ---------------------------------------------------------*/
Motor_t motor1; // 电机1实体
Motor_t motor2; // 电机2实体

/* Exported functions --------------------------------------------------------*/

/**
 * @brief 电机驱动示例初始化
 * @note 在main函数中调用，初始化两个电机
 */
void Motor_Example_Init(void)
{
    // 创建电机1 - 使用TIM1_CH2和PE9
    Motor_Create(&motor1, 
                 &htim1,           // TIM1定时器
                 TIM_CHANNEL_2,    // 通道2 (PE11)
                 GPIOE,            // GPIOE端口
                 GPIO_PIN_9,       // PE9引脚
                 GPIO_PIN_SET);    // 正转时输出高电平
    
    // 创建电机2 - 使用TIM1_CH4和PE13
    Motor_Create(&motor2, 
                 &htim1,           // TIM1定时器
                 TIM_CHANNEL_4,    // 通道4 (PE14)
                 GPIOE,            // GPIOE端口
                 GPIO_PIN_13,      // PE13引脚
                 GPIO_PIN_SET);    // 正转时输出高电平
}

/**
 * @brief 基本电机控制示例
 */
void Motor_Example_Basic(void)
{
    // 电机1以50%速度正转
    Motor_SetSpeed(&motor1, 50);
    
    // 电机2以30%速度反转
    Motor_SetSpeed(&motor2, -30);
    
    // 延时1秒
    HAL_Delay(1000);
    
    // 停止所有电机
    Motor_Stop(&motor1);
    Motor_Stop(&motor2);
}

/**
 * @brief 电机加速减速示例
 */
void Motor_Example_Acceleration(void)
{
    int8_t speed;
    
    // 电机1从0加速到100%
    for (speed = 0; speed <= 100; speed += 10) {
        Motor_SetSpeed(&motor1, speed);
        HAL_Delay(200); // 每档延时200ms
    }
    
    // 电机1从100%减速到0
    for (speed = 100; speed >= 0; speed -= 10) {
        Motor_SetSpeed(&motor1, speed);
        HAL_Delay(200);
    }
    
    // 停止电机
    Motor_Stop(&motor1);
}

/**
 * @brief 双电机同步控制示例
 */
void Motor_Example_Synchronous(void)
{
    // 双电机同向运动 - 前进
    Motor_SetSpeed(&motor1, 60);
    Motor_SetSpeed(&motor2, 60);
    HAL_Delay(2000);
    
    // 双电机反向运动 - 后退
    Motor_SetSpeed(&motor1, -60);
    Motor_SetSpeed(&motor2, -60);
    HAL_Delay(2000);
    
    // 差速转向 - 左转
    Motor_SetSpeed(&motor1, 30);
    Motor_SetSpeed(&motor2, 80);
    HAL_Delay(1000);
    
    // 差速转向 - 右转
    Motor_SetSpeed(&motor1, 80);
    Motor_SetSpeed(&motor2, 30);
    HAL_Delay(1000);
    
    // 停止
    Motor_Stop(&motor1);
    Motor_Stop(&motor2);
}

/**
 * @brief 电机状态监控示例
 * @note A4950快慢衰减模式：正转用慢衰减，反转用快衰减
 */
void Motor_Example_Monitor(void)
{
    // 设置电机速度
    Motor_SetSpeed(&motor1, 75);
    Motor_SetSpeed(&motor2, -45);
    
    // 获取并显示电机状态
    MotorState_t state1 = Motor_GetState(&motor1);
    MotorState_t state2 = Motor_GetState(&motor2);
    
    // 根据状态进行处理
    if (state1 == MOTOR_STATE_FORWARD) {
        // 电机1正转处理
    } else if (state1 == MOTOR_STATE_BACKWARD) {
        // 电机1反转处理
    }
    
    // 运行一段时间后停止
    HAL_Delay(2000);
    Motor_Stop(&motor1);
    Motor_Stop(&motor2);
}

/**
 * @brief 电机使能控制示例
 */
void Motor_Example_Enable(void)
{
    // 失能电机1
    Motor_Enable(&motor1, 0);
    
    // 尝试控制失能的电机（将失败）
    if (Motor_SetSpeed(&motor1, 50) != 0) {
        // 设置失败，电机已失能
    }
    
    // 重新使能电机1
    Motor_Enable(&motor1, 1);
    
    // 现在可以正常控制
    Motor_SetSpeed(&motor1, 50);
    HAL_Delay(1000);
    Motor_Stop(&motor1);
}

/**
 * @brief 在main函数中的集成示例
 */
void Motor_Example_Integration(void)
{
    // 初始化（在main函数开始时调用）
    Motor_Example_Init();
    
    // 主循环中的控制逻辑
    while (1) {
        // 基本控制示例
        Motor_Example_Basic();
        HAL_Delay(2000);
        
        // 加速减速示例
        Motor_Example_Acceleration();
        HAL_Delay(1000);
        
        // 同步控制示例
        Motor_Example_Synchronous();
        HAL_Delay(1000);
        
        // 状态监控示例
        Motor_Example_Monitor();
        HAL_Delay(1000);
        
        // 使能控制示例
        Motor_Example_Enable();
        HAL_Delay(1000);
    }
}