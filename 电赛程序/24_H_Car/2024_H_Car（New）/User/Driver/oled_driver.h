#ifndef __OLED_DRIVER_H__
#define __OLED_DRIVER_H__

#include "MyDefine.h"

int Oled_Printf(uint8_t x, uint8_t y, uint8_t Char_Size, uint8_t Color_Turn, const char *format, ...);
void OLED_SendBuff(uint8_t buff[8][128]);
void HAL_I2C_MemTxCpltCallback(I2C_HandleTypeDef *hi2c);

#endif
