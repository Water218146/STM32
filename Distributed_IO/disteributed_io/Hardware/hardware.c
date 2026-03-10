#include "hardware.h"

__IO uint32_t LsiFreq = 40000;

//看门狗初始化
void iwdg_init()
{
 IWDG_WriteAccessCmd(IWDG_WriteAccess_Enable);

  /* IWDG counter clock: LSI/32 */
  IWDG_SetPrescaler(IWDG_Prescaler_32);

  /* Set counter reload value to obtain 250ms IWDG TimeOut.
     Counter Reload Value = 250ms/IWDG counter clock period
                          = 250ms / (LSI/32)
                          = 0.25s / (LsiFreq/32)
                          = LsiFreq/(32 * 4)
                          = LsiFreq/128
   */
  IWDG_SetReload(LsiFreq/128);

  /* Reload IWDG counter */
  IWDG_ReloadCounter();

  /* Enable IWDG (the LSI oscillator will be enabled by hardware) */
  IWDG_Enable();

}

void hardwire_init()
{
	Rcc_Init();                 // 初始化时钟
	
	// 配置SysTick定时器：48MHz / 48000 = 1000Hz (1ms中断一次)
	SysTick_Config(SystemCoreClock / 1000);
	
	gpio_init();                // GPIO初始化
	NVIC_init();                // 中断配置及初始化
  Rs485_Config(115200);       // 配置串口及其波特率
	iwdg_init();                // 看门狗初始化
	
	// TIM3 PWM和中断初始化：1kHz PWM频率，1ms中断周期
	// PWM频率 = 48MHz / (48 * 1000) = 1kHz
	TIM3_PWM_Init(1000-1, 48-1);
	ADC1_Config();              // ADC初始化
	DAC1_Config();              // DAC初始化
	I2C1_Config();              // I2C1初始化（PB6=SCL, PB7=SDA）
	dac_app_init();             // 生成正弦波数据表
}

