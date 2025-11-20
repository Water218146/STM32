#include "key_app.h"

/*=====================================按键处理方案选择====================================*/
#define KEY_SCHEME_SIMPLE    1  // 简单按键方案
#define KEY_SCHEME_ADVANCED  2  // 高级按键方案(ebtn库)

// 当前使用的方案 - 可以在这里切换不同的按键处理方案
#define CURRENT_KEY_SCHEME   KEY_SCHEME_ADVANCED

/*=====================================简单按键处理方案====================================*/

#if (CURRENT_KEY_SCHEME == KEY_SCHEME_SIMPLE)

uint8_t Key_Val,Key_Up,Key_Down,Key_Old;

uint8_t Key_Read()
{
	uint8_t temp = 0;
	if(HAL_GPIO_ReadPin(KEY1_GPIO_Port,KEY1_Pin)==GPIO_PIN_RESET) temp = 1; //KEY1
    if(HAL_GPIO_ReadPin(KEY2_GPIO_Port,KEY2_Pin)==GPIO_PIN_RESET) temp = 2; //KEY2
    if(HAL_GPIO_ReadPin(KEY3_GPIO_Port,KEY3_Pin)==GPIO_PIN_RESET) temp = 3; //KEY3
    if(HAL_GPIO_ReadPin(KEY4_GPIO_Port,KEY4_Pin)==GPIO_PIN_RESET) temp = 4; //KEY4
    if(HAL_GPIO_ReadPin(KEY5_GPIO_Port,KEY5_Pin)==GPIO_PIN_RESET) temp = 5; //KEY5
    if(HAL_GPIO_ReadPin(KEY6_GPIO_Port,KEY6_Pin)==GPIO_PIN_RESET) temp = 6; //KEY6
	return temp;
}

void key_task()
{
    Key_Val = Key_Read(); // 读取当前按键值
    Key_Down = Key_Val & (Key_Old ^ Key_Val);   // 按键按下
    Key_Up = ~Key_Val &(Key_Old ^ Key_Val);     // 按键松开
    Key_Old = Key_Val;  // 保存上次按键值
}


#endif /* CURRENT_KEY_SCHEME == KEY_SCHEME_SIMPLE */
/*=====================================高级按键处理方案(ebtn库)====================================*/

#if (CURRENT_KEY_SCHEME == KEY_SCHEME_ADVANCED)

#include "ebtn.h"

/* 按键参数配置 */
const ebtn_btn_param_t key_param_normal = EBTN_PARAMS_INIT(
    20,     // time_debounce: 按键消抖时间 20ms
    20,     // time_debounce_release: 释放消抖时间 20ms
    50,     // time_click_pressed_min: 有效点击最小按下时间 50ms
    500,    // time_click_pressed_max: 有效点击最大按下时间 500ms
    300,    // time_click_multi_max: 多击间隔时间 300ms
    500,    // time_keepalive_period: 长按保持事件周期 500ms
    5       // max_consecutive: 最大连击次数 5 次
);

/* 按键ID定义 */
typedef enum
{
	KEY1 = 1, // 单个按键ID
    KEY2,
    KEY3,
    KEY4,
    KEY5,
    KEY6,
    KEY_MAX,
	
	
/*组合按键定义*/	
    COM_KEY1 = 101, // 组合键ID
    COM_KEY2 = 102,
		COM_KEY3 = 103,
}user_button_t;
/* 单个按键配置 */
ebtn_btn_t my_buttons[] = {
    EBTN_BUTTON_INIT(KEY1, &key_param_normal),
    EBTN_BUTTON_INIT(KEY2, &key_param_normal),
    EBTN_BUTTON_INIT(KEY3, &key_param_normal),
    EBTN_BUTTON_INIT(KEY4, &key_param_normal),
    EBTN_BUTTON_INIT(KEY5, &key_param_normal),
    EBTN_BUTTON_INIT(KEY6, &key_param_normal),
};

/* 组合按键配置 */
ebtn_btn_combo_t my_combos[] = {
    EBTN_BUTTON_COMBO_INIT(COM_KEY1, &key_param_normal),
    EBTN_BUTTON_COMBO_INIT(COM_KEY2, &key_param_normal),
		EBTN_BUTTON_COMBO_INIT(COM_KEY3, &key_param_normal)
};

