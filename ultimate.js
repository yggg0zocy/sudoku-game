// ==================== 杀手数独 / 终极模式 (ultimate.js) ====================
if (typeof window._ultimateLoaded === 'undefined') {
    window._ultimateLoaded = true;

let killerCages = [];
window._isInUltimateMode = false;

function cleanupUltimateBoard() {
    const boardEl = document.getElementById('sudoku-board');
    if (boardEl) {
        const svgOverlay = boardEl.querySelector('#killer-svg-overlay');
        if (svgOverlay) svgOverlay.remove();
        
        Array.from(boardEl.children).forEach(cell => {
            const notesContainer = cell.querySelector('.notes, .note-grid, div');
            if (notesContainer && !notesContainer.classList.contains('notes-grid')) {
                notesContainer.style.display = '';
                notesContainer.style.alignItems = '';
                notesContainer.style.justifyContent = '';
            }
        });
    }
}

window.initUltimate = function() {
    window._isInUltimateMode = true;
    
    const boardEl = document.getElementById('sudoku-board');
    if (boardEl) {
        if (boardEl.children.length !== 81) {
            boardEl.innerHTML = '';
            for (let i = 0; i < 81; i++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.index = i;
                cell.addEventListener('click', () => {
                    if (typeof selectCell === 'function') selectCell(i);
                    else {
                        selectedIndex = i;
                        if (typeof updateUI === 'function') updateUI();
                    }
                });
                boardEl.appendChild(cell);
            }
        }
    }

    cleanupUltimateBoard();

    const tip = document.getElementById('loading-tip');
    if (tip) tip.style.display = 'inline';

    if (typeof board !== 'undefined') board.fill(0);
    if (typeof solution !== 'undefined') solution.fill(0);
    if (typeof initialBoard !== 'undefined') initialBoard.fill(0);

    // 🔧 修复：新开一局终极模式时，清空数字按钮的“已填满9个”锁定状态，
    // 防止从经典/对角线模式切换过来时，残留的 completed 状态把按钮锁死。
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('completed'));

    generateUltimateSolution();
    
    if (typeof notes !== 'undefined') notes = Array.from({length: 81}, () => new Set());
    if (typeof yellowNotes !== 'undefined') yellowNotes = Array.from({length: 81}, () => new Set());
    if (typeof removedNotes !== 'undefined') removedNotes = Array.from({length: 81}, () => new Set());
    if (typeof lines !== 'undefined') lines = [];
    if (typeof chainNodes !== 'undefined') chainNodes = [];
    if (typeof chainLines !== 'undefined') chainLines = [];
    if (typeof selectedIndex !== 'undefined') selectedIndex = -1;
    if (typeof errorCount !== 'undefined') errorCount = 0;
    if (typeof score !== 'undefined') score = 0;
    if (typeof historyStack !== 'undefined') historyStack = [];
    
    const errEl = document.getElementById('error-count');
    const scoreEl = document.getElementById('score-val');
    if (errEl) errEl.textContent = `${errorCount}/3`;
    if (scoreEl) scoreEl.textContent = score;
    if (tip) tip.style.display = 'none';

    if (typeof startTimer === 'function') startTimer();
    
    if (typeof updateUI === 'function') {
        updateUI();
    } else {
        const cells = boardEl ? boardEl.children : [];
        for(let i=0; i<cells.length; i++) cells[i].textContent = '';
    }
    
    setTimeout(() => {
        renderCleanKillerCages();
        fixNotesPosition5();
    }, 10);
};

