#include "hardware_RCC.h"

void Rcc_Init(void)
{
    RCC_ClocksTypeDef RCC_ClockFreq;
    
    RCC_GetClocksFreq(&RCC_ClockFreq);        /* 若只想检查当前频率，可留；不需要就删 */
    
//    /* ========== 使用 HSI 内部时钟 + PLL = 48MHz ========== */
//    /* HSI = 8MHz, HSI/2 = 4MHz, 4MHz * 12 = 48MHz */
//    
//    FLASH_PrefetchBufferCmd(ENABLE);  // 启用 Flash 预取缓冲
//    
//    RCC_PLLCmd(DISABLE);  // 先关闭 PLL
//    RCC_PLLConfig(RCC_PLLSource_HSI_Div2, RCC_PLLMul_12);  // HSI/2 * 12 = 48MHz
//    RCC_PLLCmd(ENABLE);   // 开启 PLL
//    
//    while (RCC_GetFlagStatus(RCC_FLAG_PLLRDY) == RESET)  // 等待 PLL 稳定
//    {
//    }
//    
//    RCC_SYSCLKConfig(RCC_SYSCLKSource_PLLCLK);  // 将系统时钟源切换为 PLL
//    while (RCC_GetSYSCLKSource() != 0x08)  // 等待 PLL 成为系统时钟 (0x08 = PLL)
//    {
//    }
//    
//    RCC_HCLKConfig(RCC_SYSCLK_Div1);  // HCLK = SYSCLK
//    RCC_PCLKConfig(RCC_HCLK_Div1);    // PCLK = HCLK

    /* ========== 原 HSE 外部时钟配置 ========== */
    
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

