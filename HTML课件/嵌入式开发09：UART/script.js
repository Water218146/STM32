// Copyright (c) 2024 米醋电子工作室. All rights reserved.
document.addEventListener('DOMContentLoaded', () => {
    // 获取 DOM 元素
    const byteInput = document.getElementById('byteInput');
    const receiveByteBtn = document.getElementById('receiveByteBtn');
    const elapseTimeBtn = document.getElementById('elapseTimeBtn');
    const elapseTimeoutBtn = document.getElementById('elapseTimeoutBtn');
    const rxBufferViz = document.getElementById('rxBufferViz');
    const rxIndexVal = document.getElementById('rxIndexVal');
    const rxTicksVal = document.getElementById('rxTicksVal');
    const uwTickVal = document.getElementById('uwTickVal');
    const timeoutStatus = document.getElementById('timeoutStatus');
    const logOutput = document.getElementById('logOutput');

    // --- 模拟状态变量 ---
    let uart_rx_buffer = []; // 模拟接收缓冲区 (存储ASCII码)
    let uart_rx_index = 0;   // 模拟接收索引
    let uart_rx_ticks = 0;   // 模拟最后接收时间戳
    let uwTick = 0;          // 模拟系统滴答时间
    const UART_RX_BUFFER_SIZE = 16; // 可视化缓冲区大小限制
    const UART_TIMEOUT_MS = 100; // 模拟超时时间

    // --- Helper 函数 ---
    // 更新状态显示
    const updateStatusDisplay = () => {
        rxIndexVal.textContent = uart_rx_index;
        rxTicksVal.textContent = uart_rx_ticks;
        uwTickVal.textContent = uwTick;
        const isTimedOut = uart_rx_index > 0 && (uwTick - uart_rx_ticks > UART_TIMEOUT_MS);
        timeoutStatus.textContent = isTimedOut ? '超时!' : '未超时';
        timeoutStatus.classList.toggle('timed-out', isTimedOut);
    };

    // 更新缓冲区可视化
    const updateBufferViz = () => {
        rxBufferViz.innerHTML = ''; // 清空
        for (let i = 0; i < UART_RX_BUFFER_SIZE; i++) {
            const slot = document.createElement('div');
            slot.classList.add('buffer-slot');
            if (i < uart_rx_index) {
                // 显示字符和ASCII码
                slot.textContent = `${String.fromCharCode(uart_rx_buffer[i])}(${uart_rx_buffer[i]})`;
                slot.title = `Index ${i}: Char='${String.fromCharCode(uart_rx_buffer[i])}', ASCII=${uart_rx_buffer[i]}`;
            } else {
                slot.textContent = '-'; // 空槽位
                slot.title = `Index ${i}: Empty`;
            }
            rxBufferViz.appendChild(slot);
        }
    };

    // 添加日志
    const addLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        logOutput.textContent += `[${timestamp}] ${message}\n`;
        logOutput.scrollTop = logOutput.scrollHeight; // 滚动到底部
    };

    // 重置状态（超时处理后调用）
    const resetState = () => {
        addLog(`超时处理完成，清空缓冲区。`);
        uart_rx_buffer = [];
        uart_rx_index = 0;
        // uart_rx_ticks 不重置，因为下一次接收会更新它
        updateBufferViz();
        updateStatusDisplay();
    };

    // 检查并处理超时
    const checkTimeout = () => {
        if (uart_rx_index > 0 && (uwTick - uart_rx_ticks > UART_TIMEOUT_MS)) {
            // 超时发生
            updateStatusDisplay(); // 更新状态以显示"超时"
            const receivedData = uart_rx_buffer.slice(0, uart_rx_index);
            const receivedString = String.fromCharCode(...receivedData);
            addLog(`检测到超时！(uwTick: ${uwTick}, uart_rx_ticks: ${uart_rx_ticks})`);
            addLog(`处理接收到的数据 (${uart_rx_index} bytes): ASCII=[${receivedData.join(',')}] | String="${receivedString}"`);
            // 模拟数据处理后清空
            resetState();
            return true; // 表示已处理超时
        }
        return false; // 未超时或未处理
    };

    // --- 事件监听器 ---
    // 接收字节按钮
    receiveByteBtn.addEventListener('click', () => {
        const byteChar = byteInput.value;
        if (!byteChar) {
            addLog("请输入一个字符再点击接收。");
            return;
        }
        if (uart_rx_index >= UART_RX_BUFFER_SIZE) {
            addLog("错误：模拟缓冲区已满！");
            return;
        }

        const byteAscii = byteChar.charCodeAt(0);
        addLog(`模拟接收字节: '${byteChar}' (ASCII: ${byteAscii})`);

        // 模拟 HAL_UART_RxCpltCallback
        uart_rx_ticks = uwTick; // 更新时间戳
        uart_rx_buffer[uart_rx_index] = byteAscii; // 存入缓冲区
        uart_rx_index++; // 索引增加

        byteInput.value = ''; // 清空输入框
        updateBufferViz();
        updateStatusDisplay();
        checkTimeout(); // 每次接收后也检查一下（虽然一般是时间流逝后才超时）
    });

    // 时间 +50ms 按钮
    elapseTimeBtn.addEventListener('click', () => {
        uwTick += 50;
        addLog(`模拟时间流逝 +50ms，当前 uwTick: ${uwTick}`);
        updateStatusDisplay();
        checkTimeout(); // 检查是否因为时间流逝导致超时
    });

    // 时间 +150ms (超时) 按钮
    elapseTimeoutBtn.addEventListener('click', () => {
        uwTick += 150;
        addLog(`模拟时间流逝 +150ms，当前 uwTick: ${uwTick}`);
        updateStatusDisplay();
        if (!checkTimeout()) {
            // 如果缓冲区为空，即使时间流逝也不会触发超时逻辑
            if (uart_rx_index === 0) {
                addLog("缓冲区为空，无超时事件发生。");
            }
             else {
                 addLog("时间已流逝，但未满足超时条件 (可能刚接收完字节)。")
             }
        }
    });

    // --- 初始化 ---
    addLog("可视化模拟器已初始化。");
    updateBufferViz();
    updateStatusDisplay();
});

