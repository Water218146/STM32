#ifndef _BIT_ARRAY_H_
#define _BIT_ARRAY_H_

#include <stdint.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

// #define BIT_ARRAY_CONFIG_64

// 如果你的系统是64位，这里可以改为uint64_t
#ifdef BIT_ARRAY_CONFIG_64
typedef uint64_t bit_array_t;
#define BIT_ARRAY_BIT(n) (1ULL << (n))
#else
typedef uint32_t bit_array_t;
#define BIT_ARRAY_BIT(n) (1UL << (n))
#endif
typedef bit_array_t bit_array_val_t;

#define BIT_ARRAY_BITS (sizeof(bit_array_val_t) * 8)

#define BIT_ARRAY_BIT_WORD(bit)  ((bit) / BIT_ARRAY_BITS)
#define BIT_ARRAY_BIT_INDEX(bit) ((bit_array_val_t)(bit) & (BIT_ARRAY_BITS - 1U))

#define BIT_ARRAY_MASK(bit)       BIT_ARRAY_BIT(BIT_ARRAY_BIT_INDEX(bit))
#define BIT_ARRAY_ELEM(addr, bit) ((addr)[BIT_ARRAY_BIT_WORD(bit)])

// 全为1的字
#define BIT_ARRAY_WORD_MAX (~(bit_array_val_t)0)

#define BIT_ARRAY_SUB_MASK(nbits) ((nbits) ? BIT_ARRAY_WORD_MAX >> (BIT_ARRAY_BITS - (nbits)) : (bit_array_val_t)0)

// 一种可能更快的方法来用掩码组合两个字
// #define bitmask_merge(a,b,abits) ((a & abits) | (b & ~abits))
#define bitmask_merge(a, b, abits) (b ^ ((a ^ b) & abits))

/**
 * @brief 此宏计算表示具有@a num_bits位的位图所需的位数组变量数量
 *
 * @param num_bits 位数
 */
#define BIT_ARRAY_BITMAP_SIZE(num_bits) (1 + ((num_bits)-1) / BIT_ARRAY_BITS)

/**
 * @brief 定义位数组变量的数组
 *
 * 此宏定义一个包含至少@a num_bits位的位数组变量数组
 *
 * @note
 * 如果从文件作用域使用，数组的位被初始化为零；
 * 如果从函数内使用，位保持未初始化状态
 *
 * @cond INTERNAL_HIDDEN
 * @note
 * 此宏应在文档Doxyfile的PREDEFINED字段中复制
 * @endcond
 *
 * @param name 位数组变量数组的名称
 * @param num_bits 所需的位数
 */
#define BIT_ARRAY_DEFINE(name, num_bits) bit_array_t name[BIT_ARRAY_BITMAP_SIZE(num_bits)]

#if 1
// 参见 http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
static inline bit_array_val_t _windows_popcount(bit_array_val_t w)
{
    w = w - ((w >> 1) & (bit_array_val_t) ~(bit_array_val_t)0 / 3);
    w = (w & (bit_array_val_t) ~(bit_array_val_t)0 / 15 * 3) + ((w >> 2) & (bit_array_val_t) ~(bit_array_val_t)0 / 15 * 3);
    w = (w + (w >> 4)) & (bit_array_val_t) ~(bit_array_val_t)0 / 255 * 15;
    return (bit_array_val_t)(w * ((bit_array_val_t) ~(bit_array_val_t)0 / 255)) >> (sizeof(bit_array_val_t) - 1) * 8;
}

#define POPCOUNT(x) _windows_popcount(x)
#else
#define POPCOUNT(x) (unsigned)__builtin_popcountll(x)
#endif

#define bits_in_top_word(nbits) ((nbits) ? BIT_ARRAY_BIT_INDEX((nbits)-1) + 1 : 0)

static inline void _bit_array_mask_top_word(bit_array_t *target, int num_bits)
{
    // 掩码顶部字
    int num_of_words = BIT_ARRAY_BITMAP_SIZE(num_bits);
    int bits_active = bits_in_top_word(num_bits);
    target[num_of_words - 1] &= BIT_ARRAY_SUB_MASK(bits_active);
}

