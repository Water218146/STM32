#ifndef __HARDWARE_IIC_H
#define __HARDWARE_IIC_H

#include "mydefine.h"

// I2C 超时时间（防止总线死锁卡死程序）
#define I2C_TIMEOUT         ((uint32_t)0x3FFFF)

// ========================================
// I2C1 初始化（GPIO + I2C外设配置）
// ========================================
void I2C1_Config(void);

// ========================================
// I2C 通用读写接口（类似 HAL 库风格）
// ========================================
// 说明：
//   I2Cx       - 选择 I2C 通道，传入 I2C1 或 I2C2
//   DevAddress - 8位设备地址（已含读写位方向），不会自动左移
//                例如 SSD1306 OLED 地址为 0x78（即 0x3C << 1）
//   MemAddress - 寄存器/内存地址
// ========================================

// 多字节写入（对应 HAL_I2C_Mem_Write）
uint8_t I2C_Mem_Write(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress, uint8_t *pData, uint16_t Size);

// 多字节读取（对应 HAL_I2C_Mem_Read）
uint8_t I2C_Mem_Read(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress, uint8_t *pData, uint16_t Size);

// 单字节快捷操作
uint8_t I2C_Mem_WriteByte(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress, uint8_t Data);
uint8_t I2C_Mem_ReadByte(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress);

#endif

