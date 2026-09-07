// ==================== 1. 全局核心状态与公共底座 ====================
let currentGameMode = 'classic'; 
let pendingTargetMode = '';       

let board = Array(81).fill(0);
let solution = Array(81).fill(0); 
let initialBoard = Array(81).fill(0);
let notes = Array.from({length: 81}, () => new Set());
let yellowNotes = Array.from({length: 81}, () => new Set());
let removedNotes = Array.from({length: 81}, () => new Set());
let selectedIndex = -1;
let isNotesMode = false;
let isYellowMode = false;
let isLineMode = false;
let lines = [];
let historyStack = [];
let isPaused = false;
let timerInterval = null;
let secondsElapsed = 0;
let isChainMode = false;
let chainNodes = []; 
let chainLines = [];

// ================ 1. 拦截用户的切换请求，弹出确认弹窗 ====================
window.requestSwitchMode = function(mode) {
    if (currentGameMode === mode) return; 
    pendingTargetMode = mode;            
    
    const modal = document.getElementById('switch-modal');
    if (modal) {
        modal.style.display = 'flex';    
    } else {
        window.confirmSwitchMode();
    }
};

// ==================== 2. 顶栏按钮与弹窗路由调度中心 ====================
window.confirmSwitchMode = function() {
    const modal = document.getElementById('switch-modal');
    if (modal) modal.style.display = 'none';
    
    if (pendingTargetMode) {
        window._isInUltimateMode = false;
        
        const boardEl = document.getElementById('sudoku-board');
        if (boardEl) {
            boardEl.innerHTML = '';
            boardEl.className = 'sudoku-board';
            const killerSvg = boardEl.querySelector('#killer-svg-overlay');
            if (killerSvg) killerSvg.remove();
        }
        
        const lineSvg = document.getElementById('line-svg');
        if (lineSvg) {
            lineSvg.innerHTML = '';
        }

        // 重置公共基础数据
        board = Array(81).fill(0);
        solution = Array(81).fill(0);
        initialBoard = Array(81).fill(0);
        selectedIndex = -1;
        notes = Array.from({length: 81}, () => new Set());
        yellowNotes = Array.from({length: 81}, () => new Set());
        removedNotes = Array.from({length: 81}, () => new Set());

        currentGameMode = pendingTargetMode;
        let mode = pendingTargetMode;
        pendingTargetMode = ''; 

        document.querySelectorAll('.mode-btn').forEach(b => {
            b.classList.remove('active');
            const attr = b.getAttribute('onclick') || '';
            if (attr.includes(`'${mode}'`) || attr.includes(`"${mode}"`)) {
                b.classList.add('active');
            }
        });

        if (typeof createBoardUI === 'function') {
            createBoardUI();
        }

        switch (mode) {
            case 'classic':
            case 'blank':
                if (typeof initClassicOrBlank === 'function') initClassicOrBlank(mode);
                break;
            case 'diagonal':
                if (typeof initDiagonal === 'function') initDiagonal();
                break;
            case 'ultimate':
                window._isInUltimateMode = true;
                if (typeof initUltimate === 'function') initUltimate();
                break;
        }
    }
};

// ==================== 3. 公共基础网格渲染框架 ====================
function createBoardUI() {
    const boardEl = document.getElementById('sudoku-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.onclick = function() {
            if (typeof selectCell === 'function') selectCell(i);
        };
        boardEl.appendChild(cell);
    }
}
// ====================4. 页面加载与模式桥梁 ====================
window.onload = function() {
    createBoardUI();
    if (typeof initClassicOrBlank === 'function') {
        initClassicOrBlank('classic');
    } else if (typeof startNewGame === 'function') {
        startNewGame();
    }
    
    // 独立执行，确保初始化时检查一次
    if (typeof updateNumberCompletionStatus === 'function') {
        updateNumberCompletionStatus();
    }
};

// ====================5.“新游戏”按钮分发直通车 ====================
window.startNewGame = function() {
    const boardEl = document.getElementById('sudoku-board');
    if (boardEl) {
        boardEl.innerHTML = '';
        boardEl.className = 'sudoku-board';
        const killerSvg = boardEl.querySelector('#killer-svg-overlay');
        if (killerSvg) killerSvg.remove();
    }
    const lineSvg = document.getElementById('line-svg');
    if (lineSvg) lineSvg.innerHTML = '';

    if (typeof createBoardUI === 'function') {
        createBoardUI();
    }

    switch (currentGameMode) {
        case 'classic':
        case 'blank':
            if (typeof classicStartNewGame === 'function') classicStartNewGame();
            else if (typeof initClassicOrBlank === 'function') initClassicOrBlank(currentGameMode);
            break;
        case 'diagonal':
            if (typeof diagonalStartNewGame === 'function') diagonalStartNewGame();
            else if (typeof initDiagonal === 'function') initDiagonal();
            break;
        case 'ultimate':
            if (typeof ultimateStartNewGame === 'function') ultimateStartNewGame();
            else if (typeof initUltimate === 'function') initUltimate();
            break;
        default:
            if (typeof initClassicOrBlank === 'function') initClassicOrBlank('classic');
            break;
    }
};
// 在 core.js 中统一接管全局输入
window.inputNumber = function(num) {
    if (isPaused || selectedIndex === -1) return;
    
    // 根据当前游戏模式，精准分发给对应的处理函数
    switch (currentGameMode) {
        case 'classic':
        case 'blank':
            if (typeof classicInputNumber === 'function') {
                classicInputNumber(num);
            }
            break;
        case 'diagonal':
            if (typeof diagonalInputNumber === 'function') {
                diagonalInputNumber(num);
            }
            break;
        case 'ultimate':
            if (typeof ultimateInputNumber === 'function') {
                ultimateInputNumber(num);
            }
            break;
        default:
            if (typeof classicInputNumber === 'function') {
                classicInputNumber(num);
            }
            break;
    }
};
// ==================== 6. 公共工具函数（撤销、暂停等） ====================
function saveHistory() {
    historyStack.push({ 
        board: [...board], 
        initialBoard: [...initialBoard],
        notes: notes.map(s => new Set(s)),
        yellowNotes: yellowNotes.map(s => new Set(s)),
        removedNotes: removedNotes.map(s => new Set(s)),
        lines: [...lines]
    });
}

