# WouoUI-Page 移植

## 框架简介

 Github ：https://github.com/Sheep118/WouoUI-PageVersion

* 所有文件都在一个文件夹内，移植方便。
* 配置简单易懂
* 注释完善
* 配置项丰富
* 对按键的支持非常灵活，可以直接在当前的按键检测函数上添加。

## 移植菜单流程

> [!NOTE]
>
> 开始移植前，请确保可以正常驱动 Oled 屏幕进行显示

### 1、准备文件

1. 在项目的 `Components` 组件文件夹中，新建一个 `WouoUI_Page` 文件夹，用于存放菜单文件。

![image-20250430163252251](附件/image-20250430163252251.png)

2. 从 Github 仓库中下载源文件的压缩包

![image-20250430163502774](附件/image-20250430163502774.png)



3. 解压后将 `Csource` 文件夹中的 .c .h 文件，全部复制到第一步创建的文件夹 `WouoUI_Page` 中。

> 此处建议使用我提供的压缩包文件，因为原版使用 UTF-8 编码，并且默认配置适配的是 0.96 寸（128 * 64）Oled，提供的压缩包文件 `Csource（GB2312）.zip` 对其进行了修改。(主要更改了配置使其更适配 0.91 寸屏幕，以及添加了一个控制 LED 开关的列表供您参考如何创建一个菜单，具体可以参考 Github)

![image-20250430163655654](附件/image-20250430163655654.png)

### 2、引用文件

1. 在工程中创建文件夹，并添加相关文件(`GD32_Xifeng_Oled\Components\WouoUI_Page\`\)：

![image-20250430173417507](附件/image-20250430173417507.png)

2. 在魔术棒中添加路径(`GD32_Xifeng_Oled\Components\WouoUI_Page\`)：

![image-20250430173601103](附件/image-20250430173601103.png)

### 3、实现缓存刷新函数

* 如果您使用的是 `Oled 驱动移植.pdf` 中提供的驱动文件，那么可以直接使用以下的实现：

```
/* buf 的大小 = [屏幕宽 / 8][屏幕长] */
void OLED_SendBuff(uint8_t buff[4][128])  
{  
    for(uint8_t i = 0; i < 4; i++)  
    {  
        OLED_Write_cmd(0xb0 + i);    // 设置页地址（0~3）
        
        OLED_Write_cmd(0x00);  // 设置低列地址

        OLED_Write_cmd(0x10);  // 设置列高地址

        // 写一页128个字符
        for (uint8_t j = 0; j < 128; j++)  
        {
            OLED_Write_data(buff[i][j]);  // 写入数据
        }
    } 
}
```

### 4、配置菜单 WouoUI_conf.h

> 菜单默认适配 0.96 寸 Oled ，以下假设采用了 0.91 寸 Oled

* 修改 14、15 行的内容，适配对应的屏幕尺寸

```C
/* WouoUI_conf.h */
//---------------------与UI相关的参数
#define WOUOUI_BUFF_WIDTH           128 // 屏幕宽
#define WOUOUI_BUFF_HEIGHT          32  // 屏幕高
```

* 修改 26~39 行的内容，使图标下方不显示磁贴

```C
/* WouoUI_conf.h */
//------------------与title页面相关的默认参数
#define DEFAULT_TILE_B_TITLE_FNOT           0  // 磁贴大标题字体
#define DEFAULT_TILE_ICON_W                 30         // 磁贴图标宽度
#define DEFAULT_TILE_ICON_H                 30         // 磁贴图标高度
#define DEFAULT_TILE_ICON_IND_U             0          //磁贴指示器与磁贴的上边距
#define DEFAULT_TILE_ICON_IND_D             2         //磁贴指示器与磁贴的下边距
#define DEFAULT_TILE_ICON_IND_L             2         //磁贴指示器与磁贴的左边距
#define DEFAULT_TILE_ICON_IND_R             2        //磁贴指示器与磁贴的右边距
#define DEFAULT_TILE_ICON_IND_SL            5        //磁贴指示器边长SideLength
#define DEFAULT_TILE_ICON_S                 6       //磁贴图标间距(图标边和边的距离)
#define DEFAULT_TILE_BAR_D                  2       //磁贴装饰条下边距
#define DEFAULT_TILE_BAR_W                  0       //磁贴装饰条宽度
#define DEFAULT_TILE_BAR_H                  0      //磁贴装饰条高度
#define DEFAULT_TILE_SLIDESTR_MODE          2       //磁贴标题文本的滚动模式
```

> [!NOTE]
>
> 将 磁贴大标题字体 设置为 0 时后，会引发 9 个错误，将这 9 个报错对应的语句注释掉即可。

### 5、初始化及调用

1. 在 `mydefine.h` 中调用 `WouoUI.h` 和 `WouoUI_user.h` 。

> WouoUI.h 为菜单的核心组件
>
> WouoUI_user.h 为测试用的菜单例程

2. 修改 Oled 显示任务函数 `oled_task` ：

```C
/* Oled 显示任务 */
void oled_task(void)
{
  WouoUI_Proc(10);
}
```

> [!NOTE]
>
> 如果因为阻塞导致出现卡顿，可以将其放在 10ms 的中断回调函数中。数值可以根据实际情况调整。

```C
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  WouoUI_Proc(10);
}

