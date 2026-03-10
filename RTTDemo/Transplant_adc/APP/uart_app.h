/*
 * Copyright (c) 2006-2021, RT-Thread Development Team
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Change Logs:
 * Date           Author       Notes
 * 2026-02-25     Water21       the first version
 */
#ifndef APP_UART_APP_H_
#define APP_UART_APP_H_

#include "mydefine.h"
int uart3_printf(const char *format,...);
int uart3_init(void);
#endif /* APP_UART_APP_H_ */
