#include <hardware_GPIO.h>

/****************************************************************************
 * @brief GPIO_init
 * @input None
 * @return None
****************************************************************************/
void gpio_init(void)//gpio初始化
{
	  RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOC|RCC_AHBPeriph_GPIOB|RCC_AHBPeriph_GPIOA|RCC_AHBPeriph_GPIOD|RCC_AHBPeriph_GPIOF, ENABLE); //使能GPIOC/B/A时钟  
   //led
    GPIO_LED_Configuretion();
	 // 初始化LED为全灭状态（高电平）
	 GPIO_SetBits(GPIOC, GPIO_Pin_10|GPIO_Pin_11|GPIO_Pin_12|GPIO_Pin_13|GPIO_Pin_14|GPIO_Pin_15);
	 GPIO_SetBits(GPIOB, GPIO_Pin_3|GPIO_Pin_4|GPIO_Pin_5|GPIO_Pin_6|GPIO_Pin_7|GPIO_Pin_8|GPIO_Pin_9);
	 GPIO_SetBits(GPIOD, GPIO_Pin_2);
	 GPIO_SetBits(GPIOA, GPIO_Pin_15);
	 GPIO_SetBits(GPIOF, GPIO_Pin_7);
	//输入
    GPIO_Input_Configuretion();
}

/****************************************************************************
 * @brief LED_Configuretion
 * @input None
 * @return None
****************************************************************************/
void GPIO_LED_Configuretion(void)//led配置
{
    GPIO_InitTypeDef GPIO_InitStructure;    
	
  /*Configure GPIO pins : PC13 PC14 PC15 PC10 PC11 PC12 */
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_13|GPIO_Pin_14|GPIO_Pin_15|GPIO_Pin_10
                          |GPIO_Pin_11|GPIO_Pin_12;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_OUT;
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_DOWN;
    GPIO_Init(GPIOC, &GPIO_InitStructure);
  /*Configure GPIO pin : PF7 */
	  GPIO_InitStructure.GPIO_Pin = GPIO_Pin_7;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_OUT;
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_DOWN;
    GPIO_Init(GPIOF, &GPIO_InitStructure);
	 /*Configure GPIO pin : PA15 */
	  GPIO_InitStructure.GPIO_Pin = GPIO_Pin_15;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_OUT;
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_DOWN;
    GPIO_Init(GPIOA, &GPIO_InitStructure);
  /*Configure GPIO pin : PD2 */		
	  GPIO_InitStructure.GPIO_Pin = GPIO_Pin_2;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_OUT;
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_DOWN;
    GPIO_Init(GPIOD, &GPIO_InitStructure);
  /*Configure GPIO pins : PB3 PB4 PB5 PB6 PB7 PB8 PB9 */
	  GPIO_InitStructure.GPIO_Pin = GPIO_Pin_3|GPIO_Pin_4|GPIO_Pin_5|GPIO_Pin_6|GPIO_Pin_7|GPIO_Pin_8|GPIO_Pin_9;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_OUT;
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_DOWN;
    GPIO_Init(GPIOB, &GPIO_InitStructure);	
}
 /****************************************************************************
 * @brief GPIO_Input_Configuretion
 * @input None
 * @return None
****************************************************************************/   
void GPIO_Input_Configuretion(void)//输入配置
{
    GPIO_InitTypeDef GPIO_InitStructure;

    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_13;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN;
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_DOWN;
    GPIO_Init(GPIOB, &GPIO_InitStructure);
}


