#ifndef __HARDWARE_ADDA_H
#define __HARDWARE_ADDA_H

#include "mydefine.h"

// ADC 初始化和读取（PA5 -> ADC_Channel_5）
void ADC1_Config(void);


// DAC 初始化和设置输出（PA4 -> DAC_Channel_1）
void DAC1_Config(void);


#endif

