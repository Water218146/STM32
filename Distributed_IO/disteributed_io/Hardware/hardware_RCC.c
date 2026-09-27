#include "hardware_RCC.h"

void Rcc_Init(void)
{
    RCC_ClocksTypeDef RCC_ClockFreq;
    
    RCC_GetClocksFreq(&RCC_ClockFreq);        /* 若只想检查当前频率，可留；不需要就删 */
 
    ErrorStatus HSEStartUpStatus;
    
    RCC_ClockSecuritySystemCmd(ENABLE);      // 时钟安全系统 CSS
    RCC_HSEConfig(RCC_HSE_ON);               // 启用外部高速时钟
    
    HSEStartUpStatus = RCC_WaitForHSEStartUp();  // 检查启动状态 
    if(HSEStartUpStatus == SUCCESS)
    {
        FLASH_PrefetchBufferCmd(ENABLE);
        RCC_PLLConfig(RCC_PLLSource_HSE, RCC_PLLMul_6);  // HSE * 6 = 48MHz
        RCC_PLLCmd(ENABLE);
        while (RCC_GetFlagStatus(RCC_FLAG_PLLRDY) == RESET)
        {
        }
        RCC_SYSCLKConfig(RCC_SYSCLKSource_PLLCLK);
        while (RCC_GetSYSCLKSource() != 0x08)
        {
        }
        RCC_HCLKConfig(RCC_SYSCLK_Div1);
        RCC_PCLKConfig(RCC_HCLK_Div1);
    }
    
}

