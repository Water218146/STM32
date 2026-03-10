#include "uart_app.h"

#define  NORMAL_REVICE_INTERRUPT 0
#define  DMA_IDLE_INTERRUPT 1 //DMA+空闲中断 容易分包 原因：RTT的串口框架是以基于流设备的 流设备所具有的物理特性 容易导致分包
#define  TIMEOUT_RINGBUFFER 2

#define  UART3_REVICE_SCHEME TIMEOUT_RINGBUFFER

#define UART3_STACK_SIZE 2048  //UART线程栈大小（uart3_printf内部有256字节局部buffer，不可低于2048）
#define UART3_PRIORITY 10     //UART线程优先级
#define UART3_TIMEOUT  10     //UART线程时间片

#if (UART3_REVICE_SCHEME== NORMAL_REVICE_INTERRUPT)

#define UART3_NAME "uart3"
static rt_device_t uart3_dev = RT_NULL;
static rt_sem_t rx_sem = RT_NULL;//用于回调函数

/* ---- 中断接收回调函数 ---- */
/* 运行在 ISR 上下文中，绝对禁止阻塞操作（如 delay、printf） */
static rt_err_t uart3_input_cb(rt_device_t dev, rt_size_t size)
{
    if (size > 0)
    {
        rt_sem_release(rx_sem);  // 仅释放信号量，唤醒线程，立刻返回
    }
    return RT_EOK;
}

static void uart_task(void *parameter)
{
   char ch;
   while(1)
   {
       /* 等待获取信号量 */
       rt_sem_take(rx_sem,RT_WAITING_FOREVER);
       while(rt_device_read(uart3_dev, -1, &ch, 1)==1)
       {
           rt_device_write(uart3_dev, 0, &ch, 1);
       }
   }
}

int uart3_init(void)
{
    /* 第一步 查找uart3这个设备 */
   uart3_dev  = rt_device_find("uart3");
   if(uart3_dev != RT_NULL)//如果找到了这个设备
   {
       /* 打开这个设备 */
       rt_device_open(uart3_dev, RT_DEVICE_FLAG_INT_RX);//使用普通中断接收模式

       /* 初始化信号量 */
       rx_sem = rt_sem_create("rx_sem", 0, RT_IPC_FLAG_PRIO);

       /* 注册回调函数 */
       rt_device_set_rx_indicate(uart3_dev, uart3_input_cb);

       /* 创建线程 */
       rt_thread_t uart3_thread = rt_thread_create("uart3_thread", uart_task, RT_NULL, UART3_STACK_SIZE, UART3_PRIORITY, UART3_TIMEOUT);

       /* 启动线程 */
       if(uart3_thread != RT_NULL)
           rt_thread_startup(uart3_thread);
       else
           rt_kprintf("uart3_thread is startup:fail");
   }
   else
     rt_kprintf("device:uart3 is not find");

   return RT_EOK;
}
#endif

#if (UART3_REVICE_SCHEME== DMA_IDLE_INTERRUPT)
//串口3名字
#define UART3_NAME "uart3"
//创建一个管理串口3的句柄
static rt_device_t uart3_dev;
//创建一个静态消息队列
static struct rt_messagequeue rx_mq;
/* 串口接收消息结构 */
struct rx_msg
{
    rt_device_t dev;    //设备句柄
    rt_size_t   size;   //接收到的数据大小
};

//串口接收回调函数
static rt_err_t uart3_input_cb(rt_device_t dev, rt_size_t size)
{
    struct rx_msg msg;
    msg.dev = dev;
    msg.size = size;
    rt_mq_send(&rx_mq, &msg, sizeof(msg));
    return RT_EOK;
}

/* 串口3任务函数 */
void uart3_task(void *parameter)
{
    struct rx_msg msg;
    char uart3_buffer[RT_SERIAL_RB_BUFSZ + 1] = {0};
    while(1)
    {
        //等待消息队列
        rt_mq_recv(&rx_mq, &msg, sizeof(msg), RT_WAITING_FOREVER);
        //有数据来之后 读取size个字节到uart3
        rt_device_read(uart3_dev, 0, uart3_buffer, msg.size);
        //转发出去
        rt_device_write(uart3_dev, 0, uart3_buffer, msg.size);
    }

}

/* 串口3初始化函数 */
int uart3_init(void)
{
    static char msg_pool[256];
    //寻找串口3设备
    uart3_dev = rt_device_find(UART3_NAME);
    if(uart3_dev != RT_NULL)
    {
        //开启设备 使用DMA接收
        rt_device_open(uart3_dev, RT_DEVICE_FLAG_DMA_RX);
        //初始化消息队列
        rt_mq_init(&rx_mq, "rx_mq", msg_pool, sizeof(struct rx_msg), sizeof(msg_pool), RT_IPC_FLAG_FIFO);
        //绑定接收回调
        rt_device_set_rx_indicate(uart3_dev, uart3_input_cb);
        /* 创建并启动线程 */
        rt_thread_t uart3_thread = rt_thread_create("uart3_task", uart3_task, RT_NULL, UART3_STACK_SIZE, UART3_PRIORITY, UART3_TIMEOUT);
        if(uart3_thread != RT_NULL)
            rt_thread_startup(uart3_thread);
        else
            rt_kprintf("uart3_thread is startup :false!");
    }
    else
        rt_kprintf("uart3 is not find!");

    return RT_EOK;
}

