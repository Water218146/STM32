#ifndef __MYDEFINE_H_
#define __MYDEFINE_H_

/*引用系统文件*/
#include "main.h"
#include "system_stm32f0xx.h"  // 包含SystemCoreClock声明
#include <stdarg.h>  // 可变参数支持
#include <stdio.h>   // vsnprintf支持
#include "string.h"

//引用标准库
#include "stm32f0xx_rcc.h"
#include "stm32f0xx_gpio.h"
#include "stm32f0xx_usart.h"

//组件
#include "ringbuffer.h"

//硬件
#include "hardware.h"
#include "hardware_RCC.h"
#include "hardware_GPIO.h"
#include "hardware_NVIC.h"
#include "hardware_uart.h"
#include "hardware_TIM.h"
#include "hardware_ADDA.h"
#include "hardware_iic.h"

//APP
#include "led_app.h"
#include "input_app.h"
#include "mydefine.h"
#include "uart_app.h"
#include "dac_app.h"
#include "adc_app.h"

//变量引用
extern uint32_t uwTick;
extern uint8_t ucled[16];
#endif
