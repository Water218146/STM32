/**
 * 导航和进度管理功能模块
 * 负责页面导航、进度跟踪、状态管理等功能
 */

class NavigationManager {
    constructor() {
        this.currentSection = null;
        this.sections = [];
        this.progressData = this.loadProgress();
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        this.init();
    }

    /**
     * 初始化导航管理器
     */
    init() {
        this.setupSections();
        this.setupEventListeners();
        this.setupProgressBar();
        this.setupSidebar();
        this.updateProgress();
        this.restoreScrollPosition();
        
        console.log('NavigationManager initialized');
    }

    /**
     * 设置章节信息
     */
    setupSections() {
        this.sections = [
            { id: 'layer-1', title: '第一层：电机驱动基础认知', subsections: ['1-1', '1-2', '1-3', '1-4'] },
            { id: 'layer-2', title: '第二层：编码器电机深度解析', subsections: ['2-1', '2-2', '2-3', '2-4', '2-5'] },
            { id: 'layer-3', title: '第三层：电机控制函数封装', subsections: ['3-1', '3-2', '3-3', '3-4', '3-5'] },
            { id: 'layer-4', title: '第四层：其他电机类型简介', subsections: ['4-1', '4-2', '4-3'] }
        ];
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 滚动事件监听
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 100));
        
        // 导航链接点击事件
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', this.handleNavClick.bind(this));
        });

        // 侧边栏控制
        this.setupSidebarControls();
        
        // 键盘导航
        document.addEventListener('keydown', this.handleKeyNavigation.bind(this));
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // 窗口大小变化
        window.addEventListener('resize', this.throttle(this.handleResize.bind(this), 250));
    }

    /**
     * 设置侧边栏控制
     */
    setupSidebarControls() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarClose = document.querySelector('.sidebar-close');
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');

        // 移动端菜单切换
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // 侧边栏关闭按钮
        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // 点击遮罩关闭侧边栏
        if (sidebar) {
            sidebar.addEventListener('click', (e) => {
                if (e.target === sidebar) {
                    this.closeSidebar();
                }
            });
        }

        // ESC键关闭侧边栏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
        });
    }

    /**
     * 设置进度条
     */
    setupProgressBar() {
        this.progressBar = document.querySelector('.progress-fill');
        this.progressPercentage = document.querySelector('.progress-percentage');
        
        if (!this.progressBar) {
            console.warn('Progress bar element not found');
        }
    }

    /**
     * 设置侧边栏
     */
    setupSidebar() {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) return;

        // 清空现有内容
        sidebarNav.innerHTML = '';

        // 生成导航项
        this.sections.forEach(section => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            
            link.href = `#${section.id}`;
            link.className = 'sidebar-link';
            link.dataset.layer = section.id.split('-')[1];
            link.textContent = section.title;
            
            li.appendChild(link);
            sidebarNav.appendChild(li);
        });
    }

    /**
     * 处理滚动事件
     */
    handleScroll() {
        if (this.isScrolling) return;
        
        this.updateCurrentSection();
        this.updateProgress();
        this.updateNavigationState();
        this.saveScrollPosition();
        this.toggleBackToTop();
    }

    /**
     * 更新当前章节
     */
    updateCurrentSection() {
        const scrollPosition = window.pageYOffset + 150; // 偏移量用于更好的用户体验
        let currentSection = null;

        this.sections.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + window.pageYOffset;
                
                if (scrollPosition >= elementTop) {
                    currentSection = section.id;
                }
            }
        });

        if (currentSection !== this.currentSection) {
            this.currentSection = currentSection;
            this.updateActiveNavigation();
        }
    }

    /**
     * 更新进度
     */
    updateProgress() {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const currentScroll = window.pageYOffset;
        const progress = Math.min((currentScroll / totalHeight) * 100, 100);

        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }

        if (this.progressPercentage) {
            this.progressPercentage.textContent = `${Math.round(progress)}%`;
        }

        // 更新学习进度数据
        this.updateLearningProgress();
    }

    /**
     * 更新学习进度
     */
    updateLearningProgress() {
        const completedSections = this.getCompletedSections();
        const totalSections = this.getTotalSections();
        const learningProgress = Math.round((completedSections / totalSections) * 100);

        // 更新进度数据
        this.progressData.learningProgress = learningProgress;
        this.progressData.completedSections = this.getCompletedSectionIds();
        this.progressData.lastVisited = new Date().toISOString();

        // 保存到本地存储
        this.saveProgress();
    }

    /**
     * 获取已完成的章节数
     */
    getCompletedSections() {
        let completed = 0;
        const viewportHeight = window.innerHeight;
        const scrollPosition = window.pageYOffset;

        this.sections.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + scrollPosition;
                const elementBottom = elementTop + element.offsetHeight;

                // 如果章节已经滚动过80%，认为已完成
                if (scrollPosition + viewportHeight >= elementTop + (element.offsetHeight * 0.8)) {
                    completed++;
                }
            }
        });

        return completed;
    }

    /**
     * 获取总章节数
     */
    getTotalSections() {
        return this.sections.length;
    }

    /**
     * 获取已完成章节的ID列表
     */
    getCompletedSectionIds() {
        const completed = [];
        const viewportHeight = window.innerHeight;
        const scrollPosition = window.pageYOffset;

        this.sections.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + scrollPosition;

                if (scrollPosition + viewportHeight >= elementTop + (element.offsetHeight * 0.8)) {
                    completed.push(section.id);
                }
            }
        });

        return completed;
    }

    /**
     * 更新导航状态
     */
    updateNavigationState() {
        // 更新头部导航
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${this.currentSection}`) {
                link.classList.add('active');
            }
        });

        // 更新侧边栏导航
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${this.currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    /**
     * 更新活动导航项
     */
    updateActiveNavigation() {
        // 移除所有活动状态
        document.querySelectorAll('.nav-link, .sidebar-link').forEach(link => {
            link.classList.remove('active');
        });

        // 添加当前章节的活动状态
        if (this.currentSection) {
            document.querySelectorAll(`a[href="#${this.currentSection}"]`).forEach(link => {
                link.classList.add('active');
            });
        }
    }    /**
     * 处理导航链接点击
     */
    handleNavClick(e) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        
        if (href && href.startsWith('#')) {
            const targetId = href.substring(1);
            this.scrollToSection(targetId);
            
            // 关闭移动端侧边栏
            if (window.innerWidth < 768) {
                this.closeSidebar();
            }
        }
    }

    /**
     * 平滑滚动到指定章节
     */
    scrollToSection(sectionId) {
        const targetElement = document.getElementById(sectionId);
        if (!targetElement) {
            console.warn(`Section ${sectionId} not found`);
            return;
        }

        this.isScrolling = true;
        
        // 计算目标位置（考虑固定头部的高度）
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const progressHeight = document.querySelector('.progress-container')?.offsetHeight || 0;
        const offset = headerHeight + progressHeight + 20; // 额外20px间距
        
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;

        // 平滑滚动
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });

        // 重置滚动标志
        setTimeout(() => {
            this.isScrolling = false;
        }, 1000);

        // 更新URL但不触发页面跳转
        if (history.pushState) {
            history.pushState(null, null, `#${sectionId}`);
        }
    }

    /**
     * 切换侧边栏显示状态
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            
            // 更新移动端菜单按钮状态
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) {
                const isOpen = sidebar.classList.contains('open');
                toggle.setAttribute('aria-expanded', isOpen);
            }
        }
    }

    /**
     * 关闭侧边栏
     */
    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            
            // 更新移动端菜单按钮状态
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /**
     * 处理键盘导航
     */
    handleKeyNavigation(e) {
        // 如果用户正在输入，不处理快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
            case 'k':
                e.preventDefault();
                this.navigateToPrevious();
                break;
            case 'ArrowDown':
            case 'j':
                e.preventDefault();
                this.navigateToNext();
                break;
            case 'Home':
                e.preventDefault();
                this.scrollToTop();
                break;
            case 'End':
                e.preventDefault();
                this.scrollToBottom();
                break;
            case 'Escape':
                this.closeSidebar();
                break;
        }
    }

    /**
     * 导航到上一个章节
     */
    navigateToPrevious() {
        const currentIndex = this.sections.findIndex(section => section.id === this.currentSection);
        if (currentIndex > 0) {
            this.scrollToSection(this.sections[currentIndex - 1].id);
        }
    }

    /**
     * 导航到下一个章节
     */
    navigateToNext() {
        const currentIndex = this.sections.findIndex(section => section.id === this.currentSection);
        if (currentIndex < this.sections.length - 1) {
            this.scrollToSection(this.sections[currentIndex + 1].id);
        }
    }

    /**
     * 滚动到页面顶部
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * 滚动到页面底部
     */
    scrollToBottom() {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }

    /**
     * 切换返回顶部按钮显示
     */
    toggleBackToTop() {
        const backToTopBtn = document.querySelector('.back-to-top');
        if (backToTopBtn) {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }
    }

    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // 页面变为可见时，更新进度
            this.updateProgress();
        } else {
            // 页面隐藏时，保存当前状态
            this.saveProgress();
            this.saveScrollPosition();
        }
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 如果窗口变大，自动关闭侧边栏
        if (window.innerWidth >= 768) {
            this.closeSidebar();
        }
        
        // 重新计算进度
        this.updateProgress();
    }

    /**
     * 加载进度数据
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('motor-learning-progress');
            return saved ? JSON.parse(saved) : {
                learningProgress: 0,
                completedSections: [],
                lastVisited: null,
                scrollPosition: 0
            };
        } catch (error) {
            console.warn('Failed to load progress data:', error);
            return {
                learningProgress: 0,
                completedSections: [],
                lastVisited: null,
                scrollPosition: 0
            };
        }
    }

    /**
     * 保存进度数据
     */
    saveProgress() {
        try {
            localStorage.setItem('motor-learning-progress', JSON.stringify(this.progressData));
        } catch (error) {
            console.warn('Failed to save progress data:', error);
        }
    }

    /**
     * 保存滚动位置
     */
    saveScrollPosition() {
        this.progressData.scrollPosition = window.pageYOffset;
        this.saveProgress();
    }

    /**
     * 恢复滚动位置
     */
    restoreScrollPosition() {
        // 只在页面刷新时恢复位置，不在首次访问时恢复
        if (this.progressData.scrollPosition && performance.navigation.type === 1) {
            setTimeout(() => {
                window.scrollTo(0, this.progressData.scrollPosition);
            }, 100);
        }
    }

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 获取学习统计信息
     */
    getStats() {
        return {
            totalSections: this.getTotalSections(),
            completedSections: this.getCompletedSections(),
            learningProgress: this.progressData.learningProgress,
            lastVisited: this.progressData.lastVisited,
            currentSection: this.currentSection
        };
    }

    /**
     * 重置进度
     */
    resetProgress() {
        this.progressData = {
            learningProgress: 0,
            completedSections: [],
            lastVisited: null,
            scrollPosition: 0
        };
        this.saveProgress();
        this.updateProgress();
        console.log('Progress reset');
    }

    /**
     * 销毁导航管理器
     */
    destroy() {
        // 移除事件监听器
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyNavigation);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        // 清理定时器
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        console.log('NavigationManager destroyed');
    }
}

// 全局函数，供HTML中的按钮调用
function scrollToSection(sectionId) {
    if (window.navigationManager) {
        window.navigationManager.scrollToSection(sectionId);
    }
}

// 页面加载完成后初始化导航管理器
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// 页面卸载前保存状态
window.addEventListener('beforeunload', () => {
    if (window.navigationManager) {
        window.navigationManager.saveProgress();
        window.navigationManager.saveScrollPosition();
    }
});

// 导出模块（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}