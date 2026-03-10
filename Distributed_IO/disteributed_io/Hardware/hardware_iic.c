#include "hardware_iic.h"

/**
 * @brief  配置 I2C1 硬件接口（PB6 -> SCL, PB7 -> SDA）
 * @param  NONE
 * @note   STM32F051 的 I2C1 使用新一代 I2C 外设，支持自动 START/STOP
 * @note   默认配置为主机模式，7位地址，100kHz标准速度
 * @note   PB6/PB7 对应 AF1 复用功能（查数据手册 Table 14）
 */
void I2C1_Config(void)
{
    // ========================================
    // 步骤1: 使能时钟
    // ========================================
    
    // 使能 GPIOB 时钟（PB6=SCL, PB7=SDA）
    RCC_AHBPeriphClockCmd(RCC_AHBPeriph_GPIOB, ENABLE);
    
    // 使能 I2C1 时钟
    RCC_APB1PeriphClockCmd(RCC_APB1Periph_I2C1, ENABLE);
    
    
    // ========================================
    // 步骤2: 配置 GPIO 为复用开漏模式
    // ========================================
    GPIO_InitTypeDef GPIO_InitStructure;
    
    // 将 PB6, PB7 连接到 I2C1 的复用功能（AF1）
    GPIO_PinAFConfig(GPIOB, GPIO_PinSource6, GPIO_AF_1);  // PB6 -> I2C1_SCL
    GPIO_PinAFConfig(GPIOB, GPIO_PinSource7, GPIO_AF_1);  // PB7 -> I2C1_SDA
    
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_6 | GPIO_Pin_7;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF;           // 复用模式
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_2MHz;       // 低速即可（I2C最高400kHz）
    GPIO_InitStructure.GPIO_OType = GPIO_OType_OD;         // 开漏输出（I2C协议要求）
    GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_UP;           // 上拉（也可外接上拉电阻）
    GPIO_Init(GPIOB, &GPIO_InitStructure);
    
    
    // ========================================
    // 步骤3: 配置 I2C 参数
    // ========================================
    I2C_InitTypeDef I2C_InitStructure;
    
    // 先复位 I2C，确保从干净状态开始
    I2C_DeInit(I2C1);
    
    // 关键：先用默认值填充结构体，防止栈上的随机垃圾值污染寄存器
    I2C_StructInit(&I2C_InitStructure);
    
    // I2C 时序配置（决定SCL频率）
    // 48MHz 主频下，100kHz 标准模式的时序值：0x10805E89
    // 48MHz 主频下，400kHz 快速模式的时序值：0x00901850
    // 该值由 STM32CubeMX 的 I2C Timing Configuration Tool 计算得出
    I2C_InitStructure.I2C_Timing = 0x10805E89;              // 100kHz 标准模式
    I2C_InitStructure.I2C_AnalogFilter = I2C_AnalogFilter_Enable;   // 使能模拟滤波器（抗干扰）
    I2C_InitStructure.I2C_DigitalFilter = 0x00;             // 数字滤波器关闭
    I2C_InitStructure.I2C_Mode = I2C_Mode_I2C;              // I2C 模式（非SMBus）
    I2C_InitStructure.I2C_OwnAddress1 = 0x00;               // 主机模式下自身地址无所谓
    I2C_InitStructure.I2C_Ack = I2C_Ack_Enable;             // 使能应答
    I2C_InitStructure.I2C_AcknowledgedAddress = I2C_AcknowledgedAddress_7bit; // 7位地址模式
    I2C_Init(I2C1, &I2C_InitStructure);
    
    
    // ========================================
    // 步骤4: 使能 I2C
    // ========================================
    I2C_Cmd(I2C1, ENABLE);
}


/**
 * @brief  通过指定 I2C 通道，向从设备的寄存器地址写入多个字节
 * @param  I2Cx:        I2C 通道（I2C1 或 I2C2）
 * @param  DevAddress:  从设备地址（8位格式，已包含读写位，例如 OLED 为 0x78）
 *                      与 HAL 库 HAL_I2C_Mem_Write 的 DevAddress 用法一致
 * @param  MemAddress:  寄存器/内存地址（写入的目标地址）
 * @param  pData:       要写入的数据缓冲区指针
 * @param  Size:        要写入的字节数
 * @retval 0: 成功, 1: 失败（超时）
 * @note   使用 STM32F0 新 I2C 的 TransferHandling 自动管理 START/STOP
 * @note   DevAddress 不会被自动左移，调用者需传入完整的8位地址
 */
