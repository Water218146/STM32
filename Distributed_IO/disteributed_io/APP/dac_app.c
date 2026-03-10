#include "dac_app.h"
#include "math.h"

#define SINE_SAMPLES 100    // 一个周期内的采样点数
#define DAC_MAX_VALUE 4095 // 12 位 DAC 的最大数字值 (2^12 - 1)

uint16_t SineWave[SINE_SAMPLES]; // 存储正弦波数据的数组
// --- 生成正弦波数据的函数 ---
/**
 * @brief 生成正弦波查找表
 * @param buffer: 存储波形数据的缓冲区指针
 * @param samples: 一个周期内的采样点数
 * @param amplitude: 正弦波的峰值幅度 (相对于中心值)
 * @param phase_shift: 相位偏移 (弧度)
 * @retval None
 */
void Generate_Sine_Wave(uint16_t* buffer, uint32_t samples, uint16_t amplitude, float phase_shift)
{
  // 计算每个采样点之间的角度步进 (2*PI / samples)
  float step = 2.0f * 3.14159f / samples; 
  
  for(uint32_t i = 0; i < samples; i++)
  {
    // 计算当前点的正弦值 (-1.0 到 1.0)
    float sine_value = sinf(i * step + phase_shift); // 使用 sinf 提高效率

    // 将正弦值映射到 DAC 的输出范围 (0 - 4095)
    // 1. 将 (-1.0 ~ 1.0) 映射到 (-amplitude ~ +amplitude)
    // 2. 加上中心值 (DAC_MAX_VALUE / 2)，将范围平移到 (Center-amp ~ Center+amp)
    buffer[i] = (uint16_t)((sine_value * amplitude) + (DAC_MAX_VALUE / 2.0f));
    
    // 确保值在有效范围内 (钳位)
    if (buffer[i] > DAC_MAX_VALUE) buffer[i] = DAC_MAX_VALUE;
    // 由于浮点计算精度问题，理论上不需要检查下限，但加上更健壮
    // else if (buffer[i] < 0) buffer[i] = 0; 
  }
}




/**
 * @brief  设置 DAC 输出值
 * @param  value: 输出值 (0 ~ 4095)
 * @note   输出电压 = value * 3.3 / 4096
 * @example DAC1_SetValue(2048);  // 输出约 1.65V（3.3V的一半）
 * @example DAC1_SetValue(4095);  // 输出约 3.3V（最大值）
 * @example DAC1_SetValue(0);     // 输出 0V
 */
void DAC1_SetValue(uint16_t value)
{
    // 设置 DAC 通道1 输出值（12位右对齐）
    DAC_SetChannel1Data(DAC_Align_12b_R, value);
}


void dac_app_init(void) // 初始化正弦波数据
{
	Generate_Sine_Wave(SineWave,SINE_SAMPLES,DAC_MAX_VALUE/2,0);
}


void dac_task(void)
{
	static uint32_t index = 0;  // 当前输出的采样点索引
	
	// 输出当前采样点的值到DAC
	DAC1_SetValue(SineWave[index]);
	
	// 移动到下一个采样点
	index++;
	
	// 如果到达数组末尾，回到起点（循环播放）
	if(index >= SINE_SAMPLES)
	{
		index = 0;
	}
}
