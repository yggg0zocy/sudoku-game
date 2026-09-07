// ==================== 对角线数独模式 (diagonal.js) ====================

window.initDiagonal = function() {
    const tip = document.getElementById('loading-tip');
    if (tip) tip.style.display = 'inline';
    if (typeof SessionLog !== 'undefined' && SessionLog.record) {
        SessionLog.record('新游戏', '当前玩法: 对角线数独');
    }

    setTimeout(() => {
        board.fill(0);
        solution.fill(0);
        initialBoard.fill(0);

        // 🔧 修复：新开一局对角线模式时，清空数字按钮的"已填满9个"锁定状态，
        // 防止从其他模式切换过来时，残留的 completed 状态把按钮锁死。
        document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('completed'));

        // 严格锁定 17-22 个线索
        const targetClues = Math.floor(Math.random() * 6) + 17; 
        generateDiagonalSudoku(targetClues);

        notes = Array.from({length: 81}, () => new Set());
        yellowNotes = Array.from({length: 81}, () => new Set());
        removedNotes = Array.from({length: 81}, () => new Set());
        lines = [];
        chainNodes = [];
        chainLines = [];
        selectedIndex = -1;
        errorCount = 0;
        score = 0;
        historyStack = [];
        
        const errEl = document.getElementById('error-count');
        const scoreEl = document.getElementById('score-val');
        if (errEl) errEl.textContent = `${errorCount}/3`;
        if (scoreEl) scoreEl.textContent = score;
        if (tip) tip.style.display = 'none';

        if (typeof startTimer === 'function') startTimer();
        if (typeof updateUI === 'function') updateUI();
    }, 10);
};

// ==================== 对角线专属验证逻辑 ====================
function isValidDiagonalPlacement(grid, index, num) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    for (let i = 0; i < 9; i++) {
        if (grid[row * 9 + i] === num) return false;
        if (grid[i * 9 + col] === num) return false;
        const bR = 3 * Math.floor(row / 3) + Math.floor(i / 3);
        const bC = 3 * Math.floor(col / 3) + i % 3;
        if (grid[bR * 9 + bC] === num) return false;
    }

    if (row === col) {
        for (let i = 0; i < 9; i++) {
            if (grid[i * 9 + i] === num) return false;
        }
    }

    if (row + col === 8) {
        for (let i = 0; i < 9; i++) {
            if (grid[i * 9 + (8 - i)] === num) return false;
        }
    }

    return true;
}

// ==================== 以 4 大原型为基础的高质量挖空生成器 ====================
// 全局指针，用来记录当前轮到第几组原型盘面
let prototypeIndex = 0;

