/**
 * 工具函数模块
 * 提供通用的工具函数和辅助方法
 */

const Utils = {
    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 节流时间间隔(ms)
     * @returns {Function} 节流后的函数
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
    },

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 防抖等待时间(ms)
     * @param {boolean} immediate - 是否立即执行
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * 检查元素是否在视口中
     * @param {Element} element - 要检查的元素
     * @param {number} threshold - 阈值(0-1)
     * @returns {boolean} 是否在视口中
     */
    isInViewport(element, threshold = 0) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        const vertInView = (rect.top <= windowHeight * (1 - threshold)) && 
                          ((rect.top + rect.height) >= windowHeight * threshold);
        const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);
        
        return vertInView && horInView;
    },

    /**
     * 平滑滚动到指定位置
     * @param {number} targetPosition - 目标位置
     * @param {number} duration - 动画持续时间(ms)
     * @param {Function} callback - 完成回调
     */
    smoothScrollTo(targetPosition, duration = 500, callback = null) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = Utils.easeInOutQuad(timeElapsed, startPosition, distance, duration);
            
            window.scrollTo(0, run);
            
            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            } else {
                if (callback) callback();
            }
        }
        
        requestAnimationFrame(animation);
    },

    /**
     * 缓动函数 - easeInOutQuad
     * @param {number} t - 当前时间
     * @param {number} b - 起始值
     * @param {number} c - 变化量
     * @param {number} d - 持续时间
     * @returns {number} 计算后的值
     */
    easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    },

    /**
     * 获取元素的偏移位置
     * @param {Element} element - 目标元素
     * @returns {Object} 包含top和left的对象
     */
    getOffset(element) {
        if (!element) return { top: 0, left: 0 };
        
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset
        };
    },

    /**
     * 添加CSS类名（支持动画）
     * @param {Element} element - 目标元素
     * @param {string} className - 类名
     * @param {number} delay - 延迟时间(ms)
     */
    addClass(element, className, delay = 0) {
        if (!element) return;
        
        if (delay > 0) {
            setTimeout(() => {
                element.classList.add(className);
            }, delay);
        } else {
            element.classList.add(className);
        }
    },

    /**
     * 移除CSS类名（支持动画）
     * @param {Element} element - 目标元素
     * @param {string} className - 类名
     * @param {number} delay - 延迟时间(ms)
     */
    removeClass(element, className, delay = 0) {
        if (!element) return;
        
        if (delay > 0) {
            setTimeout(() => {
                element.classList.remove(className);
            }, delay);
        } else {
            element.classList.remove(className);
        }
    },

    /**
     * 切换CSS类名
     * @param {Element} element - 目标元素
     * @param {string} className - 类名
     */
    toggleClass(element, className) {
        if (!element) return;
        element.classList.toggle(className);
    },

    /**
     * 检查是否支持某个CSS属性
     * @param {string} property - CSS属性名
     * @returns {boolean} 是否支持
     */
    supportsCSSProperty(property) {
        return property in document.documentElement.style;
    },

    /**
     * 检查是否为移动设备
     * @returns {boolean} 是否为移动设备
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * 检查是否为触摸设备
     * @returns {boolean} 是否为触摸设备
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /**
     * 获取随机ID
     * @param {number} length - ID长度
     * @returns {string} 随机ID
     */
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * 深度克隆对象
     * @param {any} obj - 要克隆的对象
     * @returns {any} 克隆后的对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    /**
     * 格式化日期
     * @param {Date} date - 日期对象
     * @param {string} format - 格式字符串
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!(date instanceof Date)) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },

    /**
     * 本地存储封装
     */
    storage: {
        /**
         * 设置本地存储
         * @param {string} key - 键名
         * @param {any} value - 值
         * @param {number} expiry - 过期时间(ms)
         */
        set(key, value, expiry = null) {
            try {
                const item = {
                    value: value,
                    timestamp: Date.now(),
                    expiry: expiry ? Date.now() + expiry : null
                };
                localStorage.setItem(key, JSON.stringify(item));
            } catch (error) {
                console.warn('Failed to set localStorage:', error);
            }
        },

        /**
         * 获取本地存储
         * @param {string} key - 键名
         * @param {any} defaultValue - 默认值
         * @returns {any} 存储的值
         */
        get(key, defaultValue = null) {
            try {
                const itemStr = localStorage.getItem(key);
                if (!itemStr) return defaultValue;
                
                const item = JSON.parse(itemStr);
                
                // 检查是否过期
                if (item.expiry && Date.now() > item.expiry) {
                    localStorage.removeItem(key);
                    return defaultValue;
                }
                
                return item.value;
            } catch (error) {
                console.warn('Failed to get localStorage:', error);
                return defaultValue;
            }
        },

        /**
         * 移除本地存储
         * @param {string} key - 键名
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn('Failed to remove localStorage:', error);
            }
        },

        /**
         * 清空本地存储
         */
        clear() {
            try {
                localStorage.clear();
            } catch (error) {
                console.warn('Failed to clear localStorage:', error);
            }
        }
    }
};

// 导出工具函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else if (typeof window !== 'undefined') {
    window.Utils = Utils;
}