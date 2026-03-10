#include "uart_app.h"

#define TIMEOUT 1
#define DMA_IDLE 2
#define RING_BUFFER 3

//当前使用方案
#define USART_Rx_SCHEME  RING_BUFFER



/*=====================================标准库串口printf实现====================================*/

/**
 * @brief  通过USART发送格式化字符串（类似printf）
 * @param  USARTx: USART外设指针，如 USART1, USART2
 * @param  format: 格式化字符串
 * @param  ...: 可变参数
 * @retval 发送的字节数
 * 
 * 使用示例：
 *   my_printf(USART1, "Temperature: %d°C, Voltage: %.2fV\r\n", temp, voltage);
 */
int my_printf(USART_TypeDef* USARTx, const char *format, ...)
{
    char buffer[512];  // 临时缓冲区（可根据需要调整大小）
    va_list args;      // 可变参数列表
    int len;
    
    // 1. 格式化字符串到buffer
    va_start(args, format);
    len = vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    
    // 2. 逐字节发送（标准库方式）
    for(int i = 0; i < len; i++)
    {
        // 等待发送寄存器为空
        while(USART_GetFlagStatus(USARTx, USART_FLAG_TXE) == RESET);
        
        // 发送一个字节
        USART_SendData(USARTx, (uint8_t)buffer[i]);
    }
    
    // 3. 等待最后一个字节发送完成
    while(USART_GetFlagStatus(USARTx, USART_FLAG_TC) == RESET);
    
    return len;
}


#if (USART_Rx_SCHEME == TIMEOUT)
#define UART1_BUFFER_SIZE 256  // 增大缓冲区，防止溢出

uint8_t rs485_rx_buf[UART1_BUFFER_SIZE];
uint16_t usart_buffer_index = 0;
uint32_t last_recv_time = 0;

/****************************************************************************
 * @brief 串口初始化函数
 * @input	NONE
 * @return NONE
****************************************************************************/
void uart_init()
{
    Rs485_Config(115200);//配置串口波特率
}


/****************************************************************************
 * @brief 串口一中断服务函数(单字节接收)
 * @input NONE
 * @return NONE
****************************************************************************/
void USART1_IRQHandler(void)
{

    // 检查RXNE中断
    if(USART_GetITStatus(USART1, USART_IT_RXNE) != RESET)
    {
        uint8_t recv_data = USART_ReceiveData(USART1);  // 读取数据（自动清除RXNE标志）
        
        // 溢出保护：只有缓冲区未满才存储
        if(usart_buffer_index < UART1_BUFFER_SIZE)
        {
            rs485_rx_buf[usart_buffer_index++] = recv_data;
            last_recv_time = uwTick;  // 更新接收时间
        }
        else
        {
            // 缓冲区满，丢弃数据或重置（根据需求选择）
            usart_buffer_index = 0;  // 重置缓冲区
        }    
        // ? 不需要手动清除RXNE标志（读取数据已自动清除）
    }
}

/****************************************************************************
 * @brief RS485任务（USART1）
 * @input NONE
 * @return NONE
****************************************************************************/
void rs485_task(void)
{
    // 定时发送测试（每1秒发送一次）
    static uint32_t last_tx_time = 0;
    if(uwTick - last_tx_time >= 1000)
    {
        my_printf(USART1, "Hello World %lu\r\n", uwTick/1000);
        last_tx_time = uwTick;
    }

    // 超时判断：接收完成（10ms超时）
    if(usart_buffer_index > 0)  // 有数据
    {
        if(uwTick - last_recv_time >= 10)  // 超过10ms没有新数据
        {
					//解析操作
					
					my_printf(USART1,"Tmerout:%s\r\n",rs485_rx_buf);  
          // 清空缓冲区
          memset(rs485_rx_buf, 0, UART1_BUFFER_SIZE);
          usart_buffer_index = 0;   

        }
    }
}
#endif

#if (USART_Rx_SCHEME == DMA_IDLE)
#define UART1_BUFFER_SIZE 256  // 增大缓冲区，防止溢出

uint8_t rs485_rx_buf[UART1_BUFFER_SIZE];
uint8_t rs485_rx_dma_buf[UART1_BUFFER_SIZE];//DMA搬运缓存区
uint8_t uart_flag;              //允许解析标志 


/****************************************************************************
 * @brief 串口初始化函数
 * @input	NONE
 * @return NONE
****************************************************************************/
void uart_init()
{
    Rs485_Config(115200);  // 配置串口波特率
    USART_ReceiveToIdle_DMA(USART1, DMA1_Channel3, rs485_rx_dma_buf, sizeof(rs485_rx_dma_buf));//首次启动DMA接收
}