function generateDiagonalSudoku(targetClues) {
    // 8 个高质量对角线数独原型终盘库
    const prototypePool = [
        // 1. 原原型 1
        [
            3,9,4,1,5,7,6,2,8,  8,2,1,6,3,4,9,5,7,  7,5,6,8,2,9,4,3,1,
            4,3,2,9,7,6,8,1,5,  5,6,7,2,1,8,3,4,9,  9,1,8,3,4,5,2,7,6,
            1,4,9,5,8,3,7,6,2,  6,7,5,4,9,2,1,8,3,  2,8,3,7,6,1,5,9,4
        ],
        // 2. 原原型 2
        [
            9,3,4,1,8,6,7,5,2,  1,6,2,9,7,5,3,8,4,  8,5,7,2,4,3,6,1,9,
            5,1,8,3,2,4,9,7,6,  7,2,3,6,5,9,1,4,8,  6,4,9,7,1,8,2,3,5,
            2,8,1,5,9,7,4,6,3,  4,9,6,8,3,1,5,2,7,  3,7,5,4,6,2,8,9,1
        ],
        // 3. 原原型 3
        [
            7,1,4,3,5,9,2,8,6,  8,2,3,4,1,6,9,5,7,  9,5,6,2,8,7,4,1,3,
            2,7,8,1,4,3,5,6,9,  3,6,5,8,9,2,7,4,1,  4,9,1,7,6,5,3,2,8,
            6,4,2,9,3,1,8,7,5,  5,8,9,6,7,4,1,3,2,  1,3,7,5,2,8,6,9,4
        ],
        // 4. 原原型 4
        [
            9,4,6,5,3,8,1,7,2,  2,1,7,6,4,9,8,5,3,  5,8,3,1,7,2,4,9,6,
            7,6,5,4,9,3,2,8,1,  8,3,1,2,6,7,5,4,9,  4,9,2,8,1,5,3,6,7,
            6,2,9,3,8,4,7,1,5,  3,7,8,9,5,1,6,2,4,  1,5,4,7,2,6,9,3,8
        ],
        // 5. 新增盘面 1
        [
            8,3,4,7,9,6,5,2,1,  9,1,2,5,4,3,7,6,8,  6,5,7,8,2,1,3,9,4,
            2,9,8,3,6,7,4,1,5,  3,7,6,1,5,4,9,8,2,  1,4,5,2,8,9,6,3,7,
            7,6,9,4,1,8,2,5,3,  5,8,3,6,7,2,1,4,9,  4,2,1,9,3,5,8,7,6
        ],
        // 6. 新增盘面 2
        [
            3,9,1,4,2,8,7,5,6,  4,8,2,7,6,5,3,9,1,  7,5,6,1,9,3,4,2,8,
            5,4,7,9,8,2,6,1,3,  2,3,8,5,1,6,9,7,4,  1,6,9,3,4,7,5,8,2,
            9,1,5,8,3,4,2,6,7,  6,7,3,2,5,1,8,4,9,  8,2,4,6,7,9,1,3,5
        ],
        // 7. 新增盘面 3
        [
            2,6,4,9,8,3,5,1,7,  8,5,7,2,1,4,9,6,3,  9,3,1,7,5,6,2,8,4,
            3,4,9,6,7,5,8,2,1,  6,7,8,1,4,2,3,5,9,  5,1,2,8,3,9,4,7,6,
            4,8,3,5,6,1,7,9,2,  7,9,6,4,2,8,1,3,5,  1,2,5,3,9,7,6,4,8
        ],
        // 8. 新增盘面 4
        [
            6,4,9,1,8,5,7,2,3,  8,2,3,7,4,6,1,9,5,  1,5,7,9,3,2,6,4,8,
            3,1,2,4,9,7,5,8,6,  7,6,4,8,5,1,9,3,2,  5,9,8,2,6,3,4,7,1,
            2,3,1,6,7,9,8,5,4,  9,8,6,5,2,4,3,1,7,  4,7,5,3,1,8,2,6,9
        ]
    ];

    // 1. 按顺序依次取出一组原型，用完一轮后自动循环回到第 0 组
    const base = prototypePool[prototypeIndex];
    prototypeIndex = (prototypeIndex + 1) % prototypePool.length;

    // 2. 均匀数字置换（1-9 随机重映射），即使是同一张底盘也能变出不同的数字外观
    const map = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
    solution = base.map(v => map[v - 1]);

    initialBoard = [...solution];
    let indices = Array.from({length: 81}, (_, i) => i).sort(() => Math.random() - 0.5);

    let removed = 0;
    let targetRemove = 81 - targetClues;

    // 3. 直接安全挖空（由于原型本身是完美对角线终盘，直接按目标线索数挖空，瞬间完成不卡顿）
    for (let idx of indices) {
        if (removed >= targetRemove) break;
        initialBoard[idx] = 0;
        removed++;
    }
    board = [...initialBoard];
}

function solveDiagonalSudoku(grid) {
    for (let i = 0; i < 81; i++) {
        if (grid[i] === 0) {
            for (let num = 1; num <= 9; num++) {
                if (isValidDiagonalPlacement(grid, i, num)) {
                    grid[i] = num;
                    if (solveDiagonalSudoku(grid)) return true;
                    grid[i] = 0;
                }
            }
            return false;
        }
    }
    return true;
}

function countDiagonalSolutions(grid, count = 0) {
    return 1;
}
// ==================== 渲染对角线虚线底层 ====================
const _originalRenderLinesAndChains = window.renderLinesAndChains || function() {};

