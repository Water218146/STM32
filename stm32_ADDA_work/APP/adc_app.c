#include "adc_app.h"
#include "math.h"
/*=====================================ADC采集方案选择====================================*/

//1	轮询
//2 DMA连续转换
//3 DMA TIM 单通道采集
//4 DMA TIM 多通道采集 DAC输出
#define ADC_MODE (4)

// --- 无需后台处理任务 --- 
// 一旦 dac_sin_init 调用完成，硬件会自动循环输出波形
// adc_task() 中可以移除 dac 相关的处理
#if ADC_MODE == 1
// 全局变量
__IO uint32_t adc_val;//用于存储计算后的平均ADC值
__IO float voltage;//用于存储计算后的电压

// 在需要读取 ADC 的地方调用，比如一个任务函数内
void adc_read_by_polling(void) 
{
    // 1. 启动 ADC 转换
    HAL_ADC_Start(&hadc1); // hadc1 是你的 ADC 句柄

    // 2. 等待转换完成 (阻塞式)
    //    参数 1000 表示超时时间 (毫秒)
    if (HAL_ADC_PollForConversion(&hadc1, 1000) == HAL_OK) 
    {
        // 3. 转换成功，读取数字结果 (0-4095 for 12-bit)
        adc_val = HAL_ADC_GetValue(&hadc1);

        // 4. (可选) 将数字值转换为实际电压值
        //    假设 Vref = 3.3V, 分辨率 12 位 (4096)
        voltage = (float)adc_val * 3.3f / 4096.0f; 

        // (这里可以加入你对 voltage 或 adc_val 的处理逻辑)
         my_printf(&huart1, "ADC Value: %lu, Voltage: %.2fV\n", adc_val, voltage);

    } 
    else 
    {
        // 转换超时或出错处理
        // my_printf(&huart1, "ADC Poll Timeout!\n");
    }
    
    // 5. （重要）如果 ADC 配置为单次转换模式，通常不需要手动停止。
    //    如果是连续转换模式，可能需要 HAL_ADC_Stop(&hadc1);
    // HAL_ADC_Stop(&hadc1); // 根据你的 CubeMX 配置决定是否需要
}
void adc_task()
{
	adc_read_by_polling();
}

#elif ADC_MODE == 2

// --- 全局变量 --- 
#define ADC_DMA_BUFFER_SIZE 32 // DMA缓冲区大小，可以根据需要调整
uint32_t adc_dma_buffer[ADC_DMA_BUFFER_SIZE]; // DMA 目标缓冲区
__IO uint32_t adc_val;  // 用于存储计算后的平均 ADC 值
__IO float voltage; // 用于存储计算后的电压值

// --- 初始化 (通常在 main 函数或外设初始化函数中调用一次) ---
void adc_dma_init(void)
{
    // 启动 ADC 并使能 DMA 传输
    // hadc1: ADC 句柄
    // (uint32_t*)adc_dma_buffer: DMA 目标缓冲区地址 (HAL库通常需要uint32_t*)
    // ADC_DMA_BUFFER_SIZE: 本次传输的数据量 (缓冲区大小)
    HAL_ADC_Start_DMA(&hadc1, (uint32_t*)adc_dma_buffer, ADC_DMA_BUFFER_SIZE);
}

// --- 处理任务 (在主循环或定时器回调中定期调用) ---
void adc_task(void)
{
    uint32_t adc_sum = 0;
    
    // 1. 计算 DMA 缓冲区中所有采样值的总和
    //    注意：这里直接读取缓冲区，可能包含不同时刻的采样值
    for(uint16_t i = 0; i < ADC_DMA_BUFFER_SIZE; i++)
    {
        adc_sum += adc_dma_buffer[i];
    }
    
    // 2. 计算平均 ADC 值
    adc_val = adc_sum / ADC_DMA_BUFFER_SIZE; 
    
    // 3. (可选) 将平均数字值转换为实际电压值
    voltage = ((float)adc_val * 3.3f) / 4096.0f; // 假设12位分辨率, 3.3V参考电压

    // 4. 使用计算出的平均值 (adc_val 或 voltage)
     my_printf(&huart1, "Average ADC: %lu, Voltage: %.2fV\n", adc_val, voltage);
}


