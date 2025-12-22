/**
 * 主要交互功能和动画效果模块
 * 负责手风琴、懒加载、模态框、动画等功能
 */

class InteractionManager {
    constructor() {
        this.accordions = [];
        this.lazyImages = [];
        this.modals = [];
        this.observers = {};
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * 初始化交互管理器
     */
    init() {
        if (this.isInitialized) return;
        
        this.setupAccordions();
        this.setupLazyLoading();
        this.setupModals();
        this.setupScrollAnimations();
        this.setupBackToTop();
        this.setupTooltips();
        this.setupTouchGestures();
        this.setupKeyboardShortcuts();
        
        this.isInitialized = true;
        console.log('InteractionManager initialized');
    }

    /**
     * 设置手风琴功能 - 增强版
     */
    setupAccordions() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');

        accordionHeaders.forEach(header => {
            header.addEventListener('click', this.handleAccordionClick.bind(this));

            // 添加键盘支持
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleAccordionClick(e);
                }
            });

            // 设置初始状态
            const content = header.nextElementSibling;
            if (content && content.classList.contains('accordion-content')) {
                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                this.setAccordionState(header, content, isExpanded, false);

                // 添加内容观察器，用于动画
                this.observeContentAnimation(content);
            }
        });
        
        console.log(`Initialized ${accordionHeaders.length} accordions`);
    }

    /**
     * 处理手风琴点击事件
     */
    handleAccordionClick(e) {
        e.preventDefault();
        
        const header = e.currentTarget;
        const content = header.nextElementSibling;
        
        if (!content || !content.classList.contains('accordion-content')) {
            return;
        }
        
        const isExpanded = header.getAttribute('aria-expanded') === 'true';
        this.toggleAccordion(header, content, !isExpanded);
        
        // 可选：关闭同级其他手风琴（手风琴组模式）
        if (header.dataset.group) {
            this.closeOtherAccordions(header);
        }
    }

    /**
     * 切换手风琴状态
     */
    toggleAccordion(header, content, expand) {
        this.setAccordionState(header, content, expand, true);
        
        // 如果展开，滚动到视图中
        if (expand) {
            setTimeout(() => {
                this.scrollIntoViewIfNeeded(header);
            }, 300);
        }
    }

    /**
     * 设置手风琴状态
     */
    setAccordionState(header, content, expand, animate = true) {
        // 更新ARIA属性
        header.setAttribute('aria-expanded', expand);
        content.setAttribute('aria-hidden', !expand);
        
        // 更新切换图标
        const toggle = header.querySelector('.accordion-toggle');
        if (toggle) {
            toggle.textContent = expand ? '−' : '+';
        }
        
        if (animate) {
            // 动画展开/收起
            if (expand) {
                content.style.maxHeight = content.scrollHeight + 'px';
                Utils.addClass(content, 'expanding');
                
                setTimeout(() => {
                    Utils.removeClass(content, 'expanding');
                }, 300);
            } else {
                content.style.maxHeight = '0px';
                Utils.addClass(content, 'collapsing');
                
                setTimeout(() => {
                    Utils.removeClass(content, 'collapsing');
                }, 300);
            }
        } else {
            // 直接设置状态
            content.style.maxHeight = expand ? content.scrollHeight + 'px' : '0px';
        }
    }

    /**
     * 关闭同组其他手风琴
     */
    closeOtherAccordions(currentHeader) {
        const group = currentHeader.dataset.group;
        const groupHeaders = document.querySelectorAll(`[data-group="${group}"]`);
        
        groupHeaders.forEach(header => {
            if (header !== currentHeader) {
                const content = header.nextElementSibling;
                if (content && content.classList.contains('accordion-content')) {
                    this.setAccordionState(header, content, false, true);
                }
            }
        });
    }

    /**
     * 设置懒加载
     */
    setupLazyLoading() {
        // 图片懒加载
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            this.observers.lazyImages = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observers.lazyImages.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
            
            lazyImages.forEach(img => {
                this.observers.lazyImages.observe(img);
            });
        } else {
            // 降级处理：直接加载所有图片
            lazyImages.forEach(img => this.loadImage(img));
        }
        
        console.log(`Setup lazy loading for ${lazyImages.length} images`);
    }

    /**
     * 加载图片
     */
    loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;
        
        // 创建新图片对象预加载
        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            img.src = src;
            img.removeAttribute('data-src');
            Utils.addClass(img, 'loaded');
        };
        
        imageLoader.onerror = () => {
            Utils.addClass(img, 'error');
            console.warn('Failed to load image:', src);
        };
        
        imageLoader.src = src;
    }

    /**
     * 设置模态框
     */
    setupModals() {
        const modalTriggers = document.querySelectorAll('[data-modal]');
        const modals = document.querySelectorAll('.modal');
        
        // 设置触发器
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = trigger.dataset.modal;
                this.openModal(modalId);
            });
        });
        
        // 设置模态框
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            const overlay = modal;
            
            // 关闭按钮
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            }
            
            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        console.log(`Setup ${modals.length} modals`);
    }

    /**
     * 打开模态框
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // 防止页面滚动
        document.body.style.overflow = 'hidden';
        
        // 显示模态框
        modal.classList.add('show');
        
        // 焦点管理
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        // 触发自定义事件
        modal.dispatchEvent(new CustomEvent('modal:open'));
    }

    /**
     * 关闭模态框
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.classList.remove('show');
        
        // 恢复页面滚动
        document.body.style.overflow = '';
        
        // 触发自定义事件
        modal.dispatchEvent(new CustomEvent('modal:close'));
    }

    /**
     * 关闭所有模态框
     */
    closeAllModals() {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            this.closeModal(modal.id);
        });
    }    /**
     * 设置滚动动画
     */
    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.fade-in, .slide-in-right, [data-animate]');
        
        if ('IntersectionObserver' in window) {
            this.observers.scrollAnimations = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.triggerAnimation(entry.target);
                        // 一次性动画，观察后即移除
                        this.observers.scrollAnimations.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '0px 0px -100px 0px',
                threshold: 0.1
            });
            
            animatedElements.forEach(element => {
                this.observers.scrollAnimations.observe(element);
            });
        } else {
            // 降级处理：直接触发所有动画
            animatedElements.forEach(element => this.triggerAnimation(element));
        }
        
        console.log(`Setup scroll animations for ${animatedElements.length} elements`);
    }

    /**
     * 触发动画
     */
    triggerAnimation(element) {
        const animationType = element.dataset.animate || 'fade-in';
        const delay = parseInt(element.dataset.delay) || 0;
        
        setTimeout(() => {
            Utils.addClass(element, 'animated');
            Utils.addClass(element, animationType);
        }, delay);
    }

    /**
     * 设置返回顶部功能
     */
    setupBackToTop() {
        const backToTopBtn = document.querySelector('.back-to-top');
        if (!backToTopBtn) return;
        
        // 点击事件
        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToTop();
        });
        
        // 滚动显示/隐藏
        const toggleVisibility = Utils.throttle(() => {
            if (window.pageYOffset > 300) {
                Utils.addClass(backToTopBtn, 'visible');
            } else {
                Utils.removeClass(backToTopBtn, 'visible');
            }
        }, 100);
        
        window.addEventListener('scroll', toggleVisibility);
        
        console.log('Setup back to top button');
    }

    /**
     * 滚动到顶部
     */
    scrollToTop() {
        Utils.smoothScrollTo(0, 500);
    }

    /**
     * 设置工具提示
     */
    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            const tooltipText = element.dataset.tooltip;
            if (!tooltipText) return;
            
            // 创建工具提示元素
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip-content';
            tooltip.textContent = tooltipText;
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
            
            element.appendChild(tooltip);
            
            // 鼠标事件
            element.addEventListener('mouseenter', () => {
                this.showTooltip(tooltip);
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideTooltip(tooltip);
            });
            
            // 键盘事件（可访问性）
            element.addEventListener('focus', () => {
                this.showTooltip(tooltip);
            });
            
            element.addEventListener('blur', () => {
                this.hideTooltip(tooltip);
            });
        });
        
        console.log(`Setup ${tooltipElements.length} tooltips`);
    }

    /**
     * 显示工具提示
     */
    showTooltip(tooltip) {
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip(tooltip) {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
    }

    /**
     * 设置触摸手势
     */
    setupTouchGestures() {
        if (!Utils.isTouchDevice()) return;
        
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        }, { passive: true });
        
        const handleSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 50;
            
            // 水平滑动
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // 向右滑动
                    this.handleSwipeRight();
                } else {
                    // 向左滑动
                    this.handleSwipeLeft();
                }
            }
            
            // 垂直滑动
            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    // 向下滑动
                    this.handleSwipeDown();
                } else {
                    // 向上滑动
                    this.handleSwipeUp();
                }
            }
        };
        
        this.handleSwipe = handleSwipe;
        
        console.log('Setup touch gestures');
    }

    /**
     * 处理向右滑动
     */
    handleSwipeRight() {
        // 可以用于打开侧边栏等
        if (window.navigationManager) {
            window.navigationManager.toggleSidebar();
        }
    }

    /**
     * 处理向左滑动
     */
    handleSwipeLeft() {
        // 可以用于关闭侧边栏等
        if (window.navigationManager) {
            window.navigationManager.closeSidebar();
        }
    }

    /**
     * 处理向上滑动
     */
    handleSwipeUp() {
        // 可以用于快速滚动到下一章节
        // 这里暂时不实现，避免与正常滚动冲突
    }

    /**
     * 处理向下滑动
     */
    handleSwipeDown() {
        // 可以用于快速滚动到上一章节
        // 这里暂时不实现，避免与正常滚动冲突
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 如果用户正在输入，不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // 检查修饰键
            const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
            
            switch (e.key) {
                case '?':
                    if (!hasModifier) {
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                    }
                    break;
                case 'Enter':
                case ' ':
                    // 激活焦点元素
                    if (document.activeElement && document.activeElement.click) {
                        e.preventDefault();
                        document.activeElement.click();
                    }
                    break;
                case 'Tab':
                    // Tab导航增强
                    this.handleTabNavigation(e);
                    break;
            }
        });
        
        console.log('Setup keyboard shortcuts');
    }

    /**
     * 显示键盘快捷键帮助
     */
    showKeyboardShortcuts() {
        const shortcuts = [
            { key: '↑/k', description: '上一章节' },
            { key: '↓/j', description: '下一章节' },
            { key: 'Home', description: '回到顶部' },
            { key: 'End', description: '跳到底部' },
            { key: 'Esc', description: '关闭弹窗/侧边栏' },
            { key: '?', description: '显示快捷键帮助' }
        ];
        
        // 这里可以显示一个模态框或提示
        console.log('Keyboard shortcuts:', shortcuts);
        
        // 简单的alert实现，实际项目中应该用更好的UI
        const shortcutText = shortcuts.map(s => `${s.key}: ${s.description}`).join('\n');
        alert('键盘快捷键:\n\n' + shortcutText);
    }

    /**
     * 处理Tab导航
     */
    handleTabNavigation(e) {
        // 获取所有可聚焦元素
        const focusableElements = document.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );
        
        const focusableArray = Array.from(focusableElements);
        const currentIndex = focusableArray.indexOf(document.activeElement);
        
        // 如果在模态框中，限制焦点在模态框内
        const activeModal = document.querySelector('.modal.show');
        if (activeModal) {
            const modalFocusable = activeModal.querySelectorAll(
                'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
            );
            
            if (modalFocusable.length > 0) {
                const modalArray = Array.from(modalFocusable);
                const modalIndex = modalArray.indexOf(document.activeElement);
                
                if (e.shiftKey) {
                    // Shift+Tab: 向前
                    const prevIndex = modalIndex <= 0 ? modalArray.length - 1 : modalIndex - 1;
                    modalArray[prevIndex].focus();
                } else {
                    // Tab: 向后
                    const nextIndex = modalIndex >= modalArray.length - 1 ? 0 : modalIndex + 1;
                    modalArray[nextIndex].focus();
                }
                
                e.preventDefault();
            }
        }
    }

    /**
     * 滚动到视图中（如果需要）
     */
    scrollIntoViewIfNeeded(element) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        
        if (!isVisible) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    /**
     * 添加加载状态
     */
    addLoadingState(element, text = '加载中...') {
        if (!element) return;
        
        element.classList.add('loading');
        element.setAttribute('aria-busy', 'true');
        
        // 添加加载指示器
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.setAttribute('aria-hidden', 'true');
        
        const loadingText = document.createElement('span');
        loadingText.textContent = text;
        loadingText.className = 'loading-text';
        
        element.appendChild(spinner);
        element.appendChild(loadingText);
    }

    /**
     * 移除加载状态
     */
    removeLoadingState(element) {
        if (!element) return;
        
        element.classList.remove('loading');
        element.removeAttribute('aria-busy');
        
        // 移除加载指示器
        const spinner = element.querySelector('.spinner');
        const loadingText = element.querySelector('.loading-text');
        
        if (spinner) spinner.remove();
        if (loadingText) loadingText.remove();
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * 销毁交互管理器
     */
    destroy() {
        // 清理观察器
        Object.values(this.observers).forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
        
        // 清理事件监听器
        // 注意：这里只是示例，实际项目中需要更完整的清理
        
        this.isInitialized = false;
        console.log('InteractionManager destroyed');
    }
}

