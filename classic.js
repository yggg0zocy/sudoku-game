let score = 0;
// ========== 兼容兜底定义（防止未定义报错） ============
window.SessionLog = window.SessionLog || {
    record: function() {},
    updateView: function() {}
};
// 在 classic.js 里提供这样一个桥梁函数，供 core.js 调度
window.initClassicOrBlank = function(mode) {
    currentGameMode = mode;
    startNewGame(); // 调用你原本写好的经典/空白生成逻辑
};

// ==================== 验证逻辑 ==================
function isValidPlacement(grid, index, num) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    for (let i = 0; i < 9; i++) {
        if (grid[row * 9 + i] === num) return false;
        if (grid[i * 9 + col] === num) return false;
        const bR = 3 * Math.floor(row / 3) + Math.floor(i / 3);
        const bC = 3 * Math.floor(col / 3) + i % 3;
        if (grid[bR * 9 + bC] === num) return false;
    }

    return true;
}

// ========== 游戏生成器 (兼容经典、空白等) ===============
function classicStartNewGame() {
    const tip = document.getElementById('loading-tip');
    if (tip) tip.style.display = 'inline';
    SessionLog.record('新游戏', `当前玩法: ${currentGameMode}`);

    setTimeout(() => {
        // 清空棋盘基础数据
        board.fill(0);
        solution.fill(0);
        initialBoard.fill(0);

        if (currentGameMode === 'blank') {
            // 空白页：全部为0，不设题目
            board.fill(0);
            solution.fill(0);
            initialBoard.fill(0);
        } else {
            // 默认按经典数独生成
            const targetClues = Math.floor(Math.random() * 5) + 23;
            generateSudokuByDigging(targetClues);
        }

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
        
        // ==========================================
        // 🧹 【全新替换】重新出题/开新局时：彻底擦除所有按钮的 completed 状态，防止键盘锁死
        // ==========================================
        const numButtons = document.querySelectorAll('.num-btn');
        numButtons.forEach(btn => {
            btn.classList.remove('completed'); // 移除完成状态类名，彻底解锁
        });
        
        const errEl = document.getElementById('error-count');
        const scoreEl = document.getElementById('score-val');
        if (errEl) errEl.textContent = `${errorCount}/3`;
        if (scoreEl) scoreEl.textContent = score;
        if (tip) tip.style.display = 'none';

        startTimer();
        updateUI();
    }, 30);
}