/**
 * @brief 位数组测试一个位
 *
 * 此例程测试@a target的第@a bit位是否被设置
 *
 * @param target 位数组变量或数组的地址
 * @param bit 位号（从0开始）
 *
 * @return 如果位被设置则返回true，否则返回false
 */
static inline int bit_array_get(const bit_array_t *target, int bit)
{
    bit_array_val_t val = BIT_ARRAY_ELEM(target, bit);

    return (1 & (val >> (bit & (BIT_ARRAY_BITS - 1)))) != 0;
}

/**
 * @brief 位数组清除一个位
 *
 * 位数组清除@a target的第@a bit位
 *
 * @param target 位数组变量或数组的地址
 * @param bit 位号（从0开始）
 */
static inline void bit_array_clear(bit_array_t *target, int bit)
{
    bit_array_val_t mask = BIT_ARRAY_MASK(bit);

    BIT_ARRAY_ELEM(target, bit) &= ~mask;
}

/**
 * @brief 位数组设置一个位
 *
 * 位数组设置@a target的第@a bit位
 *
 * @param target 位数组变量或数组的地址
 * @param bit 位号（从0开始）
 */
static inline void bit_array_set(bit_array_t *target, int bit)
{
    bit_array_val_t mask = BIT_ARRAY_MASK(bit);

    BIT_ARRAY_ELEM(target, bit) |= mask;
}

/**
 * @brief 位数组切换一个位
 *
 * 位数组切换@a target的第@a bit位
 *
 * @param target 位数组变量或数组的地址
 * @param bit 位号（从0开始）
 */
static inline void bit_array_toggle(bit_array_t *target, int bit)
{
    bit_array_val_t mask = BIT_ARRAY_MASK(bit);

    BIT_ARRAY_ELEM(target, bit) ^= mask;
}

/**
 * @brief 位数组将一个位设置为给定值
 *
 * 位数组将@a target的第@a bit位设置为值@a val
 *
 * @param target 位数组变量或数组的地址
 * @param bit 位号（从0开始）
 * @param val true表示1，false表示0
 */
static inline void bit_array_assign(bit_array_t *target, int bit, int val)
{
    bit_array_val_t mask = BIT_ARRAY_MASK(bit);

    if (val)
    {
        BIT_ARRAY_ELEM(target, bit) |= mask;
    }
    else
    {
        BIT_ARRAY_ELEM(target, bit) &= ~mask;
    }
}

static inline void bit_array_clear_all(bit_array_t *target, int num_bits)
{
    memset((void *)target, 0, BIT_ARRAY_BITMAP_SIZE(num_bits) * sizeof(bit_array_val_t));
}

static inline void bit_array_set_all(bit_array_t *target, int num_bits)
{
    memset((void *)target, 0xff, BIT_ARRAY_BITMAP_SIZE(num_bits) * sizeof(bit_array_val_t));
    _bit_array_mask_top_word(target, num_bits);
}

static inline void bit_array_toggle_all(bit_array_t *target, int num_bits)
{
    for (int i = 0; i < BIT_ARRAY_BITMAP_SIZE(num_bits); i++)
    {
        target[i] ^= BIT_ARRAY_WORD_MAX;
    }
    _bit_array_mask_top_word(target, num_bits);
}

//
// 字符串和打印
//

// 从具有给定开启和关闭字符的子字符串构造BIT_ARRAY

// 从字符串方法
static inline void bit_array_from_str(bit_array_t *bitarr, const char *str)
{
    int i, index;
    int space = 0;
    int len = strlen(str);

    for (i = 0; i < len; i++)
    {
        index = i - space;
        if (strchr("1", str[i]) != NULL)
        {
            bit_array_set(bitarr, index);
        }
        else if (strchr("0", str[i]) != NULL)
        {
            bit_array_clear(bitarr, index);
        }
        else
        {
            // 错误
            space++;
        }
    }
}

