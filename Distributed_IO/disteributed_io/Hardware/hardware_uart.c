#include "hardware_uart.h"

//配置 串口+485
void Rs485_Config(uint32_t baudrate)
{
    GPIO_InitTypeDef GPIO_InitStructure;
    USART_InitTypeDef USART_InitStructure;

    /* 1. 开启外设时钟 */
    // 使能 GPIOA 时钟 (PA9, PA10, PA12)
    RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOA, ENABLE);
    // 使能 USART1 时钟
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1, ENABLE);

    /* 2. 配置 GPIO 复用功能引脚 */
    
    // 将 PA9, PA10, PA12 连接到 USART1 的复用功能 (AF1)
    // 根据数据手册 Table 14，PA9/PA10/PA12 的 AF1 均为 USART1
    GPIO_PinAFConfig(GPIOA, GPIO_PinSource9, GPIO_AF_1);  // TX
    GPIO_PinAFConfig(GPIOA, GPIO_PinSource10, GPIO_AF_1); // RX
    GPIO_PinAFConfig(GPIOA, GPIO_PinSource12, GPIO_AF_1); // DE (RTS)

    // 配置引脚参数
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_9 | GPIO_Pin_10 | GPIO_Pin_12;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF;        // 复用模式
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // 高速
    GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;      // 推挽输出
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_UP;        // 上拉
    GPIO_Init(GPIOA, &GPIO_InitStructure);

    /* 3. 配置 USART1 基本参数 */
    // 注意：如果要使用8倍过采样，必须在USART_Init之前调用
     USART_OverSampling8Cmd(USART1, ENABLE);  // 对于115200波特率，建议使用默认的16倍过采样
    
    USART_InitStructure.USART_BaudRate = baudrate;
    USART_InitStructure.USART_WordLength = USART_WordLength_8b;
    USART_InitStructure.USART_StopBits = USART_StopBits_1;
    USART_InitStructure.USART_Parity = USART_Parity_No;
    USART_InitStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None; // 注意这里选 None，DE 是单独开启的
    USART_InitStructure.USART_Mode = USART_Mode_Rx | USART_Mode_Tx;
    USART_Init(USART1, &USART_InitStructure); 
		
    /* 4. 开启 RS485 硬件驱动器使能 (Driver Enable) 功能 */
    // 使能 DE 功能
    USART_DECmd(USART1, ENABLE);
    
    // 配置 DE 极性 (根据您的 RS485 收发器芯片手册决定)
    // High: 发送时 DE 为高电平 (常见 485 芯片如 SP3485/MAX485 发送时需高电平)
    // Low:  发送时 DE 为低电平
    USART_DEPolarityConfig(USART1, USART_DEPolarity_High);
    
    // 配置 DE 信号的断言(Assertion)和撤销(Deassertion)时间 (单位：采样时间单位)
    // 这有助于在发送数据前后保持 DE 信号稳定，防止丢包
    USART_SetDEAssertionTime(USART1, 0x1f);   // 发送第一个位前的建立时间
    USART_SetDEDeassertionTime(USART1, 4); // 发送最后一个位后的保持时间

    /* 5. 配置DMA初始化（只配置一次，后续只需Start即可） */
    // 配置DMA发送通道 (DMA1_Channel2 for USART1_TX)
//    DMA_Config_Tx(DMA1_Channel2, (uint32_t)&USART1->TDR, 0, 0);
    // 配置DMA接收通道
    DMA_Config_Rx(DMA1_Channel3, (uint32_t)&USART1->RDR, 0, 0);

    
    /* 6. 使能 USART1 */
    // 注意：NVIC中断配置在 hardware_NVIC.c 的 NVIC_init() 中统一管理
    USART_Cmd(USART1, ENABLE);

    /* 7. 清除所有标志位（必须在使能USART后、使能中断前） */
    USART_ClearFlag(USART1, USART_FLAG_TC);  // 清除发送完成标志
    
    // 清除IDLE标志（STM32F0特殊方法：读ISR + 读RDR）
		USART_ClearITPendingBit(USART1, USART_IT_IDLE);
    
    /* 8. 最后才使能IDLE中断（确保标志已清除，不会误触发） */
    //USART_ITConfig(USART1, USART_IT_RXNE, ENABLE);  // RXNE中断（超时方案用）
    USART_ITConfig(USART1, USART_IT_IDLE, ENABLE);  // IDLE中断（DMA+IDLE方案用）
}