/****************************************************************************
 * @brief 串口一中断服务函数(DMA+IDLE)
 * @input NONE
 * @return NONE
****************************************************************************/
void USART1_IRQHandler(void)
{
    if(USART_GetITStatus(USART1, USART_IT_IDLE) != RESET)
    {
			// 停止DMA
			DMA_Cmd(DMA1_Channel3, DISABLE);
				
			//搬运数据
			memcpy(rs485_rx_buf, rs485_rx_dma_buf, sizeof(rs485_rx_dma_buf));
			//拉高旗帜
			uart_flag = 1;

			// 清空DMA缓存区
			memset(rs485_rx_dma_buf, 0, sizeof(rs485_rx_dma_buf));
			
			//重新使能DMA接收
			USART_ReceiveToIdle_DMA(USART1, DMA1_Channel3, rs485_rx_dma_buf, sizeof(rs485_rx_dma_buf));
		  
			//清除 IDLE 标志位，防止重复进入
			USART_ClearITPendingBit(USART1, USART_IT_IDLE);
    }
		
		//清除溢出错误
		if(USART_GetFlagStatus(USART1, USART_FLAG_ORE)==SET)
		{
			USART_ClearFlag(USART1,USART_FLAG_ORE);
		}
}

/****************************************************************************
 * @brief RS485任务（USART1）
 * @input NONE
 * @return NONE
****************************************************************************/

void rs485_task(void)
{
    // 无数据直接返回
    if(!uart_flag) return;
    
    // 有数据放下旗子，表示已经拿到新货，防止重复处理同一批数据
    uart_flag = 0;
    
    // 进入解析
    my_printf(USART1, "dma_data:%s\r\n", rs485_rx_buf);

    // 清空接收区
    memset(rs485_rx_buf, 0, sizeof(rs485_rx_buf));
}

#endif

#if (USART_Rx_SCHEME == RING_BUFFER)
#define UART1_BUFFER_SIZE 128  
uint8_t rs485_rx_buf[UART1_BUFFER_SIZE];        //实际解析的缓存区
uint8_t rs485_rx_dma_buf[UART1_BUFFER_SIZE];    //DMA搬运缓存区
struct rt_ringbuffer rs485_usart_ringbuffer;    //实例化一个ringbuffer结构体
uint8_t rs485_ringbuffer_pool[128];             //ringbuffer专用缓存区

/****************************************************************************
 * @brief 串口初始化函数（ringbuffer）
 * @input	NONE
 * @return NONE
****************************************************************************/
void uart_init()
{
    USART_ReceiveToIdle_DMA(USART1, DMA1_Channel3, rs485_rx_dma_buf, sizeof(rs485_rx_dma_buf));//首次启动DMA接收
    rt_ringbuffer_init(&rs485_usart_ringbuffer,rs485_ringbuffer_pool,sizeof(rs485_ringbuffer_pool));//初始化ringbuffer将其与pool绑定 为其分配内存空间
}

/****************************************************************************
 * @brief 串口一中断服务函数(RINGBUFFER)
 * @input NONE
 * @return NONE
****************************************************************************/
void USART1_IRQHandler(void)
{
    if(USART_GetITStatus(USART1, USART_IT_IDLE) != RESET)
    {
			// 停止DMA
			DMA_Cmd(DMA1_Channel3, DISABLE);
				
      //将dma缓存区数据放入pool
			rt_ringbuffer_put(&rs485_usart_ringbuffer,rs485_rx_dma_buf,sizeof(rs485_rx_dma_buf));

			// 清空DMA缓存区
			memset(rs485_rx_dma_buf, 0, sizeof(rs485_rx_dma_buf));
			
			//重新使能DMA接收
			USART_ReceiveToIdle_DMA(USART1, DMA1_Channel3, rs485_rx_dma_buf, sizeof(rs485_rx_dma_buf));
		  
			//清除 IDLE 标志位，防止重复进入
			USART_ClearITPendingBit(USART1, USART_IT_IDLE);
    }
		
		//清除溢出错误
		if(USART_GetFlagStatus(USART1, USART_FLAG_ORE)==SET)
		{
			USART_ClearFlag(USART1,USART_FLAG_ORE);
		}
}
/****************************************************************************
 * @brief RS485任务（USART1）
 * @input NONE
 * @return NONE
****************************************************************************/

void rs485_task(void)
{
    uint16_t length;
    length = rt_ringbuffer_data_len(&rs485_usart_ringbuffer);
    if(!length) return;
    rt_ringbuffer_get(&rs485_usart_ringbuffer,rs485_rx_buf,length);

    // 进入解析
    my_printf(USART1, "ringbuffer:%s\r\n", rs485_rx_buf);

    // 清空接收区
    memset(rs485_rx_buf, 0, sizeof(rs485_rx_buf));
}
 
#endif

