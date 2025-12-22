/* oled_app.h */
#ifndef __OLED_APP_H__
#define __OLED_APP_H__

#include "mydefine.h" // 或者你的主要头文件 "mydefine.h"
#include "oled.h"   // 包含底层 OLED 驱动头文件

int Oled_Printf(uint8_t x, uint8_t y, const char *format, ...);
void oled_task(void);

//u8g2回调函数
uint8_t u8g2_gpio_and_delay_stm32(u8x8_t *u8x8, uint8_t msg, uint8_t arg_int, void *arg_ptr);
uint8_t u8x8_byte_hw_i2c(u8x8_t *u8x8, uint8_t msg, uint8_t arg_int, void *arg_ptr);
#endif
