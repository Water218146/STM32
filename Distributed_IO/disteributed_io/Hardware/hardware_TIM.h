#ifndef __HARDWARE_TIM_H
#define __HARDWARE_TIM_H

#include "mydefine.h"

// TIM3 的 PWM 和定时器中断合并初始化函数
void TIM3_PWM_Init(uint16_t arr, uint16_t psc);

// 设置 TIM3_CH1 的 PWM 占空比
void PWM_SetDuty(uint16_t duty);

#endif

