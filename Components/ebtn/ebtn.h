#ifndef _EBTN_H
#define _EBTN_H

#include <stdint.h>
#include <string.h>

#include "bit_array.h"

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

// #define EBTN_CONFIG_TIMER_16

// 如果你想减少RAM大小，这里可以改为uint16_t
#ifdef EBTN_CONFIG_TIMER_16
typedef uint16_t ebtn_time_t;
typedef int16_t ebtn_time_sign_t;
#else
typedef uint32_t ebtn_time_t;
typedef int32_t ebtn_time_sign_t;
#endif

/* 前向声明 */
struct ebtn_btn;
struct ebtn;

#define EBTN_MAX_KEYNUM (64)

/**
 * \brief           按键事件列表
 *
 */
typedef enum
{
    EBTN_EVT_ONPRESS = 0x00, /*!< 按下事件 - 检测到有效按下时发送 */
    EBTN_EVT_ONRELEASE,      /*!< 释放事件 - 检测到有效释放事件时发送（从激活到非激活） */
    EBTN_EVT_ONCLICK,        /*!< 点击事件 - 发生有效的按下和释放事件序列时发送 */
    EBTN_EVT_KEEPALIVE,      /*!< 保持事件 - 按键激活时周期性发送 */
} ebtn_evt_t;

#define EBTN_EVT_MASK_ONPRESS   (1 << EBTN_EVT_ONPRESS)
#define EBTN_EVT_MASK_ONRELEASE (1 << EBTN_EVT_ONRELEASE)
#define EBTN_EVT_MASK_ONCLICK   (1 << EBTN_EVT_ONCLICK)
#define EBTN_EVT_MASK_KEEPALIVE (1 << EBTN_EVT_KEEPALIVE)

#define EBTN_EVT_MASK_ALL (EBTN_EVT_MASK_ONPRESS | EBTN_EVT_MASK_ONRELEASE | EBTN_EVT_MASK_ONCLICK | EBTN_EVT_MASK_KEEPALIVE)

/**
 * @brief  返回两个绝对时间的差值：time1-time2
 * @param[in]  time1: 以内部时间单位表示的绝对时间
 * @param[in]  time2: 以内部时间单位表示的绝对时间
 * @return 以内部时间单位表示的有符号相对时间结果
 */
static inline ebtn_time_sign_t ebtn_timer_sub(ebtn_time_t time1, ebtn_time_t time2)
{
    return time1 - time2;
}

// 测试时间溢出错误
// #define ebtn_timer_sub(time1, time2) (time1 - time2)

/**
 * \brief           按键事件函数回调原型
 * \param[in]       btn: 发生事件的数组中的按键实例
 * \param[in]       evt: 事件类型
 */
typedef void (*ebtn_evt_fn)(struct ebtn_btn *btn, ebtn_evt_t evt);

/**
 * \brief           获取按键/输入状态回调函数
 *
 * \param[in]       btn: 要读取状态的数组中的按键实例
 * \return          按键被认为是`激活`时返回`1`，否则返回`0`
 */
typedef uint8_t (*ebtn_get_state_fn)(struct ebtn_btn *btn);

/**
 * \brief           按键参数结构体
 */