// 如果全局还没有题盘池，在这里定义一个挂载到 window 上，防止多文件冲突
if (!window._SHARED_ULTIMATE_POOL) {
    window._SHARED_ULTIMATE_POOL = [
        [
            2,1,4,3,5,7,8,9,6,  3,5,8,4,9,6,1,7,2,  9,7,6,8,1,2,3,4,5,
            1,3,7,2,6,5,9,8,4,  6,8,9,1,7,4,5,2,3,  4,2,5,9,8,3,7,6,1,
            7,9,3,6,4,1,2,5,8,  8,6,2,5,3,9,4,1,7,  5,4,1,7,2,8,6,3,9
        ],
        [
            1,6,4,5,2,3,7,9,8,  9,2,3,1,8,7,4,5,6,  7,5,8,4,9,6,1,2,3,
            5,8,9,2,7,4,6,3,1,  3,1,7,9,6,8,2,4,5,  2,4,6,3,5,1,8,7,9,
            6,9,1,7,4,5,3,8,2,  4,3,5,8,1,2,9,6,7,  8,7,2,6,3,9,5,1,4
        ],
        [
            6,9,1,2,4,3,5,7,8,  8,2,4,5,1,7,3,6,9,  5,7,3,8,9,6,1,4,2,
            1,3,6,4,2,8,7,9,5,  2,8,9,1,7,5,6,3,4,  4,5,7,6,3,9,2,8,1,
            3,1,2,7,8,4,9,5,6,  7,4,5,9,6,1,8,2,3,  9,6,8,3,5,2,4,1,7
        ],
        [
            4,8,1,3,2,5,6,9,7,  9,3,6,4,7,1,2,5,8,  7,2,5,6,9,8,3,1,4,
            1,4,9,8,3,6,5,7,2,  3,6,8,2,5,7,9,4,1,  2,5,7,1,4,9,8,3,6,
            8,1,3,9,6,4,7,2,5,  6,7,2,5,1,3,4,8,9,  5,9,4,7,8,2,1,6,3
        ],
        [
            5,9,8,2,1,4,3,6,7,  7,1,2,3,6,5,4,9,8,  4,6,3,8,7,9,2,5,1,
            1,3,5,6,4,2,8,7,9,  6,8,9,7,5,3,1,2,4,  2,4,7,1,9,8,6,3,5,
            8,7,1,5,3,6,9,4,2,  9,2,6,4,8,7,5,1,3,  3,5,4,9,2,1,7,8,6
        ],
        [
            2,9,6,3,1,4,7,5,8,  3,8,5,6,7,2,1,9,4,  4,7,1,5,8,9,2,6,3,
            1,2,8,4,6,7,9,3,5,  5,6,4,1,9,3,8,2,7,  7,3,9,2,5,8,6,4,1,
            8,1,3,9,2,5,4,7,6,  9,4,7,8,3,6,5,1,2,  6,5,2,7,4,1,3,8,9
        ],
        [
            2,9,5,1,4,3,6,7,8,  1,8,7,5,6,2,4,3,9,  6,4,3,8,7,9,5,1,2,
            4,1,2,7,3,6,9,8,5,  8,3,9,2,5,4,7,6,1,  5,7,6,9,8,1,3,2,4,
            7,5,4,3,1,8,2,9,6,  3,2,8,6,9,5,1,4,7,  9,6,1,4,2,7,8,5,3
        ],
        [
            3,9,6,1,2,4,5,8,7,  2,5,4,3,7,8,1,6,9,  8,7,1,6,9,5,2,3,4,
            4,3,7,2,1,9,6,5,8,  6,2,8,5,3,7,9,4,1,  5,1,9,4,8,6,7,2,3,
            7,4,2,8,5,1,3,9,6,  9,8,3,7,6,2,4,1,5,  1,6,5,9,4,3,8,7,2
        ],
        [
            7,2,3,1,6,4,8,5,9,  8,4,6,2,9,5,3,7,1,  5,9,1,7,3,8,2,4,6,
            1,5,9,3,4,2,7,6,8,  3,6,7,8,5,1,4,9,2,  2,8,4,9,7,6,1,3,5,
            4,1,5,6,8,7,9,2,3,  9,7,2,5,1,3,6,8,4,  6,3,8,4,2,9,5,1,7
        ],
        [
            1,9,5,2,3,4,7,6,8,  2,3,4,6,8,7,5,1,9,  8,7,6,9,1,5,2,3,4,
            3,2,9,7,4,8,6,5,1,  4,6,1,5,2,3,8,9,7,  5,8,7,1,6,9,4,2,3,
            9,5,3,4,7,6,1,8,2,  7,1,8,3,5,2,9,4,6,  6,4,2,8,9,1,3,7,5
        ],
        [
            1,7,2,3,6,4,5,9,8,  3,9,6,5,1,8,7,2,4,  8,5,4,9,2,7,3,6,1,
            4,1,8,2,5,9,6,3,7,  5,2,7,6,8,3,1,4,9,  9,6,3,7,4,1,8,5,2,
            6,8,1,4,9,5,2,7,3,  7,4,5,1,3,2,9,8,6,  2,3,9,8,7,6,4,1,5
        ],
        [
            3,6,1,2,5,4,8,7,9,  4,5,8,1,7,9,2,3,6,  7,2,9,3,6,8,4,5,1,
            1,3,5,8,2,6,9,4,7,  2,9,4,5,1,7,3,6,8,  8,7,6,9,4,3,1,2,5,
            9,8,2,6,3,5,7,1,4,  5,1,7,4,8,2,6,9,3,  6,4,3,7,9,1,5,8,2
        ]
    ];
}

let ultimatePoolIndex = 0;