/* 按键状态读取函数 */
uint8_t my_get_key_state(struct ebtn_btn *btn) {
    switch (btn->key_id) {
        case KEY1:
            return (HAL_GPIO_ReadPin(KEY1_GPIO_Port, KEY1_Pin) == GPIO_PIN_RESET);
        case KEY2:
            return (HAL_GPIO_ReadPin(KEY2_GPIO_Port, KEY2_Pin) == GPIO_PIN_RESET);
        case KEY3:
            return (HAL_GPIO_ReadPin(KEY3_GPIO_Port, KEY3_Pin) == GPIO_PIN_RESET);
        case KEY4:
            return (HAL_GPIO_ReadPin(KEY4_GPIO_Port, KEY4_Pin) == GPIO_PIN_RESET);
        case KEY5:
            return (HAL_GPIO_ReadPin(KEY5_GPIO_Port, KEY5_Pin) == GPIO_PIN_RESET);
        case KEY6:
            return (HAL_GPIO_ReadPin(KEY6_GPIO_Port, KEY6_Pin) == GPIO_PIN_RESET);
        default:
            return 0;
    }
}
/* 组合键状态管理 */
static uint8_t combo_key_active = 0;  // 组合键激活标志
static uint32_t combo_clear_time = 0; // 组合键清除时间
static uint8_t combo_operation_done = 0; // 组合键操作完成标志

