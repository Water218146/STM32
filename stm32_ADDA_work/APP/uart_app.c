#include "uart_app.h"

/*=====================================串口接收方案选择====================================*/
#define TIMEOUT   	1  // 超时检测方案
#define IDLE  			2  // DMA+空闲中断方案
#define RINGBUFFER	3  // 环形缓冲区方案

// 当前使用的方案 - 可以通过这里切换不同的包接收处理方式
#define CURRENT_Rx_SCHEME   RINGBUFFER


/*=====================================串口重定向====================================*/
int my_printf(UART_HandleTypeDef *huart, const char *format, ...)
{
	char buffer[512]; // 临时存储格式化字符串的缓冲区
	va_list arg;      // 处理可变参数
	int len;          // 存储字符串长度

	va_start(arg, format);
	// 安全地格式化字符串到 buffer
	len = vsnprintf(buffer, sizeof(buffer), format, arg);
	va_end(arg);

	// 通过 HAL 库发送 buffer 中的数据
	HAL_UART_Transmit(huart, (uint8_t *)buffer, (uint16_t)len, 0xFF);
	return len;
}

/*==================================超时检测方案 =================================*/
#if (CURRENT_Rx_SCHEME == TIMEOUT)
//接收缓冲区定义
#define UART_RX_BUFFER_SIZE 128
//超时设置
#define UART_TIMEOUT_MS 100

uint8_t uart_rx_buffer[UART_RX_BUFFER_SIZE];//串口接收缓冲区
uint16_t uart_rx_index;//接收计数器索引值
uint32_t uart_rx_ticks;//记录接收到数据的时间

/*========================串口中断回调函数========================*/
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
    // 1. 检查来源，确保是 USART1 的目标来源
	if (huart->Instance == USART1)
	{
        // 2. 记录接收时间：记录当前的时间戳
		uart_rx_ticks = uwTick;
        // 3. 字节处理：接收到的字节放入缓冲区，HAL库自动完成，
        //    我们需要增加计数器
        //    (注意：实际上 HAL_UART_Receive_IT 只是设置了接收)
		uart_rx_index++;
        // 4. 准备下次接收：再次给硬件传参，接收下一个字节
		HAL_UART_Receive_IT(&huart1, &uart_rx_buffer[uart_rx_index], 1);
	}
}

void uart_task(void)
{
    // 1. 防止空转：如果计数器为0，说明没有接收处理完，速返回
	if (uart_rx_index == 0)
		return;

    // 2. 检查是否：当前时间戳 - 接收时间戳 > 预设的长时间间隔？
	if (uwTick - uart_rx_ticks > UART_TIMEOUT_MS) // 超时判断
	{
        // --- 3. 超时开始处理 ---
        // "uart_rx_buffer" 从第0个到 "uart_rx_index - 1" 个
        // 包含了等待一个完整的数据包的数据
		my_printf(&huart1, "uart data: %s\n", uart_rx_buffer);
        // (后续可以加入自己的处理逻辑，比如控制LED)
        // --- 清理工作 ---

		// 4. 清除之前处理过的缓冲区和计数器，为下次接收做准备
		memset(uart_rx_buffer, 0, uart_rx_index);
		uart_rx_index = 0;

        // 5. 将UART接收缓冲区指针重新设置为接收缓冲区的起始位置
        huart1.pRxBuffPtr = uart_rx_buffer;
	}
    // 如果没有超时，也什么都不干，下次再检测
}


#endif
/*==================================DMA+空闲中断=================================*/
#if (CURRENT_Rx_SCHEME == IDLE)

//
uint8_t uart_rx_dma_buffer[128];//DMA专用的缓冲区  DMA 控制器直接写入内存区域
uint8_t uart_dma_buffer[128];		//实际处理缓冲区 串口空闲中断时，会将DMA缓冲区的数据复制过来
uint8_t uart_flag = 0;//"消息通知位"：一个标志位，串口中断函数设置，表示一包数据接收完毕已经被DMA搬运到了实际处理缓冲区

/*==================================串口中断回调函数=================================*/
/**
 * @brief UART DMA接收完成事件回调函数
 * @param huart UART句柄
 * @param Size 指示本次事件发生时DMA已经成功接收了多少字节的数据
 * @retval None
 */
void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
    // 1. 确保目标串口 (USART1)
    if (huart->Instance == USART1)
    {
        // 2. 立即停止当前的DMA传输（防止在处理期间）
        //    因为空闲中断意味着发送方已经停止发送，防止DMA继续等待数据
        HAL_UART_DMAStop(huart);

        // 3. 将DMA缓冲区的有效数据（Size字节）复制到处理缓冲区
        memcpy(uart_dma_buffer, uart_rx_dma_buffer, Size);
        // 注意：这里使用Size字节数，只复制实际接收到的数据

        // 4. 设置"消息通知位"，通知主循环数据已准备好
        uart_flag = 1;

        // 5. 清理DMA接收缓冲区，为下次接收准备
        //    虽然memcpy只复制了Size字节数据，但为了安全起见
        memset(uart_rx_dma_buffer, 0, sizeof(uart_rx_dma_buffer));

        // 6. **关键步骤：重新开启一次DMA接收**
        //    这样做可以让系统准备好下一次接收
        HAL_UARTEx_ReceiveToIdle_DMA(&huart1, uart_rx_dma_buffer, sizeof(uart_rx_dma_buffer));

        // 7. 由于之前关闭了半满中断，我们需要再次关闭（保险起见）
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
    // 1. 检查"消息通知位"
    if(uart_flag == 0)
        return; // 如果没有置位，说明没有数据，直接返回

    // 2. 清除标志位，表示我们已注意到有数据
    //    防止重复处理同一条数据
    uart_flag = 0;

    // 3. 处理 "工作缓冲区" (uart_dma_buffer) 中的数据
    //    这里简单地打印，实际应用中可以在这里进行分析处理
    my_printf(&huart1,"DMA data: %s\n", uart_dma_buffer);
    //    (注意：数据不一定是字符串，需要按实际格式解析，比如按字节解析)

    // 4. 清空"工作缓冲区"为下次接收准备
    memset(uart_dma_buffer, 0, sizeof(uart_dma_buffer));
}
#endif