// 接受一个要写入的字符数组。`str`的长度必须是bitarr->num_of_bits+1
// 用'\0'终止字符串
static inline char *bit_array_to_str(const bit_array_t *bitarr, int num_bits, char *str)
{
    int i;

    for (i = 0; i < num_bits; i++)
    {
        str[i] = bit_array_get(bitarr, i) ? '1' : '0';
    }

    str[num_bits] = '\0';

    return str;
}

// 接受一个要写入的字符数组。`str`的长度必须是bitarr->num_of_bits+1
// 用'\0'终止字符串
static inline char *bit_array_to_str_8(const bit_array_t *bitarr, int num_bits, char *str)
{
    int i;
    int space = 0;

    for (i = 0; i < num_bits; i++)
    {
        str[i + space] = bit_array_get(bitarr, i) ? '1' : '0';

        if ((i + 1) % 8 == 0)
        {
            space++;
            str[i + space] = ' ';
        }
    }

    str[num_bits + space] = '\0';

    return str;
}

//
// 获取和设置字（仅内部使用 -- 无边界检查）
//

static inline bit_array_val_t _bit_array_get_word(const bit_array_t *target, int num_bits, int start)
{
    int word_index = BIT_ARRAY_BIT_WORD(start);
    int word_offset = BIT_ARRAY_BIT_INDEX(start);

    bit_array_val_t result = target[word_index] >> word_offset;

    int bits_taken = BIT_ARRAY_BITS - word_offset;

    // word_offset现在是我们需要从下一个字获取的位数
    // 检查下一个字是否至少有一些位
    if (word_offset > 0 && start + bits_taken < num_bits)
    {
        result |= target[word_index + 1] << (BIT_ARRAY_BITS - word_offset);
    }

    return result;
}

// 从特定起始位置设置64位
// 不扩展位数组
static inline void _bit_array_set_word(bit_array_t *target, int num_bits, int start, bit_array_val_t word)
{
    int word_index = BIT_ARRAY_BIT_WORD(start);
    int word_offset = BIT_ARRAY_BIT_INDEX(start);

    if (word_offset == 0)
    {
        target[word_index] = word;
    }
    else
    {
        target[word_index] = (word << word_offset) | (target[word_index] & BIT_ARRAY_SUB_MASK(word_offset));

        if (word_index + 1 < BIT_ARRAY_BITMAP_SIZE(num_bits))
        {
            target[word_index + 1] = (word >> (BIT_ARRAY_BITS - word_offset)) | (target[word_index + 1] & (BIT_ARRAY_WORD_MAX << word_offset));
        }
    }

    // 掩码顶部字
    _bit_array_mask_top_word(target, num_bits);
}

//
// 填充区域（仅内部使用）
//

// FillAction是用0或1填充或切换
typedef enum
{
    ZERO_REGION,  // 零区域
    FILL_REGION,  // 填充区域
    SWAP_REGION   // 交换区域
} FillAction;

