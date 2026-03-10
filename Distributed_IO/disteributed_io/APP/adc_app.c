#include "adc_app.h"




/**
 * @brief  读取 ADC 采集值
 * @param  NONE
 * @retval ADC转换结果 (0 ~ 4095)
 * @note   返回值对应电压：voltage = result * 3.3 / 4096
 * @example uint16_t val = ADC1_Read();        // 读取原始值
 * @example float voltage = val * 3.3f / 4096; // 转换为电压
 */
 
uint16_t adc_val;        // ADC原始值（0~4095）
float voltage;           // 计算出的电压值（0~3.3V）

/**
 * @brief  读取 ADC 采集值
 * @param  NONE
 * @retval ADC转换结果 (0 ~ 4095)
 * @note   返回值对应电压：voltage = result * 3.3 / 4096
 * @note   使用连续转换模式，直接读取最新转换结果即可
 */
uint16_t ADC1_Read(void)
{
    // 等待转换完成（连续模式下会一直在转换）
    while(ADC_GetFlagStatus(ADC1, ADC_FLAG_EOC) == RESET);
    
    // 读取并返回转换结果（读取后EOC标志自动清除）
    // 右对齐模式：12位数据在bit[11:0]，直接读取即可
    return ADC_GetConversionValue(ADC1);
}


void adc_task(void)
{
	// 读取ADC值并计算电压
	adc_val = ADC1_Read();
	voltage = (float)adc_val * 3.3f / 4096.0f;
	
	// 调试：打印ADC寄存器配置（帮助诊断为什么需要右移4位）
//	static uint8_t first_run = 1;
//	if(first_run)
//	{
//		first_run = 0;
//		my_printf(USART1, "[ADC_Debug] CFGR1=0x%08X, DR=0x%08X\r\n", ADC1->CFGR1, ADC1->DR);
//		my_printf(USART1, "[ADC_Debug] RES bits(bit4-3)=%d, ALIGN bit(bit5)=%d\r\n", 
//		         (ADC1->CFGR1 >> 3) & 0x03,  // RES[1:0]位
//		         (ADC1->CFGR1 >> 5) & 0x01); // ALIGN位
//	}
	
	my_printf(USART1, "{adc_voltage}%.2f\r\n", voltage);
	my_printf(USART1, "{adc_raw}%u\r\n", adc_val);  // uint16_t 用 %u 格式
}

