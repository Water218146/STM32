document.addEventListener('DOMContentLoaded', function() {
    // 导航链接切换
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('main > section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 更新导航链接状态
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // 获取目标部分
            const targetSection = this.getAttribute('data-section');
            
            // 隐藏所有部分
            sections.forEach(section => {
                section.classList.remove('section-active');
                section.classList.add('hidden');
            });
            
            // 显示目标部分
            if (targetSection === 'home') {
                document.getElementById('hero').classList.remove('hidden');
                document.getElementById('hero').classList.add('section-active');
            } else {
                document.getElementById(targetSection).classList.remove('hidden');
                document.getElementById(targetSection).classList.add('section-active');
                
                // 如果是性能对比部分，触发性能条动画
                if (targetSection === 'mcu-compare') {
                    triggerPerformanceAnimation();
                }
                
                // 如果是开发方式部分，初始化雷达图
                if (targetSection === 'dev-methods') {
                    initMethodsRadarChart();
                }
                
                // 如果是GD32与STM32对比部分，初始化价格性能图表
                if (targetSection === 'gd32-stm32') {
                    initPricePerformanceChart();
                }
            }
        });
    });
    
    // 滚动提示点击事件
    document.querySelector('.scroll-hint').addEventListener('click', function() {
        navLinks[1].click(); // 现在应该点击"命名规范"链接
    });
    
    // 命名方法标签切换
    const methodTabButtons = document.querySelectorAll('.method-tab-btn');
    const methodPanes = document.querySelectorAll('.method-pane');
    
    if (methodTabButtons.length > 0) {
        methodTabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 更新按钮状态
                methodTabButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // 显示对应内容
                const targetMethod = this.getAttribute('data-method');
                methodPanes.forEach(pane => pane.classList.remove('active'));
                
                document.getElementById(targetMethod + '-method').classList.add('active');
            });
        });
    }
    
    // 8051/STM32风格比较按钮
    const compareButtons = document.querySelectorAll('.compare-btn');
    const comparePanes = document.querySelectorAll('.compare-pane');
    
    if (compareButtons.length > 0) {
        compareButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 更新按钮状态
                compareButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // 显示对应内容
                const targetCompare = this.getAttribute('data-compare');
                comparePanes.forEach(pane => pane.classList.remove('active'));
                
                document.getElementById(targetCompare + '-style').classList.add('active');
            });
        });
    }
    
    // 拖放交互
    const variableDrags = document.querySelectorAll('.variable-drag');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    if (variableDrags.length > 0) {
        let draggedItem = null;
        
        variableDrags.forEach(item => {
            // 设置拖动开始事件
            item.addEventListener('dragstart', function(e) {
                draggedItem = this;
                setTimeout(() => {
                    this.classList.add('being-dragged');
                }, 0);
            });
            
            // 设置拖动结束事件
            item.addEventListener('dragend', function() {
                this.classList.remove('being-dragged');
            });
        });
        
        dropZones.forEach(zone => {
            // 拖动进入目标区域
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('active');
            });
            
            // 拖动离开目标区域
            zone.addEventListener('dragleave', function() {
                this.classList.remove('active');
            });
            
            // 拖动放置在目标区域
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('active');
                
                if (draggedItem) {
                    const acceptsType = this.getAttribute('data-accepts');
                    const itemType = draggedItem.getAttribute('data-type');
                    
                    // 检查是否放到正确的区域
                    if (acceptsType === itemType) {
                        // 如果该变量已经在变量容器中，就将其移除
                        if (draggedItem.parentNode.classList.contains('variables-container')) {
                            draggedItem.parentNode.removeChild(draggedItem);
                            this.querySelector('.zone-content').appendChild(draggedItem);
                        }
                        
                        // 检查是否所有变量都被正确分类
                        checkCompletion();
                    }
                }
            });
        });
        
        // 检查是否完成练习
        function checkCompletion() {
            const remainingVariables = document.querySelector('.variables-container').children.length;
            if (remainingVariables === 0) {
                document.querySelector('.result-message').classList.add('show');
            }
        }
    }
    
    // 开发方式标签切换
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 更新按钮状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应内容
            const targetTab = this.getAttribute('data-tab');
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            if (targetTab === 'register') {
                document.getElementById('register-tab').classList.add('active');
            } else if (targetTab === 'library') {
                document.getElementById('library-tab').classList.add('active');
            } else if (targetTab === 'hal') {
                document.getElementById('hal-tab').classList.add('active');
            }
        });
    });
    
    // 性能对比条动画
    function triggerPerformanceAnimation() {
        setTimeout(function() {
            const meterFills = document.querySelectorAll('.meter-fill');
            meterFills.forEach(fill => {
                const widthValue = fill.style.width;
                fill.style.width = '0';
                
                setTimeout(function() {
                    fill.style.width = widthValue;
                }, 300);
            });
        }, 500);
    }
    
    // 初始化雷达图
    function initMethodsRadarChart() {
        // 如果已经初始化过，则不再重复初始化
        if (window.methodsChart) return;
        
        const ctx = document.getElementById('methodsRadarChart').getContext('2d');
        
        window.methodsChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['开发效率', '代码体积', '可移植性', '性能', '易于学习'],
                datasets: [
                    {
                        label: '寄存器级',
                        data: [1, 5, 1, 5, 1],
                        backgroundColor: 'rgba(255, 149, 0, 0.2)',
                        borderColor: 'rgb(255, 149, 0)',
                        pointBackgroundColor: 'rgb(255, 149, 0)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(255, 149, 0)'
                    },
                    {
                        label: '标准库',
                        data: [3, 3, 3, 3, 3],
                        backgroundColor: 'rgba(90, 200, 250, 0.2)',
                        borderColor: 'rgb(90, 200, 250)',
                        pointBackgroundColor: 'rgb(90, 200, 250)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(90, 200, 250)'
                    },
                    {
                        label: 'HAL库',
                        data: [5, 1, 5, 2, 5],
                        backgroundColor: 'rgba(0, 113, 227, 0.2)',
                        borderColor: 'rgb(0, 113, 227)',
                        pointBackgroundColor: 'rgb(0, 113, 227)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(0, 113, 227)'
                    }
                ]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: "'Noto Sans SC', sans-serif",
                                size: 12
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                const valueLabels = ['很差', '较差', '一般', '较好', '很好'];
                                return `${label}: ${valueLabels[value-1]}`;
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 2
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
    
    // 初始化价格性能图表
    function initPricePerformanceChart() {
        // 如果已经初始化过，则不再重复初始化
        if (window.pricePerformanceChart) return;
        
        const ctx = document.getElementById('pricePerformanceChart').getContext('2d');
        
        window.pricePerformanceChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['性能', '价格', '可靠性', '生态系统', '供应稳定性', '技术支持'],
                datasets: [
                    {
                        label: 'STM32',
                        data: [90, 70, 95, 95, 75, 90],
                        backgroundColor: 'rgba(0, 102, 204, 0.2)',
                        borderColor: '#0066CC',
                        pointBackgroundColor: '#0066CC',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#0066CC'
                    },
                    {
                        label: 'GD32',
                        data: [85, 95, 85, 75, 95, 80],
                        backgroundColor: 'rgba(255, 69, 58, 0.2)',
                        borderColor: '#FF453A',
                        pointBackgroundColor: '#FF453A',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#FF453A'
                    }
                ]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            showLabelBackdrop: false,
                            font: {
                                size: 10
                            }
                        },
                        pointLabels: {
                            font: {
                                size: 12,
                                family: "'Noto Sans SC', sans-serif"
                            }
                        },
                        grid: {
                            circular: true
                        },
                        angleLines: {
                            display: true
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: "'Noto Sans SC', sans-serif",
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw + '/100';
                            }
                        },
                        titleFont: {
                            family: "'Noto Sans SC', sans-serif"
                        },
                        bodyFont: {
                            family: "'Noto Sans SC', sans-serif"
                        }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 2
                    }
                }
            }
        });
    }
    
    // 监听滚动事件，实现视差效果和元素淡入
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        
        // 为首页添加视差效果
        if (document.getElementById('hero').classList.contains('section-active')) {
            document.querySelector('.hero-title').style.transform = `translateY(${scrollPosition * 0.2}px)`;
            document.querySelector('.hero-subtitle').style.transform = `translateY(${scrollPosition * 0.1}px)`;
        }
        
        // 添加元素淡入效果
        document.querySelectorAll('.feature-card, .comparison-card, .code-example, .method-info, .tip-card').forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight * 0.85) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    });
    
    // 寄存器动画
    document.querySelectorAll('.register-bits .bit').forEach((bit, index) => {
        setTimeout(() => {
            bit.classList.add('show');
        }, index * 100);
    });
    
    // 为所有卡片添加初始状态
    document.querySelectorAll('.feature-card, .comparison-card, .code-example, .method-info, .tip-card').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // 初始触发性能条动画
    triggerPerformanceAnimation();
    
    // 数据类型表格解释按钮
    const explainBtn = document.querySelector('.explain-btn');
    if (explainBtn) {
        explainBtn.addEventListener('click', function() {
            const explainContent = document.querySelector('.explain-content');
            explainContent.classList.toggle('show');
            this.textContent = explainContent.classList.contains('show') ? '隐藏解释' : '为何STM32支持更多类型？';
        });
    }
}); 