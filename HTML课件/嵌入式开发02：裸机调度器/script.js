// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化导航和滚动监听
    initNavigation();
    // 初始化代码复制功能
    initCodeCopy();
    // 初始化结构体解释器
    initStructExplainer();
    // 初始化标签页
    initTabs();
    // 初始化展开按钮
    initExpandButtons();
    // 初始化模拟器
    initSimulator();
    // 初始化进度条
    initProgressBar();
    // 添加滚动到顶部按钮
    addScrollTopButton();
    // 初始化动画
    initAnimations();
    
    // 为所有代码块添加语法高亮
    highlightAllCode();
    
    // 初始化新的结构体基础部分的交互
    initStructConcept();
});

// 初始化导航和滚动监听
function initNavigation() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // 点击导航链接滚动到对应部分
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            // 移除所有激活状态
            navLinks.forEach(link => link.classList.remove('active'));
            
            // 添加当前链接激活状态
            this.classList.add('active');
            
            // 滚动到目标部分
            window.scrollTo({
                top: targetSection.offsetTop - 80,
                behavior: 'smooth'
            });
            
            // 激活目标部分
            sections.forEach(section => {
                if (section.id === targetId.substring(1)) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
    
    // 监听滚动事件，更新导航状态
    window.addEventListener('scroll', function() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
                // 确保该部分是可见的
                section.classList.add('active');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
    
    // 滚动动画，当部分进入视口时显示
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });
    
    sections.forEach(section => {
        observer.observe(section);
    });
}

// 初始化代码复制功能
function initCodeCopy() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const codeBlock = document.getElementById(targetId);
            const codeText = codeBlock.textContent;
            
            // 创建一个临时文本区域用于复制
            const textarea = document.createElement('textarea');
            textarea.value = codeText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            // 显示复制成功状态
            this.textContent = '已复制!';
            this.classList.add('copied');
            
            // 2秒后恢复按钮状态
            setTimeout(() => {
                this.textContent = '复制代码';
                this.classList.remove('copied');
            }, 2000);
        });
    });
}

// 初始化结构体解释器
function initStructExplainer() {
    const structItems = document.querySelectorAll('.struct-item');
    
    structItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有激活状态
            structItems.forEach(item => item.classList.remove('active'));
            
            // 添加当前项激活状态
            this.classList.add('active');
        });
    });
}

// 初始化标签页
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            const tabContainer = this.closest('.tabs');
            
            // 移除所有标签按钮和内容的激活状态
            tabContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tabContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // 添加当前标签按钮和内容的激活状态
            this.classList.add('active');
            tabContent.classList.add('active');
        });
    });
}

// 初始化展开按钮
function initExpandButtons() {
    const expandButtons = document.querySelectorAll('.expand-btn');
    
    expandButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const detailsElement = document.getElementById(`${targetId}-details`);
            
            if (detailsElement.style.display === 'block') {
                detailsElement.style.display = 'none';
                this.textContent = '了解更多';
            } else {
                detailsElement.style.display = 'block';
                this.textContent = '收起';
            }
        });
    });
}

