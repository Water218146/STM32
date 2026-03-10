#ifndef __ADC_APP_H
#define __ADC_APP_H

#include "mydefine.h"

void adc_task(void);
uint16_t ADC1_Read(void);  // 返回ADC原始值（0~4095）

// 全局变量声明（可在其他文件访问）
extern uint16_t adc_val;   // ADC原始值
extern float voltage;      // 电压值（V）

#endif