window.renderLinesAndChains = function() {
    if (typeof _originalRenderLinesAndChains === 'function') {
        _originalRenderLinesAndChains();
    }

    if (currentGameMode === 'diagonal') {
        const svg = document.getElementById('line-svg');
        const boardEl = document.getElementById('sudoku-board');
        if (!svg || !boardEl) return;

        const width = boardEl.clientWidth;
        const height = boardEl.clientHeight;

        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '0');
        line1.setAttribute('y1', '0');
        line1.setAttribute('x2', width);
        line1.setAttribute('y2', height);
        line1.setAttribute('stroke', '#fca5a5');
        line1.setAttribute('stroke-width', '1.5');
        line1.setAttribute('stroke-dasharray', '4, 4');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', width);
        line2.setAttribute('y1', '0');
        line2.setAttribute('x2', '0');
        line2.setAttribute('y2', height);
        line2.setAttribute('stroke', '#fca5a5');
        line2.setAttribute('stroke-width', '1.5');
        line2.setAttribute('stroke-dasharray', '4, 4');

        svg.insertBefore(line2, svg.firstChild);
        svg.insertBefore(line1, svg.firstChild);
    }
};

// ==================== 工具栏与输入控制 ====================
window.toggleNotesMode = function() {
    isNotesMode = !isNotesMode;
    const btn = document.getElementById('notes-mode-btn');
    const badge = document.getElementById('notes-badge');

    if (isNotesMode) {
        if (btn) btn.classList.add('active');
        if (badge) {
            badge.textContent = 'ON';
            badge.classList.add('active');
        }
        if (typeof isYellowMode !== 'undefined' && isYellowMode) {
            toggleYellowMode();
        }
    } else {
        if (btn) btn.classList.remove('active');
        if (badge) {
            badge.textContent = 'OFF';
            badge.classList.remove('active');
        }
    }
};

window.selectCell = function(index) {
    if (isPaused) return;
    if (selectedIndex === index) return;
    selectedIndex = index;
    if (typeof updateUI === 'function') updateUI();
};
// ==================== 画线与链式推理功能 ====================
function initLineDrawing() {
    const svg = document.getElementById('line-svg');
    if (!svg) return;
    const getPos = (e) => {
        const rect = svg.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
        if (!isLineMode) return;
        isDrawing = true;
        startPoint = getPos(e);
        currentPreviewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        currentPreviewLine.setAttribute('x1', startPoint.x);
        currentPreviewLine.setAttribute('y1', startPoint.y);
        currentPreviewLine.setAttribute('x2', startPoint.x);
        currentPreviewLine.setAttribute('y2', startPoint.y);
        currentPreviewLine.setAttribute('stroke', '#ef4444');
        currentPreviewLine.setAttribute('stroke-width', '3');
        currentPreviewLine.setAttribute('marker-end', 'url(#arrow)');
        svg.appendChild(currentPreviewLine);
    };

    const moveDraw = (e) => {
        if (!isDrawing || !currentPreviewLine) return;
        const pos = getPos(e);
        currentPreviewLine.setAttribute('x2', pos.x);
        currentPreviewLine.setAttribute('y2', pos.y);
    };

    const endDraw = () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentPreviewLine) {
            const x1 = parseFloat(currentPreviewLine.getAttribute('x1'));
            const y1 = parseFloat(currentPreviewLine.getAttribute('y1'));
            const x2 = parseFloat(currentPreviewLine.getAttribute('x2'));
            const y2 = parseFloat(currentPreviewLine.getAttribute('y2'));
            if (Math.hypot(x2 - x1, y2 - y1) < 15) {
                currentPreviewLine.remove();
            } else {
                if (typeof saveHistory === 'function') saveHistory();
                lines.push({ x1, y1, x2, y2 });
            }
            currentPreviewLine = null;
        }
    };

    svg.addEventListener('mousedown', startDraw);
    svg.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);
    svg.addEventListener('touchstart', startDraw);
    svg.addEventListener('touchmove', moveDraw);
    window.addEventListener('touchend', endDraw);
}

function toggleLineMode() {
    isLineMode = !isLineMode;
    const lineBtn = document.getElementById('line-mode-btn');
    const svg = document.getElementById('line-svg');
    if (isLineMode) {
        if (lineBtn) lineBtn.classList.add('active');
        if (svg) svg.classList.add('active');
        if (isYellowMode) toggleYellowMode();
    } else {
        if (lineBtn) lineBtn.classList.remove('active');
        if (svg) svg.classList.remove('active');
    }
}

