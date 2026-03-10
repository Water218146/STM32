#include "input_app.h"

void input_task()
{
    if(GPIO_ReadInputDataBit(GPIOB, GPIO_Pin_13)) //  π”√GPIO_Pin_13∫Í)
        ucled[0] = 1;
		else
				ucled[0] = 0;

}