static inline void _bit_array_set_region(bit_array_t *target, int start, int length, FillAction action)
{
    if (length == 0)
        return;

    int first_word = BIT_ARRAY_BIT_WORD(start);
    int last_word = BIT_ARRAY_BIT_WORD(start + length - 1);
    int foffset = BIT_ARRAY_BIT_INDEX(start);
    int loffset = BIT_ARRAY_BIT_INDEX(start + length - 1);

    if (first_word == last_word)
    {
        bit_array_val_t mask = BIT_ARRAY_SUB_MASK(length) << foffset;

        switch (action)
        {
        case ZERO_REGION:
            target[first_word] &= ~mask;
            break;
        case FILL_REGION:
            target[first_word] |= mask;
            break;
        case SWAP_REGION:
            target[first_word] ^= mask;
            break;
        }
    }
    else
    {
        // 设置第一个字
        switch (action)
        {
        case ZERO_REGION:
            target[first_word] &= BIT_ARRAY_SUB_MASK(foffset);
            break;
        case FILL_REGION:
            target[first_word] |= ~BIT_ARRAY_SUB_MASK(foffset);
            break;
        case SWAP_REGION:
            target[first_word] ^= ~BIT_ARRAY_SUB_MASK(foffset);
            break;
        }

        int i;

        // 设置整个字
        switch (action)
        {
        case ZERO_REGION:
            for (i = first_word + 1; i < last_word; i++)
                target[i] = (bit_array_val_t)0;
            break;
        case FILL_REGION:
            for (i = first_word + 1; i < last_word; i++)
                target[i] = BIT_ARRAY_WORD_MAX;
            break;
        case SWAP_REGION:
            for (i = first_word + 1; i < last_word; i++)
                target[i] ^= BIT_ARRAY_WORD_MAX;
            break;
        }

        // 设置最后一个字
        switch (action)
        {
        case ZERO_REGION:
            target[last_word] &= ~BIT_ARRAY_SUB_MASK(loffset + 1);
            break;
        case FILL_REGION:
            target[last_word] |= BIT_ARRAY_SUB_MASK(loffset + 1);
            break;
        case SWAP_REGION:
            target[last_word] ^= BIT_ARRAY_SUB_MASK(loffset + 1);
            break;
        }
    }
}

// 获取设置的位数（汉明权重）
static inline int bit_array_num_bits_set(bit_array_t *target, int num_bits)
{
    int i;

    int num_of_bits_set = 0;

    for (i = 0; i < BIT_ARRAY_BITMAP_SIZE(num_bits); i++)
    {
        if (target[i] > 0)
        {
            num_of_bits_set += POPCOUNT(target[i]);
        }
    }

    return num_of_bits_set;
}

// 获取未设置的位数（1 - 汉明权重）
static inline int bit_array_num_bits_cleared(bit_array_t *target, int num_bits)
{
    return num_bits - bit_array_num_bits_set(target, num_bits);
}

// 从一个数组复制位到另一个数组
// 注意：使用宏bit_array_copy
// 目标和源可以是同一个bit_array，src/dst区域可以重叠
static inline void bit_array_copy(bit_array_t *dst, int dstindx, const bit_array_t *src, int srcindx, int length, int src_num_bits, int dst_num_bits)
{
    // 要复制的完整字数
    int num_of_full_words = length / BIT_ARRAY_BITS;
    int i;

    int bits_in_last_word = bits_in_top_word(length);

    if (dst == src && srcindx > dstindx)
    {
        // 从左到右工作
        for (i = 0; i < num_of_full_words; i++)
        {
            bit_array_val_t word = _bit_array_get_word(src, src_num_bits, srcindx + i * BIT_ARRAY_BITS);
            _bit_array_set_word(dst, dst_num_bits, dstindx + i * BIT_ARRAY_BITS, word);
        }

        if (bits_in_last_word > 0)
        {
            bit_array_val_t src_word = _bit_array_get_word(src, src_num_bits, srcindx + i * BIT_ARRAY_BITS);
            bit_array_val_t dst_word = _bit_array_get_word(dst, dst_num_bits, dstindx + i * BIT_ARRAY_BITS);

            bit_array_val_t mask = BIT_ARRAY_SUB_MASK(bits_in_last_word);
            bit_array_val_t word = bitmask_merge(src_word, dst_word, mask);

            _bit_array_set_word(dst, dst_num_bits, dstindx + num_of_full_words * BIT_ARRAY_BITS, word);
        }
    }
    else
    {
        // 从右到左工作
        for (i = 0; i < num_of_full_words; i++)
        {
            bit_array_val_t word = _bit_array_get_word(src, src_num_bits, srcindx + length - (i + 1) * BIT_ARRAY_BITS);
            _bit_array_set_word(dst, dst_num_bits, dstindx + length - (i + 1) * BIT_ARRAY_BITS, word);
        }

        if (bits_in_last_word > 0)
        {
            bit_array_val_t src_word = _bit_array_get_word(src, src_num_bits, srcindx);
            bit_array_val_t dst_word = _bit_array_get_word(dst, dst_num_bits, dstindx);

            bit_array_val_t mask = BIT_ARRAY_SUB_MASK(bits_in_last_word);
            bit_array_val_t word = bitmask_merge(src_word, dst_word, mask);
            _bit_array_set_word(dst, dst_num_bits, dstindx, word);
        }
    }

    _bit_array_mask_top_word(dst, dst_num_bits);
}

