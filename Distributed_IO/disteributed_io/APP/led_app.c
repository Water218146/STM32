#include "led_app.h"

uint8_t ucled[16] = {0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0};
/**
* @brief 根据ucLed数组状态更新16个LED的显示
* @param ucLed Led数据储存数组 (大小为16)
*/
void led_disp(unsigned char *ucled)
{
	uint16_t temp = 0x0000;
	static uint16_t temp_old = 0x0000;     // 初始化为0x0000，确保第一次更新
	static uint8_t first_run = 1;          // 首次运行标志
	
	for(uint8_t i = 0;i<16;i++)
	{
		if(ucled[i])
			temp |= (1<<i);
	}

	if(first_run || (temp != temp_old))  // 首次运行或状态变化时更新
	{
		first_run = 0;
		GPIO_WriteBit(GPIOC,GPIO_Pin_15,ucled[0]?Bit_RESET :Bit_SET);
		GPIO_WriteBit(GPIOC,GPIO_Pin_14,ucled[1]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOC,GPIO_Pin_13,ucled[2]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOB,GPIO_Pin_9,ucled[3]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOB,GPIO_Pin_8,ucled[4]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOB,GPIO_Pin_7,ucled[5]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOB,GPIO_Pin_6,ucled[6]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOB,GPIO_Pin_5,ucled[7]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOB,GPIO_Pin_4,ucled[8]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOB,GPIO_Pin_3,ucled[9]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOD,GPIO_Pin_2,ucled[10]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOC,GPIO_Pin_12,ucled[11]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOC,GPIO_Pin_11,ucled[12]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOC,GPIO_Pin_10,ucled[13]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOA,GPIO_Pin_15,ucled[14]?Bit_RESET:Bit_SET);
		GPIO_WriteBit(GPIOF,GPIO_Pin_7,ucled[15]?Bit_RESET:Bit_SET);
		
		temp_old = temp;
	}
}

void led_task(void)
{
	static uint32_t led_last_time = 0;
	if(uwTick - led_last_time >= 1000)
	{
		ucled[15] ^= 1;
		led_last_time = uwTick;
	}
	
	led_disp(ucled);
}