// 页面加载完成后初始化交互管理器
document.addEventListener('DOMContentLoaded', () => {
    window.interactionManager = new InteractionManager();
});

// 页面卸载前清理
window.addEventListener('beforeunload', () => {
    if (window.interactionManager) {
        window.interactionManager.destroy();
    }
});

/**
 * 内容动画观察器
 */
InteractionManager.prototype.observeContentAnimation = function(content) {
    if (!content) return;

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 添加动画类
                entry.target.classList.add('show');

                // 为子元素添加延迟动画
                const children = entry.target.querySelectorAll('.analogy-card, .knowledge-card, .thinking-box, .code-example, .learning-outcome');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.style.animationDelay = `${index * 0.1}s`;
                        child.classList.add('animate-in');
                    }, index * 100);
                });
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });

    animationObserver.observe(content);
    this.observers.contentAnimation = animationObserver;
};

/**
 * 代码复制功能
 */
InteractionManager.prototype.setupCodeCopy = function() {
    const codeBlocks = document.querySelectorAll('.code-example');

    codeBlocks.forEach(block => {
        const header = block.querySelector('.code-header');
        if (!header) return;

        // 添加复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.innerHTML = '📋 复制';
        copyBtn.title = '复制代码';

        copyBtn.addEventListener('click', () => {
            const codeContent = block.querySelector('.code-content');
            if (codeContent) {
                navigator.clipboard.writeText(codeContent.textContent).then(() => {
                    copyBtn.innerHTML = '✅ 已复制';
                    setTimeout(() => {
                        copyBtn.innerHTML = '📋 复制';
                    }, 2000);
                }).catch(() => {
                    // 降级方案
                    const textArea = document.createElement('textarea');
                    textArea.value = codeContent.textContent;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);

                    copyBtn.innerHTML = '✅ 已复制';
                    setTimeout(() => {
                        copyBtn.innerHTML = '📋 复制';
                    }, 2000);
                });
            }
        });

        header.appendChild(copyBtn);
    });
};

