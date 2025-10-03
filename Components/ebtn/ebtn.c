#include <string.h>
#include "ebtn.h"

#define EBTN_FLAG_ONPRESS_SENT ((uint8_t)0x01) /*!< 标志位表示按下事件已发送 */
#define EBTN_FLAG_IN_PROCESS   ((uint8_t)0x02) /*!< 标志位表示按键正在处理中 */

/* 默认按键组实例 */
static ebtn_t ebtn_default;

/**
 * \brief           处理按键信息和状态
 *
 * \param[in]       btn: 要处理的按键实例
 * \param[in]       old_state: 旧状态
 * \param[in]       new_state: 新状态
 * \param[in]       mstime: 当前毫秒系统时间
 */
static void prv_process_btn(ebtn_btn_t *btn, uint8_t old_state, uint8_t new_state, ebtn_time_t mstime)
{
    ebtn_t *ebtobj = &ebtn_default;

    /* 检查参数是否设置 */
    if (btn->param == NULL)
    {
        return;
    }

    /* 按键状态刚刚改变 */
    if (new_state != old_state)
    {
        btn->time_state_change = mstime;

        if (new_state)
        {
            btn->flags |= EBTN_FLAG_IN_PROCESS;
        }
    }
    /* 按键仍然被按下 */
    if (new_state)
    {
        /*
         * 处理消抖并发送按下事件
         *
         * 这是我们检测到有效按下的时候
         */
        if (!(btn->flags & EBTN_FLAG_ONPRESS_SENT))
        {
            /*
             * 当满足以下条件时运行if语句：
             *
             * - 运行时模式已启用 -> 用户为消抖设置自己的配置
             * - 按下的配置消抖时间大于 `0`
             */
            if (ebtn_timer_sub(mstime, btn->time_state_change) >= btn->param->time_debounce)
            {
                /*
                 * 检查多次点击限制是否达到
                 */
                if ((btn->click_cnt > 0) && (ebtn_timer_sub(mstime, btn->click_last_time) >= btn->param->time_click_multi_max))
                {
                    if (btn->event_mask & EBTN_EVT_MASK_ONCLICK)
                    {
                        ebtobj->evt_fn(btn, EBTN_EVT_ONCLICK);
                    }
                    btn->click_cnt = 0;
                }

                /* 设置保活时间 */
                btn->keepalive_last_time = mstime;
                btn->keepalive_cnt = 0;

                /* 开始新的按下事件 */
                btn->flags |= EBTN_FLAG_ONPRESS_SENT;
                if (btn->event_mask & EBTN_EVT_MASK_ONPRESS)
                {
                    ebtobj->evt_fn(btn, EBTN_EVT_ONPRESS);
                }

                btn->time_change = mstime; /* 按键状态现在已改变 */
            }
        }

        /*
         * 处理保活，但仅在按下事件已发送时
         *
         * 当检测到有效按下时发送保活
         */
        else
        {
            while ((btn->param->time_keepalive_period > 0) && (ebtn_timer_sub(mstime, btn->keepalive_last_time) >= btn->param->time_keepalive_period))
            {
                btn->keepalive_last_time += btn->param->time_keepalive_period;
                ++btn->keepalive_cnt;
                if (btn->event_mask & EBTN_EVT_MASK_KEEPALIVE)
                {
                    ebtobj->evt_fn(btn, EBTN_EVT_KEEPALIVE);
                }
            }

            // 场景1: 多次点击以长按结束，需要发送点击事件
            if ((btn->click_cnt > 0) && (ebtn_timer_sub(mstime, btn->time_change) > btn->param->time_click_pressed_max))
            {
                if (btn->event_mask & EBTN_EVT_MASK_ONCLICK)
                {
                    ebtobj->evt_fn(btn, EBTN_EVT_ONCLICK);
                }

                btn->click_cnt = 0;
            }
        }
    }
    /* 按键仍然被释放 */
    else
    {
        /*
         * 只有在按下事件已经开始时我们才需要响应
         *
         * 如果不是这种情况则什么都不做
         */
        if (btn->flags & EBTN_FLAG_ONPRESS_SENT)
        {
            /*
             * 当满足以下条件时运行if语句：
             *
             * - 运行时模式已启用 -> 用户为消抖设置自己的配置
             * - 释放的配置消抖时间大于 `0`
             */
            if (ebtn_timer_sub(mstime, btn->time_state_change) >= btn->param->time_debounce_release)
            {
                /* 处理释放事件 */
                btn->flags &= ~EBTN_FLAG_ONPRESS_SENT;
                if (btn->event_mask & EBTN_EVT_MASK_ONRELEASE)
                {
                    ebtobj->evt_fn(btn, EBTN_EVT_ONRELEASE);
                }

                /* 检查点击事件的时间有效性 */
                if (ebtn_timer_sub(mstime, btn->time_change) >= btn->param->time_click_pressed_min &&
                    ebtn_timer_sub(mstime, btn->time_change) <= btn->param->time_click_pressed_max)
                {
                    ++btn->click_cnt;

                    btn->click_last_time = mstime;
                }
                else
                {
                    // 场景2: 如果最后一次按下太短，而之前的点击序列是
                    // 正数，则向用户发送事件
                    if ((btn->click_cnt > 0) && (ebtn_timer_sub(mstime, btn->time_change) < btn->param->time_click_pressed_min))
                    {
                        if (btn->event_mask & EBTN_EVT_MASK_ONCLICK)
                        {
                            ebtobj->evt_fn(btn, EBTN_EVT_ONCLICK);
                        }
                    }
                    /*
                     * 有一个释放事件，但时间
                     * 用于点击事件检测超出了允许的窗口
                     *
                     * 重置点击计数器 -> 对于点击事件不是有效序列
                     */
                    btn->click_cnt = 0;
                }

                // 场景3: 如果达到最大连续点击次数，
                // 此部分将在释放事件后立即发送点击事件
                if ((btn->click_cnt > 0) && (btn->click_cnt == btn->param->max_consecutive))
                {
                    if (btn->event_mask & EBTN_EVT_MASK_ONCLICK)
                    {
                        ebtobj->evt_fn(btn, EBTN_EVT_ONCLICK);
                    }
                    btn->click_cnt = 0;
                }

                btn->time_change = mstime; /* 按键状态现在已改变 */
            }
        }
        else
        {
            /*
             * 根据配置，这部分代码
             * 将在一定超时后发送点击事件
             *
             * 如果用户更喜欢多点击功能，此功能很有用
             * 仅在最后一次点击事件发生后报告，
             * 包括用户进行的点击次数
             */
            if (btn->click_cnt > 0)
            {
                if (ebtn_timer_sub(mstime, btn->click_last_time) >= btn->param->time_click_multi_max)
                {
                    if (btn->event_mask & EBTN_EVT_MASK_ONCLICK)
                    {
                        ebtobj->evt_fn(btn, EBTN_EVT_ONCLICK);
                    }
                    btn->click_cnt = 0;
                }
            }
            else
            {
                // 检查按键是否在处理中
                if (btn->flags & EBTN_FLAG_IN_PROCESS)
                {
                    btn->flags &= ~EBTN_FLAG_IN_PROCESS;
                }
            }
        }
    }
}