#endif

#if (UART3_REVICE_SCHEME== TIMEOUT_RINGBUFFER)

#define RINGBUFFER_SIZE 256        //环形缓存器大小
#define UART3_BUFFER_SIZE 256      //实际应用数组大小
#define UART3_NAME "uart3"         //串口3名称
#define UART3_TIMEOUT_TICK 20      //超时时间 20ms
#define UART3_INIT_MSG "Uart3 Application Initialized.\r\n"

/* 环形缓存区存储池 */
static uint8_t ringbuffer_pool[RINGBUFFER_SIZE];

/* 环形缓存区对象 */
static struct rt_ringbuffer uart3_ringbuffer;

/* 实际读取应用的缓冲区 */
static uint8_t uart3_rx_buffer[UART3_BUFFER_SIZE];

/* 串口设备句柄（同时用于uart3_printf重定向） */
static rt_device_t uart3_dev = RT_NULL;

/* 记录上次接收数据的tick */
static rt_tick_t last_rx_tick = 0;

/* 对串口3进行重定向 */
int uart3_printf(const char *format,...)
{
    char buffer[256];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);

    int len = strlen(buffer);
    rt_device_write(uart3_dev, 0, buffer, len);
    return len;
}

/* UART3接收回调函数（运行于ISR，禁止阻塞操作） */
static rt_err_t uart3_input_cb(rt_device_t dev, rt_size_t size)
{
    rt_size_t read_size;
    rt_uint8_t temp_buffer[UART3_BUFFER_SIZE];

    /* 复位超时计时 */
    last_rx_tick = rt_tick_get();

    /* 从串口驱动缓冲区读数据 */
    read_size = rt_device_read(uart3_dev, 0, temp_buffer, UART3_BUFFER_SIZE);

    if(read_size > 0)
    {
        /* 写入应用层环形缓冲区，ISR中不调用uart3_printf */
        rt_size_t stored = rt_ringbuffer_put(&uart3_ringbuffer, temp_buffer, read_size);
        (void)stored; /* 丢包静默，业务线程中可检测ringbuffer水位 */
    }
    return RT_EOK;
}

/* 串口数据处理线程 */
static void uart_task(void *parameter)
{
    rt_size_t size;
    rt_tick_t now_tick;

    while(1)
    {
        now_tick = rt_tick_get();

        /* 超时且ringbuffer中有数据，视为一帧完整接收 */
        if((now_tick - last_rx_tick >= UART3_TIMEOUT_TICK)
            && (rt_ringbuffer_data_len(&uart3_ringbuffer) > 0))
        {
            size = rt_ringbuffer_get(&uart3_ringbuffer, uart3_rx_buffer, sizeof(uart3_rx_buffer) - 1);
            if(size > 0)
            {
                uart3_rx_buffer[size] = '\0';
                uart3_printf("ringbuffer data: %s\r\n", uart3_rx_buffer);
                memset(uart3_rx_buffer, 0, sizeof(uart3_rx_buffer));
            }
        }

        rt_thread_delay(50); /* 50ms轮询一次，精度足够，不占满CPU */
    }
}


/* UART3应用初始化函数 */
int uart3_init(void)
{
    rt_err_t result;
    struct serial_configure config = RT_SERIAL_CONFIG_DEFAULT;

    /* 初始化环形缓冲区 */
    rt_ringbuffer_init(&uart3_ringbuffer, ringbuffer_pool, sizeof(ringbuffer_pool));

    /* 查找串口设备 */
    uart3_dev = rt_device_find(UART3_NAME);
    if(uart3_dev == RT_NULL)
    {
        rt_kprintf("Find %s failed!\n", UART3_NAME);
        return RT_ERROR;
    }

    /* 配置串口参数 */
    config.baud_rate = BAUD_RATE_115200;
    config.data_bits = DATA_BITS_8;
    config.stop_bits = STOP_BITS_1;
    config.parity    = PARITY_NONE;
    config.bufsz     = UART3_BUFFER_SIZE;

    result = rt_device_control(uart3_dev, RT_DEVICE_CTRL_CONFIG, &config);
    if(result != RT_EOK)
    {
        rt_kprintf("Configure %s failed!\n", UART3_NAME);
        return RT_ERROR;
    }

    /* 打开串口（中断收发模式） */
    result = rt_device_open(uart3_dev, RT_DEVICE_FLAG_INT_RX | RT_DEVICE_FLAG_INT_TX);
    if(result != RT_EOK)
    {
        rt_kprintf("Open %s failed!\n", UART3_NAME);
        return RT_ERROR;
    }

    /* 注册接收回调 */
    rt_device_set_rx_indicate(uart3_dev, uart3_input_cb);

    /* 打印初始化完成消息 */
    uart3_printf(UART3_INIT_MSG);

    /* 创建数据处理线程 */
    rt_thread_t uart3_thread = rt_thread_create("uart3_thread", uart_task, RT_NULL,
                                    UART3_STACK_SIZE, UART3_PRIORITY, UART3_TIMEOUT);
    if(uart3_thread != RT_NULL)
        rt_thread_startup(uart3_thread);
    else
    {
        rt_kprintf("uart3_thread create failed!\n");
        return RT_ERROR;
    }
    return RT_EOK;
}

#endif