/**
 * 学习进度跟踪
 */
InteractionManager.prototype.setupProgressTracking = function() {
    const sections = document.querySelectorAll('.accordion-item');
    const progressBar = document.querySelector('.progress-fill');

    if (!progressBar) return;

    let completedSections = 0;
    const totalSections = sections.length;

    sections.forEach(section => {
        const header = section.querySelector('.accordion-header');
        if (!header) return;

        header.addEventListener('click', () => {
            setTimeout(() => {
                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                const wasCompleted = section.classList.contains('completed');

                if (isExpanded && !wasCompleted) {
                    section.classList.add('completed');
                    completedSections++;
                    this.updateProgress(completedSections, totalSections);
                }
            }, 100);
        });
    });
};

/**
 * 更新学习进度
 */
InteractionManager.prototype.updateProgress = function(completed, total) {
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    if (progressBar) {
        const percentage = (completed / total) * 100;
        progressBar.style.width = `${percentage}%`;

        if (progressText) {
            progressText.textContent = `学习进度: ${completed}/${total} (${Math.round(percentage)}%)`;
        }

        // 进度达到100%时显示祝贺
        if (percentage === 100) {
            setTimeout(() => {
                this.showNotification('🎉 恭喜！您已完成所有学习内容！', 'success', 5000);
            }, 500);
        }
    }
};

