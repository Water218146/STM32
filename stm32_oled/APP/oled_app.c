/* oled_app.c */
#include "oled_app.h"

#define OLED_SCHEME_Normal 1
#define OLED_SCHEME_u8g2   2



#define CURRENT_Oled_SCHEME OLED_SCHEME_u8g2

// 假设 OLED 分辨率为 128 像素，使用 6x8 字体
// 每页 8 像素高，则有 64/8 = 8 页 (y=0~7) 或 32/8 = 4 页 (y=0~3)
// 每页 6 像素宽可显示 128/6 = 21 个字符 (x=0~20? 或根据函数可能有其他位置)
// **注意:** Oled_Printf 的 x, y 参数单位需要参考 OLED_ShowStr 实现，可能是字符位置或像素位置
// 文档中的注释 (0-127, 0-3) 表示可能是 128x32 屏幕，其中 x 是像素，y 是页

/**
 * @brief	使用类似printf的方式显示字符串，显示6x8大小的ASCII字符
 * @param x  起始 X 坐标 (像素) 或 字符单位置 (需参考 OLED_ShowStr)
 * @param y  起始 Y 坐标 (像素) 或 字符单位置 (需参考 OLED_ShowStr, 0-3 或 0-7)
 * @param format, ... 格式化字符串及参数
 * 例如：Oled_Printf(0, 0, "Data = %d", dat);
**/
int Oled_Printf(uint8_t x, uint8_t y, const char *format, ...)
{
	char buffer[512]; // 缓冲区大小根据需要调整
	va_list arg;
	int len;

	va_start(arg, format);
	len = vsnprintf(buffer, sizeof(buffer), format, arg);
	va_end(arg);

	// 假设 OLED_ShowStr 使用的参数是 x 列字符和 y
	// 第四个参数是 8 (高度)
	OLED_ShowStr(x, y, buffer, 8); // 将 buffer 转为 uint8_t*
	return len;
}

#if (CURRENT_Oled_SCHEME == OLED_SCHEME_u8g2)
// u8g2 的 GPIO 和延时回调函数
uint8_t u8g2_gpio_and_delay_stm32(u8x8_t *u8x8, uint8_t msg, uint8_t arg_int, void *arg_ptr)
{
  switch(msg)
  {
    case U8X8_MSG_GPIO_AND_DELAY_INIT:
      // 初始化 GPIO (如果需要单独初始化 SPI 的 CS, DC, RST 引脚)
      // 对于硬件 I2C，这里通常不需要做什么
      break;
    case U8X8_MSG_DELAY_MILLI:
      // 原因: u8g2 内部某些操作需要毫秒级的延时等待。
      // 提供毫秒级延时：直接调用 HAL 库函数。
      HAL_Delay(arg_int);
      break;
    case U8X8_MSG_DELAY_10MICRO:
      // 原因: 某些通讯协议或显示时序可能需要微秒级延时。
      // 提供 10 微秒延时：HAL_Delay(1) 精度不够（通常是毫秒级），
      // 需要更精确的延时，可以使用 CPU NOP 指令或 DWT 延时计数。
      // 下面简单循环仅为示例，**需要根据您 CPU 时钟频率精确调整循环次数**。
      for (volatile uint32_t i = 0; i < 150; ++i) {} // 示例循环，需根据实际调整
      break;
    case U8X8_MSG_DELAY_100NANO:
      // 原因: 极端的时序控制，通常在高速接口或特定操作中需要。
      // 提供 100 纳秒延时非常困难，通常用 NOP 指令实现。
      // **同样需要根据 CPU 时钟频率调整 NOP 数量**。
       __NOP(); __NOP(); __NOP(); // 示例 NOP
      break;
    case U8X8_MSG_GPIO_I2C_CLOCK: // [[fallthrough]] // Fallthrough 注释表示有意为之
    case U8X8_MSG_GPIO_I2C_DATA:
      // 控制 SCL/SDA 引脚的电平。这些仅在**软件模拟 I2C** 时需要实现。
      // 使用硬件 I2C 时，这些消息可以忽略，由 HAL 库处理。
      break;
     // --- 其他的 GPIO 回调消息，主要用于半总线或 SPI 接口 ---
     // 如果你的 u8g2 应用需要控制其他的 SPI 引脚 (CS, DC, Reset)，
     // 则需要在这里根据 msg 类型读取/设置对应的 GPIO 引脚状态。
     // 因为仅使用硬件 I2C 显示的场景，这些我们简单返回不支持。
     case U8X8_MSG_GPIO_CS:
        // SPI 片选引脚
        break;
      case U8X8_MSG_GPIO_DC:
        // SPI 数据/命令选择控制
        break;
      case U8X8_MSG_GPIO_RESET:
        // 显示屏复位引脚控制
        break;
    case U8X8_MSG_GPIO_MENU_SELECT:
      u8x8_SetGPIOResult(u8x8, /* 获取选择键 GPIO 状态 */ 0);
      break;
    default:
      u8x8_SetGPIOResult(u8x8, 1); // 不支持的消息
      break;
  }
  return 1;
}