typedef struct ebtn_btn_param
{
    /**
     * \brief           按下事件的最小消抖时间，单位为毫秒
     *
     * 这是输入应具有稳定激活电平以检测有效*按下*事件的时间。
     *
     * 当值设置为`> 0`时，输入必须处于激活状态至少
     * 最小毫秒时间，才能检测到有效的*按下*事件。
     *
     * \note            如果值设置为`0`，则不使用消抖，当输入状态变为*非激活*状态时，
     *                  *按下*事件将立即触发。
     *
     *                  为了安全地不使用此功能，外部逻辑必须确保输入电平的稳定转换。
     *
     */
    uint16_t time_debounce; /*!< 消抖时间，单位毫秒 */

    /**
     * \brief           释放事件的最小消抖时间，单位为毫秒
     *
     * 这是输入应具有最小稳定释放电平以检测有效*释放*事件的时间。
     *
     * 如果应用程序想要防止输入被认为是"激活"时线路上的不需要的毛刺，
     * 此设置可能很有用。
     *
     * 当值设置为`> 0`时，输入必须处于非激活低电平至少
     * 最小毫秒时间，才能检测到有效的*释放*事件
     *
     * \note            如果值设置为`0`，则不使用消抖，当输入状态变为*非激活*状态时，
     *                  *释放*事件将立即触发
     *
     */
    uint16_t time_debounce_release; /*!< 释放事件的消抖时间，单位毫秒 */

    /**
     * \brief           有效点击事件的最小激活输入时间，单位毫秒
     *
     * 输入应处于激活状态（消抖后）至少这么长时间，才能考虑
     * 潜在的有效点击事件。将值设置为`0`以禁用此功能
     *
     */
    uint16_t time_click_pressed_min; /*!< 有效点击事件的最小按下时间 */

    /**
     * \brief           有效点击事件的最大激活输入时间，单位毫秒
     *
     * 输入最多应按下这么长时间以仍然触发有效点击。
     * 设置为`-1`以允许任何时间触发点击事件。
     *
     * 当输入激活时间超过配置时间时，不检测点击事件并被忽略。
     *
     */
    uint16_t time_click_pressed_max; /*!< 有效点击事件的最大按下时间*/

    /**
     * \brief           最后一次释放和下一次有效按下之间允许的最大时间，
     *                  仍然允许多点击事件，单位毫秒
     *
     * 此值也用作超时长度，将*点击*事件从先前检测到的有效点击事件发送到应用程序。
     *
     * 如果应用程序依赖于多个连续点击，这是允许用户触发潜在新点击的最大时间，
     * 或者结构将被重置（如果到目前为止检测到任何点击，则在发送给用户之前）
     *
     */
    uint16_t time_click_multi_max; /*!< 被认为是连续点击的2次点击之间的最大时间 */

    /**
     * \brief           保活事件周期，单位毫秒
     *
     * 当输入激活时，保活事件将在此时间段内发送。
     * 第一个保活将在输入被认为激活后发送。
     *
     */
    uint16_t time_keepalive_period; /*!< 周期性保活事件的时间，单位毫秒 */

    /**
     * \brief           允许的最大连续点击事件数，
     *                  在结构重置为默认值之前。
     *
     * \note            当达到连续值时，应用程序将收到点击通知。
     *                  这可以在检测到最后一次点击后立即执行，或者在标准超时后执行
     *                  （除非已经检测到下一次按下，然后在有效的下一次按下事件之前发送给应用程序）。
     *
     */
    uint16_t max_consecutive; /*!< 最大连续点击数 */
} ebtn_btn_param_t;

#define EBTN_PARAMS_INIT(_time_debounce, _time_debounce_release, _time_click_pressed_min, _time_click_pressed_max, _time_click_multi_max,                      \
                         _time_keepalive_period, _max_consecutive)                                                                                             \
    {                                                                                                                                                          \
        .time_debounce = _time_debounce, .time_debounce_release = _time_debounce_release, .time_click_pressed_min = _time_click_pressed_min,                   \
        .time_click_pressed_max = _time_click_pressed_max, .time_click_multi_max = _time_click_multi_max, .time_keepalive_period = _time_keepalive_period,     \
        .max_consecutive = _max_consecutive                                                                                                                    \
    }

#define EBTN_BUTTON_INIT_RAW(_key_id, _param, _mask)                                                                                                           \
    {                                                                                                                                                          \
        .key_id = _key_id, .param = _param, .event_mask = _mask,                                                                                               \
    }

#define EBTN_BUTTON_INIT(_key_id, _param) EBTN_BUTTON_INIT_RAW(_key_id, _param, EBTN_EVT_MASK_ALL)

#define EBTN_BUTTON_DYN_INIT(_key_id, _param)                                                                                                                  \
    {                                                                                                                                                          \
        .next = NULL, .btn = EBTN_BUTTON_INIT(_key_id, _param),                                                                                                \
    }

#define EBTN_BUTTON_COMBO_INIT_RAW(_key_id, _param, _mask)                                                                                                     \
    {                                                                                                                                                          \
        .comb_key = {0}, .btn = EBTN_BUTTON_INIT_RAW(_key_id, _param, _mask),                                                                                  \
    }

#define EBTN_BUTTON_COMBO_INIT(_key_id, _param)                                                                                                                \
    {                                                                                                                                                          \
        .comb_key = {0}, .btn = EBTN_BUTTON_INIT(_key_id, _param),                                                                                             \
    }

#define EBTN_BUTTON_COMBO_DYN_INIT(_key_id, _param)                                                                                                            \
    {                                                                                                                                                          \
        .next = NULL, .btn = EBTN_BUTTON_COMBO_INIT(_key_id, _param),                                                                                          \
    }

#define EBTN_ARRAY_SIZE(_arr) sizeof(_arr) / sizeof((_arr)[0])

/**
 * \brief           按键结构体
 */
