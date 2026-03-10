#ifndef __UART_APP_H
#define __UART_APP_H

#include "mydefine.h"

int my_printf(USART_TypeDef* USARTx, const char *format, ...);
void rs485_task(void);
void uart_init(void);
#endif

