#include "led_app.h"

uint8_t led_state = 0;

void Led_Init()
{
    Led_Display(0);
}

void Led_Task()
{
    Led_Display(led_state);
}
