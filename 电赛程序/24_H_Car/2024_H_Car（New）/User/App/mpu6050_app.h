#ifndef __MPU6050_APP_H__
#define __MPU6050_APP_H__

#include "MyDefine.h"

void Mpu6050_Init(void);
void Mpu6050_Task(void);

extern float Pitch, Roll, Yaw;

#endif