// 12个高质量数独终盘题库池
const ULTIMATE_SOLUTION_POOL = [
    // 1号盘面
    [
        2,1,4,3,5,7,8,9,6,  3,5,8,4,9,6,1,7,2,  9,7,6,8,1,2,3,4,5,
        1,3,7,2,6,5,9,8,4,  6,8,9,1,7,4,5,2,3,  4,2,5,9,8,3,7,6,1,
        7,9,3,6,4,1,2,5,8,  8,6,2,5,3,9,4,1,7,  5,4,1,7,2,8,6,3,9
    ],
    // 2号盘面
    [
        1,6,4,5,2,3,7,9,8,  9,2,3,1,8,7,4,5,6,  7,5,8,4,9,6,1,2,3,
        5,8,9,2,7,4,6,3,1,  3,1,7,9,6,8,2,4,5,  2,4,6,3,5,1,8,7,9,
        6,9,1,7,4,5,3,8,2,  4,3,5,8,1,2,9,6,7,  8,7,2,6,3,9,5,1,4
    ],
    // 3号盘面
    [
        6,9,1,2,4,3,5,7,8,  8,2,4,5,1,7,3,6,9,  5,7,3,8,9,6,1,4,2,
        1,3,6,4,2,8,7,9,5,  2,8,9,1,7,5,6,3,4,  4,5,7,6,3,9,2,8,1,
        3,1,2,7,8,4,9,5,6,  7,4,5,9,6,1,8,2,3,  9,6,8,3,5,2,4,1,7
    ],
    // 4号盘面
    [
        4,8,1,3,2,5,6,9,7,  9,3,6,4,7,1,2,5,8,  7,2,5,6,9,8,3,1,4,
        1,4,9,8,3,6,5,7,2,  3,6,8,2,5,7,9,4,1,  2,5,7,1,4,9,8,3,6,
        8,1,3,9,6,4,7,2,5,  6,7,2,5,1,3,4,8,9,  5,9,4,7,8,2,1,6,3
    ],
    // 5号盘面
    [
        5,9,8,2,1,4,3,6,7,  7,1,2,3,6,5,4,9,8,  4,6,3,8,7,9,2,5,1,
        1,3,5,6,4,2,8,7,9,  6,8,9,7,5,3,1,2,4,  2,4,7,1,9,8,6,3,5,
        8,7,1,5,3,6,9,4,2,  9,2,6,4,8,7,5,1,3,  3,5,4,9,2,1,7,8,6
    ],
    // 6号盘面
    [
        2,9,6,3,1,4,7,5,8,  3,8,5,6,7,2,1,9,4,  4,7,1,5,8,9,2,6,3,
        1,2,8,4,6,7,9,3,5,  5,6,4,1,9,3,8,2,7,  7,3,9,2,5,8,6,4,1,
        8,1,3,9,2,5,4,7,6,  9,4,7,8,3,6,5,1,2,  6,5,2,7,4,1,3,8,9
    ],
    // 7号盘面
    [
        2,9,5,1,4,3,6,7,8,  1,8,7,5,6,2,4,3,9,  6,4,3,8,7,9,5,1,2,
        4,1,2,7,3,6,9,8,5,  8,3,9,2,5,4,7,6,1,  5,7,6,9,8,1,3,2,4,
        7,5,4,3,1,8,2,9,6,  3,2,8,6,9,5,1,4,7,  9,6,1,4,2,7,8,5,3
    ],
    // 8号盘面
    [
        3,9,6,1,2,4,5,8,7,  2,5,4,3,7,8,1,6,9,  8,7,1,6,9,5,2,3,4,
        4,3,7,2,1,9,6,5,8,  6,2,8,5,3,7,9,4,1,  5,1,9,4,8,6,7,2,3,
        7,4,2,8,5,1,3,9,6,  9,8,3,7,6,2,4,1,5,  1,6,5,9,4,3,8,7,2
    ],
    // 9号盘面
    [
        7,2,3,1,6,4,8,5,9,  8,4,6,2,9,5,3,7,1,  5,9,1,7,3,8,2,4,6,
        1,5,9,3,4,2,7,6,8,  3,6,7,8,5,1,4,9,2,  2,8,4,9,7,6,1,3,5,
        4,1,5,6,8,7,9,2,3,  9,7,2,5,1,3,6,8,4,  6,3,8,4,2,9,5,1,7
    ],
    // 10号盘面
    [
        1,9,5,2,3,4,7,6,8,  2,3,4,6,8,7,5,1,9,  8,7,6,9,1,5,2,3,4,
        3,2,9,7,4,8,6,5,1,  4,6,1,5,2,3,8,9,7,  5,8,7,1,6,9,4,2,3,
        9,5,3,4,7,6,1,8,2,  7,1,8,3,5,2,9,4,6,  6,4,2,8,9,1,3,7,5
    ],
    // 11号盘面
    [
        1,7,2,3,6,4,5,9,8,  3,9,6,5,1,8,7,2,4,  8,5,4,9,2,7,3,6,1,
        4,1,8,2,5,9,6,3,7,  5,2,7,6,8,3,1,4,9,  9,6,3,7,4,1,8,5,2,
        6,8,1,4,9,5,2,7,3,  7,4,5,1,3,2,9,8,6,  2,3,9,8,7,6,4,1,5
    ],
    // 12号盘面
    [
        3,6,1,2,5,4,8,7,9,  4,5,8,1,7,9,2,3,6,  7,2,9,3,6,8,4,5,1,
        1,3,5,8,2,6,9,4,7,  2,9,4,5,1,7,3,6,8,  8,7,6,9,4,3,1,2,5,
        9,8,2,6,3,5,7,1,4,  5,1,7,4,8,2,6,9,3,  6,4,3,7,9,1,5,8,2
    ]
];

