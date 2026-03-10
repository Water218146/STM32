#ifndef __HARDWARE_UART_H
#define __HARDWARE_UART_H

#include "mydefine.h"

// USART配置函数
void Rs485_Config(uint32_t baudrate);

// DMA底层配置函数
void DMA_Config_Tx(DMA_Channel_TypeDef* DMA_Channelx, uint32_t peri_addr, uint32_t mem_addr, uint16_t data_size);
void DMA_Config_Rx(DMA_Channel_TypeDef* DMA_Channelx, uint32_t peri_addr, uint32_t mem_addr, uint16_t buffer_size);

// 类似HAL库的高级封装函数（推荐使用）
void USART_ReceiveToIdle_DMA(USART_TypeDef* USARTx, DMA_Channel_TypeDef* DMA_Channelx, 
                             uint8_t* rx_buffer, uint16_t buffer_size);
void USART_Transmit_DMA(USART_TypeDef* USARTx, DMA_Channel_TypeDef* DMA_Channelx, 
                        uint8_t* tx_buffer, uint16_t data_size);

#endif
