#ifndef __MYDEFINE_H__
#define __MYDEFINE_H__

/* ========== HAL 库头文件 ========== */
#include "main.h"
#include "gpio.h"
#include "dma.h"
#include "i2c.h"
#include "tim.h"
#include "usart.h"

/* ========== C 语言头文件 ========== */
#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#include <math.h>
#include <stdint.h>
#include <stdbool.h>

/* ========== 组件库头文件 ========== */
#include "ebtn.h"

#include "oled.h"

// #include "WouoUI.h"
// #include "WouoUI_user.h"

#include "ringbuffer.h"

#include "hardware_iic.h"

#include "inv_mpu.h"
#include "inv_mpu_dmp_motion_driver.h"
#include "mpu6050.h"

#include "pid.h"

/* ========== 驱动库头文件 ========== */
#include "led_driver.h"
#include "key_driver.h"
#include "oled_driver.h"
#include "uart_driver.h"
#include "motor_driver.h"
#include "encoder_driver.h"
#include "mpu6050_driver.h"

/* ========== 应用层头文件 ========== */
#include "led_app.h"
#include "key_app.h"
#include "oled_app.h"
#include "uart_app.h"
#include "gray_app.h"
#include "motor_app.h" 
#include "encoder_app.h"
#include "mpu6050_app.h"
#include "pid_app.h"

/* ========== 核心调度器头文件 ========== */
#include "Scheduler.h"
#include "Scheduler_Task.h"

#endif