// 初始化模拟器
function initSimulator() {
    // 模拟器元素
    const startButton = document.getElementById('start-sim');
    const pauseButton = document.getElementById('pause-sim');
    const resetButton = document.getElementById('reset-sim');
    const timeScaleInput = document.getElementById('time-scale');
    const scaleValue = document.getElementById('scale-value');
    const timeDisplay = document.getElementById('sim-time-value');
    const outputDisplay = document.getElementById('sim-output');
    const tasks = document.querySelectorAll('.sim-task');
    
    // 模拟器状态
    let isRunning = false;
    let simulationTime = 0;
    let timeScale = 10;
    let animationFrame;
    let lastTimestamp = 0;
    
    // 任务配置
    const taskConfigs = [
        { id: 'led', period: 1000, lastRun: 0, name: 'LED闪烁' },
        { id: 'key', period: 10, lastRun: 0, name: '按键扫描' },
        { id: 'sensor', period: 100, lastRun: 0, name: '传感器读取' },
        { id: 'comm', period: 50, lastRun: 0, name: '通信处理' }
    ];
    
    // 更新时间缩放显示
    timeScaleInput.addEventListener('input', function() {
        timeScale = parseInt(this.value);
        scaleValue.textContent = timeScale + 'x';
    });
    
    // 开始模拟
    startButton.addEventListener('click', function() {
        if (!isRunning) {
            isRunning = true;
            lastTimestamp = performance.now();
            animationFrame = requestAnimationFrame(updateSimulation);
            outputDisplay.innerHTML += '<div class="output-line">模拟启动...</div>';
            startButton.textContent = '继续';
        } else {
            outputDisplay.innerHTML += '<div class="output-line">模拟继续运行...</div>';
        }
    });
    
    // 暂停模拟
    pauseButton.addEventListener('click', function() {
        isRunning = false;
        cancelAnimationFrame(animationFrame);
        outputDisplay.innerHTML += '<div class="output-line">模拟暂停</div>';
    });
    
    // 重置模拟
    resetButton.addEventListener('click', function() {
        isRunning = false;
        cancelAnimationFrame(animationFrame);
        simulationTime = 0;
        timeDisplay.textContent = '0';
        taskConfigs.forEach(task => {
            task.lastRun = 0;
        });
        tasks.forEach(task => {
            const progressBar = task.querySelector('.progress-bar');
            const status = task.querySelector('.task-status');
            progressBar.style.width = '0%';
            status.textContent = '等待中';
        });
        outputDisplay.innerHTML = '<div class="output-line">模拟重置</div>';
    });
    
    // 更新模拟
    function updateSimulation(timestamp) {
        if (!isRunning) return;
        
        // 计算时间增量
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        
        // 更新模拟时间
        simulationTime += deltaTime * timeScale;
        timeDisplay.textContent = Math.floor(simulationTime);
        
        // 检查任务执行
        taskConfigs.forEach(task => {
            const taskElement = document.querySelector(`.sim-task[data-task="${task.id}"]`);
            const progressBar = taskElement.querySelector('.progress-bar');
            const status = taskElement.querySelector('.task-status');
            
            // 计算进度百分比
            const elapsedTime = simulationTime - task.lastRun;
            const progressPercent = Math.min(100, (elapsedTime / task.period) * 100);
            progressBar.style.width = progressPercent + '%';
            
            // 检查是否应该执行任务
            if (simulationTime >= task.lastRun + task.period) {
                task.lastRun = simulationTime;
                executeTask(task);
                status.textContent = '执行中';
                
                // 短暂闪烁效果
                taskElement.style.backgroundColor = 'rgba(0, 122, 255, 0.1)';
                setTimeout(() => {
                    taskElement.style.backgroundColor = '#f9f9f9';
                    status.textContent = '等待中';
                }, 300);
            }
        });
        
        // 继续动画循环
        animationFrame = requestAnimationFrame(updateSimulation);
    }
    
    // 执行任务
    function executeTask(task) {
        let output = '';
        
        switch (task.id) {
            case 'led':
                output = `[${Math.floor(simulationTime)}ms] LED状态切换`;
                break;
            case 'key':
                output = `[${Math.floor(simulationTime)}ms] 扫描按键状态`;
                break;
            case 'sensor':
                const sensorValue = Math.floor(Math.random() * 1000);
                output = `[${Math.floor(simulationTime)}ms] 读取传感器数据: ${sensorValue}`;
                break;
            case 'comm':
                output = `[${Math.floor(simulationTime)}ms] 处理通信数据`;
                break;
        }
        
        // 添加输出
        if (output) {
            outputDisplay.innerHTML += `<div class="output-line">${output}</div>`;
            // 自动滚动到底部
            outputDisplay.scrollTop = outputDisplay.scrollHeight;
        }
    }
}

