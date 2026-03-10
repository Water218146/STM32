#include "hardware_TIM.h"

/**
 * @brief  配置 TIM3 的 PWM 输出和定时器中断功能（合并版）
 * @param  arr: 自动重装载值（决定PWM频率和中断频率）
 * @param  psc: 预分频值（决定PWM频率和中断频率）
 * @note   TIM3_CH1 -> PA6 (STM32F051)
 * @note   PWM频率 = 系统时钟 / ((PSC+1) * (ARR+1))
 * @note   中断频率 = PWM频率（每个PWM周期触发一次中断）
 * @example TIM3_PWM_Init(999, 47);  // 48MHz / 48 / 1000 = 1kHz PWM, 1ms中断
 * @example TIM3_PWM_Init(2399, 1);  // 48MHz / 2 / 2400 = 10kHz PWM, 0.1ms中断
 */
void TIM3_PWM_Init(uint16_t arr, uint16_t psc)
{
    // ========================================
    // 步骤1: 使能时钟
    // ========================================
    
    // 使能 TIM3 时钟
    RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM3, ENABLE);
    
    // 使能 GPIOA 时钟（TIM3_CH1 在 PA6 上，用于PWM输出）
    RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);
    
    
    // ========================================
    // 步骤2: 配置 GPIO 为复用功能（PWM输出引脚）
    // ========================================
    GPIO_InitTypeDef GPIO_InitStructure;
    
    // 配置 PA6 为复用功能推挽输出
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_6;           // TIM3_CH1
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF;        // 复用模式
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_2MHz;   // 高速
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;      // 推挽输出
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_NOPULL;    // 无上下拉（减少噪声）
    GPIO_Init(GPIOA, &GPIO_InitStructure);
    
    // 将 PA6 映射到 TIM3 的复用功能（AF1）
    GPIO_PinAFConfig(GPIOA, GPIO_PinSource6, GPIO_AF_1);
    
    
    // ========================================
    // 步骤3: 配置定时器时基（决定PWM频率和中断频率）
    // ========================================
    TIM_TimeBaseInitTypeDef TIM_TimeBaseStructure;
    
    // PWM频率 = 系统时钟 / ((PSC+1) * (ARR+1))
    // 例如：48MHz / ((47+1) * (999+1)) = 1000Hz = 1kHz
    TIM_TimeBaseStructure.TIM_Period = arr;                    // ARR: 自动重装载值
    TIM_TimeBaseStructure.TIM_Prescaler = psc;                 // PSC: 预分频值
    TIM_TimeBaseStructure.TIM_ClockDivision = TIM_CKD_DIV1;    // 时钟分频
    TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up; // 向上计数
    TIM_TimeBaseInit(TIM3, &TIM_TimeBaseStructure);
    
    
    // ========================================
    // 步骤4: 配置 PWM 输出通道
    // ========================================
    TIM_OCInitTypeDef TIM_OCInitStructure;
    
    TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_PWM1;         // PWM模式1
    TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable; // 使能输出
    TIM_OCInitStructure.TIM_Pulse = 0;                        // CCR: 初始占空比为0
    TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High; // 高电平有效
    
    // 应用到通道1
    TIM_OC1Init(TIM3, &TIM_OCInitStructure);
    TIM_OC1PreloadConfig(TIM3, TIM_OCPreload_Enable);         // 使能CCR预装载
    
    
    // ========================================
    // 步骤5: 配置定时器中断
    // ========================================
    
    // 使能 TIM3 更新中断（每个PWM周期结束时触发）
    TIM_ITConfig(TIM3, TIM_IT_Update, ENABLE);
    
    
    // ========================================
    // 步骤6: 使能定时器
    // ========================================
    
    TIM_Cmd(TIM3, ENABLE);                                    // 启动定时器
    TIM_ARRPreloadConfig(TIM3, ENABLE);                       // 使能ARR预装载
}

/**
 * @brief  设置 PWM 占空比
 * @param  duty: 占空比值 (0 ~ arr)
 * @note   占空比 = duty / (arr + 1)
 */
void PWM_SetDuty(uint16_t duty)
{
    // 设置通道1的比较寄存器值
    TIM_SetCompare1(TIM3, duty);
}


/**
 * @brief  定时器3中断服务函数
 * @param  NONE
 * @note   每个PWM周期结束时触发（1ms一次）
 */
void TIM3_IRQHandler()
{
	static uint8_t LED_ms;
	
    if(TIM_GetITStatus(TIM3, TIM_IT_Update) != RESET)
    {
        LED_ms++;
        if(LED_ms == 100)
        {
            LED_ms = 0;
            ucled[9] ^= 1;  // 每100ms翻转一次LED
        }
    }
    TIM_ClearITPendingBit(TIM3, TIM_IT_Update);
}