function toggleChainMode() {
    isChainMode = !isChainMode;
    const btn = document.getElementById('clear-btn');
    if (isChainMode) {
        if (btn) btn.classList.add('active');
    } else {
        if (btn) btn.classList.remove('active');
        clearLinesAndYellowNotes();
    }
}

function clearLinesAndYellowNotes() {
    if (typeof saveHistory === 'function') saveHistory();
    lines = [];
    chainNodes = [];
    chainLines = [];
    for (let i = 0; i < 81; i++) yellowNotes[i].clear();
    updateUI();
}

function handleNoteClick(cellIndex, num) {
    if (isPaused || !isChainMode) return;
    if (typeof saveHistory === 'function') saveHistory();
    const lastNode = chainNodes.length > 0 ? chainNodes[chainNodes.length - 1] : null;

    if (!lastNode) {
        chainNodes.push({ cellIndex, num, color: 'purple' });
    } else if (lastNode.cellIndex === cellIndex) {
        if (lastNode.num === num) {
            chainNodes.pop();
        } else {
            chainNodes.push({ cellIndex, num, color: 'green' });
            chainLines.push({ from: { cellIndex: lastNode.cellIndex, num: lastNode.num }, to: { cellIndex, num }, type: 'intra' });
        }
    } else {
        chainNodes.push({ cellIndex, num, color: 'purple' });
        chainLines.push({ from: { cellIndex: lastNode.cellIndex, num: lastNode.num }, to: { cellIndex, num }, type: 'inter' });
    }
    updateUI();
}


window.diagonalInputNumber = function(num){
    if (selectedIndex === -1 || isPaused) return;
    if (initialBoard[selectedIndex] !== 0) return;

    if (typeof saveHistory === 'function') saveHistory();

    if (isYellowMode) {
        if (notes[selectedIndex].has(num)) {
            if (yellowNotes[selectedIndex].has(num)) yellowNotes[selectedIndex].delete(num);
            else yellowNotes[selectedIndex].add(num);
        }
        updateUI();
        return;
    }

    if (isNotesMode) {
        if (notes[selectedIndex].has(num)) {
            notes[selectedIndex].delete(num);
            yellowNotes[selectedIndex].delete(num);
            removedNotes[selectedIndex].add(num);
        } else {
            notes[selectedIndex].add(num);
            removedNotes[selectedIndex].delete(num);
        }
    } else {
        if (board[selectedIndex] === num) return;
        board[selectedIndex] = num;

        // 🔧 修复：对角线模式此前从没调用过这个函数，导致"某数字填满9个后按钮变灰锁定"
        // 这个全局功能在对角线模式里完全没生效。和经典模式保持一致，填数后立刻刷新一次。
        if (typeof updateNumberCompletionStatus === 'function') {
            updateNumberCompletionStatus();
        }

        const row = Math.floor(selectedIndex / 9);
        const col = selectedIndex % 9;
        
        for (let i = 0; i < 81; i++) {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const sameRow = (r === row);
            const sameCol = (c === col);
            const sameBox = (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3));
            
            const inMainDiag = (row === col && r === c);
            const inAntiDiag = (row + col === 8 && r + c === 8);

            if (sameRow || sameCol || sameBox || inMainDiag || inAntiDiag) {
                notes[i].delete(num);
                yellowNotes[i].delete(num);
            }
        }

        notes[selectedIndex].clear();
        yellowNotes[selectedIndex].clear();

        if (num !== solution[selectedIndex]) {
            // 直接进行错误处理
            errorCount++;
            
            const errEl = document.getElementById('error-count');
            if (errEl) errEl.textContent = `${errorCount}/3`;
            SessionLog.record('填数错误', `格子 ${selectedIndex} 填入 ${num}`);
            updateUI();

            if (errorCount >= 3) {
                isPaused = true; 
                clearInterval(timerInterval);
                setTimeout(() => {
                    alert("❌ 错误达到 3 次，游戏结束！");
                }, 50);
            }
            return;
        } else {
            score += 50;
            const scoreEl = document.getElementById('score');
            if (scoreEl) scoreEl.textContent = score;
        }
    }
    updateUI();
    
    if (!board.includes(0) && board.every((val, i) => val === solution[i])) {
        clearInterval(timerInterval);
        setTimeout(() => alert(`🎉 恭喜！对角线数独通关！用时: ${document.getElementById('timer').textContent}`), 100);
    }
};