// 初始化进度条
function initProgressBar() {
    const progressBar = document.querySelector('.progress-bar');
    
    window.addEventListener('scroll', function() {
        const windowHeight = window.innerHeight;
        const fullHeight = document.body.clientHeight;
        const scrolled = window.scrollY;
        
        const scrollPercent = (scrolled / (fullHeight - windowHeight)) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

// 添加滚动到顶部按钮
function addScrollTopButton() {
    // 创建按钮
    const scrollTopButton = document.createElement('div');
    scrollTopButton.className = 'scroll-top';
    scrollTopButton.innerHTML = '↑';
    document.body.appendChild(scrollTopButton);
    
    // 监听滚动显示/隐藏按钮
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            scrollTopButton.classList.add('show');
        } else {
            scrollTopButton.classList.remove('show');
        }
    });
    
    // 点击按钮滚动到顶部
    scrollTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// 初始化时钟动画
function initClockAnimation() {
    const hourHand = document.querySelector('.hour-hand');
    const minuteHand = document.querySelector('.minute-hand');
    const secondHand = document.querySelector('.second-hand');
    const tasks = document.querySelectorAll('.task');
    
    // 模拟时钟运行
    function updateClock() {
        const now = new Date();
        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const hours = now.getHours() % 12;
        
        const secondsDegrees = (seconds / 60) * 360;
        const minutesDegrees = ((minutes + seconds / 60) / 60) * 360;
        const hoursDegrees = ((hours + minutes / 60) / 12) * 360;
        
        secondHand.style.transform = `rotate(${secondsDegrees}deg)`;
        minuteHand.style.transform = `rotate(${minutesDegrees}deg)`;
        hourHand.style.transform = `rotate(${hoursDegrees}deg)`;
        
        // 激活当前时间对应的任务
        tasks.forEach(task => {
            const taskTime = task.getAttribute('data-time');
            const [taskHour, taskMinute] = taskTime.split(':').map(Number);
            
            if (hours === taskHour && Math.abs(minutes - taskMinute) < 2) {
                task.classList.add('active');
            } else {
                task.classList.remove('active');
            }
        });
    }
    
    // 每秒更新时钟
    setInterval(updateClock, 1000);
    updateClock(); // 初始更新
}

// 添加语法高亮到所有代码块
function highlightAllCode() {
    // 如果存在Prism或hljs等语法高亮库
    if (window.Prism) {
        Prism.highlightAll();
    } else if (window.hljs) {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    } else {
        // 如果没有加载语法高亮库，可以添加基本的样式
        document.querySelectorAll('.code-snippet pre, .code-container pre, .tip-code pre, .hal-usage pre, .function-details pre').forEach((block) => {
            // 为没有语法高亮的代码块添加基本样式
            block.classList.add('no-highlight');
        });
    }
}

// 动画初始化
function initAnimations() {
    initClockAnimation();
    initTaskAnimation();
    initStructMemoryAnimation();
}

// 结构体内存布局动画
function initStructMemoryAnimation() {
    const memoryLayout = document.querySelector('.memory-diagram');
    if (!memoryLayout) return;
    
    // 创建内存布局可视化
    const structMemoryHTML = `
        <div class="struct-memory-visual">
            <div class="memory-block char-block" data-type="char" title="1字节">
                <div class="block-label">name[0]</div>
                <div class="block-value">T</div>
            </div>
            <div class="memory-block char-block" data-type="char" title="1字节">
                <div class="block-label">name[1]</div>
                <div class="block-value">a</div>
            </div>
            <div class="memory-block char-block" data-type="char" title="1字节">
                <div class="block-label">...</div>
                <div class="block-value">...</div>
            </div>
            <div class="memory-block padding-block" data-type="padding" title="填充">
                <div class="block-label">padding</div>
                <div class="block-value"></div>
            </div>
            <div class="memory-block int-block" data-type="int" title="4字节">
                <div class="block-label">priority</div>
                <div class="block-value">5</div>
            </div>
            <div class="memory-block pointer-block" data-type="pointer" title="4/8字节">
                <div class="block-label">function</div>
                <div class="block-value">0x1A2B3C4D</div>
            </div>
            <div class="memory-block pointer-block" data-type="pointer" title="4/8字节">
                <div class="block-label">param</div>
                <div class="block-value">0x5E6F7A8B</div>
            </div>
            <div class="memory-block uint-block" data-type="uint32" title="4字节">
                <div class="block-label">period</div>
                <div class="block-value">1000</div>
            </div>
            <div class="memory-block uint-block" data-type="uint32" title="4字节">
                <div class="block-label">next_run</div>
                <div class="block-value">2500</div>
            </div>
            <div class="memory-block bool-block" data-type="bool" title="1字节">
                <div class="block-label">is_running</div>
                <div class="block-value">false</div>
            </div>
            <div class="memory-block padding-block" data-type="padding" title="填充">
                <div class="block-label">padding</div>
                <div class="block-value"></div>
            </div>
        </div>
        <div class="memory-address-labels">
            <div class="address">0x00</div>
            <div class="address">...</div>
            <div class="address">0x20</div>
            <div class="address">0x24</div>
            <div class="address">0x28</div>
            <div class="address">0x2C</div>
            <div class="address">0x30</div>
            <div class="address">0x34</div>
            <div class="address">0x35</div>
            <div class="address">0x38</div>
        </div>
    `;
    
    memoryLayout.innerHTML = structMemoryHTML;
    
    // 为内存块添加悬停效果
    document.querySelectorAll('.memory-block').forEach(block => {
        block.addEventListener('mouseenter', () => {
            block.classList.add('highlight');
        });
        
        block.addEventListener('mouseleave', () => {
            block.classList.remove('highlight');
        });
    });
}

// 在页面滚动时自动激活当前视野中的部分
document.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('.section');
    
    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const isVisible = (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) / 2 &&
            rect.bottom >= (window.innerHeight || document.documentElement.clientHeight) / 2
        );
        
        if (isVisible) {
            section.classList.add('active');
        }
    });
});

