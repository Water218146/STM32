#include "uart_app.h"

/*=====================================解析处理方案选择====================================*/
#define TIMEOUT   	1  // 超时解析方案
#define IDLE  			2  // DMA+空闲中断解析
#define RINGBUFFER	3  //环形缓存区

// 当前使用的方案 - 可以在这里切换不同的按键处理方案
#define CURRENT_Rx_SCHEME   RINGBUFFER


/*=====================================串口重定向====================================*/
int my_printf(UART_HandleTypeDef *huart, const char *format, ...)
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

/*==================================超时解析方案 =================================*/
#if (CURRENT_Rx_SCHEME == TIMEOUT)
//最大接收数据个数
#define UART_RX_BUFFER_SIZE 128
//超时规则
#define UART_TIMEOUT_MS 100

uint8_t uart_rx_buffer[UART_RX_BUFFER_SIZE];//串口接收缓存区
uint16_t uart_rx_index;//缓存区数组索引值
uint32_t uart_rx_ticks;//记录最后接收到数据的时间

/*========================串口普通中断回调函数========================*/
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
    // 1. 核对身份：是 USART1 的快递员吗？
	if (huart->Instance == USART1)
	{
        // 2. 更新收货时间：记录下当前时间
		uart_rx_ticks = uwTick;
        // 3. 货物入库：将收到的字节放入缓冲区（HAL库已自动完成）
        //    并增加计数器
        //    (注意：实际入库由 HAL_UART_Receive_IT 触发，这里只更新计数)
		uart_rx_index++;
        // 4. 准备下次收货：再次告诉硬件，我还想收一个字节
		HAL_UART_Receive_IT(&huart1, &uart_rx_buffer[uart_rx_index], 1);
	}
}

void uart_task(void)
{
    // 1. 检查货架：如果计数器为0，说明没货或刚处理完，休息。
	if (uart_rx_index == 0)
		return;

    // 2. 检查手表：当前时间 - 最后收货时间 > 规定的超时时间？
	if (uwTick - uart_rx_ticks > UART_TIMEOUT_MS) // 核心判断
	{
        // --- 3. 超时！开始理货 --- 
        // "uart_rx_buffer" 里从第0个到第 "uart_rx_index - 1" 个
        // 就是我们等到的一整批货（一帧数据）
		my_printf(&huart1, "uart data: %s\n", uart_rx_buffer);
        // (在这里加入你自己的处理逻辑，比如解析命令控制LED)
        // --- 理货结束 --- 

		// 4. 清理现场：把处理完的货从货架上拿走，计数器归零
		memset(uart_rx_buffer, 0, uart_rx_index);
		uart_rx_index = 0;

        // 5. 将UART接收缓冲区指针重置为接收缓冲区的起始位置
        huart1.pRxBuffPtr = uart_rx_buffer;
	}
    // 如果没超时，啥也不做，等下次再检查
}


#endif
/*==================================DMA+空闲中断=================================*/
#if (CURRENT_Rx_SCHEME == IDLE)

//
uint8_t uart_rx_dma_buffer[128];//DMA专用的缓存区  DMA 控制器直接操作的内存区域
uint8_t uart_dma_buffer[128];		//待处理货架 当发生空闲中断时 会将DMA缓存区里的数据复制过来
uint8_t uart_flag = 0;//"到货通知旗": 一个标志位。当空闲中断发生，表示一批数据接收完成并且已经从 DMA 区复制到待处理货架上了

/*==================================空闲中断回调函数=================================*/
/**
 * @brief UART DMA接收完成或空闲事件回调函数
 * @param huart UART句柄
 * @param Size 指示在事件发生前，DMA已经成功接收了多少字节的数据
 * @retval None
 */
