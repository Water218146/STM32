/*
 * 2024 年电赛 H 题 - 循迹小车
 * 基于天空星 STM32F407 核心板实现
 * 硬件方案：
 *  霍尔编码器电机 * 2
 *  TB6612
 *  12V 降压模块
 *  感为 8 路灰度传感器（蓝光款）
 *  MPU6050
 *  0.96 寸 Oled
 */

#include "Scheduler_Task.h"

void System_Init(void)
{
  Led_Init();
  Key_Init();
  Oled_Init();
  Uart_Init();
  Gray_Init();
  Motor_Init();
  Encoder_Init();
  Mpu6050_Init();
  PID_Init();
  Uart_Printf(&huart1, "=== System Init ===\r\n");
  HAL_TIM_Base_Start_IT(&htim2);
}

extern Encoder left_encoder;
extern Encoder right_encoder;

extern MOTOR left_motor;
extern MOTOR right_motor;

unsigned char measure_timer5ms;
unsigned char key_timer10ms;

unsigned char output_ff_flag;
unsigned int intput_timer500ms;

unsigned char intput_ff_flag;
unsigned int output_timer500ms;

unsigned int led_timer500ms; // 每经过一个点，LED 点亮 500ms 后熄灭

unsigned char point_count = 0; // 经过的点位计数（入圈 + 1，出圈 + 1）

unsigned char system_mode = 4; // 系统状态（1 ~ 4 对应 4 道题目）

unsigned char circle_count = 0; // 第四题的圈数计数器

unsigned int distance = 0; // 记录小车每一段行驶的距离

// TIM2 中断服务函数（1ms 中断）
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  if(htim->Instance != htim2.Instance) return;
 
  /* 10ms 按键检测任务*/
  if(++key_timer10ms >= 10)
  {
    key_timer10ms = 0;
    Key_Task();
  }
  
  /* 5ms 测量任务*/
  if(++measure_timer5ms >= 5) 
  {
    measure_timer5ms = 0;
    Encoder_Task();
    distance += left_encoder.speed_cm_s;
    Mpu6050_Task();
    Gray_Task();
    PID_Task();
  }
  
  /* 出圈触发器 */
  if(Digtal != 0x00)
  {
    output_ff_flag = 1;
    if(++intput_timer500ms >= 800) intput_timer500ms = 800;
  }
  else if(output_ff_flag == 1 && intput_timer500ms == 800)
  {
    output_ff_flag = 0;
    intput_timer500ms = 0;
    point_count++;
    Car_State_Update();
  }
  
  /* 入圈触发器 */
  if(Digtal == 0x00)
  {
    intput_ff_flag = 1;
    if(++output_timer500ms >= 800) output_timer500ms = 800;
  }
  else if(intput_ff_flag == 1 && output_timer500ms == 800)
  {
    intput_ff_flag = 0;
    output_timer500ms = 0;
    point_count++;
    Car_State_Update();
  }
  
  /* LED 状态检测 */
  if(led_state == 1 && ++led_timer500ms >= 500)
  {
    led_state = 0;
    led_timer500ms = 0;
  }
}

// 每次点位计数更新时，根据系统状态同步更新小车的状态
void Car_State_Update(void)
{
  led_state = 1;
  distance = 0;
  
  switch(system_mode)
  {
    case 1: // 第一题：直线行驶 A -> B
      if(point_count == 1)
      {
        pid_running = 0;
        Motor_Brake(&left_motor);
        Motor_Brake(&right_motor);
      }
      break;
    case 2: // 第二题：环绕一圈 A -> B -> C -> D
      if(point_count == 1)
        pid_control_mode = 1; // 使用循迹环控制
      else if(point_count == 2)
      {
        pid_control_mode = 0; // 使用角度环控制
        pid_set_target(&pid_angle, -176);
      }
      else if(point_count == 3)
        pid_control_mode = 1; // 使用循迹环控制
      else if(point_count == 4)
      {
        pid_running = 0;
        Motor_Brake(&left_motor);
        Motor_Brake(&right_motor);
      }
      break;
    case 3: // 第三题：8 字环绕一圈 A -> C -> B -> D
      if(point_count == 1)
      {
        pid_control_mode = 1; // 使用循迹环控制
      }
      else if(point_count == 2)
      {
        pid_control_mode = 0; // 使用角度环控制
        pid_set_target(&pid_angle, 253);
      }
      else if(point_count == 3)
      {
        pid_control_mode = 1; // 使用循迹环控制
      }
      else if(point_count == 4)
      {
        pid_running = 0;
        Motor_Brake(&left_motor);
        Motor_Brake(&right_motor);
      }
      break;
    case 4: // 第四题：8 字环绕四圈
      if(point_count == 1)
      {
        pid_control_mode = 1; // 使用循迹环控制
      }
      else if(point_count == 2)
      {
        pid_control_mode = 0; // 使用角度环控制
        pid_set_target(&pid_angle, 253 - (0.3 * circle_count)); // 根据圈数进行飘移补偿
      }
      else if(point_count == 3)
        pid_control_mode = 1; // 使用循迹环控制
      else if(point_count == 4)
      {
        if(++circle_count >= 4)
        {
          pid_running = 0;
          Motor_Brake(&left_motor);
          Motor_Brake(&right_motor);
        }
        point_count = 0;
        pid_control_mode = 0; // 使用角度环控制
        pid_set_target(&pid_angle, 0 - (0.2 * circle_count)); // 根据圈数进行飘移补偿
      }
      break;
  }
  
  /* 重置历史误差 */
  pid_reset(&pid_line);
  pid_reset(&pid_angle);
}
