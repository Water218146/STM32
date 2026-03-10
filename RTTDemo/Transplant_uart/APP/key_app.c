#include "key_app.h"
#define KEY1 GET_PIN(E,15)
#define KEY2 GET_PIN(E,13)
#define KEY3 GET_PIN(E,11)
#define KEY4 GET_PIN(E,9)
#define KEY5 GET_PIN(E,7)
#define KEY6 GET_PIN(B,0)

#define KEY_STACK_SIZE 512  //KEY线程栈大小
#define KEY_PRIORITY 10     //KEY线程优先级
#define KEY_TIMEOUT  10     //KEY线程时间片
uint8_t read_key(void)
{
    uint8_t temp =0;
    if(rt_pin_read(KEY1) == PIN_LOW)return 1;
    if(rt_pin_read(KEY2) == PIN_LOW)return 2;
    if(rt_pin_read(KEY3) == PIN_LOW)return 3;
    if(rt_pin_read(KEY4) == PIN_LOW)return 4;
    if(rt_pin_read(KEY5) == PIN_LOW)return 5;
    if(rt_pin_read(KEY6) == PIN_LOW)return 6;
    return temp;
}

void key_task(void *paratemer)
{
    uint8_t key_val,key_down,key_up,key_old = 0;
    while(1)
    {
       key_val = read_key();
       key_down = key_val & (key_val ^ key_old);
       key_up = ~key_val & (key_val ^key_old);
       key_old = key_val;

       //拿锁
       rt_mutex_take(led_mutex, RT_WAITING_FOREVER);
       if(key_down)
           ucled[0] = 1;
       if(key_up)
           ucled[0] = 0;
       //释放锁
       rt_mutex_release(led_mutex);

       rt_thread_mdelay(10);
    }
}

void key_hardware_init(void)
{
    rt_pin_mode(KEY1,PIN_MODE_INPUT_PULLUP);
    rt_pin_mode(KEY2,PIN_MODE_INPUT_PULLUP);
    rt_pin_mode(KEY3,PIN_MODE_INPUT_PULLUP);
    rt_pin_mode(KEY4,PIN_MODE_INPUT_PULLUP);
    rt_pin_mode(KEY5,PIN_MODE_INPUT_PULLUP);
    rt_pin_mode(KEY6,PIN_MODE_INPUT_PULLUP);

    rt_thread_t key_thread  = rt_thread_create("key_task", key_task, RT_NULL , KEY_STACK_SIZE, KEY_PRIORITY, KEY_TIMEOUT);
    if(key_thread != RT_NULL)
        rt_thread_startup(key_thread);
    else {
        rt_kprintf("key_thread_init:error");
    }
}
