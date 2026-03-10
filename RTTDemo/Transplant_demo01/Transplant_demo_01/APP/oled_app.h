/*
 * Copyright (c) 2006-2021, RT-Thread Development Team
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Change Logs:
 * Date           Author       Notes
 * 2026-02-25     Water21       the first version
 */
#ifndef APP_OLED_APP_H_
#define APP_OLED_APP_H_

#include "mydefine.h"

int oled_printf(uint8_t x, uint8_t y, const char *format, ...);
void oled_task(void *parameter);
void oled_init(void);


#endif /* APP_OLED_APP_H_ */