// 全局索引指针，记录当前轮到第几个题库盘面
let ultimatePoolIndex = 0;

function generateSudokuByDigging(targetClues) {
    let generated = false;

    // 1. 按顺序依次取出一组题库终盘，用完 12 组后自动循环回到第 0 组
    if (ULTIMATE_SOLUTION_POOL && ULTIMATE_SOLUTION_POOL.length > 0) {
        const base = ULTIMATE_SOLUTION_POOL[ultimatePoolIndex];
        ultimatePoolIndex = (ultimatePoolIndex + 1) % ULTIMATE_SOLUTION_POOL.length;
        
        // 给数字做个随机映射（1-9打乱对应），增加变化
        const map = [1,2,3,4,5,6,7,8,9];
        for (let i = map.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [map[i], map[j]] = [map[j], map[i]];
        }
        solution = base.map(v => map[v - 1]);
        generated = true;
    }

    // 2. 如果题库未生效，使用保底盘面
    if (!generated) {
        const base = [
            5,3,4,6,7,8,9,1,2, 6,7,2,1,9,5,3,4,8, 1,9,8,3,4,2,5,6,7,
            8,5,9,7,6,1,4,2,3, 4,2,6,8,5,3,7,9,1, 7,1,3,9,2,4,8,5,6,
            9,6,1,5,3,7,2,8,4, 2,8,7,4,1,9,6,3,5, 3,4,5,2,8,6,1,7,9
        ];
        solution = [...base];
    }
    
    initialBoard = [...solution];
    let indices = Array.from({length: 81}, (_, i) => i).sort(() => Math.random() - 0.5);

    let removed = 0;
    let targetRemove = 81 - targetClues;

    // 3. 挖空生成最终题目（带唯一解验证）
    for (let idx of indices) {
        if (removed >= targetRemove) break;
        let temp = initialBoard[idx];
        initialBoard[idx] = 0;

        if (countSolutions([...initialBoard]) === 1) {
            removed++;
        } else {
            initialBoard[idx] = temp;
        }
    }
    board = [...initialBoard];
}

function solveSudoku(grid) {
    for (let i = 0; i < 81; i++) {
        if (grid[i] === 0) {
            let nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
            for (let num of nums) {
                if (isValidPlacement(grid, i, num)) {
                    grid[i] = num;
                    if (solveSudoku(grid)) return true;
                    grid[i] = 0;
                }
            }
            return false;
        }
    }
    return true;
}

function countSolutions(grid, count = 0) {
    for (let i = 0; i < 81; i++) {
        if (grid[i] === 0) {
            for (let num = 1; num <= 9; num++) {
                if (isValidPlacement(grid, i, num)) {
                    grid[i] = num;
                    count = countSolutions(grid, count);
                    grid[i] = 0;
                    if (count >= 2) return count;
                }
            }
            return count;
        }
    }
    return count + 1;
}

// ==================== 单元格选择与数字输入 ====================
function selectCell(index) {
    if (isPaused) return;
    if (selectedIndex === index) return;
    selectedIndex = index;
    updateUI();
}

