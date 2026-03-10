#include "led_driver.h"

void Led_Display(uint8_t enable)
{
  static uint8_t led_temp_old = 0x00;
  
  if(enable != led_temp_old)
  {
    HAL_GPIO_WritePin(LED_GPIO_Port, LED_Pin, enable ? GPIO_PIN_SET : GPIO_PIN_RESET);

    led_temp_old = enable;
  }
}