/**
 * \brief           初始化ebtn按键处理库
 * 
 * \param[in]       btns: 按键配置数组指针
 *                      - 包含所有单个按键的配置信息
 *                      - 每个按键需要设置key_id、消抖时间、点击时间等参数
 *                      - 例如: ebtn_btn_t my_btns[] = {{.key_id=1, .time_debounce=20, ...}, ...}
 * 
 * \param[in]       btns_cnt: 按键数量
 *                      - 指定btns数组中有多少个按键
 *                      - 必须与实际数组大小匹配，避免越界访问
 * 
 * \param[in]       btns_combo: 组合键配置数组指针
 *                      - 定义多个按键同时按下的组合键功能
 *                      - 可以为NULL，表示不使用组合键功能
 *                      - 例如: Ctrl+C, Alt+Tab等组合按键
 * 
 * \param[in]       btns_combo_cnt: 组合键数量
 *                      - 指定btns_combo数组中有多少个组合键
 *                      - 如果btns_combo为NULL，此参数应为0
 * 
 * \param[in]       get_state_fn: 按键状态读取回调函数
 *                      - 用户必须实现的函数，用于读取硬件按键状态
 *                      - 函数原型: uint8_t (*)(ebtn_btn_t *btn)
 *                      - 返回值: 1表示按键按下，0表示按键释放
 *                      - 这是硬件抽象层，使库与具体芯片无关
 * 
 * \param[in]       evt_fn: 按键事件处理回调函数
 *                      - 用户必须实现的函数，用于处理按键事件
 *                      - 函数原型: void (*)(ebtn_btn_t *btn, ebtn_evt_t evt)
 *                      - 当检测到按键事件时会调用此函数通知应用层
 *                      - 事件类型包括: ONPRESS(按下)、ONRELEASE(释放)、ONCLICK(点击)等
 * 
 * \return          初始化结果
 *                      - 1: 初始化成功
 *                      - 0: 初始化失败(通常是因为必要的回调函数为NULL)
 * 
 * \note            此函数必须在使用ebtn库的其他功能之前调用
 *                  get_state_fn和evt_fn是必须的参数，不能为NULL
 */
