#include "led_app.h"

#define LED_STACK_SIZE 512  //LED线程栈大小
#define LED_PRIORITY 10     //LED线程优先级
#define LED_TIMEOUT  10     //LED线程时间片

#define LED_PIN_BASE GET_PIN(D,8)
//全局led数组变量
uint8_t ucled[6] = {0,0,0,0,0,0};
//led互斥锁控制块  防止资源冲突
rt_mutex_t led_mutex;

void led_disp(uint8_t *ucled)
{
    uint8_t temp = 0x00;
    static uint8_t temp_old = 0xff;
    for (int i = 0; i < 6; i++)         // 遍历6个LED的状态
    {
        temp |= (ucled[i]<<i);
    }
    if(temp != temp_old)
    {
      for(uint8_t i = 0;i < 6;i++)
      {
          if((temp>>i) & 0x01)
              rt_pin_write(LED_PIN_BASE+i, PIN_HIGH);
          else
              rt_pin_write(LED_PIN_BASE+i, PIN_LOW);
      }
    }
}

void led_task(void *paramater)
{
    uint32_t sys_led_last_time = 0;
    while(1)
    {
        //使用时抢锁
        rt_mutex_take(led_mutex, RT_WAITING_FOREVER);
        if(rt_tick_get()-sys_led_last_time >100)
        {
            ucled[5] ^=1;
            sys_led_last_time = rt_tick_get();
        }
        led_disp(ucled);
        //用完释放锁
        rt_mutex_release(led_mutex);
        rt_thread_mdelay(1);
    }
}
void led_hardware_init(void)
{
    for(uint8_t i = 0;i < 6; i++)
    {
        rt_pin_mode(LED_PIN_BASE + i,PIN_MODE_OUTPUT);
    }

    //初始化led互斥锁
    led_mutex = rt_mutex_create("led_mutex", RT_IPC_FLAG_PRIO);
    //初始化led线程
    rt_thread_t led_thread = rt_thread_create("led_task", led_task, RT_NULL, LED_STACK_SIZE, LED_PRIORITY, LED_TIMEOUT);
    if(led_thread != RT_NULL)
        rt_thread_startup(led_thread);
    else
        rt_kprintf("led_thread_init:error");

}