function classicInputNumber(num) {
    if (selectedIndex === -1 || isPaused) return;
    // 在空白模式下，所有格子都可以填数字，不用受 initialBoard 限制
    if (currentGameMode !== 'blank' && initialBoard[selectedIndex] !== 0) return;

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
    
        // 每次填完数后，立刻更新数字按钮的完成状态
        if (typeof updateNumberCompletionStatus === 'function') {
            updateNumberCompletionStatus();
        }

        if (currentGameMode !== 'blank') checkWin();
        // 填入数字后，自动清除同行、同列、同宫其他格子的该备选数
        const row = Math.floor(selectedIndex / 9);
        const col = selectedIndex % 9;
        for (let i = 0; i < 81; i++) {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const sameRow = (r === row);
            const sameCol = (c === col);
            const sameBox = (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3));
            if (sameRow || sameCol || sameBox) {
                notes[i].delete(num);
                yellowNotes[i].delete(num);
            }
        }

        if (currentGameMode === 'blank') {
            initialBoard[selectedIndex] = num; // 空白模式下填入的数字作为初始盘面
        }

        notes[selectedIndex].clear();
        yellowNotes[selectedIndex].clear();

        if (currentGameMode !== 'blank') {
            if (num !== solution[selectedIndex]) {
                errorCount++;
                const errEl = document.getElementById('error-count');
                if (errEl) errEl.textContent = `${errorCount}/3`;
                SessionLog.record('填数错误', `格子 ${selectedIndex} 填入 ${num}`);
                updateUI();

                if (errorCount >= 3) {
                    setTimeout(() => alert("❌ 错误达到 3 次，游戏结束！"), 10);
                    clearInterval(timerInterval);
                }
                return;
            } else {
                score += 50;
                const scoreEl = document.getElementById('score');
                if (scoreEl) scoreEl.textContent = score;
                SessionLog.record('填数正确', `格子 ${selectedIndex} 填入 ${num}`);
            }
        }
    }
    updateUI();
    if (currentGameMode !== 'blank') checkWin();
}

function fillAllNotes() {
    if (isPaused) return;
    if (typeof saveHistory === 'function') saveHistory();
    for (let i = 0; i < 81; i++) {
        if (board[i] === 0) {
            for (let num = 1; num <= 9; num++) {
                if (isValidPlacement(board, i, num) && !removedNotes[i].has(num)) {
                    notes[i].add(num);
                } else {
                    notes[i].delete(num);
                    yellowNotes[i].delete(num);
                }
            }
        }
    }
    SessionLog.record('辅助操作', '一键填充备选数');
    updateUI();
}

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

// ==================== 界面渲染与更新 ====================
function updateUI() {
    const cells = document.querySelectorAll('.cell');
    const selectedVal = selectedIndex !== -1 ? board[selectedIndex] : 0;
    const selRow = selectedIndex !== -1 ? Math.floor(selectedIndex / 9) : -1;
    const selCol = selectedIndex !== -1 ? selectedIndex % 9 : -1;

    cells.forEach((cell, i) => {
        const val = board[i];
        let classList = ['cell'];
        cell.textContent = '';

        if (initialBoard[i] !== 0) {
            classList.push('given');
            cell.textContent = val;
        } else if (val !== 0) {
            classList.push('user-entered');
            if (currentGameMode !== 'blank' && val !== solution[i]) classList.push('invalid');
            cell.textContent = val;
        } else if (notes[i].size > 0) {
            const grid = document.createElement('div');
            grid.className = 'notes-grid';
            const fragment = document.createDocumentFragment();

            for (let n = 1; n <= 9; n++) {
                const note = document.createElement('div');
                note.className = 'note-num';
                if (notes[i].has(n)) {
                    note.textContent = n;
                    const nodeState = chainNodes.find(item => item.cellIndex === i && item.num === n);
                    if (nodeState) {
                        note.classList.add(nodeState.color === 'purple' ? 'chain-purple' : 'chain-green');
                    } else if (yellowNotes[i].has(n)) {
                        note.classList.add('yellow-marked');
                    } else if (selectedVal !== 0 && n === selectedVal) {
                        note.classList.add('highlighted-note');
                    }

                    note.onclick = (e) => {
                        if (!isChainMode) return;
                        e.stopPropagation();
                        handleNoteClick(i, n);
                    };
                }
                fragment.appendChild(note);
            }
            grid.appendChild(fragment);
            cell.appendChild(grid);
        }

        if (i === selectedIndex) {
            classList.push('selected');
        } else if (selectedIndex !== -1) {
            const r = Math.floor(i / 9);
            const c = i % 9;
            if (r === selRow || c === selCol) classList.push('highlighted');
            if (selectedVal !== 0 && val === selectedVal) classList.push('same-num');
        }

        cell.className = classList.join(' ');
    });

    renderLinesAndChains();
   
}