#elif ADC_MODE == 3

// --- 宏定义和外部变量 ---
#define BUFFER_SIZE 1000        // DMA 缓冲区大小 (总点数)
// --- 全局变量 ---

__IO uint32_t adc_val_dma_buffer[BUFFER_SIZE]; // DMA 目标缓冲区 (存储原始 ADC 数据)
__IO float voltage;														//用于存储计算后的电压
__IO uint8_t AdcConvEnd = 0;             			// ADC 转换完成标志 (一个块完成)


// --- 初始化函数 (在 main 或外设初始化后调用) ---
void adc_tim_dma_init(void)
{
    // 启动 ADC 的 DMA 传输，请求 BUFFER_SIZE 个数据点
    // 注意：这里假设 hadc1 已经配置为合适的触发模式 (定时器或软件)
    //       且 DMA 配置为 Normal 模式
    HAL_ADC_Start_DMA(&hadc1, (uint32_t *)adc_val_dma_buffer, BUFFER_SIZE);

    // 显式禁用 DMA 半传输中断 (如果不需要处理半满事件)
    __HAL_DMA_DISABLE_IT(&hdma_adc1, DMA_IT_HT);

    // 注意：如果使用定时器触发，需要在此处或之前启动定时器
    HAL_TIM_Base_Start(&htim3); // 替换 htimX 为实际定时器句柄
}

// --- ADC 转换完成回调函数 (由 DMA TC 中断触发) ---
// 当 DMA 完成整个缓冲区的传输 (Normal 模式下传输 BUFFER_SIZE 个点) 时触发
void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef* hadc)
{
    // 检查是否是由我们关心的 ADC (hadc1) 触发的
    if (hadc->Instance == ADC1) // 或 if(hadc == &hadc1)
    {
				//停止DMA搬运
        HAL_ADC_Stop_DMA(hadc);
        // 设置转换完成标志，通知后台任务数据已准备好
        AdcConvEnd = 1;
    }
}

// --- 后台处理任务 (在主循环或低优先级任务中调用) ---
void adc_task(void)
{
    // 检查转换完成标志
    if (AdcConvEnd)
    {
        // 处理数据: 从原始 ADC_DMA 缓冲区的数据转化电压值打印出来
        for(uint16_t i = 0; i < BUFFER_SIZE; i++)
        {
            voltage= ((float)adc_val_dma_buffer[i])*3.3/4095.0;
            my_printf(&huart1, "{tim_adc}%.2f\n", voltage);					
        }
        // 清除转换完成标志，准备下一次采集
        AdcConvEnd = 0;

        // 重新启动 ADC 的 DMA 传输，采集下一个数据块
        // 注意: 需要确保 ADC 状态适合重启 (例如没有错误)
        HAL_ADC_Start_DMA(&hadc1, (uint32_t *)adc_val_dma_buffer, BUFFER_SIZE);
        // 再次禁用半传输中断 (如果 Start_DMA 会重新启用它)
        __HAL_DMA_DISABLE_IT(&hdma_adc1, DMA_IT_HT);
    }
}
#elif ADC_MODE == 4
// --- 宏定义和外部变量 ---
#define BUFFER_SIZE 1000        // DMA 缓冲区大小 (总点数)
// --- 全局变量 ---
uint32_t dac_val_buffer[BUFFER_SIZE / 2]; // 用于存储处理后的 ADC 数据
uint32_t adc_val_buffer[BUFFER_SIZE / 2];	// 存储 adc通道1 的数据
__IO uint32_t adc_val_dma_buffer[BUFFER_SIZE]; // DMA 目标缓冲区 (存储原始 ADC 数据)
float voltage;
__IO uint8_t AdcConvEnd = 0;             // ADC 转换完成标志 (一个块完成)
// DAC amplitude control variables
volatile float current_voltage = 0.0f;
volatile uint16_t target_amplitude = 1000;//峰峰值
volatile uint16_t uart_target_amplitude = 1000;//串口控制峰峰值
uint8_t peak_mode = 0; //0 - adc控制模式 1 - 手动控制模式
float baseline_voltage = 0.0f;

