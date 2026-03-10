/*
 * Copyright (c) 2006-2021, RT-Thread Development Team
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Change Logs:
 * Date           Author       Notes
 * 2026-02-25     Water21       the first version
 */
#include "adc_app.h"
#define ADC_STACK_SIZE 4096  //ADC线程栈大小
#define ADC_PRIORITY 10     //ADC线程优先级
#define ADC_TIMEOUT  10     //ADC线程时间片

//DMA搬运数组大小
#define DMA_BUFFER_SIZE 32

//DMA搬运数组
uint32_t adc_dma_buffer[DMA_BUFFER_SIZE];

/**
  * @brief DMA中断函数 必要要有 否则DMA触发后 会进入默认中断(死循环)
  */
void DMA2_Stream0_IRQHandler(void)
{
  /* USER CODE BEGIN DMA2_Stream0_IRQn 0 */

  /* USER CODE END DMA2_Stream0_IRQn 0 */
  HAL_DMA_IRQHandler(&hdma_adc1);
  /* USER CODE BEGIN DMA2_Stream0_IRQn 1 */

  /* USER CODE END DMA2_Stream0_IRQn 1 */
}

/* ADC线程入口函数  */
void adc_task(void *paratemer)
{
    float adc_value = 0;
    while(1)
    {
        adc_value = 0;
        for(uint8_t i = 0;i<DMA_BUFFER_SIZE;i++)
        {
            adc_value = adc_value + (float)adc_dma_buffer[i];
        }
        adc_value = (adc_value / DMA_BUFFER_SIZE) *3.3 /4096.0f;
        oled_printf(0, 2, "vol:%.2f   ",adc_value);
        uart3_printf("voltage:%.2f\r\n",adc_value);
//        rt_kprintf("voltage:%.d\r\n",(uint32_t)adc_value*1000);
        rt_thread_mdelay(100);
    }
}

/* ADC硬件初始化 */
int adc_hardware_init(void)
{
    //硬件初始化（HAL_ADC_MspInit 由 HAL_ADC_Init 内部自动调用，无需手动调用）
    MX_DMA_Init();
    MX_ADC1_Init();
    //启动DMA
    HAL_ADC_Start_DMA(&hadc1, adc_dma_buffer, DMA_BUFFER_SIZE);

    /* 创建线程 */
    rt_thread_t adc_thread =  rt_thread_create("adc_task", adc_task,  RT_NULL, ADC_STACK_SIZE, ADC_PRIORITY, ADC_TIMEOUT);
   /* 启动线程 */
    if(adc_thread != RT_NULL)
        rt_thread_startup(adc_thread);
    else
    {
        rt_kprintf("adc_thread startup:false!");
        return RT_ERROR;
    }

    return RT_EOK;
}