// 将src的所有内容复制到dst。dst被调整大小以匹配src
static inline void bit_array_copy_all(bit_array_t *dst, const bit_array_t *src, int num_bits)
{
    for (int i = 0; i < BIT_ARRAY_BITMAP_SIZE(num_bits); i++)
    {
        dst[i] = src[i];
    }
}

//
// 逻辑运算符
//

// 目标可以与一个或两个源相同
static inline void bit_array_and(bit_array_t *dest, const bit_array_t *src1, const bit_array_t *src2, int num_bits)
{
    for (int i = 0; i < BIT_ARRAY_BITMAP_SIZE(num_bits); i++)
    {
        dest[i] = src1[i] & src2[i];
    }
}

static inline void bit_array_or(bit_array_t *dest, const bit_array_t *src1, const bit_array_t *src2, int num_bits)
{
    for (int i = 0; i < BIT_ARRAY_BITMAP_SIZE(num_bits); i++)
    {
        dest[i] = src1[i] | src2[i];
    }
}

static inline void bit_array_xor(bit_array_t *dest, const bit_array_t *src1, const bit_array_t *src2, int num_bits)
{
    for (int i = 0; i < BIT_ARRAY_BITMAP_SIZE(num_bits); i++)
    {
        dest[i] = src1[i] ^ src2[i];
    }
}

static inline void bit_array_not(bit_array_t *dest, const bit_array_t *src, int num_bits)
{
    for (int i = 0; i < BIT_ARRAY_BITMAP_SIZE(num_bits); i++)
    {
        dest[i] = ~src[i];
    }
}

//
// 左/右移位数组。如果fill为零，用0填充，否则用1填充
//

// 向LSB/较低索引移位
static inline void bit_array_shift_right(bit_array_t *target, int num_bits, int shift_dist, int fill)
{
    if (shift_dist >= num_bits)
    {
        fill ? bit_array_set_all(target, num_bits) : bit_array_clear_all(target, num_bits);
        return;
    }
    else if (shift_dist == 0)
    {
        return;
    }

    FillAction action = fill ? FILL_REGION : ZERO_REGION;

    int cpy_length = num_bits - shift_dist;
    bit_array_copy(target, 0, target, shift_dist, cpy_length, num_bits, num_bits);

    _bit_array_set_region(target, cpy_length, shift_dist, action);
}

// 向MSB/较高索引移位
static inline void bit_array_shift_left(bit_array_t *target, int num_bits, int shift_dist, int fill)
{
    if (shift_dist >= num_bits)
    {
        fill ? bit_array_set_all(target, num_bits) : bit_array_clear_all(target, num_bits);
        return;
    }
    else if (shift_dist == 0)
    {
        return;
    }

    FillAction action = fill ? FILL_REGION : ZERO_REGION;

    int cpy_length = num_bits - shift_dist;
    bit_array_copy(target, shift_dist, target, 0, cpy_length, num_bits, num_bits);
    _bit_array_set_region(target, 0, shift_dist, action);
}

//
// 比较
//

// 按存储的值比较两个位数组，索引0为最低有效位（LSB）。
// 数组必须具有相同的长度。
// 返回：
//  >0 当且仅当 bitarr1 > bitarr2
//   0 当且仅当 bitarr1 == bitarr2
//  <0 当且仅当 bitarr1 < bitarr2
static inline int bit_array_cmp(const bit_array_t *bitarr1, const bit_array_t *bitarr2, int num_bits)
{
    return memcmp(bitarr1, bitarr2, BIT_ARRAY_BITMAP_SIZE(num_bits) * sizeof(bit_array_val_t));
}

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* _BIT_ARRAY_H_ */