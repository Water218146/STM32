#include "oled_driver.h"

/**
 * @brief	使用类似printf的方式显示字符串，显示6x8大小的ASCII字符
 * @param {uint8_t} x待显示字符串的开始横坐标x:0~127
 * @param {uint8_t} y待显示字符串的开始纵坐标 y:0~7，若选择字体大小为16，则两行数字之间需要间隔2，若选择字体大小为12，间隔1
 * @param {uint8_t} Char_Size待显示字符串的字体大小,选择字体 16/12，16为8X16，12为6x8
 * @param {uint8_t} Color_Turn是否反相显示(1反相、0不反相)
 * @param {const char *} *format 待显示的格式化字符串
 * 例如：Oled_Printf(0, 0, 12, 0, "Data = %d", dat);
**/
int Oled_Printf(uint8_t x, uint8_t y, uint8_t Char_Size, uint8_t Color_Turn, const char *format, ...)
{
	char buffer[128]; // 临时存储格式化后的字符串
	va_list arg;      // 处理可变参数
	int len;          // 最终字符串长度

	va_start(arg, format);
	// 安全地格式化字符串到 buffer
	len = vsnprintf(buffer, sizeof(buffer), format, arg);
	va_end(arg);

	OLED_ShowString(x, y, buffer, Char_Size, Color_Turn);

	return len;
}

//void OLED_SendBuff(uint8_t buff[8][128])  
//{  
//  for(uint8_t page=0; page<8; page++) 
//  {  // 遍历8个页
//    OLED_Set_Pos(0, page);             // 设置起始列地址和页地址
//    for(uint8_t col=0; col<128; col++) // 遍历128列
//    { 
//      OLED_WR_DATA(buff[page][col]); // 写入显存数据
//    }
//  }
//}

void OLED_SendBuff(uint8_t buff[8][128])  
{
    for(uint8_t page=0; page<8; page++) {
        OLED_Set_Pos(0, page);
        // 使用HAL_I2C_Mem_Write进行块传输
        HAL_I2C_Mem_Write(&hi2c1, 
                        0x78,          // OLED地址
                        0x40,          // 数据寄存器地址
                        I2C_MEMADD_SIZE_8BIT,
                        buff[page],    // 直接传输整页数据
                        128,           // 每页128字节
                        100);          // 超时时间100ms
    }
}