/****************************************************************************
 * @brief DMA发送配置函数
 * @param DMA_Channelx: DMA通道，如 DMA1_Channel2 (USART1_TX)
 * @param peri_addr: 外设地址，如 (uint32_t)&USART1->TDR
 * @param mem_addr: 内存地址，如 (uint32_t)tx_buffer
 * @param data_size: 发送字节数
 * @return None
 * 
 * 使用示例：
 *   DMA_Config_Tx(DMA1_Channel2, (uint32_t)&USART1->TDR, (uint32_t)tx_buffer, 10);
****************************************************************************/
void DMA_Config_Tx(DMA_Channel_TypeDef* DMA_Channelx, uint32_t peri_addr, uint32_t mem_addr, uint16_t data_size)
{
    DMA_InitTypeDef DMA_InitStructure;
    
    // 使能DMA1时钟（如果还没使能）
    RCC_AHBPeriphClockCmd(RCC_AHBPeriph_DMA1, ENABLE);
    
    // 复位DMA通道配置
    DMA_DeInit(DMA_Channelx);
    
    // 配置DMA参数
    DMA_InitStructure.DMA_PeripheralBaseAddr = peri_addr;              // 外设地址（USART TDR）
    DMA_InitStructure.DMA_MemoryBaseAddr = mem_addr;                   // 内存地址（发送缓冲区）
    DMA_InitStructure.DMA_DIR = DMA_DIR_PeripheralDST;                 // 传输方向：内存→外设
    DMA_InitStructure.DMA_BufferSize = data_size;                      // 传输数据量
    DMA_InitStructure.DMA_PeripheralInc = DMA_PeripheralInc_Disable;  // 外设地址不递增
    DMA_InitStructure.DMA_MemoryInc = DMA_MemoryInc_Enable;            // 内存地址递增
    DMA_InitStructure.DMA_PeripheralDataSize = DMA_PeripheralDataSize_Byte;  // 外设数据宽度：字节
    DMA_InitStructure.DMA_MemoryDataSize = DMA_MemoryDataSize_Byte;    // 内存数据宽度：字节
    DMA_InitStructure.DMA_Mode = DMA_Mode_Normal;                      // 普通模式（传输一次后停止）
    DMA_InitStructure.DMA_Priority = DMA_Priority_High;              // 优先级：中
    DMA_InitStructure.DMA_M2M = DMA_M2M_Disable;                       // 禁用内存到内存
    
    // 初始化DMA
    DMA_Init(DMA_Channelx, &DMA_InitStructure);
    
    // 暂不使能DMA（需要发送时再使能）
    // DMA_Cmd(DMA_Channelx, ENABLE);
}

/****************************************************************************
 * @brief DMA接收配置函数
 * @param DMA_Channelx: DMA通道，如 DMA1_Channel3 (USART1_RX)
 * @param peri_addr: 外设地址，如 (uint32_t)&USART1->RDR
 * @param mem_addr: 内存地址，如 (uint32_t)rx_buffer
 * @param buffer_size: 接收缓冲区大小
 * @return None
 * 
 * 使用示例：
 *   DMA_Config_Rx(DMA1_Channel3, (uint32_t)&USART1->RDR, (uint32_t)rx_buffer, 256);
 *   USART_DMACmd(USART1, USART_DMAReq_Rx, ENABLE);  // 使能USART的DMA接收请求
 *   DMA_Cmd(DMA1_Channel3, ENABLE);                 // 启动DMA
****************************************************************************/
void DMA_Config_Rx(DMA_Channel_TypeDef* DMA_Channelx, uint32_t peri_addr, uint32_t mem_addr, uint16_t buffer_size)
{
    DMA_InitTypeDef DMA_InitStructure;
    
    // 使能DMA1时钟（如果还没使能）
    RCC_AHBPeriphClockCmd(RCC_AHBPeriph_DMA1, ENABLE);
    
    // 复位DMA通道配置
    DMA_DeInit(DMA_Channelx);
    
    // 配置DMA参数
    DMA_InitStructure.DMA_PeripheralBaseAddr = peri_addr;              // 外设地址（USART RDR）
    DMA_InitStructure.DMA_MemoryBaseAddr = mem_addr;                   // 内存地址（接收缓冲区）
    DMA_InitStructure.DMA_DIR = DMA_DIR_PeripheralSRC;                 // 传输方向：外设→内存
    DMA_InitStructure.DMA_BufferSize = buffer_size;                    // 缓冲区大小
    DMA_InitStructure.DMA_PeripheralInc = DMA_PeripheralInc_Disable;  // 外设地址不递增
    DMA_InitStructure.DMA_MemoryInc = DMA_MemoryInc_Enable;            // 内存地址递增
    DMA_InitStructure.DMA_PeripheralDataSize = DMA_PeripheralDataSize_Byte;  // 外设数据宽度：字节
    DMA_InitStructure.DMA_MemoryDataSize = DMA_MemoryDataSize_Byte;    // 内存数据宽度：字节
    DMA_InitStructure.DMA_Mode = DMA_Mode_Normal;                      // 普通模式（配合IDLE中断使用）
    DMA_InitStructure.DMA_Priority = DMA_Priority_High;                // 优先级：高
    DMA_InitStructure.DMA_M2M = DMA_M2M_Disable;                       // 禁用内存到内存
    
    // 初始化DMA
    DMA_Init(DMA_Channelx, &DMA_InitStructure);
    
    // 暂不使能DMA（配置完USART后再使能）
 //   DMA_Cmd(DMA_Channelx, ENABLE);
}

