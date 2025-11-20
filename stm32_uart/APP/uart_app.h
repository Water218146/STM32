#ifndef __UART_APP_H_
#define __UART_APP_H_

#include "mydefine.h"
int my_printf(UART_HandleTypeDef *huart, const char *format, ...);
void uart_task(void);
#endif