int ebtn_init(ebtn_btn_t *btns, uint16_t btns_cnt, ebtn_btn_combo_t *btns_combo, uint16_t btns_combo_cnt, ebtn_get_state_fn get_state_fn, ebtn_evt_fn evt_fn)
{
    ebtn_t *ebtobj = &ebtn_default;

    if (evt_fn == NULL || get_state_fn == NULL /* 在仅回调模式下参数是必须的 */
    )
    {
        return 0;
    }

    memset(ebtobj, 0x00, sizeof(*ebtobj));
    ebtobj->btns = btns;
    ebtobj->btns_cnt = btns_cnt;
    ebtobj->btns_combo = btns_combo;
    ebtobj->btns_combo_cnt = btns_combo_cnt;
    ebtobj->evt_fn = evt_fn;
    ebtobj->get_state_fn = get_state_fn;

    return 1;
}

/**
 * \brief           使用get_state_fn获取所有按键状态
 *
 * \param[out]       state_array: 存储按键状态
 */
static void ebtn_get_current_state(bit_array_t *state_array)
{
    ebtn_t *ebtobj = &ebtn_default;
    ebtn_btn_dyn_t *target;
    int i;

    /* 处理所有按键 */
    for (i = 0; i < ebtobj->btns_cnt; ++i)
    {
        /* 获取按键状态 */
        uint8_t new_state = ebtobj->get_state_fn(&ebtobj->btns[i]);
        // 保存状态
        bit_array_assign(state_array, i, new_state);
    }

    for (target = ebtobj->btn_dyn_head, i = ebtobj->btns_cnt; target; target = target->next, i++)
    {
        /* 获取按键状态 */
        uint8_t new_state = ebtobj->get_state_fn(&target->btn);

        // 保存状态
        bit_array_assign(state_array, i, new_state);
    }
}

/**
 * \brief           处理按键状态
 *
 * \param[in]       btn: 要处理的按键实例
 * \param[in]       old_state: 所有按键的旧状态
 * \param[in]       curr_state: 所有按键的当前状态
 * \param[in]       idx: 按键内部key_idx
 * \param[in]       mstime: 当前毫秒系统时间
 */
static void ebtn_process_btn(ebtn_btn_t *btn, bit_array_t *old_state, bit_array_t *curr_state, int idx, ebtn_time_t mstime)
{
    prv_process_btn(btn, bit_array_get(old_state, idx), bit_array_get(curr_state, idx), mstime);
}

/**
 * \brief           处理组合按键状态
 *
 * \param[in]       btn: 要处理的按键实例
 * \param[in]       old_state: 所有按键的旧状态
 * \param[in]       curr_state: 所有按键的当前状态
 * \param[in]       comb_key: 组合键
 * \param[in]       mstime: 当前毫秒系统时间
 */