#if (CURRENT_Rx_SCHEME == RINGBUFFER)
uint8_t uart_rx_dma_buffer[128];//DMA专用的缓冲区  DMA 控制器直接写入内存区域
uint8_t uart_dma_buffer[128];		//实际处理缓冲区 串口空闲中断时，会将DMA缓冲区的数据复制过来

//ringbuffer定义
struct rt_ringbuffer uart_ringbuffer;//实例化一个ringbuffer结构体
uint8_t ringbuffer_pool[128];		//ringbuffer专用内存池

uint8_t uart_printf_flag = 0;//串口打印标志位
/*==================================串口初始化函数=================================*/
void uart_init(void)
{
	HAL_UARTEx_ReceiveToIdle_DMA(&huart1, uart_rx_dma_buffer, sizeof(uart_rx_dma_buffer));//初次手动启动DMA
	__HAL_DMA_DISABLE_IT(&hdma_usart1_rx, DMA_IT_HT);//关闭半满中断
	rt_ringbuffer_init(&uart_ringbuffer,ringbuffer_pool,sizeof(ringbuffer_pool));// 初始化ringbuffer 让ringbffer结构体 绑定 其数据池
}
/*==================================串口中断回调函数=================================*/
/**
 * @brief UART DMA接收完成事件回调函数
 * @param huart UART句柄
 * @param Size 指示本次事件发生时DMA已经成功接收了多少字节的数据
 * @retval None
 */
void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
    // 1. 确保目标串口 (USART1)
    if (huart->Instance == USART1)
    {
        // 2. 立即停止当前的DMA传输（防止在处理期间）
        //    因为空闲中断意味着发送方已经停止发送，防止DMA继续等待数据
        HAL_UART_DMAStop(huart);

        // 3. 将 DMA 接收到的有效数据（Size字节）放到 ringbuffer里去
		rt_ringbuffer_put(&uart_ringbuffer,uart_rx_dma_buffer,Size);//把dma接收到的数据，放到 ringbuffer_pool里去
        // 注意：这里使用Size字节数，只复制实际接收到的数据，而且该函数的第一个参数是结构体的地址

        // 4. 清空 DMA 接收缓冲区，为下次接收准备
        //    虽然只处理了Size字节数据，但为了安全起见
        memset(uart_rx_dma_buffer, 0, sizeof(uart_rx_dma_buffer));

        // 5. **关键步骤：重新开启一次DMA接收**
        //    这样做可以让系统准备好下一次接收
        HAL_UARTEx_ReceiveToIdle_DMA(&huart1, uart_rx_dma_buffer, sizeof(uart_rx_dma_buffer));

        // 6. 由于之前关闭了半满中断，我们需要再次关闭（保险起见）
         __HAL_DMA_DISABLE_IT(&hdma_usart1_rx, DMA_IT_HT);
    }
}

void uart_task()
{
		unsigned char x,y;
	
	uint16_t length;
	length = rt_ringbuffer_data_len(&uart_ringbuffer);//获取pool中的数据长度
	if(length==0)return;
	rt_ringbuffer_get(&uart_ringbuffer,uart_dma_buffer,length);
	//进行解析操作
	/*=================================DAC波形控制解析=================================*/
	//命令控制区
	if(strcmp((char*)uart_dma_buffer, "mode:sin") == 0)
	{
		dac_mode = 0;  // 设置为正弦波模式
	}
	else if(strcmp((char*)uart_dma_buffer, "mode:sanjiao") == 0)
	{
		dac_mode = 1;  // 设置为三角波模式
	}
	else if(strcmp((char*)uart_dma_buffer, "mode:fangbo") == 0)
	{
		dac_mode = 2;  // 设置为方波模式
	}
//	else if(strcmp((char*)uart_dma_buffer, "pinglv") == 0)//串口开始打印
//	{

//	}
	else if(strcmp((char*)uart_dma_buffer, "run") == 0)//串口停止打印
	{
		uart_printf_flag = 1;
		my_printf(&huart1,"run printf");
	}	
	else if(strcmp((char*)uart_dma_buffer, "stop") == 0)//串口停止打印
	{
		uart_printf_flag = 0;
		my_printf(&huart1,"stop printf");
	}
	
	//参数设置区域
	if(sscanf(uart_dma_buffer,"pinglv:%d",&x)==1)
	{
		current_sample_count = 10000 / x;
	}
	else if(sscanf(uart_dma_buffer,"peak:%d",&y)==1)
	{
		if (y >= 100 && y <= 3300)
		{
			peak_mode = 1;
			uart_target_amplitude = (uint16_t)(y * 2047.0f / 3300.0f);
			if (uart_target_amplitude < 100) uart_target_amplitude = 100;
			if (uart_target_amplitude > 2047) uart_target_amplitude = 2047;
			baseline_voltage = current_voltage;
		}
	}
	

	//清空接收缓存区
	memset(uart_dma_buffer,0,sizeof(uart_dma_buffer));
}

#endif