typedef struct ebtn_btn
{
    uint16_t key_id;    /*!< 用户定义的自定义参数，用于回调函数 */
    uint8_t flags;      /*!< 私有按键标志管理 */
    uint8_t event_mask; /*!< 私有按键事件掩码管理 */

    ebtn_time_t time_change;       /*!< 有效消抖后按键状态最后一次改变的时间，单位毫秒 */
    ebtn_time_t time_state_change; /*!< 按键状态最后一次改变的时间，单位毫秒 */

    ebtn_time_t keepalive_last_time; /*!< 最后一次发送保活事件的时间，单位毫秒 */
    ebtn_time_t click_last_time;     /*!< 最后一次成功检测到（未发送！）点击事件的时间，单位毫秒 */

    uint16_t keepalive_cnt; /*!< 成功按下检测后发送的保活事件数。释放后值重置 */
    uint16_t click_cnt;     /*!< 检测到的连续点击数，遵守点击之间的最大超时 */

    const ebtn_btn_param_t *param;
} ebtn_btn_t;

/**
 * \brief           组合按键结构体
 */
typedef struct ebtn_btn_combo
{
    BIT_ARRAY_DEFINE(comb_key, EBTN_MAX_KEYNUM); /*!< 选择键索引 - `1`表示激活，`0`表示非激活 */

    ebtn_btn_t btn;
} ebtn_btn_combo_t;

/**
 * \brief           动态按键结构体
 */
typedef struct ebtn_btn_dyn
{
    struct ebtn_btn_dyn *next; /*!< 指向下一个按键 */

    ebtn_btn_t btn;
} ebtn_btn_dyn_t;

/**
 * \brief           动态组合按键结构体
 */
typedef struct ebtn_btn_combo_dyn
{
    struct ebtn_btn_combo_dyn *next; /*!< 指向下一个组合按键 */

    ebtn_btn_combo_t btn;
} ebtn_btn_combo_dyn_t;

/**
 * \brief           easy_button组结构体
 */
typedef struct ebtn
{
    ebtn_btn_t *btns;             /*!< 指向按键数组的指针 */
    uint16_t btns_cnt;            /*!< 数组中的按键数量 */
    ebtn_btn_combo_t *btns_combo; /*!< 指向组合按键数组的指针 */
    uint16_t btns_combo_cnt;      /*!< 数组中的组合按键数量 */

    ebtn_btn_dyn_t *btn_dyn_head;             /*!< 指向动态按键链表的指针 */
    ebtn_btn_combo_dyn_t *btn_combo_dyn_head; /*!< 指向动态组合按键链表的指针 */

    ebtn_evt_fn evt_fn;             /*!< 指向事件函数的指针 */
    ebtn_get_state_fn get_state_fn; /*!< 指向获取状态函数的指针 */

    BIT_ARRAY_DEFINE(old_state, EBTN_MAX_KEYNUM); /*!< 旧按键状态 - `1`表示激活，`0`表示非激活 */
} ebtn_t;

/**
 * \brief           按键处理函数，读取输入并相应地执行操作
 *
 *
 * \param[in]       mstime: 当前系统时间，单位毫秒
 */
void ebtn_process(ebtn_time_t mstime);

/**
 * \brief           按键处理函数，使用所有按键输入状态
 *
 * \param[in]       curr_state: 当前所有按键输入状态
 * \param[in]       mstime: 当前系统时间，单位毫秒
 */
void ebtn_process_with_curr_state(bit_array_t *curr_state, ebtn_time_t mstime);

/**
 * \brief           检查按键是否激活
 * 当初始消抖周期已过时，认为是激活的。
 * 这是按下和释放事件之间的周期。
 *
 * \param[in]       btn: 要检查的按键句柄
 * \return          激活时返回`1`，否则返回`0`
 */
int ebtn_is_btn_active(const ebtn_btn_t *btn);

/**
 * \brief           检查按键是否在处理中
 * 用于低功耗处理，表示按键暂时空闲，嵌入式系统可以考虑进入深度睡眠。
 *
 * \param[in]       btn: 要检查的按键句柄
 * \return          处理中时返回`1`，否则返回`0`
 */
int ebtn_is_btn_in_process(const ebtn_btn_t *btn);

/**
 * \brief           检查是否有按键在处理中
 * 用于低功耗处理，表示按键暂时空闲，嵌入式系统可以考虑进入深度睡眠。
 *
 * \return          处理中时返回`1`，否则返回`0`
 */
int ebtn_is_in_process(void);

/**
 * \brief           初始化按键管理器
 * \param[in]       btns: 要处理的按键数组
 * \param[in]       btns_cnt: 要处理的按键数量
 * \param[in]       btns_combo: 要处理的组合按键数组
 * \param[in]       btns_combo_cnt: 要处理的组合按键数量
 * \param[in]       get_state_fn: 指向按需提供按键状态的函数的指针
 * \param[in]       evt_fn: 按键事件函数回调
 *
 * \return          成功时返回`1`，否则返回`0`
 */