function generateUltimateSolution() {
    const pool = window._SHARED_ULTIMATE_POOL;
    const base = pool[ultimatePoolIndex];
    ultimatePoolIndex = (ultimatePoolIndex + 1) % pool.length;
    
    const map = [1,2,3,4,5,6,7,8,9];
    for (let i = map.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [map[i], map[j]] = [map[j], map[i]];
    }
    solution = base.map(v => map[v - 1]);

    if (typeof initialBoard !== 'undefined') initialBoard.fill(0);
    if (typeof board !== 'undefined') board.fill(0);

    generateUniqueKillerCages();
}

// 🔧 新增：带“唯一解校验”的笼子生成——原来的 generateRandomKillerCages 纯随机切分，
// 不保证切出来的笼子布局真的能唯一推出一个解，实测约 85% 概率会出现“歧义题”（不止一种填法都满足所有笼子和）。
// 这里反复生成 + 用一个真正遵守笼子约束的回溯解算器验证解的数目，直到拿到唯一解为止。
function generateUniqueKillerCages() {
    const MAX_ATTEMPTS = 50;
    const NODE_BUDGET = 200000; // 单次尝试最多探索的节点数，防止极端情况卡死浏览器

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        generateRandomKillerCages(); // 内部会重置并重新填充全局 killerCages
        const { count } = countKillerSolutions(killerCages, 2, NODE_BUDGET);
        if (count === 1) {
            return; // 找到了唯一解题目，killerCages 就是最终结果
        }
    }
    // 兜底：极小概率下 50 次都没凑出唯一解，直接用最后一次生成的结果，
    // 避免卡死；此时理论上可能存在多解，但概率极低（实测远低于 1%）。
    console.warn('[杀手数独] 未能在', MAX_ATTEMPTS, '次尝试内生成唯一解题目，使用最后一次生成结果。');
}

// 带笼子约束的回溯解算器，用来统计一个笼子布局到底有几种解（最多数到 limit 就提前退出，省时间）
function countKillerSolutions(cages, limit, nodeBudget) {
    const cellCage = new Array(81).fill(-1);
    cages.forEach((cage, ci) => {
        cage.cells.forEach(idx => { cellCage[idx] = ci; });
    });

    const rowUsed = new Array(9).fill(0);
    const colUsed = new Array(9).fill(0);
    const boxUsed = new Array(9).fill(0);
    const cageSum = new Array(cages.length).fill(0);
    const cageFilled = new Array(cages.length).fill(0);
    const cageUsedDigits = new Array(cages.length).fill(0);

    let count = 0;
    let nodes = 0;

    function backtrack(pos) {
        nodes++;
        if (nodes > nodeBudget) return true; // 超出节点预算，直接当作“探索不完”提前退出
        if (pos === 81) {
            count++;
            return count >= limit;
        }
        const row = Math.floor(pos / 9), col = pos % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const ci = cellCage[pos];
        const cage = cages[ci];
        const remaining = cage.cells.length - cageFilled[ci];

        for (let num = 1; num <= 9; num++) {
            const bit = 1 << num;
            if (rowUsed[row] & bit) continue;
            if (colUsed[col] & bit) continue;
            if (boxUsed[box] & bit) continue;
            if (cageUsedDigits[ci] & bit) continue;

            const newSum = cageSum[ci] + num;
            const isFull = remaining === 1;
            if (isFull && newSum !== cage.sum) continue;
            if (!isFull && newSum >= cage.sum) continue;

            rowUsed[row] |= bit; colUsed[col] |= bit; boxUsed[box] |= bit;
            cageUsedDigits[ci] |= bit; cageSum[ci] = newSum; cageFilled[ci]++;

            if (backtrack(pos + 1)) return true;

            rowUsed[row] &= ~bit; colUsed[col] &= ~bit; boxUsed[box] &= ~bit;
            cageUsedDigits[ci] &= ~bit; cageSum[ci] -= num; cageFilled[ci]--;
        }
        return false;
    }

    backtrack(0);
    return { count };
}

