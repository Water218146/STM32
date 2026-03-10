/*
 * Copyright (c) 2006-2026, RT-Thread Development Team
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Change Logs:
 * Date           Author       Notes
 * 2026-02-24     RT-Thread    first version
 */

#include <rtthread.h>
#include "mydefine.h"
int main(void)
{
    led_hardware_init();
    key_hardware_init();
    oled_init();
    uart3_init();
    return RT_EOK;
}