void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
    // 1. 确认是目标串口 (USART1)
    if (huart->Instance == USART1)
    {
        // 2. 紧急停止当前的 DMA 传输 (如果还在进行中)
        //    因为空闲中断意味着发送方已经停止，防止 DMA 继续等待或出错
        HAL_UART_DMAStop(huart);

        // 3. 将 DMA 缓冲区中有效的数据 (Size 个字节) 复制到待处理缓冲区
        memcpy(uart_dma_buffer, uart_rx_dma_buffer, Size); 
        // 注意：这里使用了 Size，只复制实际接收到的数据
        
        // 4. 举起"到货通知旗"，告诉主循环有数据待处理
        uart_flag = 1;

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


/**
 * @brief  处理 DMA 接收到的 UART 数据
 * @param  None
 * @retval None
 */
void uart_task(void)
{
    // 1. 检查"到货通知旗"
    if(uart_flag == 0) 
        return; // 旗子没举起来，说明没新货，直接返回
    
    // 2. 放下旗子，表示我们已经注意到新货了
    //    防止重复处理同一批数据
    uart_flag = 0;
	
    // 3. 处理 "待处理货架" (uart_dma_buffer) 中的数据
    //    这里简单地打印出来，实际应用中会进行解析、执行命令等
    my_printf(&huart1,"DMA data: %s\n", uart_dma_buffer);
    //    (注意：如果数据不是字符串，需要用其他方式处理，比如按字节解析)
    
    // 4. 清空"待处理货架"，为下次接收做准备
    memset(uart_dma_buffer, 0, sizeof(uart_dma_buffer));
}
#endif

#if (CURRENT_Rx_SCHEME == RINGBUFFER)
uint8_t uart_rx_dma_buffer[128];//DMA专用的缓存区  DMA 控制器直接操作的内存区域
uint8_t uart_dma_buffer[128];		//实际要解析的数组缓存区 当发生空闲中断时 会将DMA缓存区里的数据复制过来

//ringbuffer变量
struct rt_ringbuffer uart_ringbuffer;//实例化一个ringbuffer结构体
uint8_t ringbuffer_pool[128];		//ringbuffer专用缓存区域

/*==================================空闲中断回调函数=================================*/
/**
 * @brief UART DMA接收完成或空闲事件回调函数
 * @param huart UART句柄
 * @param Size 指示在事件发生前，DMA已经成功接收了多少字节的数据
 * @retval None
 */
void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
    // 1. 确认是目标串口 (USART1)
    if (huart->Instance == USART1)
    {
        // 2. 紧急停止当前的 DMA 传输 (如果还在进行中)
        //    因为空闲中断意味着发送方已经停止，防止 DMA 继续等待或出错
        HAL_UART_DMAStop(huart);
			
        // 3. 将 DMA 缓冲区中有效的数据 (Size 个字节) 放到 ringbuffer中去
				rt_ringbuffer_put(&uart_ringbuffer,uart_rx_dma_buffer,Size);//将dma缓存区的数据 放到 ringbuffer_pool中去
        // 注意：这里使用了 Size，只复制实际接收到的数据 并且该函数传入的第一个参数是结构体的地址
			
        // 4. 清空 DMA 接收缓冲区，为下次接收做准备
        //    虽然 memcpy 只复制了 Size 个，但清空整个缓冲区更保险
        memset(uart_rx_dma_buffer, 0, sizeof(uart_rx_dma_buffer));
			
        // 5. **关键：重新启动下一次 DMA 空闲接收**
        //    必须再次调用，否则只会接收这一次
        HAL_UARTEx_ReceiveToIdle_DMA(&huart1, uart_rx_dma_buffer, sizeof(uart_rx_dma_buffer));
        
        // 6. 如果之前关闭了半满中断，可能需要在这里再次关闭 (根据需要)
         __HAL_DMA_DISABLE_IT(&hdma_usart1_rx, DMA_IT_HT);
    }
}

void uart_task()
{
	uint16_t length;
	length = rt_ringbuffer_data_len(&uart_ringbuffer);//获取pool中的数据长度
	if(length==0)return;
	rt_ringbuffer_get(&uart_ringbuffer,uart_dma_buffer,length);
	//进行解析操作
	my_printf(&huart1,"ringbuffer data: %s\r\n",uart_dma_buffer);
	
	//清空接收缓存区
	memset(uart_dma_buffer,0,sizeof(uart_dma_buffer));
}

#endif