// 任务动画初始化
function initTaskAnimation() {
    // 动画进度条
    const rateBars = document.querySelectorAll('.rate-indicator');
    rateBars.forEach(bar => {
        setInterval(() => {
            bar.style.width = '0';
            setTimeout(() => {
                bar.style.width = '100%';
            }, 50);
        }, 2000);
    });
    
    // 任务列表动画
    const tasks = document.querySelectorAll('.task');
    tasks.forEach((task, index) => {
        // 已经通过CSS添加了动画延迟
        
        // 为任务添加悬停效果
        task.addEventListener('mouseenter', () => {
            task.style.transform = 'translateY(-5px)';
            task.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
        });
        
        task.addEventListener('mouseleave', () => {
            task.style.transform = 'translateY(0)';
            task.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
        });
    });
}

// 初始化结构体基础部分的交互
function initStructConcept() {
    // 初始化结构体代码标签页
    initStructTabs();
    
    // 初始化结构体内存布局
    initMemoryLayout();
    
    // 初始化手风琴折叠面板
    initAccordion();
    
    // 添加结构体卡片的3D效果
    initStructCard();
}

// 初始化结构体代码标签页
function initStructTabs() {
    const tabBtns = document.querySelectorAll('.tab-container .tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 获取目标标签页ID
            const targetId = this.getAttribute('data-tab');
            
            // 移除所有标签页按钮的激活状态
            tabBtns.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的激活状态
            this.classList.add('active');
            
            // 隐藏所有标签页内容
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 显示目标标签页内容
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// 初始化内存布局可视化
function initMemoryLayout() {
    const memoryDiagram = document.querySelector('.memory-diagram');
    if (!memoryDiagram) return;
    
    // 预定义结构体内存布局数据
    const structLayouts = {
        default: [
            { address: '0x00', type: 'char[32]', size: '32B', class: 'char', name: 'name' },
            { address: '0x20', type: 'int', size: '4B', class: 'int', name: 'priority' },
            { address: '0x24', type: 'void(*)(void*)', size: '4/8B', class: 'pointer', name: 'function' },
            { address: '0x28', type: 'void*', size: '4/8B', class: 'pointer', name: 'param' },
            { address: '0x30', type: 'uint32_t', size: '4B', class: 'int', name: 'period' },
            { address: '0x34', type: 'uint32_t', size: '4B', class: 'int', name: 'next_run' },
            { address: '0x38', type: 'bool', size: '1B', class: 'char', name: 'is_running' },
            { address: '0x39', type: 'padding', size: '3B', class: 'padding', name: '填充字节' }
        ],
        optimized: [
            { address: '0x00', type: 'void(*)(void*)', size: '4/8B', class: 'pointer', name: 'function' },
            { address: '0x08', type: 'void*', size: '4/8B', class: 'pointer', name: 'param' },
            { address: '0x10', type: 'char[32]', size: '32B', class: 'char', name: 'name' },
            { address: '0x30', type: 'uint32_t', size: '4B', class: 'int', name: 'period' },
            { address: '0x34', type: 'uint32_t', size: '4B', class: 'int', name: 'next_run' },
            { address: '0x38', type: 'int', size: '4B', class: 'int', name: 'priority' },
            { address: '0x3C', type: 'bool', size: '1B', class: 'char', name: 'is_running' },
            { address: '0x3D', type: 'padding', size: '3B', class: 'padding', name: '填充字节' }
        ]
    };
    
    // 当前显示的结构体布局
    let currentLayout = 'default';
    let showPadding = true;
    
    // 渲染内存布局
    function renderMemoryLayout() {
        const layout = structLayouts[currentLayout];
        let html = '';
        
        layout.forEach(block => {
            if (block.class === 'padding' && !showPadding) return;
            
            html += `
                <div class="memory-block ${block.class}">
                    <span class="memory-block-address">${block.address}</span>
                    <span class="memory-block-type">${block.name}: ${block.type}</span>
                    <span class="memory-block-size">${block.size}</span>
                </div>
            `;
        });
        
        memoryDiagram.innerHTML = html;
        
        // 添加内存块的悬停效果
        document.querySelectorAll('.memory-block').forEach(block => {
            block.addEventListener('mouseenter', () => {
                block.style.transform = 'translateX(10px)';
                block.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.1)';
            });
            
            block.addEventListener('mouseleave', () => {
                block.style.transform = 'translateX(0)';
                block.style.boxShadow = 'none';
            });
        });
    }
    
    // 初始渲染
    renderMemoryLayout();
    
    // 切换结构体按钮
    const changeStructBtn = document.getElementById('change-struct');
    if (changeStructBtn) {
        changeStructBtn.addEventListener('click', () => {
            currentLayout = currentLayout === 'default' ? 'optimized' : 'default';
            renderMemoryLayout();
            
            // 更新按钮文本
            changeStructBtn.textContent = currentLayout === 'default' ? 
                '查看优化结构' : '查看原始结构';
        });
    }
    
    // 切换填充显示按钮
    const togglePaddingBtn = document.getElementById('toggle-padding');
    if (togglePaddingBtn) {
        togglePaddingBtn.addEventListener('click', () => {
            showPadding = !showPadding;
            renderMemoryLayout();
            
            // 更新按钮文本
            togglePaddingBtn.textContent = showPadding ? 
                '隐藏填充字节' : '显示填充字节';
        });
    }
}

// 初始化手风琴折叠面板
function initAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        
        header.addEventListener('click', () => {
            // 检查当前项是否已激活
            const isActive = item.classList.contains('active');
            
            // 关闭所有项
            accordionItems.forEach(item => {
                item.classList.remove('active');
            });
            
            // 如果当前项未激活，则激活它
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// 为结构体卡片添加3D效果
function initStructCard() {
    const card = document.querySelector('.struct-card');
    if (!card) return;
    
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // 鼠标x相对于卡片的位置
        const y = e.clientY - rect.top;  // 鼠标y相对于卡片的位置
        
        // 计算旋转角度，最大旋转角度为10度
        const rotateY = ((x / rect.width) - 0.5) * 10;  // 左右旋转
        const rotateX = ((y / rect.height) - 0.5) * -10; // 上下旋转
        
        // 应用变换
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    // 鼠标离开时重置变换
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
    
    // 给卡片字段添加动画
    const fields = card.querySelectorAll('.card-field');
    fields.forEach((field, index) => {
        field.style.opacity = '0';
        field.style.transform = 'translateY(20px)';
        
        // 延迟显示每个字段，创建连续出现的效果
        setTimeout(() => {
            field.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            field.style.opacity = '1';
            field.style.transform = 'translateY(0)';
        }, 300 + index * 150);
    });
}

// 页脚效果
document.addEventListener("DOMContentLoaded", function() {
    const footer = document.querySelector('footer');
    const footerLogo = document.querySelector('.footer-logo');
    
    // 页脚滚动效果
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.body.offsetHeight;
        
        // 当滚动到接近页脚时
        if (scrollPosition + windowHeight > documentHeight - 150) {
            footer.classList.add('footer-visible');
        } else {
            footer.classList.remove('footer-visible');
        }
    });
    
    // Logo悬停效果
    if (footerLogo) {
        footerLogo.addEventListener('mouseenter', function() {
            this.classList.add('logo-hover');
        });
        
        footerLogo.addEventListener('mouseleave', function() {
            this.classList.remove('logo-hover');
        });
    }
}); 