function renderLinesAndChains() {
    const svg = document.getElementById('line-svg');
    if (!svg) return;
    const marker = svg.querySelector('defs');
    svg.innerHTML = '';
    if (marker) svg.appendChild(marker);

    lines.forEach(l => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', l.x1); line.setAttribute('y1', l.y1);
        line.setAttribute('x2', l.x2); line.setAttribute('y2', l.y2);
        line.setAttribute('stroke', '#ef4444');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('marker-end', 'url(#arrow)');
        svg.appendChild(line);
    });

    chainLines.forEach(line => {
        const p1 = getNoteCenterPosition(line.from.cellIndex, line.from.num);
        const p2 = getNoteCenterPosition(line.to.cellIndex, line.to.num);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return;

        if (line.type === 'intra') {
            const radius = 8;
            const startX = p1.x + (dx / dist) * radius, startY = p1.y + (dy / dist) * radius;
            const endX = p2.x - (dx / dist) * radius, endY = p2.y - (dy / dist) * radius;
            const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
            const offset = Math.max(22, dist * 0.8);
            const cx = midX - (dy / dist) * offset, cy = midY + (dx / dist) * offset;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`);
            path.setAttribute('stroke', '#3b82f6');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-dasharray', '3,2'); 
            path.setAttribute('fill', 'none');
            path.setAttribute('marker-end', 'url(#blue-arrow)');
            svg.appendChild(path);
        } else {
            const radius = 14;
            if (dist <= radius * 2) return;
            const startX = p1.x + (dx / dist) * radius, startY = p1.y + (dy / dist) * radius;
            const endX = p2.x - (dx / dist) * radius, endY = p2.y - (dy / dist) * radius;

            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', startX); lineEl.setAttribute('y1', startY);
            lineEl.setAttribute('x2', endX); lineEl.setAttribute('y2', endY);
            lineEl.setAttribute('stroke', '#ef4444');
            lineEl.setAttribute('stroke-width', '2');
            lineEl.setAttribute('marker-end', 'url(#arrow)');
            svg.appendChild(lineEl);
        }
    });
}

function getNoteCenterPosition(cellIndex, num) {
    const boardEl = document.getElementById('sudoku-board');
    const boardRect = boardEl.getBoundingClientRect();
    const cellEl = boardEl.children[cellIndex];
    if (!cellEl) return { x: 0, y: 0 };
    const cellRect = cellEl.getBoundingClientRect();
    const row = Math.floor((num - 1) / 3);
    const col = (num - 1) % 3;
    const w = cellRect.width / 3, h = cellRect.height / 3;
    return {
        x: (cellRect.left - boardRect.left) + col * w + w / 2,
        y: (cellRect.top - boardRect.top) + row * h + h / 2
    };
}

function checkWin() {
    if (!board.includes(0) && board.every((val, i) => val === solution[i])) {
        clearInterval(timerInterval);
        SessionLog.record('通关成功', `用时: ${document.getElementById('timer').textContent}，得分: ${score}`);
        
        // 优化：给一点微小的宏任务延时，让浏览器的点击事件彻底释放后再弹窗
        setTimeout(() => {
            setTimeout(() => {
                alert(`🎉 恭喜！成功通关！\n用时: ${document.getElementById('timer').textContent}\n最终得分: ${score}`);
                
                // 点击确定后，自动触发新游戏
                if (typeof classicStartNewGame === 'function') {
                    classicStartNewGame();
                }
            }, 50);
        }, 100);
    }
}

function startTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    isPaused = false;
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.textContent = '❚❚';
    timerInterval = setInterval(() => {
        if (!isPaused) {
            secondsElapsed++;
            const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
            const s = String(secondsElapsed % 60).padStart(2, '0');
            const timerEl = document.getElementById('timer');
            if (timerEl) timerEl.textContent = `${m}:${s}`;
        }
    }, 1000);
}