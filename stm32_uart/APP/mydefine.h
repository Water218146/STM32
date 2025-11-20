#ifndef __MYDEFINE_H_
#define __MYDEFINE_H_

/*引用系统头文件*/
#include "main.h"
#include "gpio.h"
#include "stdarg.h"
#include "string.h"
#include "stdio.h"
#include "usart.h"
#include "dma.h"

/*组件库*/
#include "ebtn.h"
#include "ringbuffer.h"

/*APP*/
#include "scheduler.h"
#include "led_app.h"
#include "key_app.h"
#include "uart_app.h"

/*外部引用专区*/
extern uint8_t ucLed[6];
extern uint8_t uart_rx_buffer[];//串口接收缓存区
extern uint8_t uart_rx_dma_buffer[128];//DMA专用缓冲区
extern UART_HandleTypeDef huart1;
extern DMA_HandleTypeDef hdma_usart1_rx;
extern struct rt_ringbuffer uart_ringbuffer;//实例化一个ringbuffer结构体
extern uint8_t ringbuffer_pool[128];		//ringbuffer专用缓存区域
#endif