// 注意在初始化时开启定时器中断 HAL_TIM_Base_Start_IT(&htim2);
```

3. 在 `main.c` 的 Oled 初始化函数 `OLED_Init()` 后追加以下内容：

```C
WouoUI_SelectDefaultUI(); //选择默认UI
WouoUI_AttachSendBuffFun(OLED_SendBuff); //绑定刷屏函数
TestUI_Init(); //用户UI的初始化
```

4. 将 Oled 驱动文件 `oled.c` 和 `oledfont.h` 中的 `F8X16` 替换成  `Oled_F8X16`  解决冲突问题。
4. 编译下载，一气呵成，此时即可看到 Oled 上出现菜单画面

![7fc35fe143ce5a8717c56df12099036](附件/7fc35fe143ce5a8717c56df12099036.jpg)

### 6、绑定按键操作

* 共有以下 8 种操作类型，只需在对应按键下调用 `WOUOUI_MSG_QUE_SEND(InputMsg)` 发送对应的按键事件即可。

```C
typedef enum {
    msg_up = 0x00,   // 上，或者last消息，表上一个
    msg_down,        // 下，或者next消息，表下一个
    msg_left,        // 左，混合模式时表示上一个
    msg_right,       // 右，混合模式时表示下一个
    msg_click,       // 点击消息，表确认，确认某一选项，回调用一次回调
    msg_return,      // 返回消息，表示返回，从一个页面退出
    msg_home,        // home消息，表回主界面(尚未设计，目前还没有设计对应的功能，默认以page_id为0的页面为主页面)
    msg_none = 0xFF, // none表示没有操作
} InputMsg;          // 输入消息类型，UI设计只供输入5种消息

```

* 以下例子基于 ebtn 框架：

```C
void prv_btn_event(struct ebtn_btn *btn, ebtn_evt_t evt)
{
    if((btn->key_id == USER_BUTTON_0) && (ebtn_click_get_count(btn) == 1)) {
        ucLed[0] ^= 1;
        WOUOUI_MSG_QUE_SEND(msg_up);
    }
    
    if((btn->key_id == USER_BUTTON_1) && (ebtn_click_get_count(btn) == 1)) {
        ucLed[1] ^= 1;
        WOUOUI_MSG_QUE_SEND(msg_down);
    }
    
    if((btn->key_id == USER_BUTTON_2) && (ebtn_click_get_count(btn) == 1)) {
        ucLed[2] ^= 1;
        WOUOUI_MSG_QUE_SEND(msg_left);
    }
    
    if((btn->key_id == USER_BUTTON_3) && (ebtn_click_get_count(btn) == 1)) {
        ucLed[3] ^= 1;
        WOUOUI_MSG_QUE_SEND(msg_right);
    }
    
    if((btn->key_id == USER_BUTTON_4) && (ebtn_click_get_count(btn) == 1)) {
        ucLed[4] ^= 1;
        WOUOUI_MSG_QUE_SEND(msg_return); // 返回
    }
    
    if((btn->key_id == USER_BUTTON_5) && (ebtn_click_get_count(btn) == 1)) {
        ucLed[5] ^= 1;
        WOUOUI_MSG_QUE_SEND(msg_click); // 确定
    }
}
```

* 编译下载后即可控制菜单。

> [!NOTE]
>
> 使用中如果发现非常迟缓，不够丝滑。
>
> 这可能是第三步中实现的缓存刷新函数 `OLED_SendBuff` 效率不够高的问题，下面给出了一种解决方法

### 使用 u8g2 提高效率

* 使用前确保进行了 u8g2 的初始化。

```C
void OLED_SendBuff(uint8_t buff[4][128])
{
    // 获取 u8g2 的缓冲区指针
    uint8_t *u8g2_buffer = u8g2_GetBufferPtr(&u8g2);

    // 将数据拷贝到 u8g2 的缓冲区
    memcpy(u8g2_buffer, buff, 4 * 128);

    // 发送整个缓冲区到 OLED
    u8g2_SendBuffer(&u8g2);
}
```

* 编译下载后，即可感受到德芙般的丝滑，感谢您的阅读。





