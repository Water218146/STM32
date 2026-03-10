#include "mpu6050_app.h"

float Pitch, Roll, Yaw; // pitch-俯仰角（俯-仰+），roll横滚角（前-后+），yaw-航向角（左+右-），要根据陀螺仪的xyz轴看

void Mpu6050_Init(void)
{
  MPU_Init();
	mpu_dmp_init();
}

void Mpu6050_Task(void)
{
  mpu_dmp_get_data(&Pitch, &Roll, &Yaw);
  Yaw = convert_to_continuous_yaw(Yaw);
}
