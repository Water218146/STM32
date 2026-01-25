# -*- coding: utf-8 -*-
"""
堆栈原理图示生成脚本
用于生成 STM32 堆栈概念的可视化图表
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

def create_memory_layout():
    """创建内存布局图"""
    fig, ax = plt.subplots(1, 1, figsize=(10, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # 标题
    ax.text(5, 9.5, 'STM32F051 RAM 内存布局 (8KB)',
            fontsize=16, ha='center', fontweight='bold')

    # 高地址标记
    ax.text(0.5, 8.7, '高地址\n0x20002000', fontsize=10, va='center')

    # 栈区域
    stack_box = FancyBboxPatch((2, 6.5), 6, 2,
                               boxstyle="round,pad=0.1",
                               facecolor='#FF6B6B', edgecolor='#C92A2A', linewidth=2)
    ax.add_patch(stack_box)
    ax.text(5, 7.8, '栈 (Stack)', fontsize=14, ha='center', fontweight='bold', color='white')
    ax.text(5, 7.3, '局部变量、函数参数、返回地址', fontsize=11, ha='center', color='white')
    ax.text(8.5, 7.5, '↓ 生长方向', fontsize=10, ha='center', color='#C92A2A')

    # 空闲区域
    free_box = FancyBboxPatch((2, 4), 6, 2.3,
                              boxstyle="round,pad=0.1",
                              facecolor='#E9ECEF', edgecolor='#ADB5BD', linewidth=1)
    ax.add_patch(free_box)
    ax.text(5, 5.15, '空闲区域', fontsize=12, ha='center', color='#6C757D')

    # 堆区域
    heap_box = FancyBboxPatch((2, 1.5), 6, 2.2,
                              boxstyle="round,pad=0.1",
                              facecolor='#4DABF7', edgecolor='#1864AB', linewidth=2)
    ax.add_patch(heap_box)
    ax.text(5, 2.5, '堆 (Heap)', fontsize=14, ha='center', fontweight='bold', color='white')
    ax.text(5, 2, '动态内存分配 (malloc/free)', fontsize=11, ha='center', color='white')
    ax.text(8.5, 2.6, '↑ 生长方向', fontsize=10, ha='center', color='#1864AB')

    # 低地址标记
    ax.text(0.5, 2.3, '低地址\n0x20000000', fontsize=10, va='center')

    # 栈顶指针
    ax.annotate('', xy=(2, 6.5), xytext=(1.2, 6.5),
                arrowprops=dict(arrowstyle='->', lw=2, color='#C92A2A'))
    ax.text(1.1, 6.2, 'SP\n栈顶', fontsize=10, ha='center', color='#C92A2A', fontweight='bold')

    plt.tight_layout()
    plt.savefig('D:/AAAWaterCode/Distributed_IO/disteributed_io/docs/memory_layout.png',
                dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print('[OK] Memory layout diagram generated')

def create_stack_frame():
    """创建栈帧图"""
    fig, ax = plt.subplots(1, 1, figsize=(10, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.text(5, 9.5, '函数调用时的栈帧结构',
            fontsize=16, ha='center', fontweight='bold')

    # 绘制栈帧
    frames = [
        ('返回地址', 8.5, '#FFD93D'),
        ('参数 a = 5', 7.8, '#6BCB77'),
        ('参数 b = 3', 7.1, '#6BCB77'),
        ('局部变量 c = 10', 6.4, '#4D96FF'),
        ('数组 buf[20]', 5.7, '#FF6B6B'),
    ]

    for name, y, color in frames:
        box = FancyBboxPatch((3, y-0.3), 4, 0.6,
                            boxstyle="round,pad=0.05",
                            facecolor=color, edgecolor='black', linewidth=1.5, alpha=0.8)
        ax.add_patch(box)
        ax.text(5, y, name, fontsize=12, ha='center', va='center', fontweight='bold')

    # 栈顶指针
    ax.annotate('', xy=(3, 5.4), xytext=(2.2, 5.4),
                arrowprops=dict(arrowstyle='->', lw=2.5, color='#E63946'))
    ax.text(2.1, 5.8, 'SP\n栈顶指针', fontsize=11, ha='center', color='#E63946', fontweight='bold')

    # 函数调用说明
    ax.text(8, 7.5, 'func(5, 3)', fontsize=12, ha='center',
            bbox=dict(boxstyle='round', facecolor='#F8F9FA', edgecolor='gray'))

    plt.tight_layout()
    plt.savefig('D:/AAAWaterCode/Distributed_IO/disteributed_io/docs/stack_frame.png',
                dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print('[OK] Stack frame diagram generated')

def create_comparison():
    """创建堆栈对比图"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 8))

    for ax in [ax1, ax2]:
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.axis('off')

    # 栈图
    ax1.text(5, 9.5, '栈', fontsize=16, ha='center', fontweight='bold')

    stack_items = [
        ('main() 函数', 8.5, '#FF6B6B'),
        ('func1() 调用', 7.2, '#4ECDC4'),
        ('  func2() 调用', 5.9, '#45B7D1'),
        ('    func3() 调用', 4.6, '#96CEB4'),
    ]

    for name, y, color in stack_items:
        box = FancyBboxPatch((1, y-0.35), 8, 0.7,
                            boxstyle="round,pad=0.05",
                            facecolor=color, edgecolor='black', linewidth=1, alpha=0.8)
        ax1.add_patch(box)
        ax1.text(5, y, name, fontsize=11, ha='center', va='center', fontweight='bold')

    ax1.text(5, 3, '后进先出 (LIFO)', fontsize=12, ha='center',
            bbox=dict(boxstyle='round', facecolor='#FFE66D', edgecolor='#FF6B6B', linewidth=2))
    ax1.text(5, 2, '← 最先调用的函数在最下面', fontsize=10, ha='center', color='#666')

    # 堆图
    ax2.text(5, 9.5, '堆', fontsize=16, ha='center', fontweight='bold')

    class HeapItem:
        def __init__(self, name, y, color, freed=False):
            self.name = name
            self.y = y
            self.color = color
            self.freed = freed

    heap_items = [
        HeapItem('malloc(100B)', 7.5, '#A8E6CF'),
        HeapItem('malloc(200B)', 6.2, '#DCEDC1'),
        HeapItem('malloc(50B) → free()', 4.9, '#FFD3B6', True),
        HeapItem('malloc(300B)', 3.6, '#FFAAA5'),
        HeapItem('malloc(150B)', 2.3, '#FF8B94'),
    ]

    for item in heap_items:
        name, y, color, freed = item.name, item.y, item.color, item.freed
        box = FancyBboxPatch((1, y-0.35), 8, 0.7,
                            boxstyle="round,pad=0.05",
                            facecolor=color, edgecolor='black', linewidth=1, alpha=0.4 if freed else 0.9)
        ax2.add_patch(box)
        ax2.text(5, y, name, fontsize=11, ha='center', va='center',
                fontweight='bold', alpha=0.5 if freed else 1)

    ax2.text(5, 1, '手动管理，顺序不固定', fontsize=11, ha='center',
            bbox=dict(boxstyle='round', facecolor='#FFE66D', edgecolor='#4DABF7', linewidth=2))

    plt.tight_layout()
    plt.savefig('D:/AAAWaterCode/Distributed_IO/disteributed_io/docs/stack_heap_comparison.png',
                dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print('[OK] Stack/Heap comparison diagram generated')

def create_overflow():
    """创建栈溢出示意图"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 8))

    for ax in [ax1, ax2]:
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.axis('off')

    # 正常情况
    ax1.text(5, 9.5, '正常栈使用', fontsize=16, ha='center', fontweight='bold')

    # 栈边界
    ax1.add_patch(patches.Rectangle((2, 1.5), 6, 7.5,
                                   facecolor='none', edgecolor='#28A745', linewidth=3))
    ax1.text(8.5, 5.25, '栈边界', fontsize=10, ha='center', color='#28A745', rotation=90)

    # 正常栈帧
    for i, y in enumerate([8, 7, 6, 5]):
        box = FancyBboxPatch((2.5, y-0.3), 5, 0.6,
                            boxstyle="round,pad=0.05",
                            facecolor='#4ECDC4', edgecolor='black', linewidth=1, alpha=0.8)
        ax1.add_patch(box)
        ax1.text(5, y, f'函数调用 {i+1}', fontsize=10, ha='center', va='center')

    ax1.text(5, 4, f'栈使用: 4/8 帧', fontsize=12, ha='center',
            bbox=dict(boxstyle='round', facecolor='#D4EDDA', edgecolor='#28A745'))

    # 栈溢出
    ax2.text(5, 9.5, '栈溢出！', fontsize=16, ha='center', fontweight='bold', color='#DC3545')

    # 栈边界
    ax2.add_patch(patches.Rectangle((2, 1.5), 6, 7.5,
                                   facecolor='none', edgecolor='#DC3545', linewidth=3))
    ax2.text(8.5, 5.25, '栈边界', fontsize=10, ha='center', color='#DC3545', rotation=90)

    # 溢出的栈帧
    for i, (y, color) in enumerate([(8, '#4ECDC4'), (7, '#4ECDC4'), (6, '#4ECDC4'),
                                     (5, '#4ECDC4'), (4, '#FFD93D'), (3, '#FF6B6B'), (2, '#DC3545')]):
        box = FancyBboxPatch((2.5, y-0.3), 5, 0.6,
                            boxstyle="round,pad=0.05",
                            facecolor=color, edgecolor='black', linewidth=1, alpha=0.8)
        ax2.add_patch(box)
        if y >= 4:
            ax2.text(5, y, f'函数调用 {i+1}', fontsize=10, ha='center', va='center')
        else:
            ax2.text(5, y, '💥 溢出!', fontsize=10, ha='center', va='center', fontweight='bold')

    ax2.text(5, 1.2, '⚠️ 超出栈边界 → 程序崩溃', fontsize=11, ha='center', color='#DC3545',
            bbox=dict(boxstyle='round', facecolor='#F8D7DA', edgecolor='#DC3545', linewidth=2))

    plt.tight_layout()
    plt.savefig('D:/AAAWaterCode/Distributed_IO/disteributed_io/docs/stack_overflow.png',
                dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print('[OK] Stack overflow diagram generated')

def create_table():
    """创建对比表格图"""
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    ax.axis('off')

    ax.text(0.5, 0.95, '栈 vs 堆 详细对比', fontsize=18, ha='center',
            transform=ax.transAxes, fontweight='bold')

    table_data = [
        ['对比项', '栈', '堆'],
        ['分配方式', '自动（编译器）', '手动'],
        ['生长方向', '高地址 → 低地址 ⬇', '低地址 → 高地址 ⬆'],
        ['分配速度', '⭐⭐⭐⭐⭐ 很快', '⭐⭐⭐ 较慢'],
        ['空间大小', '小（通常 1-4KB）', '大（剩余 RAM）'],
        ['生命周期', '作用域结束自动释放', '必须手动 free()'],
        ['典型用途', '局部变量、函数调用', '动态数据结构'],
        ['主要风险', '栈溢出', '内存泄漏、碎片化'],
        ['管理复杂度', '✓ 简单', '⚠️ 复杂'],
    ]

    table = ax.table(cellText=table_data, cellLoc='center', loc='center',
                     colWidths=[0.15, 0.4, 0.4])
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1, 2.5)

    # 设置表头样式
    for i in range(3):
        table[(0, i)].set_facecolor('#343A40')
        table[(0, i)].set_text_props(color='white', fontweight='bold')

    # 设置列样式
    for i in range(1, len(table_data)):
        table[(i, 0)].set_facecolor('#F8F9FA')
        table[(i, 1)].set_facecolor('#FFE3E3')  # 栈 - 浅红
        table[(i, 2)].set_facecolor('#E3F2FD')  # 堆 - 浅蓝

    plt.tight_layout()
    plt.savefig('D:/AAAWaterCode/Distributed_IO/disteributed_io/docs/comparison_table.png',
                dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print('[OK] Comparison table diagram generated')

def create_code_example():
    """创建代码示例图"""
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    ax.axis('off')

    ax.text(0.5, 0.95, '代码示例：栈和堆的使用', fontsize=16, ha='center',
            transform=ax.transAxes, fontweight='bold')

    code = '''void example()
{
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 栈上的变量（自动管理）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    int a = 10;              // ← 栈
    char buf[100];           // ← 栈

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 堆上的变量（手动管理）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    int *p = (int*)malloc(sizeof(int));  // ← 堆
    *p = 20;

    // 使用完毕
    free(p);    // ⚠️ 必须释放！否则内存泄漏

    // a 和 buf 自动释放，无需手动处理
}'''

    ax.text(0.1, 0.7, code, fontsize=10, family='monospace', va='top',
            transform=ax.transAxes,
            bbox=dict(boxstyle='round', facecolor='#F8F9FA',
                     edgecolor='#DEE2E6', linewidth=2, pad=1))

    # 栈内存图
    ax.text(0.25, 0.35, '栈布局:', fontsize=11, fontweight='bold',
            transform=ax.transAxes)
    ax.add_patch(patches.Rectangle((0.05, 0.18), 0.35, 0.15,
                                   transform=ax.transAxes,
                                   facecolor='#FFD3B6', edgecolor='black', linewidth=1))
    ax.text(0.225, 0.28, 'buf[100]', ha='center', va='center', fontsize=9,
            transform=ax.transAxes, fontweight='bold')
    ax.text(0.225, 0.23, 'a = 10', ha='center', va='center', fontsize=9,
            transform=ax.transAxes, fontweight='bold')

    # 堆内存图
    ax.text(0.75, 0.35, '堆布局:', fontsize=11, fontweight='bold',
            transform=ax.transAxes, ha='center')
    ax.add_patch(patches.Rectangle((0.6, 0.18), 0.3, 0.15,
                                   transform=ax.transAxes,
                                   facecolor='#A8E6CF', edgecolor='black', linewidth=1))
    ax.text(0.75, 0.255, '*p = 20', ha='center', va='center', fontsize=9,
            transform=ax.transAxes, fontweight='bold')
    ax.text(0.75, 0.23, '(malloc分配)', ha='center', va='center', fontsize=8,
            transform=ax.transAxes, color='#666')

    # 箭头
    ax.annotate('', xy=(0.6, 0.255), xytext=(0.4, 0.23),
                arrowprops=dict(arrowstyle='->', lw=2, color='#E63946'),
                transform=ax.transAxes)
    ax.text(0.5, 0.2, 'p 指针', ha='center', fontsize=9, color='#E63946',
            transform=ax.transAxes, fontweight='bold')

    plt.tight_layout()
    plt.savefig('D:/AAAWaterCode/Distributed_IO/disteributed_io/docs/code_example.png',
                dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    print('[OK] Code example diagram generated')

if __name__ == '__main__':
    print('Starting to generate Stack/Heap diagrams...')
    print()

    create_memory_layout()
    create_stack_frame()
    create_comparison()
    create_overflow()
    create_table()
    create_code_example()

    print()
    print('=' * 50)
    print('[OK] All diagrams generated to docs directory!')
    print('=' * 50)
