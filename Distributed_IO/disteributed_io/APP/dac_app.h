#ifndef __DAC_APP_H
#define __DAC_APP_H

#include "mydefine.h"

void dac_task(void);
void DAC1_SetValue(uint16_t value);
void dac_app_init(void);  // 初始化正弦波数据

#endif