// u8g2 的硬件 I2C 通讯回调函数
uint8_t u8x8_byte_hw_i2c(u8x8_t *u8x8, uint8_t msg, uint8_t arg_int, void *arg_ptr)
{
  static uint8_t buffer[32]; // u8g2 每次传输最多 32 字节
  static uint8_t buf_idx;
  uint8_t *data;

  switch(msg)
  {
    case U8X8_MSG_BYTE_SEND:
      // 原因: u8g2 通常以小块方式发送数据，而不是分块发送。
      // 此条消息用于将一小块数据 (arg_int 字节) 从 u8g2 内部传递到我们的回调函数。
      // 我们需要把这些数据存到本地 buffer 中，等待 START/END_TRANSFER 信号。
      data = (uint8_t *)arg_ptr;
      while( arg_int > 0 )
      {
        buffer[buf_idx++] = *data;
        data++;
        arg_int--;
      }
      break;
    case U8X8_MSG_BYTE_INIT:
      // 原因: 提供一个机会初始化 I2C 总线的初始化。
      // 初始化 I2C (通常在 main 函数中已完成)
      // 如果你的 main 函数里已经调用了 MX_I2C1_Init()，这里通常可留空。
      break;
    case U8X8_MSG_BYTE_SET_DC:
      // 原因: 这条消息用于 SPI 通讯中控制 Data/Command 选择引脚。
      // 设置数据/命令线 (I2C 不需要)
      // I2C 通讯使用特定的控制字节 (0x00 和 0x40) 来区分命令和数据，所以该消息对于 I2C 无需处理。
      break;
    case U8X8_MSG_BYTE_START_TRANSFER:
      // 原因: 标志一次 I2C 数据传输的开始。
      buf_idx = 0;
      // 当你看到这个信号时，表示本地缓冲区将被准备用于存放新的数据块。
      break;
    case U8X8_MSG_BYTE_END_TRANSFER:
      // 原因: 标志一次 I2C 数据传输的结束。
      // 此时本地 buffer 中已经积累了所有需要发送的数据块。
      // 现在执行实际 I2C 发送操作，并处理超时。
      // 发送缓冲区中的数据
      // 注意: u8x8_GetI2CAddress(u8x8) 返回的是 7 位地址 * 2 = 8 位地址
      if (HAL_I2C_Master_Transmit(&hi2c1, u8x8_GetI2CAddress(u8x8), buffer, buf_idx, 100) != HAL_OK)
      {
        return 0; // 传输失败
      }
      break;
    default:
      return 0;
  }
  return 1;
}
/* u8g2 显示任务示例 */
void oled_task(void) // 或者你定义的任务函数名
{
  // --- 准备阶段 ---
  // 设置绘图颜色 (对于单色屏，1 通常表示点亮像素)
  u8g2_SetDrawColor(&u8g2, 1);
  // 选择要使用的字体 (确保字体文件已添加到工程)
  u8g2_SetFont(&u8g2, u8g2_font_ncenB08_tr); // ncenB08: 字体名, _tr: 透明背景

  // --- 核心绘图流程 ---
  // 1. 清除内存缓冲区 (非常重要，每次绘制新帧前必须调用)
  u8g2_ClearBuffer(&u8g2);

  // 2. 使用 u8g2 API 在缓冲区中绘图
  //    所有绘图操作都作用于 RAM 中的缓冲区。
  // 绘制字符串 (参数: u8g2实例, x坐标, y坐标, 字符串)
  // y 坐标通常是字符串基线的位置。
  u8g2_DrawStr(&u8g2, 2, 12, "Hello u8g2!"); // 从 (2, 12) 开始绘制
  u8g2_DrawStr(&u8g2, 2, 28, "Micron Elec Studio"); // 绘制第二行

  // 绘制图形 (示例：一个空心圆和一个实心框)
  // 绘制圆 (参数: u8g2实例, 圆心x, 圆心y, 半径, 绘制选项)
  u8g2_DrawCircle(&u8g2, 90, 19, 10, U8G2_DRAW_ALL); // U8G2_DRAW_ALL 画圆周
  // 绘制实心框 (参数: u8g2实例, 左上角x, 左上角y, 宽度, 高度)
  // u8g2_DrawBox(&u8g2, 50, 15, 20, 10);
  // 绘制空心框 (参数: u8g2实例, 左上角x, 左上角y, 宽度, 高度)
  // u8g2_DrawFrame(&u8g2, 50, 15, 20, 10);

  // 3. 将缓冲区内容一次性发送到屏幕 (非常重要)
  //    这个函数会调用我们之前编写的 I2C 回调函数，将整个缓冲区的数据发送出去。
  u8g2_SendBuffer(&u8g2);
}
#endif
/* Oled 显示任务 */
#if (CURRENT_Oled_SCHEME == OLED_SCHEME_Normal)
void oled_task(void)
{
	static uint8_t count;
  // 如果不是通用方案需要的，则其他数据会保留
//	OLED_Clear();
  Oled_Printf(0,0, "Hello World!!!");
  Oled_Printf(0,1, "Count:%d  ",count++);
//  Oled_Printf(0,2, "测试");
  // 刷新显示到屏幕 (如果底层不需要)
  // OLED_Refresh_Gram(); // 取消这部分如果你的底层会自动刷新缓存

}
#endif
