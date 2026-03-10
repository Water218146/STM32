#include "uart_app.h"

extern uint8_t uart_rx_dma_buffer[BUFFER_SIZE]; // DMA 读取缓冲区

extern uint8_t ring_buffer_input[BUFFER_SIZE]; // 环形缓冲区对应的线性数组
extern struct rt_ringbuffer ring_buffer; // 环形缓冲区

extern uint8_t uart_data_buffer[BUFFER_SIZE]; // 数据处理缓冲区

void Uart_Init(void)
{
  rt_ringbuffer_init(&ring_buffer, ring_buffer_input, BUFFER_SIZE);
  
  HAL_UARTEx_ReceiveToIdle_DMA(&huart1, uart_rx_dma_buffer, BUFFER_SIZE); // 启动读取中断
  __HAL_DMA_DISABLE_IT(&hdma_usart1_rx, DMA_IT_HT); // 关闭 DMA 的"半满中断"功能
}

void Uart_Task(void)
{
  uint16_t uart_data_len = rt_ringbuffer_data_len(&ring_buffer);
  if(uart_data_len > 0)
  {
    rt_ringbuffer_get(&ring_buffer, uart_data_buffer, uart_data_len);
    uart_data_buffer[uart_data_len] = '\0';
    /* 数据解析 */

    Uart_Printf(&huart1, "Ringbuffer:%s\r\n", uart_data_buffer);
    
    memset(uart_data_buffer, 0, uart_data_len);
  }
}

