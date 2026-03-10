#include "mpu6050_driver.h"

// 获取飘移量
void MPU_Get_Gyro_Offset(short* gx_offset, short* gy_offset, short* gz_offset)
{
    int i;
    short gx, gy, gz;
    long temp_gx = 0, temp_gy = 0, temp_gz = 0;

    // 确保设备处于静止状态
    for(i = 0; i < 400; i++)
    {
        MPU_Get_Gyroscope(&gx, &gy, &gz);
        temp_gx += gx;
        temp_gy += gy;
        temp_gz += gz;
        HAL_Delay(5); // 延时5毫秒
    }
    *gx_offset = temp_gx / 400;
    *gy_offset = temp_gy / 400;
    *gz_offset = temp_gz / 400;
}

// 使用静态变量来保存上一次的状态
static float g_last_yaw = 0.0f;
static int g_revolution_count = 0;
static bool g_is_yaw_initialized = false;

/**
 * @brief 将一个在[-180, 180]范围内的yaw角度转换为连续的角度值。
 * 
 * @param current_yaw 从传感器读取的当前yaw值 (-180 to 180)。
 * @return float 连续的yaw角度值 (例如 370, -450 等)。
 */
float convert_to_continuous_yaw(float current_yaw) 
{
    // 定义一个阈值来检测“跳变”。这个值应该大于180，通常取270或300比较安全。
    const float WRAP_AROUND_THRESHOLD = 300.0f;

    // 首次调用时进行初始化
    if (!g_is_yaw_initialized) {
        g_last_yaw = current_yaw;
        g_is_yaw_initialized = true;
        g_revolution_count = 0;
    }

    // 计算与上次读数的差异
    float diff = current_yaw - g_last_yaw;

    // 检测是否发生了“跳变”
    if (diff > WRAP_AROUND_THRESHOLD) {
        // 从正角度跳到负角度 (例如, 从 170° 到 -175°), 实际是向右转, 圈数应该增加
        // 此时 diff 接近 -360 (例如 -175 - 170 = -345)
        // 这段逻辑处理的是从-180跳变到+180的情况，说明是向左转过界
        g_revolution_count--;
    } else if (diff < -WRAP_AROUND_THRESHOLD) {
        // 从负角度跳到正角度 (例如, 从 -170° 到 175°), 实际是向左转, 圈数应该减小
        // 此时 diff 接近 360 (例如 175 - (-170) = 345)
        // 这段逻辑处理的是从+180跳变到-180的情况，说明是向右转过界
        g_revolution_count++;
    }

    // 更新上次的yaw值以备下次调用
    g_last_yaw = current_yaw;

    // 计算连续的yaw值
    float continuous_yaw = current_yaw + (float)g_revolution_count * 360.0f;

    return continuous_yaw;
}

