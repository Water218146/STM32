#ifndef __MPU6050_DRIVER_H__
#define __MPU6050_DRIVER_H__

#include "MyDefine.h"

void MPU_Get_Gyro_Offset(short* gx_offset, short* gy_offset, short* gz_offset);
float convert_to_continuous_yaw(float current_yaw);

#endif
