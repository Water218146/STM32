#include "dac_app.h"
#include "adc_app.h"
#include "math.h"
#include <stdlib.h>
//波形的频率 = TIM6频率 / 采样点数
//波形的周期 = 采样点数/ TIM6频率
/*=======================================DAC输出======================================*/
// --- 宏定义 ---
#define MAX_WAVE_SAMPLES 1000      // 波形采样点数
#define DAC_MAX_VALUE 4095     // 12位DAC最大值

// 全局变量
uint16_t WaveBuffer[MAX_WAVE_SAMPLES];     // 波形数据缓冲区（固定大小）
uint16_t current_sample_count = 100;      // 当前实际使用的采样点数（动态）



//切换波形变量
uint8_t dac_mode = 0;              // DAC模式 (0=正弦波, 1=三角波, 2=方波)



// 状态记录变量
static uint16_t last_amplitude = 1000;
static uint16_t uart_last_amplitude = 1000;
static uint8_t last_dac_mode = 0;

// --- 生成正弦波数据的函数 ---
/**
 * @brief 生成正弦波查找表
 * @param buffer: 存储波形数据的缓冲区指针
 * @param samples: 一个周期的采样点数
 * @param amplitude: 正弦波的幅值(半峰值)
 * @param phase_shift: 相位偏移 (弧度)
 * @retval None
 */
void Generate_Sine_Wave(uint16_t* buffer, uint32_t samples, uint16_t amplitude, float phase_shift)
{
    float step = 2.0f * 3.14159f / samples;
    
    for(uint32_t i = 0; i < samples; i++)
    {
        float sine_value = sinf(i * step + phase_shift);
        buffer[i] = (uint16_t)((sine_value * amplitude) + (DAC_MAX_VALUE / 2.0f));
        
        if (buffer[i] > DAC_MAX_VALUE) buffer[i] = DAC_MAX_VALUE;
    }
}

// --- 生成三角波数据的函数 ---
/**
 * @brief 生成三角波查找表
 * @param buffer: 存储波形数据的缓冲区指针
 * @param samples: 一个周期的采样点数
 * @param amplitude: 三角波的幅值(半峰值)
 * @param phase_shift: 相位偏移 (弧度)
 * @retval None
 */
void Generate_Triangle_Wave(uint16_t* buffer, uint32_t samples, uint16_t amplitude, float phase_shift)
{
    float phase_samples = phase_shift * samples / (2.0f * 3.14159f);
    
    for(uint32_t i = 0; i < samples; i++)
    {
        float current_sample = (float)i + phase_samples;
        while(current_sample >= samples) current_sample -= samples;
        while(current_sample < 0) current_sample += samples;
        
        float triangle_value;
        
        if (current_sample < samples / 2.0f)
        {
            triangle_value = 2.0f * current_sample / (samples / 2.0f) - 1.0f;
        }
        else
        {
            triangle_value = -2.0f * (current_sample - samples / 2.0f) / (samples / 2.0f) + 1.0f;
        }
        
        buffer[i] = (uint16_t)((triangle_value * amplitude) + (DAC_MAX_VALUE / 2.0f));
        
        if (buffer[i] > DAC_MAX_VALUE) buffer[i] = DAC_MAX_VALUE;
        else if (buffer[i] < 0) buffer[i] = 0;
    }
}

// --- 生成方波数据的函数 ---
/**
 * @brief 生成方波查找表
 * @param buffer: 存储波形数据的缓冲区指针
 * @param samples: 一个周期的采样点数
 * @param amplitude: 方波的幅值(半峰值)
 * @param phase_shift: 相位偏移 (弧度)
 * @retval None
 */
void Generate_Square_Wave(uint16_t* buffer, uint32_t samples, uint16_t amplitude, float phase_shift)
{
    float phase_samples = phase_shift * samples / (2.0f * 3.14159f);
    
    for(uint32_t i = 0; i < samples; i++)
    {
        float current_sample = (float)i + phase_samples;
        while(current_sample >= samples) current_sample -= samples;
        while(current_sample < 0) current_sample += samples;
        
        float square_value;
        
        if (current_sample < samples / 2.0f)
        {
            square_value = 1.0f;
        }
        else
        {
            square_value = -1.0f;
        }
        
        buffer[i] = (uint16_t)((square_value * amplitude) + (DAC_MAX_VALUE / 2.0f));
        
        if (buffer[i] > DAC_MAX_VALUE) buffer[i] = DAC_MAX_VALUE;
        else if (buffer[i] < 0) buffer[i] = 0;
    }
}

// --- 统一的DAC初始化函数 ---
/**
 * @brief DAC波形输出初始化（默认正弦波）
 * @note 只需要调用一次，之后DMA会循环输出
 */
void dac_wave_init(void)
{
    // 生成默认波形（正弦波）
    Generate_Sine_Wave(WaveBuffer, current_sample_count, target_amplitude, 0.0f);
    
    // 启动定时器触发
    HAL_TIM_Base_Start(&htim6);
    
    // 启动DAC DMA（只启动一次！）
    HAL_DAC_Start_DMA(&hdac, DAC_CHANNEL_1, 
                      (uint32_t *)WaveBuffer, 
                      current_sample_count, 
                      DAC_ALIGN_12B_R);
    
    last_amplitude = target_amplitude;
    last_dac_mode = 0;
    
}

// --- DAC任务函数 ---
/**
 * @brief DAC任务，处理幅值动态调节和波形切换
 * @note 调用周期：1ms
 */
void dac_task(void)
{
    static uint16_t last_amplitude = 1000;
    static uint16_t uart_last_amplitude = 1000;
    static uint8_t last_dac_mode = 0;
    static uint16_t last_sample_count = 100;
    
    uint8_t adc_amplitude_changed = (abs((int)target_amplitude - (int)last_amplitude) > 10);
    uint8_t uart_amplitude_changed = (abs((int)uart_target_amplitude - (int)uart_last_amplitude) > 0);
    uint8_t mode_changed = (dac_mode != last_dac_mode);
    uint8_t sample_count_changed = (current_sample_count != last_sample_count);
    
    uint16_t use_amplitude;
    uint8_t need_update = 0;
    
    if (peak_mode == 1)
    {
        use_amplitude = uart_target_amplitude;
        need_update = (uart_amplitude_changed || mode_changed || sample_count_changed);
    }
    else
    {
        use_amplitude = target_amplitude;
        need_update = (adc_amplitude_changed || mode_changed || sample_count_changed);
    }
    
    if (need_update)
    {
        last_amplitude = target_amplitude;
        uart_last_amplitude = uart_target_amplitude;
        last_dac_mode = dac_mode;
        last_sample_count = current_sample_count;
        
        HAL_DAC_Stop_DMA(&hdac, DAC_CHANNEL_1);
        
        switch(dac_mode)
        {
            case 0:
                Generate_Sine_Wave(WaveBuffer, current_sample_count, use_amplitude, 0.0f);
                break;
                
            case 1:
                Generate_Triangle_Wave(WaveBuffer, current_sample_count, use_amplitude, 0.0f);
                break;
                
            case 2:
                Generate_Square_Wave(WaveBuffer, current_sample_count, use_amplitude, 0.0f);
                break;
        }
        
        HAL_DAC_Start_DMA(&hdac, DAC_CHANNEL_1,
                          (uint32_t *)WaveBuffer,
                          current_sample_count,
                          DAC_ALIGN_12B_R);
    }
}
