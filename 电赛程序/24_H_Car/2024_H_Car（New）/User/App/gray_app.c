#include "gray_app.h"

unsigned char Digtal; // 开关量

float gray_weights[8] = {-4.0f, -3.0f, -2.0f, -1.0f, 1.0f, 2.0f, 3.0f, 4.0f}; // 8 路灰度通道权重表

float g_line_position_error; // 循迹误差值

void Gray_Init(void)
{

}

void Gray_Task(void)
{
    //获取传感器开关量结果
    Digtal=~IIC_Get_Digtal();
//    Uart_Printf(&huart1, "Digtal %d-%d-%d-%d-%d-%d-%d-%d\r\n",(Digtal>>0)&0x01,(Digtal>>1)&0x01,(Digtal>>2)&0x01,(Digtal>>3)&0x01,(Digtal>>4)&0x01,(Digtal>>5)&0x01,(Digtal>>6)&0x01,(Digtal>>7)&0x01);
  
    float weighted_sum = 0;
    uint8_t black_line_count = 0;

    for(uint8_t i = 0; i < 8; i++)
    {
      if((Digtal>>i) & 0x01)
      {
        weighted_sum += gray_weights[i];
        black_line_count++;
      }
    }
    
    if(black_line_count > 0)
      g_line_position_error = weighted_sum / (float)black_line_count;
}