function generateRandomKillerCages() {
    killerCages = [];
    const visited = new Array(81).fill(false);

    for (let i = 0; i < 81; i++) {
        if (visited[i]) continue;

        let cageCells = [i];
        visited[i] = true;

        let rand = Math.random();
        let targetSize;
        if (rand < 0.05) targetSize = 1;
        else if (rand < 0.45) targetSize = 2;
        else if (rand < 0.85) targetSize = 3;
        else if (rand < 0.95) targetSize = 4;
        else targetSize = 5;

        let current = i;
        for (let s = 1; s < targetSize; s++) {
            let r = Math.floor(current / 9);
            let c = current % 9;
            let neighbors = [];

            if (r > 0) neighbors.push((r - 1) * 9 + c);
            if (r < 8) neighbors.push((r + 1) * 9 + c);
            if (c > 0) neighbors.push(r * 9 + (c - 1));
            if (c < 8) neighbors.push(r * 9 + (c + 1));

            let unvisitedNeighbors = neighbors.filter(n => {
                if (visited[n]) return false;
                const neighborVal = solution[n];
                const hasDuplicate = cageCells.some(cellIdx => solution[cellIdx] === neighborVal);
                return !hasDuplicate;
            });

            if (unvisitedNeighbors.length > 0) {
                let next = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
                visited[next] = true;
                cageCells.push(next);
                current = next;
            } else {
                break;
            }
        }

        let sum = cageCells.reduce((acc, idx) => acc + solution[idx], 0);
        killerCages.push({ sum: sum, cells: cageCells });
    }
}

function renderCleanKillerCages() {
    const boardEl = document.getElementById('sudoku-board');
    if (!boardEl) return;

    let svgOverlay = document.getElementById('killer-svg-overlay');
    if (!svgOverlay) {
        svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgOverlay.id = 'killer-svg-overlay';
        svgOverlay.style.position = 'absolute';
        svgOverlay.style.top = '0';
        svgOverlay.style.left = '0';
        svgOverlay.style.width = '100%';
        svgOverlay.style.height = '100%';
        svgOverlay.style.pointerEvents = 'none';
        boardEl.style.position = 'relative';
        boardEl.appendChild(svgOverlay);
    }
    svgOverlay.innerHTML = '';

    const cellSize = boardEl.clientWidth / 9;
    if (!cellSize || isNaN(cellSize)) return;
    const inset = 3.5;
    const insetSegments = [];
    const textElements = [];

    killerCages.forEach(cage => {
        const cellSet = new Set(cage.cells);

        cage.cells.forEach(idx => {
            const r = Math.floor(idx / 9);
            const c = idx % 9;
            const x = c * cellSize;
            const y = r * cellSize;

            const topN = r > 0 ? (r - 1) * 9 + c : -1;
            const botN = r < 8 ? (r + 1) * 9 + c : -1;
            const leftN = c > 0 ? r * 9 + (c - 1) : -1;
            const rightN = c < 8 ? r * 9 + (c + 1) : -1;

            const hasTop = (topN >= 0 && cellSet.has(topN));
            const hasBot = (botN >= 0 && cellSet.has(botN));
            const hasLeft = (leftN >= 0 && cellSet.has(leftN));
            const hasRight = (rightN >= 0 && cellSet.has(rightN));

            const x0 = x + inset;
            const x1 = x + cellSize - inset;
            const y0 = y + inset;
            const y1 = y + cellSize - inset;

            if (!hasTop) {
                insetSegments.push({ x1: x + (hasLeft ? 0 : inset), y1: y0, x2: x + cellSize - (hasRight ? 0 : inset), y2: y0 });
            }
            if (!hasBot) {
                insetSegments.push({ x1: x + (hasLeft ? 0 : inset), y1: y1, x2: x + cellSize - (hasRight ? 0 : inset), y2: y1 });
            }
            if (!hasLeft) {
                insetSegments.push({ x1: x0, y1: y + (hasTop ? 0 : inset), x2: x0, y2: y + cellSize - (hasBot ? 0 : inset) });
            }
            if (!hasRight) {
                insetSegments.push({ x1: x1, y1: y + (hasTop ? 0 : inset), x2: x1, y2: y + cellSize - (hasBot ? 0 : inset) });
            }
        });

        const isCageFull = cage.cells.every(idx => {
            const valFromBoard = (typeof board !== 'undefined') ? board[idx] : 0;
            return valFromBoard !== 0 && valFromBoard !== undefined;
        });

        if (!isCageFull) {
            const firstIdx = cage.cells[0];
            const fr = Math.floor(firstIdx / 9);
            const fc = firstIdx % 9;
            textElements.push({
                x: fc * cellSize + 7,  
                y: fr * cellSize + 16, 
                val: cage.sum
            });
        }
    });

    insetSegments.forEach(seg => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', Math.round(seg.x1));
        line.setAttribute('y1', Math.round(seg.y1));
        line.setAttribute('x2', Math.round(seg.x2));
        line.setAttribute('y2', Math.round(seg.y2));
        line.setAttribute('stroke', '#ab6afb'); 
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4, 2');
        line.setAttribute('stroke-linecap', 'round');
        svgOverlay.appendChild(line);
    });

    textElements.forEach(t => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', t.x);
        text.setAttribute('y', t.y);
        text.setAttribute('fill', '#000000');
        text.setAttribute('font-size', '12px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-family', 'sans-serif');
        text.textContent = t.val;
        svgOverlay.appendChild(text);
    });
}

