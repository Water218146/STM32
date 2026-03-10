#ifndef __UART_DRIVER_H__
#define __UART_DRIVER_H__

#include "MyDefine.h"

#define BUFFER_SIZE 128 // »º³åÇø´óÐ¡

int Uart_Printf(UART_HandleTypeDef *huart, const char *format, ...);  
void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size);

#endif