int ebtn_init(ebtn_btn_t *btns, uint16_t btns_cnt, ebtn_btn_combo_t *btns_combo, uint16_t btns_combo_cnt, ebtn_get_state_fn get_state_fn, ebtn_evt_fn evt_fn);

/**
 * @brief 注册动态按键
 *
 * @param button: 动态按键结构体实例
 * \return          成功时返回`1`，否则返回`0`
 */
int ebtn_register(ebtn_btn_dyn_t *button);

/**
 * \brief           注册动态组合按键
 * \param[in]       button: 动态组合按键结构体实例
 *
 * \return          成功时返回`1`，否则返回`0`
 */
int ebtn_combo_register(ebtn_btn_combo_dyn_t *button);

/**
 * \brief           获取当前总按键数量
 *
 * \return          按键的大小
 */
int ebtn_get_total_btn_cnt(void);

/**
 * \brief           获取key_id的内部key_idx
 * \param[in]       key_id: key_id
 *
 * \return          错误时返回'-1'，其他为key_idx
 */
int ebtn_get_btn_index_by_key_id(uint16_t key_id);

/**
 * \brief           获取key_id的内部按键实例，这里是按键实例，动态注册的也是获取其按键实例
 *
 * \param[in]       key_id: key_id
 *
 * \return          错误时返回'NULL'，其他为按键实例
 */
ebtn_btn_t *ebtn_get_btn_by_key_id(uint16_t key_id);

/**
 * \brief           获取按键的内部key_idx
 * \param[in]       btn: 按键
 *
 * \return          错误时返回'-1'，其他为key_idx
 */
int ebtn_get_btn_index_by_btn(ebtn_btn_t *btn);

/**
 * \brief           获取动态按键的内部key_idx
 * \param[in]       btn: 按键
 *
 * \return          错误时返回'-1'，其他为key_idx
 */
int ebtn_get_btn_index_by_btn_dyn(ebtn_btn_dyn_t *btn);

/**
 * \brief           使用key_idx绑定组合按键键
 * \param[in]       btn: 组合按键
 * \param[in]       idx: key_idx
 *
 */
void ebtn_combo_btn_add_btn_by_idx(ebtn_btn_combo_t *btn, int idx);

/**
 * \brief           使用key_idx移除组合按键键
 * \param[in]       btn: 组合按键
 * \param[in]       idx: key_idx
 *
 */
void ebtn_combo_btn_remove_btn_by_idx(ebtn_btn_combo_t *btn, int idx);

/**
 * \brief           使用key_id绑定组合按键键，确保key_id（按键）已经注册
 * \param[in]       btn: 组合按键
 * \param[in]       key_id: key_id
 *
 */
void ebtn_combo_btn_add_btn(ebtn_btn_combo_t *btn, uint16_t key_id);

/**
 * \brief           使用key_id移除组合按键键，确保key_id（按键）已经注册
 * \param[in]       btn: 组合按键
 * \param[in]       key_id: key_id
 *
 */
void ebtn_combo_btn_remove_btn(ebtn_btn_combo_t *btn, uint16_t key_id);

/**
 * \brief           获取特定按键的保活周期
 * \param[in]       btn: 要获取保活周期的按键实例
 * \return          保活周期，单位`毫秒`
 */
#define ebtn_keepalive_get_period(btn) ((btn)->time_keepalive_period)

/**
 * \brief           获取自上次按下事件以来的实际保活计数数量
 *                  如果按键未被按下，则设置为`0`
 * \param[in]       btn: 要获取保活周期的按键实例
 * \return          自按下事件以来的保活事件数量
 */
#define ebtn_keepalive_get_count(btn) ((btn)->keepalive_cnt)

/**
 * \brief           获取特定所需时间（毫秒）的保活计数数量
 *                  它将计算特定按键在达到请求时间之前应进行的保活滴答数量
 *
 * 函数的结果可以与\ref ebtn_keepalive_get_count一起使用，
 * 后者返回自按键上次按下事件以来的实际保活计数数量。
 *
 * \note            值始终是整数对齐的，粒度为一个保活时间周期
 * \note            实现为宏，因为当使用静态保活时，编译器可能会优化它
 *
 * \param[in]       btn: 用于检查的按键
 * \param[in]       ms_time: 用于计算保活计数数量的时间，单位毫秒
 * \return          保活计数数量
 */
#define ebtn_keepalive_get_count_for_time(btn, ms_time) ((ms_time) / ebtn_keepalive_get_period(btn))

/**
 * \brief           获取按键上连续点击事件的数量
 * \param[in]       btn: 要获取点击数量的按键实例
 * \return          按键上的连续点击数量
 */
#define ebtn_click_get_count(btn) ((btn)->click_cnt)

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* _EBTN_H */