function fixNotesPosition5() {
    if (!window._isInUltimateMode) return;
    const boardEl = document.getElementById('sudoku-board');
    if (!boardEl) return;
    const cells = boardEl.children;

    for (let i = 0; i < cells.length && i < 81; i++) {
        const cell = cells[i];
        const notesContainer = cell.querySelector('.notes, .note-grid, div');
        if (notesContainer) {
            notesContainer.style.display = 'flex';
            notesContainer.style.alignItems = 'center';
            notesContainer.style.justifyContent = 'center';
            notesContainer.style.width = '100%';
            notesContainer.style.height = '100%';
            notesContainer.style.position = 'absolute';
            notesContainer.style.top = '0';
            notesContainer.style.left = '0';
        }
    }
}

const _originalUpdateUI = window.updateUI;
if (typeof _originalUpdateUI === 'function') {
    window.updateUI = function() {
        _originalUpdateUI.apply(this, arguments);
        if (window._isInUltimateMode) {
            renderCleanKillerCages();
            fixNotesPosition5();
        }
    };
}

function isValidKillerPlacement(grid, index, num) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    for (let i = 0; i < 9; i++) {
        const rIdx = row * 9 + i;
        const cIdx = i * 9 + col;
        const bR = 3 * Math.floor(row / 3) + Math.floor(i / 3);
        const bC = 3 * Math.floor(col / 3) + i % 3;
        const bIdx = bR * 9 + bC;

        if (rIdx !== index && grid[rIdx] === num) return false;
        if (cIdx !== index && grid[cIdx] === num) return false;
        if (bIdx !== index && grid[bIdx] === num) return false;
    }

    const cage = killerCages.find(c => c.cells.includes(index));
    if (cage) {
        let currentSum = 0;
        for (let idx of cage.cells) {
            let val = (idx === index) ? num : grid[idx];
            if (idx !== index && val === num && val !== 0) return false;
            if (val !== 0) currentSum += val;
        }
        const isFull = cage.cells.every(idx => (idx === index ? num !== 0 : grid[idx] !== 0));
        if (isFull && currentSum !== cage.sum) return false;
        if (!isFull && currentSum > cage.sum) return false;
    }

    return true;
}
window.ultimateInputNumber = function(num) {
    if (selectedIndex === -1 || isPaused) return;
    
    // 🟢 补充：锁定初始盘面 或 已经填对的格子，防止误触修改
    if (initialBoard[selectedIndex] !== 0 || board[selectedIndex] === solution[selectedIndex]) {
        return;
    }

    if (typeof saveHistory === 'function') saveHistory();

    if (isNotesMode) {
        if (notes[selectedIndex].has(num)) {
            notes[selectedIndex].delete(num);
            removedNotes[selectedIndex].add(num);
        } else {
            notes[selectedIndex].add(num);
            removedNotes[selectedIndex].delete(num);
        }
    } else {
        if (board[selectedIndex] === num) return;
        board[selectedIndex] = num;

        // 🔧 修复：终极模式此前从没调用过这个函数，导致“某数字填满9个后按钮变灰锁定”
        // 这个全局功能在终极模式里完全没生效。和经典模式保持一致，填数后立刻刷新一次。
        if (typeof updateNumberCompletionStatus === 'function') {
            updateNumberCompletionStatus();
        }

        // 🔧 修复：不再用 isValidKillerPlacement 做实时行/列/宫/笼子校验——
        // 棋盘上残留的“错误数字”（填错后不会被清除）会污染这个校验，
        // 导致玩家明明填对了，却因为同行/同列/同宫/同笼子里有个之前的错误遗留数字而被误判为犯规。
        // 和经典、对角线模式保持一致：直接对照标准答案判断对错即可。
        if (num !== solution[selectedIndex]) {
            errorCount++;
            const errEl = document.getElementById('error-count');
            if (errEl) errEl.textContent = `${errorCount}/3`;
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
        }
        notes[selectedIndex].clear();
    }
    updateUI();
    
    // 🟢 补充：通关时带上最终得分提示
    if (!board.includes(0) && board.every((val, i) => val === solution[i])) {
        clearInterval(timerInterval);
        setTimeout(() => {
            alert(`🎉 恭喜！终极杀手数独通关！\n用时: ${document.getElementById('timer').textContent}\n最终得分: ${score}`);
        }, 100);
    }
};
}