static void ebtn_process_btn_combo(ebtn_btn_t *btn, bit_array_t *old_state, bit_array_t *curr_state, bit_array_t *comb_key, ebtn_time_t mstime)
{
    BIT_ARRAY_DEFINE(tmp_data, EBTN_MAX_KEYNUM) = {0};

    if (bit_array_num_bits_set(comb_key, EBTN_MAX_KEYNUM) == 0)
    {
        return;
    }
    bit_array_and(tmp_data, curr_state, comb_key, EBTN_MAX_KEYNUM);
    uint8_t curr = bit_array_cmp(tmp_data, comb_key, EBTN_MAX_KEYNUM) == 0;

    bit_array_and(tmp_data, old_state, comb_key, EBTN_MAX_KEYNUM);
    uint8_t old = bit_array_cmp(tmp_data, comb_key, EBTN_MAX_KEYNUM) == 0;

    prv_process_btn(btn, old, curr, mstime);
}

void ebtn_process_with_curr_state(bit_array_t *curr_state, ebtn_time_t mstime)
{
    ebtn_t *ebtobj = &ebtn_default;
    ebtn_btn_dyn_t *target;
    ebtn_btn_combo_dyn_t *target_combo;
    int i;

    /* 处理所有按键 */
    for (i = 0; i < ebtobj->btns_cnt; ++i)
    {
        ebtn_process_btn(&ebtobj->btns[i], ebtobj->old_state, curr_state, i, mstime);
    }

    for (target = ebtobj->btn_dyn_head, i = ebtobj->btns_cnt; target; target = target->next, i++)
    {
        ebtn_process_btn(&target->btn, ebtobj->old_state, curr_state, i, mstime);
    }

    /* 处理所有组合按键 */
    for (i = 0; i < ebtobj->btns_combo_cnt; ++i)
    {
        ebtn_process_btn_combo(&ebtobj->btns_combo[i].btn, ebtobj->old_state, curr_state, ebtobj->btns_combo[i].comb_key, mstime);
    }

    for (target_combo = ebtobj->btn_combo_dyn_head; target_combo; target_combo = target_combo->next)
    {
        ebtn_process_btn_combo(&target_combo->btn.btn, ebtobj->old_state, curr_state, target_combo->btn.comb_key, mstime);
    }

    bit_array_copy_all(ebtobj->old_state, curr_state, EBTN_MAX_KEYNUM);
}

void ebtn_process(ebtn_time_t mstime)
{
    BIT_ARRAY_DEFINE(curr_state, EBTN_MAX_KEYNUM) = {0};

    // 获取当前状态
    ebtn_get_current_state(curr_state);

    ebtn_process_with_curr_state(curr_state, mstime);
}

int ebtn_get_total_btn_cnt(void)
{
    ebtn_t *ebtobj = &ebtn_default;
    int total_cnt = 0;
    ebtn_btn_dyn_t *curr = ebtobj->btn_dyn_head;

    total_cnt += ebtobj->btns_cnt;

    while (curr)
    {
        total_cnt++;
        curr = curr->next;
    }
    return total_cnt;
}

int ebtn_get_btn_index_by_key_id(uint16_t key_id)
{
    ebtn_t *ebtobj = &ebtn_default;
    int i = 0;
    ebtn_btn_dyn_t *target;

    for (i = 0; i < ebtobj->btns_cnt; ++i)
    {
        if (ebtobj->btns[i].key_id == key_id)
        {
            return i;
        }
    }

    for (target = ebtobj->btn_dyn_head, i = ebtobj->btns_cnt; target; target = target->next, i++)
    {
        if (target->btn.key_id == key_id)
        {
            return i;
        }
    }

    return -1;
}

ebtn_btn_t *ebtn_get_btn_by_key_id(uint16_t key_id)
{
    ebtn_t *ebtobj = &ebtn_default;
    int i = 0;
    ebtn_btn_dyn_t *target;

    for (i = 0; i < ebtobj->btns_cnt; ++i)
    {
        if (ebtobj->btns[i].key_id == key_id)
        {
            return &ebtobj->btns[i];
        }
    }

    for (target = ebtobj->btn_dyn_head, i = ebtobj->btns_cnt; target; target = target->next, i++)
    {
        if (target->btn.key_id == key_id)
        {
            return &target->btn;
        }
    }

    return NULL;
}

int ebtn_get_btn_index_by_btn(ebtn_btn_t *btn)
{
    return ebtn_get_btn_index_by_key_id(btn->key_id);
}