uint8_t I2C_Mem_Write(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress, uint8_t *pData, uint16_t Size)
{
    uint32_t timeout;
    uint16_t i;
    
    // 等待 I2C 总线空闲
    timeout = I2C_TIMEOUT;
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_BUSY) != RESET)
    {
        if((timeout--) == 0) return 1;
    }
    
    // 配置传输：从设备地址 + 总字节数（1字节寄存器地址 + Size字节数据）+ 自动结束 + 产生START
    // DevAddress 直接使用，不做左移处理
    I2C_TransferHandling(I2Cx, DevAddress, Size + 1, I2C_AutoEnd_Mode, I2C_Generate_Start_Write);
    
    // 等待发送寄存器空，发送寄存器地址
    timeout = I2C_TIMEOUT;
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_TXIS) == RESET)
    {
        if((timeout--) == 0) return 1;
    }
    I2C_SendData(I2Cx, MemAddress);
    
    // 逐字节发送数据
    for(i = 0; i < Size; i++)
    {
        timeout = I2C_TIMEOUT;
        while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_TXIS) == RESET)
        {
            if((timeout--) == 0) return 1;
        }
        I2C_SendData(I2Cx, pData[i]);
    }
    
    // 等待传输完成（自动结束模式会自动产生STOP）
    timeout = I2C_TIMEOUT;
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_STOPF) == RESET)
    {
        if((timeout--) == 0) return 1;
    }
    
    // 清除 STOP 标志
    I2C_ClearFlag(I2Cx, I2C_FLAG_STOPF);
    
    return 0;
}


/**
 * @brief  通过指定 I2C 通道，从从设备的寄存器地址读取多个字节
 * @param  I2Cx:        I2C 通道（I2C1 或 I2C2）
 * @param  DevAddress:  从设备地址（8位格式，已包含读写位，例如 OLED 为 0x78）
 *                      与 HAL 库 HAL_I2C_Mem_Read 的 DevAddress 用法一致
 * @param  MemAddress:  寄存器/内存地址（要读取的目标地址）
 * @param  pData:       存放读取数据的缓冲区指针
 * @param  Size:        要读取的字节数
 * @retval 0: 成功, 1: 失败（超时）
 * @note   先写寄存器地址（SoftEnd不产生STOP），再重新START读数据（AutoEnd自动STOP）
 * @note   DevAddress 不会被自动左移，调用者需传入完整的8位地址
 */
uint8_t I2C_Mem_Read(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress, uint8_t *pData, uint16_t Size)
{
    uint32_t timeout;
    uint16_t i;
    
    // 等待 I2C 总线空闲
    timeout = I2C_TIMEOUT;
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_BUSY) != RESET)
    {
        if((timeout--) == 0) return 1;
    }
    
    // ========================================
    // 阶段1: 发送寄存器地址（写方向，SoftEnd，不自动产生STOP）
    // ========================================
    // DevAddress 直接使用，不做左移处理
    I2C_TransferHandling(I2Cx, DevAddress, 1, I2C_SoftEnd_Mode, I2C_Generate_Start_Write);
    
    timeout = I2C_TIMEOUT;
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_TXIS) == RESET)
    {
        if((timeout--) == 0) return 1;
    }
    I2C_SendData(I2Cx, MemAddress);
    
    // 等待传输完成（TC标志表示SoftEnd模式下数据发完）
    timeout = I2C_TIMEOUT;
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_TC) == RESET)
    {
        if((timeout--) == 0) return 1;
    }
    
    // ========================================
    // 阶段2: 重新START读取数据（读方向，AutoEnd，自动产生STOP）
    // ========================================
    I2C_TransferHandling(I2Cx, DevAddress, Size, I2C_AutoEnd_Mode, I2C_Generate_Start_Read);
    
    for(i = 0; i < Size; i++)
    {
        timeout = I2C_TIMEOUT;
        while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_RXNE) == RESET)
        {
            if((timeout--) == 0) return 1;
        }
        pData[i] = I2C_ReceiveData(I2Cx);
    }
    
    // 等待 STOP 条件完成
    timeout = I2C_TIMEOUT;
    while(I2C_GetFlagStatus(I2Cx, I2C_FLAG_STOPF) == RESET)
    {
        if((timeout--) == 0) return 1;
    }
    
    // 清除 STOP 标志
    I2C_ClearFlag(I2Cx, I2C_FLAG_STOPF);
    
    return 0;
}


/**
 * @brief  通过指定 I2C 通道，向从设备写入单个字节（快捷封装）
 * @param  I2Cx:        I2C 通道（I2C1 或 I2C2）
 * @param  DevAddress:  从设备地址（8位格式，不自动左移）
 * @param  MemAddress:  寄存器地址
 * @param  Data:        要写入的字节
 * @retval 0: 成功, 1: 失败
 */
uint8_t I2C_Mem_WriteByte(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress, uint8_t Data)
{
    return I2C_Mem_Write(I2Cx, DevAddress, MemAddress, &Data, 1);
}


/**
 * @brief  通过指定 I2C 通道，从从设备读取单个字节（快捷封装）
 * @param  I2Cx:        I2C 通道（I2C1 或 I2C2）
 * @param  DevAddress:  从设备地址（8位格式，不自动左移）
 * @param  MemAddress:  寄存器地址
 * @retval 读取到的字节
 */
uint8_t I2C_Mem_ReadByte(I2C_TypeDef* I2Cx, uint16_t DevAddress, uint8_t MemAddress)
{
    uint8_t data = 0;
    I2C_Mem_Read(I2Cx, DevAddress, MemAddress, &data, 1);
    return data;
}