function undo() {
    if (historyStack.length === 0 || isPaused) return;
    const last = historyStack.pop();
    board = last.board;
    initialBoard = last.initialBoard || initialBoard;
    notes = last.notes;
    yellowNotes = last.yellowNotes;
    removedNotes = last.removedNotes;
    lines = last.lines;
    if (typeof updateUI === 'function') updateUI();
}

function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.textContent = isPaused ? '▶' : '❚❚';
}


// ====================7. 数字填满9个后的全局状态更新 ====================
window.updateNumberCompletionStatus = function() {
    // 1. 统计当前棋盘上每个数字（1到9）各自被填了多少个
    const counts = Array(10).fill(0);
    for (let i = 0; i < board.length; i++) {
        const val = board[i];
        if (val >= 1 && val <= 9) {
            counts[val]++;
        }
    }

    // 2. 找到右侧数字键盘里的所有按钮并更新状态
    const numButtons = document.querySelectorAll('.num-btn');
    numButtons.forEach(btn => {
        // 获取按钮代表的数字（兼容文本内容或属性）
        const num = parseInt(btn.textContent.trim() || btn.dataset.num);
        if (num >= 1 && num <= 9) {
            const isCurrentlyCompleted = btn.classList.contains('completed');
            
            if (counts[num] >= 9) {
                btn.classList.add('completed');
                
                // 【在这里加】：如果它之前没有完成，而现在刚好达到 9 个，触发一次闪烁！
                if (!isCurrentlyCompleted) {
                    btn.classList.remove('cell-completed-anim');
                    void btn.offsetWidth; // 触发重绘
                    btn.classList.add('cell-completed-anim');
                    setTimeout(() => btn.classList.remove('cell-completed-anim'), 500);
                }

            } else {
                btn.classList.remove('completed');
            }
        }
    });
};
// ====================7. 全局锁定已填对的格子 ====================
window.inputNumber = function(num) {
    if (isPaused || selectedIndex === -1) return;
    
    if (currentGameMode !== 'blank') {
        if (initialBoard[selectedIndex] !== 0 || board[selectedIndex] === solution[selectedIndex]) {
            return; // 已经锁定的格子，直接拦截，不准修改！
        }
    }
    
    switch (currentGameMode) {
        case 'classic':
        case 'blank':
            if (typeof classicInputNumber === 'function') {
                classicInputNumber(num);
            }
            break;
        case 'diagonal':
            if (typeof diagonalInputNumber === 'function') {
                diagonalInputNumber(num);
            }
            break;
        case 'ultimate':
            if (typeof ultimateInputNumber === 'function') {
                ultimateInputNumber(num);
            }
            break;
        default:
            if (typeof classicInputNumber === 'function') {
                classicInputNumber(num);
            }
            break;
    }
};
//==================8. 检查并触发行列宫完成动效===========
function checkAndAnimateCompletion(row, col) {
    // 假设你的单元格 DOM 带有类似 data-row 和 data-col 属性，或者你可以根据索引直接获取
    // 这里以标准网格查找为例：
    const getCell = (r, c) => {
        const board = document.getElementById('sudoku-board');
        if (!board) return null;
        // 如果你的格子是按顺序排列的 0-80
        return board.children[r * 9 + c];
    };

    const triggerAnim = (cells) => {
        cells.forEach(cell => {
            if (!cell) return;
            cell.classList.remove('cell-completed-anim');
            void cell.offsetWidth; // 触发重绘
            cell.classList.add('cell-completed-anim');
        });
        setTimeout(() => {
            cells.forEach(cell => {
                if (cell) cell.classList.remove('cell-completed-anim');
            });
        }, 500);
    };

    // 1. 检查当前行 (row) 是否填满
    let rowCells = [];
    let rowComplete = true;
    for (let c = 0; c < 9; c++) {
        let cell = getCell(row, c);
        if (!cell || !cell.textContent.trim()) { rowComplete = false; break; }
        rowCells.push(cell);
    }
    if (rowComplete) triggerAnim(rowCells);

    // 2. 检查当前列 (col) 是否填满
    let colCells = [];
    let colComplete = true;
    for (let r = 0; r < 9; r++) {
        let cell = getCell(r, col);
        if (!cell || !cell.textContent.trim()) { colComplete = false; break; }
        colCells.push(cell);
    }
    if (colComplete) triggerAnim(colCells);

    // 3. 检查当前 3x3 宫是否填满
    let boxRowStart = Math.floor(row / 3) * 3;
    let boxColStart = Math.floor(col / 3) * 3;
    let boxCells = [];
    let boxComplete = true;
    for (let r = boxRowStart; r < boxRowStart + 3; r++) {
        for (let c = boxColStart; c < boxColStart + 3; c++) {
            let cell = getCell(r, c);
            if (!cell || !cell.textContent.trim()) { boxComplete = false; break; }
            boxCells.push(cell);
        }
    }
    if (boxComplete) triggerAnim(boxCells);
}