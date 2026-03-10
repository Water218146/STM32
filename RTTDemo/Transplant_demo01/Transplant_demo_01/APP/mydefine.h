/*
 * Copyright (c) 2006-2021, RT-Thread Development Team
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Change Logs:
 * Date           Author       Notes
 * 2026-02-24     Water21       the first version
 */
#ifndef APP_MYDEFINE_H_
#define APP_MYDEFINE_H_
//系统库
#include "rtthread.h"
#include "rtdevice.h"
#include "board.h"
#include "drv_common.h"
#include "string.h"
#include "stdarg.h"
#include "stdio.h"

//系统硬件外设

//组件库
#include "oled.h"

//APP
#include "led_app.h"
#include "key_app.h"
#include "oled_app.h"
#include "uart_app.h"
#include "adc_app.h"

//变量引用
//led
extern uint8_t ucled[6];
extern rt_mutex_t led_mutex;
#endif /* APP_MYDEFINE_H_ */
