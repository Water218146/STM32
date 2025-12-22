# Oled 驱动移植

Github：https://github.com/yangjinhaoaa/OLED0.91-SSD1306-HAL

## 驱动代码


1. 在项目的 `Components` 组件文件夹中，新建一个 `Oled` 文件夹，用于存放 Oled 驱动文件。

![image-20250430164520612](附件/image-20250430164520612.png)

2. 从 Github 仓库中下载驱动文件的压缩包

![image-20250430164240162](附件/image-20250430164240162.png)

2. 解压后，将 `0.91OLED-SSD1306-STM32HAL` 文件夹中的文件，全部复制到项目的 `Components`

![image-20250430164546218](附件/image-20250430164546218.png)

## CubeMX 配置

1. 根据原理图配置对应的 I2C 引脚（此处以西门子嵌入式为例）：PB9 为 SDA，PB8 为 SCL

![image-20250430164748400](附件/image-20250430164748400.png)

2. 在 CubeMX 中进行以下配置，然后创建工程：

![image-20250430165125092](附件/image-20250430165125092.png)

## 移植驱动文件

1. 在工程中创建文件夹，并添加 `oled.c` 文件(`GD32_Xifeng_Oled\Components\Oled\`\)：

![image-20250430165526570](附件/image-20250430165526570.png)

2. 在魔术棒中添加 Oled 驱动文件的路径(`GD32_Xifeng_Oled\Components\Oled\`)：

![image-20250430165851932](附件/image-20250430165851932.png)

3. 在 `mydefine.h` 中引用 `oled.h`。
4. 将 `oled.c` 第 38 ~ 44 行中的 `&hi2c2` 改为 `&hi2c1` 。

![image-20250430170235638](附件/image-20250430170235638.png)

5. 在 `APP` 中新建 `oled_app.c` 和 `oled_app.h` 文件，并将 `oled_app.c` 添加到工程中。

![image-20250430170541231](附件/image-20250430170541231.png)

6. 在 `oled_app.c` 和 `oled_app.h` 文件中写入以下内容：

```C
/* oled_app.h */
#ifndef __OLED_APP_H__
#define __OLED_APP_H__

#include "mydefine.h"

int Oled_Printf(uint8_t x, uint8_t y, const char *format, ...);
void oled_task(void);

#endif
```

```C
/* oled_app.c */
#include "oled_app.h"

/**
 * @brief	使用类似printf的方式显示字符串，显示6x8大小的ASCII字符
 * @param x  Character position on the X-axis  range：0 - 127
 * @param y  Character position on the Y-axis  range：0 - 3 
 * 例如：Oled_Printf(0, 0, "Data = %d", dat);
**/
int Oled_Printf(uint8_t x, uint8_t y, const char *format, ...)
{
	char buffer[512]; // 临时存储格式化后的字符串
	va_list arg;      // 处理可变参数
	int len;          // 最终字符串长度

	va_start(arg, format);
	// 安全地格式化字符串到 buffer
	len = vsnprintf(buffer, sizeof(buffer), format, arg);
	va_end(arg);

	OLED_ShowStr(x, y, buffer, 8);
	return len;
}

/* Oled 显示任务 */
void oled_task(void)
{
  Oled_Printf(0, 0, "Hello World!!!");
  Oled_Printf(0, 2, "Welcome to MCU");
}
```

7. 在 `mydefine.h` 中引用 `oled_app.h`。
8. 在 `scheduler.c` 的静态任务数组中，添加 `oled_task`，执行周期为 10ms
9. 在 `main.c` 中的 `scheduler_init()` 之前调用 `OLED_Init()`。
10. 编译，下载，一气呵成。Oled 上出现以下画面即表示驱动移植成功。

![780b783daf722431da28a1386beebd3](附件/780b783daf722431da28a1386beebd3.jpg)