/* 按键事件处理函数 */
void my_handle_key_event(struct ebtn_btn *btn, ebtn_evt_t evt) {
    uint16_t key_id = btn->key_id;
    uint16_t click_cnt = ebtn_click_get_count(btn);
    uint32_t current_time = HAL_GetTick();

    // 检查组合键状态是否需要清除
    if (combo_key_active && (current_time - combo_clear_time > 300)) {
        combo_key_active = 0;
        combo_operation_done = 0;
    }

    switch (evt) {
        case EBTN_EVT_ONPRESS: // 按键按下
            // 处理组合按键 - 只在ONPRESS中执行实际操作，避免重复
            if (key_id >= COM_KEY1 && key_id <= COM_KEY3) {
                combo_key_active = 1;
                combo_clear_time = current_time;
                
                // 只执行一次操作
                if (!combo_operation_done) {
                    combo_operation_done = 1;
                    
                    if (key_id == COM_KEY1) 
                    { 
                        // Copy_Key (KEY1+KEY2) 复制功能

                    }
                    else if(key_id == COM_KEY2)
                    {
                        //Paste_Key (KEY1 + KEY3）粘贴功能

                    }
                    else if(key_id == COM_KEY3)
                    {
                        //Cut_Key (KEY1+KEY4) 剪切功能

                       
                    }
                }
            }            
            // 处理单个按键（严格检查：无组合键激活且无操作完成标志）
            else if (!combo_key_active && !combo_operation_done) {
                if (key_id == KEY1) { /* KEY1 按下处理 */ }
                else if (key_id == KEY2) { /* KEY2 按下处理 */ }
                else if (key_id == KEY3) { /* KEY3 按下处理 */ }
                else if (key_id == KEY4) { /* KEY4 按下处理 */ }
                else if (key_id == KEY5) { /* KEY5 按下处理 */ }
                else if (key_id == KEY6) { /* KEY6 按下处理 */ }
            }
            break;

        case EBTN_EVT_ONRELEASE: // 按键释放
            // 处理组合按键
            if (key_id >= COM_KEY1 && key_id <= COM_KEY3) {
                // 组合键释放处理
                if (key_id == COM_KEY1) { 
                    // COM_KEY1 (KEY1+KEY2) 释放
                }
                // 更新组合键清除时间，延长保护期
                combo_clear_time = current_time;
            }
            // 处理单个按键（严格检查：无组合键激活且无操作完成标志）
            else if (!combo_key_active && !combo_operation_done) {
                if (key_id == KEY1) { /* KEY1 释放处理 */ }
                else if (key_id == KEY2) { /* KEY2 释放处理 */ }
                else if (key_id == KEY3) { /* KEY3 释放处理 */ }
                else if (key_id == KEY4) { /* KEY4 释放处理 */ }
                else if (key_id == KEY5) { /* KEY5 释放处理 */ }
                else if (key_id == KEY6) { /* KEY6 释放处理 */ }
            }
            break;
        case EBTN_EVT_ONCLICK: // 按键点击
            // 处理组合按键 
           if (key_id >= COM_KEY1 && key_id <= COM_KEY3) {
                combo_key_active = 1;
                combo_clear_time = current_time;
            }
            // 处理单个按键（严格检查：无组合键激活且无操作完成标志）
            else if (!combo_key_active && !combo_operation_done) {
                if (key_id == KEY1) {
                    if (click_cnt == 1) {
                        // KEY1 单击处理
											my_printf(&huart1,"Hellow\r\n");
                    } 
										else if (click_cnt == 2) 
										{
                        // KEY1 双击处理
                    }
                } 
                else if (key_id == KEY2) {
                    if (click_cnt == 1) {
                        // KEY2 单击处理
                    }
                }
                else if (key_id == KEY3) {
                    if (click_cnt == 1) {
                        // KEY3 单击处理
                    }
                }
                else if (key_id == KEY4) {
                    if (click_cnt == 1) {
                        // KEY4 单击处理
                    }
                }
                else if (key_id == KEY5) {
                    if (click_cnt == 1) {
                        // KEY5 单击处理
                    }
                }
                else if (key_id == KEY6) {
                    if (click_cnt == 1) {
                        // KEY6 单击处理
                    }
                }
            }
            break;
        case EBTN_EVT_KEEPALIVE: // 长按保持
            // 处理组合按键
           if (key_id >= COM_KEY1 && key_id <= COM_KEY3) {
                combo_key_active = 1;
                combo_clear_time = current_time;
                
                if (key_id == COM_KEY1) {
                    // COM_KEY1 (KEY1+KEY2) 长按处理
                }
                else if (key_id == COM_KEY3) {
                    // Cut_Key (KEY1+KEY4) 长按处理
                }
            }
            // 处理单个按键（严格检查：无组合键激活且无操作完成标志）
            else if (!combo_key_active && !combo_operation_done) {
                if (key_id == KEY1) {
                    // KEY1 长按处理
                }
                else if (key_id == KEY2) {
                    // KEY2 长按处理
                }
                else if (key_id == KEY3) {
                    // KEY3 长按处理
                }
                else if (key_id == KEY4) {
                    // KEY4 长按处理
                }
                else if (key_id == KEY5) {
                    // KEY5 长按处理
                }
                else if (key_id == KEY6) {
                    // KEY6 长按处理
                }
            }
            break;

        default:
            break;
    }
}
/* ebtn初始化 */
void my_ebtn_init(void)
{
    // 初始化
    ebtn_init(my_buttons,EBTN_ARRAY_SIZE(my_buttons),my_combos,EBTN_ARRAY_SIZE(my_combos),my_get_key_state,my_handle_key_event);
    
    // 配置组合键
    int key1_index = ebtn_get_btn_index_by_key_id(KEY1);
    int key2_index = ebtn_get_btn_index_by_key_id(KEY2);
	int key3_index = ebtn_get_btn_index_by_key_id(KEY3);
	int key4_index = ebtn_get_btn_index_by_key_id(KEY4);

    if (key1_index >= 0 && key2_index >= 0)
	{
        ebtn_combo_btn_add_btn_by_idx(&my_combos[0], key1_index);
        ebtn_combo_btn_add_btn_by_idx(&my_combos[0], key2_index);
	}
	if(key1_index >= 0 && key3_index >= 0)
	{
		ebtn_combo_btn_add_btn_by_idx(&my_combos[1], key1_index);
        ebtn_combo_btn_add_btn_by_idx(&my_combos[1], key3_index);
	}
	if(key1_index >= 0 && key4_index >= 0)
	{
		ebtn_combo_btn_add_btn_by_idx(&my_combos[2], key1_index);
        ebtn_combo_btn_add_btn_by_idx(&my_combos[2], key4_index);			
	}
}



void key_task() 
{
	ebtn_process(HAL_GetTick());
}

#endif /* CURRENT_KEY_SCHEME == KEY_SCHEME_ADVANCED */