/****************************************************************************
 * @brief 启动USART的DMA接收（类似HAL库的UART_Start_Receive_DMA）
 * @param USARTx: USART外设，如 USART1、USART2
 * @param DMA_Channelx: DMA接收通道，如 DMA1_Channel3 (USART1_RX)
 * @param rx_buffer: 接收缓冲区指针
 * @param buffer_size: 缓冲区大小
 * @return None
 * 
 * 功能：设置DMA接收缓冲区地址和大小，启动DMA接收（DMA需先配置好，如在Rs485_Config中）
 *       本函数通用设计，可用于不同串口和芯片
 * 
 * 使用示例：
 *   // USART1:
 *   USART_ReceiveToIdle_DMA(USART1, DMA1_Channel3, rx_buf1, 256);
 *   // USART2:
 *   USART_ReceiveToIdle_DMA(USART2, DMA1_Channel5, rx_buf2, 128);
****************************************************************************/
void USART_ReceiveToIdle_DMA(USART_TypeDef* USARTx, DMA_Channel_TypeDef* DMA_Channelx, 
                             uint8_t* rx_buffer, uint16_t buffer_size)
{
    // 1. 停止DMA（如果正在运行）
    DMA_Cmd(DMA_Channelx, DISABLE);
    
    // 2. 设置内存地址和传输数量
    DMA_Channelx->CMAR = (uint32_t)rx_buffer;   // 内存地址
    DMA_Channelx->CNDTR = buffer_size;          // 传输数量
    
    // 3. 使能USART的DMA接收请求（每次调用都设置，确保通用性）
    USART_DMACmd(USARTx, USART_DMAReq_Rx, ENABLE);
    
		// 4. 清除 IDLE 标志（防止启用中断后立即触发）
		USART_ClearITPendingBit(USART1, USART_IT_IDLE);

		// 5. 启动DMA通道
		DMA_Cmd(DMA_Channelx, ENABLE);

		// 6. 最后启用 IDLE 中断（确保 DMA 已就绪）
		USART_ITConfig(USARTx, USART_IT_IDLE, ENABLE);
}

/****************************************************************************
 * @brief 启动USART的DMA发送（类似HAL库的UART_Start_Transmit_DMA）
 * @param USARTx: USART外设，如 USART1、USART2
 * @param DMA_Channelx: DMA发送通道，如 DMA1_Channel2 (USART1_TX)
 * @param tx_buffer: 发送缓冲区指针
 * @param data_size: 发送数据长度
 * @return None
 * 
 * 功能：设置DMA发送缓冲区地址和大小，启动DMA发送（DMA需先配置好）
 *       本函数通用设计，可用于不同串口和芯片
 * 
 * 使用示例：
 *   // USART1:
 *   USART_Transmit_DMA(USART1, DMA1_Channel2, tx_data1, 10);
 *   // USART2:
 *   USART_Transmit_DMA(USART2, DMA1_Channel4, tx_data2, 20);
 * 
 * 注意：发送前应等待上次传输完成
****************************************************************************/
void USART_Transmit_DMA(USART_TypeDef* USARTx, DMA_Channel_TypeDef* DMA_Channelx, 
                        uint8_t* tx_buffer, uint16_t data_size)
{
    // 1. 停止之前的DMA传输（如果有）
    DMA_Cmd(DMA_Channelx, DISABLE);
    
    // 2. 设置内存地址和传输数量
    DMA_Channelx->CMAR = (uint32_t)tx_buffer;   // 内存地址
    DMA_Channelx->CNDTR = data_size;            // 传输数量
    
    // 3. 使能USART的DMA发送请求（每次调用都设置，确保通用性）
    USART_DMACmd(USARTx, USART_DMAReq_Tx, ENABLE);
    
    // 4. 启动DMA通道
    DMA_Cmd(DMA_Channelx, ENABLE);
}

void send_data(uint8_t* data, uint16_t len)
{
    // // 等待上次发送完成
    // while(DMA_GetFlagStatus(DMA1_FLAG_TC2) == RESET);
    
    // // 启动DMA发送
    // // memcpy(uart_tx_buffer, data, len);
    // USART_Transmit_DMA(USART1, DMA1_Channel2, uart_tx_buffer, len);
}