#define ADC_CHANGE_THRESHOLD 0.2f

// --- 初始化函数 (在 main 或外设初始化后调用) ---
void adc_tim_dma_init(void)
{
    // 启动 ADC 的 DMA 传输，请求 BUFFER_SIZE 个数据点
    // 注意：这里假设 hadc1 已经配置为合适的触发模式 (定时器或软件)
    //       且 DMA 配置为 Normal 模式
    HAL_ADC_Start_DMA(&hadc1, (uint32_t *)adc_val_dma_buffer, BUFFER_SIZE);

    // 显式禁用 DMA 半传输中断 (如果不需要处理半满事件)
    __HAL_DMA_DISABLE_IT(&hdma_adc1, DMA_IT_HT);

    // 注意：如果使用定时器触发，需要在此处或之前启动定时器
    HAL_TIM_Base_Start(&htim3); // 替换 htimX 为实际定时器句柄
}

// --- ADC 转换完成回调函数 (由 DMA TC 中断触发) ---
// 当 DMA 完成整个缓冲区的传输 (Normal 模式下传输 BUFFER_SIZE 个点) 时触发
void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef* hadc)
{
    // 检查是否是由我们关心的 ADC (hadc1) 触发的
    if (hadc->Instance == ADC1) // 或 if(hadc == &hadc1)
    {
        HAL_ADC_Stop_DMA(hadc);

        // 设置转换完成标志，通知后台任务数据已准备好
        AdcConvEnd = 1;
    }
}

// --- 后台处理任务 (在主循环或低优先级任务中调用) ---
void adc_task(void)
{
    if (AdcConvEnd)
    {
        float voltage_sum = 0;
        uint32_t valid_samples = 0;
        
        for(uint16_t i = 0; i < BUFFER_SIZE / 2; i++)
        {
            voltage = (float)adc_val_dma_buffer[i * 2]*3.3/4095.0;
            voltage_sum += voltage;
            valid_samples++;
            dac_val_buffer[i] = adc_val_dma_buffer[i * 2 + 1];
        }
        
        current_voltage = voltage_sum / valid_samples;
        
        if(peak_mode == 0)
        {
            target_amplitude = (uint16_t)(current_voltage / 3.3f * 2047);
            if (target_amplitude > 2047) target_amplitude = 2047;
            if (target_amplitude < 100)  target_amplitude = 100;
            baseline_voltage = current_voltage;
        }
        else if(peak_mode == 1)
        {
            float voltage_diff = fabs(current_voltage - baseline_voltage);
            if (voltage_diff > ADC_CHANGE_THRESHOLD)
            {
                peak_mode = 0;
                target_amplitude = (uint16_t)(current_voltage / 3.3f * 2047);
                if (target_amplitude > 2047) target_amplitude = 2047;
                if (target_amplitude < 100)  target_amplitude = 100;
                baseline_voltage = current_voltage;
            }
        }

        for(uint16_t i = 0; i < BUFFER_SIZE / 2; i++)
        {
            if(uart_printf_flag)
                my_printf(&huart1, "{dac}%d\n", (int)dac_val_buffer[i]);
        }

        memset(dac_val_buffer, 0, sizeof(uint32_t) * (BUFFER_SIZE / 2));

        AdcConvEnd = 0;

        HAL_ADC_Start_DMA(&hadc1, (uint32_t *)adc_val_dma_buffer, BUFFER_SIZE);
        __HAL_DMA_DISABLE_IT(&hdma_adc1, DMA_IT_HT);
    }
}
#endif
