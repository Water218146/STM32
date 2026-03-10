#include "key_app.h"

extern PID_T pid_speed_left;  // 左轮速度环 PID 控制器
extern PID_T pid_speed_right; // 右轮速度环 PID 控制器

extern bool pid_running;

void Key_Init()
{
    Ebtn_Init();
}

void Key_Task()
{
    ebtn_process(HAL_GetTick());
}

/* 处理按键事件的回调函数 */
// 函数原型: void (*ebtn_evt_fn)(struct ebtn_btn *btn, ebtn_evt_t evt);
void my_handle_key_event(struct ebtn_btn *btn, ebtn_evt_t evt) {
//    uint16_t key_id = btn->key_id;                 // 获取触发事件的按键 ID
    uint16_t click_cnt = ebtn_click_get_count(btn); // 获取连击次数 (仅在 ONCLICK 事件时有意义)
    switch (evt) {
        case EBTN_EVT_ONPRESS: // 按下事件 (消抖成功后触发一次)
            break;
        case EBTN_EVT_ONRELEASE: // 释放事件 (消抖成功后触发一次)
            break;
        case EBTN_EVT_ONCLICK: // 单击/连击事件 (在释放后，或达到最大连击数，或超时后触发)
            switch (click_cnt) 
            {
              case 1: // 开启 PID 控制
                pid_running = 1;
                Uart_Printf(&huart1, "key down\r\n");
                break;
            }
            break;
        case EBTN_EVT_KEEPALIVE: // 保持活动/长按事件 (按下持续时间超过阈值后，按周期触发)
            if(++system_mode >= 5) system_mode = 1;
            break;
        default: // 未知事件 (理论上不应发生)
            // printf(" - Unknown Event\n");
            break;
    }
}

