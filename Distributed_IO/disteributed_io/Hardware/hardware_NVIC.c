#include "hardware_NVIC.h"

void NVIC_init(void)
{
  NVIC_InitTypeDef NVIC_InitStructure;   
	/*usart1*/
	NVIC_InitStructure.NVIC_IRQChannel = USART1_IRQn;
	NVIC_InitStructure.NVIC_IRQChannelPriority = 2;
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_Init(&NVIC_InitStructure);
	
	/*Timer 3*/
	NVIC_InitStructure.NVIC_IRQChannel = TIM3_IRQn;
	NVIC_InitStructure.NVIC_IRQChannelPriority = 2;
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_Init(&NVIC_InitStructure);	
	
	/*test PA8÷–∂œ*/
	NVIC_InitStructure.NVIC_IRQChannel = EXTI4_15_IRQn;
	NVIC_InitStructure.NVIC_IRQChannelPriority = 2;
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_Init(&NVIC_InitStructure);	
	
	/*PA8“˝Ω≈÷–∂œ≈‰÷√*/
	EXTI8_Config();
}

/****************************************************************************
 * @brief 	PA8“˝Ω≈÷–∂œ≈‰÷√
 * @input 
 * @return
****************************************************************************/
void EXTI8_Config(void)
{
	EXTI_InitTypeDef EXTI_InitStrueture;
	GPIO_InitTypeDef GPIO_InitStructure;
	/* Enable SYSCFG clock */
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_SYSCFG, ENABLE);
	SYSCFG_EXTILineConfig(EXTI_PortSourceGPIOA,EXTI_PinSource8);
	RCC_AHBPeriphClockCmd (RCC_AHBPeriph_GPIOA, ENABLE);
	
	/*≈‰÷√“˝Ω≈*/
	GPIO_InitStructure.GPIO_Pin  = GPIO_Pin_8;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_DOWN;
	GPIO_Init(GPIOA, &GPIO_InitStructure);

  /*≈‰÷√EXTI*/
  EXTI_InitStrueture.EXTI_Line = EXTI_Line8;
	EXTI_InitStrueture.EXTI_Mode = EXTI_Mode_Interrupt;
	EXTI_InitStrueture.EXTI_Trigger = EXTI_Trigger_Rising;
	EXTI_InitStrueture.EXTI_LineCmd = ENABLE;
	EXTI_Init(&EXTI_InitStrueture);
	
}

void EXTI4_15_IRQHandler()
{
	if(EXTI_GetITStatus(EXTI_Line8)!=RESET)
	{
		ucled[9]^=1;
		
		EXTI_ClearITPendingBit(EXTI_Line8);
	}
}

