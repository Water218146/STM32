#include "oled_app.h"
#define OLED_STACK_SIZE 2048  //OLED线程栈大小
#define OLED_PRIORITY 10     //OLED线程优先级
#define OLED_TIMEOUT  20     //OLED线程时间片
// 假设 OLED 分辨率为 128 像素，使用 6x8 字体
// 每个字 8 像素高，则有 64/8 = 8 页 (y=0~7) 或 32/8 = 4 页 (y=0~3)
// 每个字 6 像素宽可显示 128/6 = 21 个字符 (x=0~20? 或根据函数可能有其他位置)
// **注意:** Oled_Printf 的 x, y 参数单位需要参考 OLED_ShowStr 实现，可能是字符位置或像素位置
// 文档中的注释 (0-127, 0-3) 表示可能是 128x32 屏幕，其中 x 是像素，y 是页

/**
 * @brief   使用类似printf的方式显示字符串，显示6x8大小的ASCII字符
 * @param x  起始 X 坐标 (像素) 或 字符单位置 (需参考 OLED_ShowStr)
 * @param y  起始 Y 坐标 (像素) 或 字符单位置 (需参考 OLED_ShowStr, 0-3 或 0-7)
 * @param format, ... 格式化字符串及参数
 * 例如：Oled_Printf(0, 0, "Data = %d", dat);
**/
int oled_printf(uint8_t x, uint8_t y, const char *format, ...)
{
    char buffer[256]; // 缓冲区大小根据需要调整
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

void oled_task(void *parameter)
{
    uint8_t count = 0;
    while(1)
    {
        oled_printf(0, 0, "oled_task:run! ");
        oled_printf(0, 1, "count:%d  ",++count);
        rt_thread_mdelay(25);
    }
}

void oled_init(void)
{

    OLED_Init();
    rt_thread_t oled_thread = rt_thread_create("oled_task", oled_task, RT_NULL, OLED_STACK_SIZE, OLED_PRIORITY, OLED_TIMEOUT);
    if(oled_thread != RT_NULL)
        rt_thread_startup(oled_thread);
    else {
        rt_kprintf("oled_thread_startup:flase");
    }
}
