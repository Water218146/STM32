/**
  ******************************************************************************
  * @file    Project/STM32F0xx_StdPeriph_Templates/main.c 
  * @author  MCD Application Team
  * @version V1.6.0
  * @date    13-October-2021
  * @brief   Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2014 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */

/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "scheduler.h"
/** @addtogroup STM32F0xx_StdPeriph_Templates
  * @{
  */

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
/* Private function prototypes -----------------------------------------------*/
/* Private functions ---------------------------------------------------------*/

/**
  * @brief  Main program.
  * @param  None
  * @retval None
  */
int main(void)
{
//	scheduler_init();//调度器初始化
	hardwire_init();//硬件配置初始化	
//  GPIO_SetBits(GPIOC,GPIO_Pin_15);	

//	GPIO_ResetBits(GPIOC,GPIO_Pin_15);
//	GPIO_ResetBits(GPIOC,GPIO_Pin_14);
//	GPIO_ResetBits(GPIOC,GPIO_Pin_13);
//	GPIO_ResetBits(GPIOB,GPIO_Pin_9);
//	GPIO_ResetBits(GPIOB,GPIO_Pin_8);
//	GPIO_ResetBits(GPIOB,GPIO_Pin_7);
//	GPIO_ResetBits(GPIOB,GPIO_Pin_6);
//	GPIO_ResetBits(GPIOB,GPIO_Pin_5);
//	GPIO_ResetBits(GPIOB,GPIO_Pin_4);
//	GPIO_ResetBits(GPIOB,GPIO_Pin_3);
//	GPIO_ResetBits(GPIOD,GPIO_Pin_2);
//	GPIO_ResetBits(GPIOC,GPIO_Pin_12);
//	GPIO_ResetBits(GPIOC,GPIO_Pin_11);
//	GPIO_ResetBits(GPIOC,GPIO_Pin_10);
//	GPIO_ResetBits(GPIOA,GPIO_Pin_15);
//	GPIO_ResetBits(GPIOF,GPIO_Pin_7);
  while (1)
  {
		scheduler_run();
  }
}


#ifdef  USE_FULL_ASSERT

/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t* file, uint32_t line)
{ 
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */

  /* Infinite loop */
  while (1)
  {
  }
}
#endif

/**
  * @}
  */


