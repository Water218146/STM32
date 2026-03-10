#ifndef __PID_APP_H__
#define __PID_APP_H__

#include "MyDefine.h"

// PID参数结构体
typedef struct
{
    float kp;          // 比例系数
    float ki;          // 积分系数
    float kd;          // 微分系数
    float out_min;     // 输出最小值
    float out_max;     // 输出最大值
} PidParams_t;

void PID_Init(void);
void PID_Task(void);

extern bool pid_running; // PID 控制使能开关
extern unsigned char pid_control_mode;

extern int basic_speed;

extern PID_T pid_speed_left;  // 左轮速度环
extern PID_T pid_speed_right; // 右轮速度环

extern PID_T pid_line;        // 循迹环

extern PID_T pid_angle;       // 角度环

#endif