int ebtn_get_btn_index_by_btn_dyn(ebtn_btn_dyn_t *btn)
{
    return ebtn_get_btn_index_by_key_id(btn->btn.key_id);
}

void ebtn_combo_btn_add_btn_by_idx(ebtn_btn_combo_t *btn, int idx)
{
    bit_array_set(btn->comb_key, idx);
}

void ebtn_combo_btn_remove_btn_by_idx(ebtn_btn_combo_t *btn, int idx)
{
    bit_array_clear(btn->comb_key, idx);
}

void ebtn_combo_btn_add_btn(ebtn_btn_combo_t *btn, uint16_t key_id)
{
    int idx = ebtn_get_btn_index_by_key_id(key_id);
    if (idx < 0)
    {
        return;
    }
    ebtn_combo_btn_add_btn_by_idx(btn, idx);
}

void ebtn_combo_btn_remove_btn(ebtn_btn_combo_t *btn, uint16_t key_id)
{
    int idx = ebtn_get_btn_index_by_key_id(key_id);
    if (idx < 0)
    {
        return;
    }
    ebtn_combo_btn_remove_btn_by_idx(btn, idx);
}

int ebtn_is_btn_active(const ebtn_btn_t *btn)
{
    return btn != NULL && (btn->flags & EBTN_FLAG_ONPRESS_SENT);
}

int ebtn_is_btn_in_process(const ebtn_btn_t *btn)
{
    return btn != NULL && (btn->flags & EBTN_FLAG_IN_PROCESS);
}

int ebtn_is_in_process(void)
{
    ebtn_t *ebtobj = &ebtn_default;
    ebtn_btn_dyn_t *target;
    ebtn_btn_combo_dyn_t *target_combo;
    int i;

    /* 处理所有按键 */
    for (i = 0; i < ebtobj->btns_cnt; ++i)
    {
        if (ebtn_is_btn_in_process(&ebtobj->btns[i]))
        {
            return 1;
        }
    }

    for (target = ebtobj->btn_dyn_head, i = ebtobj->btns_cnt; target; target = target->next, i++)
    {
        if (ebtn_is_btn_in_process(&target->btn))
        {
            return 1;
        }
    }

    /* 处理所有组合按键 */
    for (i = 0; i < ebtobj->btns_combo_cnt; ++i)
    {
        if (ebtn_is_btn_in_process(&ebtobj->btns_combo[i].btn))
        {
            return 1;
        }
    }

    for (target_combo = ebtobj->btn_combo_dyn_head; target_combo; target_combo = target_combo->next)
    {
        if (ebtn_is_btn_in_process(&target_combo->btn.btn))
        {
            return 1;
        }
    }

    return 0;
}

int ebtn_register(ebtn_btn_dyn_t *button)
{
    ebtn_t *ebtobj = &ebtn_default;

    ebtn_btn_dyn_t *curr = ebtobj->btn_dyn_head;
    ebtn_btn_dyn_t *last = NULL;

    if (!button)
    {
        return 0;
    }

    if (ebtn_get_total_btn_cnt() >= EBTN_MAX_KEYNUM)
    {
        return 0; /* 达到最大数量 */
    }

    if (curr == NULL)
    {
        ebtobj->btn_dyn_head = button;
        return 1;
    }

    while (curr)
    {
        if (curr == button)
        {
            return 0; /* 已经存在 */
        }
        last = curr;
        curr = curr->next;
    }

    last->next = button;

    return 1;
}

int ebtn_combo_register(ebtn_btn_combo_dyn_t *button)
{
    ebtn_t *ebtobj = &ebtn_default;

    ebtn_btn_combo_dyn_t *curr = ebtobj->btn_combo_dyn_head;
    ebtn_btn_combo_dyn_t *last = NULL;

    if (!button)
    {
        return 0;
    }

    if (curr == NULL)
    {
        ebtobj->btn_combo_dyn_head = button;
        return 1;
    }

    while (curr)
    {
        if (curr == button)
        {
            return 0; /* 已经存在 */
        }
        last = curr;
        curr = curr->next;
    }

    last->next = button;

    return 1;
}