// --- DMA+IDLE Visualization Logic ---

document.addEventListener('DOMContentLoaded', () => {
    const receiveFrame1Btn = document.getElementById('receiveFrame1Btn');
    const receiveFrame2Btn = document.getElementById('receiveFrame2Btn');
    const consumerProcessBtn = document.getElementById('consumerProcessBtn');
    const resetVizBtn = document.getElementById('resetVizBtn');

    const isrLogLinearEl = document.getElementById('isrLogLinear');
    const linearBufferVizEl = document.getElementById('linearBufferViz');
    const linearStatusEl = document.getElementById('linearStatus');
    const consumerLogLinearEl = document.getElementById('consumerLogLinear');

    const isrLogRingEl = document.getElementById('isrLogRing');
    const ringBufferVizEl = document.getElementById('ringBufferViz');
    const ringStatusEl = document.getElementById('ringStatus');
    const consumerLogRingEl = document.getElementById('consumerLogRing');

    const frame1 = "Frame1";
    const frame2 = "Frame2\n";
    const linearBufferSize = 16;
    const ringBufferSize = 16;
    const consumerChunkSize = 3;

    let linearBuffer = new Array(linearBufferSize).fill(null);
    let linearLen = 0;
    let linearConsumerPos = 0;
    let ringBufferData = new Array(ringBufferSize).fill(null);
    let ringReadIndex = 0;
    let ringWriteIndex = 0;
    let linearOverwriteTimeout = null; // Timeout handle for flash effect

    function logMessage(el, message, type = 'info') {
        const prefix = type === 'error' ? '[ERROR] ' : type === 'warn' ? '[WARN] ' : '';
        el.textContent += prefix + message + '\n';
        el.scrollTop = el.scrollHeight; // Auto scroll
    }

    function renderLinearBuffer() {
        linearBufferVizEl.innerHTML = '';
        // Clear any previous overwrite flash timeouts
        if (linearOverwriteTimeout) clearTimeout(linearOverwriteTimeout);

        for (let i = 0; i < linearBufferSize; i++) {
            const slot = document.createElement('div');
            slot.classList.add('buffer-slot');
            const char = linearBuffer[i] !== null ? String.fromCharCode(linearBuffer[i]) : '';
            slot.textContent = char.replace(/[&<>]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[c])); 
            if (linearBuffer[i] !== null) {
                slot.classList.add('filled');
            }
            // Highlight the next position the consumer would read from
            if (i === linearConsumerPos && linearLen > 0 && linearConsumerPos < linearLen) {
                 slot.classList.add('consumer-pos');
            }
            linearBufferVizEl.appendChild(slot);
        }
        linearStatusEl.textContent = `(len=${linearLen}, next_read=${linearConsumerPos})`;
    }

    function renderRingBuffer() {
        ringBufferVizEl.innerHTML = '';
        let dataLen = (ringWriteIndex - ringReadIndex + ringBufferSize) % ringBufferSize;
        for (let i = 0; i < ringBufferSize; i++) {
            const slot = document.createElement('div');
            slot.classList.add('buffer-slot');
            const char = ringBufferData[i] !== null ? String.fromCharCode(ringBufferData[i]) : '';
            slot.textContent = char.replace(/[&<>]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[c])); 

            let isFilled = false;
            if (ringReadIndex < ringWriteIndex) {
                 isFilled = i >= ringReadIndex && i < ringWriteIndex;
            } else if (ringReadIndex > ringWriteIndex) {
                 isFilled = i >= ringReadIndex || i < ringWriteIndex;
            } else if (ringReadIndex === ringWriteIndex && dataLen === ringBufferSize) { // Buffer is full
                isFilled = true;
            }

            if (isFilled) {
                slot.classList.add('filled');
            }

            if (i === ringReadIndex) {
                const pointer = document.createElement('div');
                pointer.classList.add('rb-pointer', 'read');
                pointer.textContent = 'R';
                slot.appendChild(pointer);
            }
            if (i === ringWriteIndex) {
                const pointer = document.createElement('div');
                pointer.classList.add('rb-pointer', 'write');
                pointer.textContent = 'W';
                slot.appendChild(pointer);
            }
            ringBufferVizEl.appendChild(slot);
        }
         ringStatusEl.textContent = `(len=${dataLen} r=${ringReadIndex} w=${ringWriteIndex})`;
    }

    function resetSimulation() {
        linearBuffer.fill(null);
        linearLen = 0;
        linearConsumerPos = 0;
        ringBufferData.fill(null);
        ringReadIndex = 0;
        ringWriteIndex = 0;
        isrLogLinearEl.textContent = '';
        consumerLogLinearEl.textContent = '';
        isrLogRingEl.textContent = '';
        consumerLogRingEl.textContent = '';
        renderLinearBuffer();
        renderRingBuffer();
        logMessage(isrLogLinearEl, "Simulation Reset.");
        logMessage(consumerLogLinearEl, "Simulation Reset.");
        logMessage(isrLogRingEl, "Simulation Reset.");
        logMessage(consumerLogRingEl, "Simulation Reset.");
    }

    function simulateLinearReceive(frame) {
        const frameStr = frame.replace('\n', '\\n');
        logMessage(isrLogLinearEl, `ISR: Received '${frameStr}' (len=${frame.length})`);
        
        // Warn if overwriting existing, unprocessed data
        if (linearLen > 0 && linearConsumerPos < linearLen) {
             logMessage(isrLogLinearEl, `ISR: WARNING! Overwriting ${linearLen - linearConsumerPos} unread bytes!`, 'warn');
        } else if (linearLen > 0) {
             logMessage(isrLogLinearEl, `ISR: Overwriting previous frame data.`);
        }

        // Add flash effect to overwritten slots
        const slots = linearBufferVizEl.querySelectorAll('.buffer-slot');
        for (let i = 0; i < frame.length && i < linearBufferSize; i++) {
            if (linearBuffer[i] !== null) {
                if(slots[i]) slots[i].classList.add('overwritten');
            }
        }
        
        // Reset state and copy new data after a short delay for the animation
        linearOverwriteTimeout = setTimeout(() => {
            linearLen = 0; // Reset length before copy
            linearConsumerPos = 0; // Consumer position reset on new data
            for (let i = 0; i < frame.length && i < linearBufferSize; i++) {
                linearBuffer[i] = frame.charCodeAt(i);
                linearLen++;
            }
            // Clear remaining buffer
            for (let i = linearLen; i < linearBufferSize; i++) linearBuffer[i] = null;
            renderLinearBuffer(); // Re-render without the 'overwritten' class
            logMessage(isrLogLinearEl, `ISR: memcpy complete.`);
        }, 500); // Match animation duration
    }

    function simulateRingReceive(frame) {
        const frameStr = frame.replace('\n', '\\n');
        logMessage(isrLogRingEl, `ISR: Received '${frameStr}' (len=${frame.length})`);
        let putCount = 0;
        let skipped = false;
        for (let i = 0; i < frame.length; i++) {
            const nextWriteIndex = (ringWriteIndex + 1) % ringBufferSize;
            if (nextWriteIndex === ringReadIndex) {
                if (!skipped) { // Log only once per frame
                    logMessage(isrLogRingEl, "ISR: Ring buffer full! Skipping rest of frame.", 'warn');
                    skipped = true;
                }
                continue; // Skip this byte
            }
            ringBufferData[ringWriteIndex] = frame.charCodeAt(i);
            ringWriteIndex = nextWriteIndex;
            putCount++;
        }
         logMessage(isrLogRingEl, `ISR: Put ${putCount} bytes into ring_buffer. Skipped: ${skipped ? 'Yes' : 'No'}.`);
        renderRingBuffer();
    }

    receiveFrame1Btn.onclick = () => {
        simulateLinearReceive(frame1);
        simulateRingReceive(frame1);
    };

    receiveFrame2Btn.onclick = () => {
        simulateLinearReceive(frame2);
        simulateRingReceive(frame2);
    };

    consumerProcessBtn.onclick = () => {
        // Linear Buffer Consumer
        let processedLinear = '';
        if (linearLen > 0 && linearConsumerPos < linearLen) {
            const remaining = linearLen - linearConsumerPos;
            const count = Math.min(consumerChunkSize, remaining);
            logMessage(consumerLogLinearEl, `CONSUMER: Trying to process ${count} bytes from pos ${linearConsumerPos}...`);
            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    // Check if data still exists (ISR might have overwritten)
                    if(linearConsumerPos + i < linearLen && linearBuffer[linearConsumerPos + i] !== null) {
                       processedLinear += String.fromCharCode(linearBuffer[linearConsumerPos + i]); 
                    } else {
                        logMessage(consumerLogLinearEl, `CONSUMER: Data at pos ${linearConsumerPos + i} seems gone (overwritten?)`, 'warn');
                        processedLinear += '?'; // Indicate potential data loss
                    }
                }
                logMessage(consumerLogLinearEl, `CONSUMER: Processed '${processedLinear.replace('\n', '\\n')}'`);
                linearConsumerPos += count;
                 if(linearConsumerPos >= linearLen) {
                     logMessage(consumerLogLinearEl, `CONSUMER: Reached end of currently known data (len=${linearLen}).`);
                 }
                 renderLinearBuffer(); // Update consumer position highlight
            } else {
                // This case shouldn't happen with the check `linearConsumerPos < linearLen`
                logMessage(consumerLogLinearEl, "CONSUMER: No data to process at current position."); 
            }
        } else {
            logMessage(consumerLogLinearEl, "CONSUMER: No data available or already processed.");
        }

        // Ring Buffer Consumer
        let processedRing = '';
        let ringDataLen = (ringWriteIndex - ringReadIndex + ringBufferSize) % ringBufferSize;
        if (ringDataLen > 0) {
            const count = Math.min(consumerChunkSize, ringDataLen);
            logMessage(consumerLogRingEl, `CONSUMER: Trying to process ${count} bytes from ring_buffer...`);
            for (let i = 0; i < count; i++) {
                 processedRing += String.fromCharCode(ringBufferData[ringReadIndex]);
                 ringBufferData[ringReadIndex] = null; // Consume data
                 ringReadIndex = (ringReadIndex + 1) % ringBufferSize;
            }
            logMessage(consumerLogRingEl, `CONSUMER: Processed '${processedRing.replace('\n', '\\n')}'`);
            renderRingBuffer(); // Update R pointer and data display
        } else {
             logMessage(consumerLogRingEl, "CONSUMER: ring_buffer empty.");
        }

    };
    
    resetVizBtn.onclick = resetSimulation;

    // Initial render
    resetSimulation();
}); 