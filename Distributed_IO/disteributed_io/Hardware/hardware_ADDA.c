#include "hardware_ADDA.h"

/**
 * @brief  配置 ADC1 单通道采集（PA0 -> ADC_Channel_0）
 * @param  NONE
 * @note   STM32F051 只有一个 ADC（ADC1），12位分辨率
 * @note   采集范围：0V ~ 3.3V  ->  数字值：0 ~ 4095
 * @note   PA5 对应 ADC_Channel_5
 */
void ADC1_Config(void)
{
    // ========================================
    // 步骤1: 使能时钟
    // ========================================
    
    // 使能 ADC1 时钟
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_ADC1, ENABLE);
    
    // 使能 GPIOA 时钟（PA0 作为 ADC 输入引脚）
    RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);
    
    
    // ========================================
    // 步骤2: 配置 GPIO 为模拟输入
    // ========================================
    GPIO_InitTypeDef GPIO_InitStructure;
    
    // 配置 PA0 为模拟输入模式
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_5;           // PA5 -> ADC_Channel_5
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AN;        // 模拟模式（ADC专用）
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_NOPULL;    // 无上下拉（模拟输入不能有）
    GPIO_Init(GPIOA, &GPIO_InitStructure);
    

    // ========================================
    // 步骤3: 配置 ADC 参数
    // ========================================
    ADC_InitTypeDef ADC_InitStructure;
    
    // 先复位 ADC，确保从干净状态开始
    ADC_DeInit(ADC1);
    
    // 关键：先用默认值填充结构体，防止栈上的随机垃圾值污染寄存器
    ADC_StructInit(&ADC_InitStructure);
    
    ADC_InitStructure.ADC_Resolution = ADC_Resolution_12b;            // 12位分辨率（0~4095）
    ADC_InitStructure.ADC_ContinuousConvMode = ENABLE;                // 连续转换模式（转换完成后自动开始下一次转换）
    ADC_InitStructure.ADC_ExternalTrigConvEdge = ADC_ExternalTrigConvEdge_None; // 软件触发（不用外部触发）关闭触发总开关
		ADC_InitStructure.ADC_ExternalTrigConv = ADC_ExternalTrigConv_T1_TRGO; // 值其实是0，但必须显式赋值 使用T1触发 但是由于总开关关了 不会被触发
    ADC_InitStructure.ADC_DataAlign = ADC_DataAlign_Right;            // 数据右对齐（12位数据在bit[11:0]，直接读取无需移位）
    ADC_InitStructure.ADC_ScanDirection = ADC_ScanDirection_Upward;   // 向上扫描
    ADC_Init(ADC1, &ADC_InitStructure);
    
    // 配置采样通道：ADC_Channel_5（PA5），采样时间 239.5 个周期（稳定）
    ADC_ChannelConfig(ADC1, ADC_Channel_5, ADC_SampleTime_239_5Cycles);
    
    
    // ========================================
    // 步骤4: 校准并使能 ADC
    // ========================================
    
    // 校准 ADC（提高采集精度，每次上电建议校准一次）
    ADC_GetCalibrationFactor(ADC1);
    
    // 使能 ADC
    ADC_Cmd(ADC1, ENABLE);
    
    // 等待 ADC 准备就绪
    while(!ADC_GetFlagStatus(ADC1, ADC_FLAG_ADRDY));
    
    // 启动第一次转换（之后会连续自动转换）
    ADC_StartOfConversion(ADC1);
}


/**
 * @brief  配置 DAC 通道1 输出（PA4 -> DAC_Channel_1）
 * @param  NONE
 * @note   STM32F051 有 1 个 DAC，12位分辨率
 * @note   输出范围：0V ~ 3.3V  ->  数字值：0 ~ 4095
 * @note   PA4 是 DAC_Channel_1 的固定引脚，不可更改
 */
void DAC1_Config(void)
{
    // ========================================
    // 步骤1: 使能时钟
    // ========================================
    
    // 使能 DAC 时钟
    RCC_APB1PeriphClockCmd(RCC_APB1Periph_DAC, ENABLE);
    
    // 使能 GPIOA 时钟（PA4 作为 DAC 输出引脚）
    RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);
    
    
    // ========================================
    // 步骤2: 配置 GPIO 为模拟输出
    // ========================================
    GPIO_InitTypeDef GPIO_InitStructure;
    
    // 配置 PA4 为模拟模式（DAC输出引脚固定为PA4）
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_4;           // PA4 -> DAC_Channel_1
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AN;        // 模拟模式（DAC专用）
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_NOPULL;    // 无上下拉
    GPIO_Init(GPIOA, &GPIO_InitStructure);
    
    
    // ========================================
    // 步骤3: 配置 DAC 参数
    // ========================================
    DAC_InitTypeDef DAC_InitStructure;
    
    DAC_InitStructure.DAC_Trigger = DAC_Trigger_None;           // 不使用触发（直接写入立即输出）
    DAC_InitStructure.DAC_WaveGeneration = DAC_WaveGeneration_None; // 不生成波形（手动控制输出值）
    DAC_InitStructure.DAC_OutputBuffer = DAC_OutputBuffer_Enable;   // 使能输出缓冲（增强驱动能力）
    DAC_Init(DAC_Channel_1, &DAC_InitStructure);
    
    
    // ========================================
    // 步骤4: 使能 DAC
    // ========================================
    
    // 使能 DAC 通道1
    DAC_Cmd(DAC_Channel_1, ENABLE);
    
    // 初始输出 0V
    DAC_SetChannel1Data(DAC_Align_12b_R, 0);
}

