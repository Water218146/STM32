#include "hardware.h"

void hardwire_init()
{
	Rcc_Init();//初始化时钟
	gpio_init();//GPIO初始化
}

