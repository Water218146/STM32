#include "uart_driver.h"


uint8_t uart_rx_dma_buffer[BUFFER_SIZE]; // DMA 读取缓冲区

uint8_t ring_buffer_input[BUFFER_SIZE]; // 环形缓冲区对应的线性数组
struct rt_ringbuffer ring_buffer; // 环形缓冲区

uint8_t uart_data_buffer[BUFFER_SIZE]; // 数据处理缓冲区

int Uart_Printf(UART_HandleTypeDef *huart, const char *format, ...)
{
	char buffer[512]; // 临时存储格式化后的字符串
	va_list arg;      // 处理可变参数
	int len;          // 最终字符串长度

	va_start(arg, format);
	// 安全地格式化字符串到 buffer
	len = vsnprintf(buffer, sizeof(buffer), format, arg);
	va_end(arg);

	// 通过 HAL 库发送 buffer 中的内容
	HAL_UART_Transmit(huart, (uint8_t *)buffer, (uint16_t)len, 0xFF);
	return len;
}

void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
    // 1. 确认是目标串口 (USART1)
    if (huart->Instance == USART1)
    {
        // 2. 紧急停止当前的 DMA 传输 (如果还在进行中)
        //    因为空闲中断意味着发送方已经停止，防止 DMA 继续等待或出错
        HAL_UART_DMAStop(huart);

        // 3. 将 DMA 缓冲区中有效的数据 (Size 个字节) 复制到待处理缓冲区
        rt_ringbuffer_put(&ring_buffer, uart_rx_dma_buffer, Size);
        // 注意：这里使用了 Size，只复制实际接收到的数据
        
        // 4. 举起"到货通知旗"，告诉主循环有数据待处理

        // 5. 清空 DMA 接收缓冲区，为下次接收做准备
        //    虽然 memcpy 只复制了 Size 个，但清空整个缓冲区更保险
        memset(uart_rx_dma_buffer, 0, sizeof(uart_rx_dma_buffer));

        // 6. **关键：重新启动下一次 DMA 空闲接收**
        //    必须再次调用，否则只会接收这一次
        HAL_UARTEx_ReceiveToIdle_DMA(&huart1, uart_rx_dma_buffer, sizeof(uart_rx_dma_buffer));
        
        // 7. 如果之前关闭了半满中断，可能需要在这里再次关闭 (根据需要)
         __HAL_DMA_DISABLE_IT(&hdma_usart1_rx, DMA_IT_HT);
    }
}
