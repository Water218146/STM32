#include "oled_app.h"

extern Encoder left_encoder;
extern Encoder right_encoder;

extern MOTOR left_motor;
extern MOTOR right_motor;

extern PID_T pid_speed_left;  // 左轮速度环 PID 控制器
extern PID_T pid_speed_right; // 右轮速度环 PID 控制器

extern unsigned char Digtal;

void Oled_Init(void)
{
  OLED_Init();
  OLED_Clear();
}

void Oled_Task(void)
{

    Oled_Printf(120, 0, 12, 0, "%d", system_mode);
    Oled_Printf(0, 0, 12, 0, "%d-%d-%d-%d-%d-%d-%d-%d",(Digtal>>0)&0x01,(Digtal>>1)&0x01,(Digtal>>2)&0x01,(Digtal>>3)&0x01,(Digtal>>4)&0x01,(Digtal>>5)&0x01,(Digtal>>6)&0x01,(Digtal>>7)&0x01);
    //Oled_Printf(0, 0, 12, 0, "Left:%d  Right:%d  ", left_motor.speed, right_motor.speed);
  
    Oled_Printf(114, 2, 12, 0, "%02d", point_count);
  
    Oled_Printf(0, 2, 12, 0, "Left:%.2fcm/s  ", left_encoder.speed_cm_s);
    Oled_Printf(0, 4, 12, 0, "Right:%.2fcm/s  ", right_encoder.speed_cm_s);
  
//    Oled_Printf(0, 2, 12, 0, "Roll:%f  ", Roll);
//    Oled_Printf(0, 4, 12, 0, "Pitch:%f  ", Pitch);
    Oled_Printf(0, 6, 12, 0, "Yaw:%f  ", Yaw);
  
//    Uart_Printf(&huart1, "%f,%f\r\n", pid_line_right.target, g_line_position_error); // 测试循迹环
  
//    Uart_Printf(&huart1, "%f,%f\r\n", pid_angle.target, Yaw); // 测试角度环
  
//    Uart_Printf(&huart1, "%f,%f,%f,%f\r\n", pid_speed_left.target, left_encoder.speed_cm_s, pid_speed_right.target, right_encoder.speed_cm_s); // 测试速度环
}
