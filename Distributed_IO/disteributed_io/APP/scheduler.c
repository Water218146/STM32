#include "scheduler.h"

//全局变量 用于存储任务数量
uint8_t task_num;

typedef struct
{
    void (*task_func)(void);
    uint32_t rate_ms;
    uint32_t last_run;
}task_t;


// 静态任务数组，每个任务包含任务函数、执行周期（毫秒）和上次运行时间（毫秒）
static task_t scheduler_task[] = {
    {0,1,0},

};

//调度器初始化函数
void scheduler_init(void)
{
    task_num = sizeof(scheduler_task) / sizeof(task_t);
}


//调度器运行函数
void scheduler_run(void)
{
    //遍历任务数组
    for(uint8_t i = 0; i < task_num; i++)
    {
        //获取当前系统时间
        uint32_t now_time = uwTick;
        //检查当前任务调度间隔是否到达其最小周期
        if(now_time - scheduler_task[i].last_run >= scheduler_task[i].rate_ms)
        {
            //更新上次运行的时间
            scheduler_task[i].last_run = now_time;
            //调用函数
            scheduler_task[i].task_func();
        }
    }
}