/**
 * 设置思考题答案功能
 */
InteractionManager.prototype.setupThinkingAnswers = function() {
    const thinkingBoxes = document.querySelectorAll('.thinking-box');

    thinkingBoxes.forEach(box => {
        const toggleBtn = box.querySelector('.thinking-toggle-btn');
        const answer = box.querySelector('.thinking-answer');

        if (toggleBtn && answer) {
            toggleBtn.addEventListener('click', () => {
                const isVisible = answer.classList.contains('show');

                // 找到包含的手风琴内容容器
                const accordionContent = box.closest('.accordion-content');

                if (isVisible) {
                    answer.classList.remove('show');
                    toggleBtn.textContent = '查看答案';
                    toggleBtn.style.background = 'var(--info-color)';
                } else {
                    answer.classList.add('show');
                    toggleBtn.textContent = '隐藏答案';
                    toggleBtn.style.background = 'var(--success-color)';
                }

                // 动态调整手风琴容器高度
                if (accordionContent) {
                    setTimeout(() => {
                        const contentHeight = accordionContent.scrollHeight;
                        accordionContent.style.maxHeight = Math.max(contentHeight + 100, 2000) + 'px';
                    }, 50);
                }
            });
        }
    });
};

// 在初始化方法中添加新功能
const originalInit = InteractionManager.prototype.init;
InteractionManager.prototype.init = function() {
    originalInit.call(this);

    // 添加新的增强功能
    this.setupCodeCopy();
    this.setupProgressTracking();
    this.setupThinkingAnswers();
};

// 导出模块（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionManager;
}