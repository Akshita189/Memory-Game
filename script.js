// ============================================================================
// FILE: script.js
// Description: JavaScript with FIXED AI Memory + Multiplayer Mode
// ============================================================================

// Game State Object
const gameState = {
    rows: 0,
    cols: 0,
    grid: [],                    // 2D Array - Main Data Structure
    moveHistory: [],             // Stack - For undo functionality
    aiMemory: new Map(),         // HashMap - AI memory implementation
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    player1Score: 0,
    player2Score: 0,
    isPlayer1Turn: true,
    isProcessing: false,
    difficulty: '',
    aiDelay: 1000,
    gameMode: 'ai',              // 'ai' or 'multiplayer'
    isAIGame: true
    ,isActive: false
};

// Difficulty Tree Structure (Binary Tree implementation)
class DifficultyNode {
    constructor(name, rows, cols, timeLimit, aiDelay) {
        this.levelName = name;
        this.rows = rows;
        this.cols = cols;
        this.timeLimit = timeLimit;
        this.aiDelay = aiDelay;
        this.easier = null;
        this.harder = null;
    }
}

// Create Difficulty Binary Tree
const createDifficultyTree = () => {
    const root = new DifficultyNode("Medium", 4, 4, 120, 1000);
    root.easier = new DifficultyNode("Easy", 3, 4, 180, 1500);
    root.harder = new DifficultyNode("Hard", 4, 6, 90, 800);
    
    root.easier.harder = root;
    root.harder.easier = root;
    
    return root;
};

const difficultyTree = createDifficultyTree();

// Card Class
class Card {
    constructor(symbol, row, col) {
        this.symbol = symbol;
        this.row = row;
        this.col = col;
        this.isRevealed = false;
        this.isMatched = false;
    }
    
    reveal() {
        this.isRevealed = true;
    }
    
    hide() {
        this.isRevealed = false;
    }
    
    setMatched() {
        this.isMatched = true;
    }
}

// Stack Implementation
class Stack {
    constructor() {
        this.items = [];
    }
    
    push(element) {
        this.items.push(element);
    }
    
    pop() {
        if (this.isEmpty()) return null;
        return this.items.pop();
    }
    
    top() {
        if (this.isEmpty()) return null;
        return this.items[this.items.length - 1];
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    size() {
        return this.items.length;
    }
    
    clear() {
        this.items = [];
    }
}

// FIXED AI Player with HashMap Memory
class AIPlayer {
    constructor() {
        this.memory = new Map(); // HashMap: symbol -> array of positions
    }
    
    // Remember a card that was revealed
    rememberCard(symbol, row, col) {
        if (!this.memory.has(symbol)) {
            this.memory.set(symbol, []);
        }
        
        // Check if position already exists
        const positions = this.memory.get(symbol);
        const exists = positions.some(p => p.row === row && p.col === col);
        
        if (!exists) {
            positions.push({row, col});
            console.log(`🧠 AI remembers: ${symbol} at (${row}, ${col})`);
        }
    }
    
    // Forget a card that was matched
    forgetCard(symbol, row, col) {
        if (this.memory.has(symbol)) {
            const positions = this.memory.get(symbol);
            const filtered = positions.filter(p => p.row !== row || p.col !== col);
            
            if (filtered.length === 0) {
                this.memory.delete(symbol);
                console.log(`🧠 AI forgets symbol: ${symbol} (all matched)`);
            } else {
                this.memory.set(symbol, filtered);
                console.log(`🧠 AI forgets position: ${symbol} at (${row}, ${col})`);
            }
        }
    }
    
    // FIXED: AI makes intelligent moves based on memory
    makeMove(grid, firstCard = null) {
        console.log('\n🤖 AI Making Move...');
        console.log('Current Memory:', this.memory);
        
        // If we have a first card, try to find its match in memory
        if (firstCard) {
            const targetSymbol = grid[firstCard.row][firstCard.col].symbol;
            console.log(`Looking for match for: ${targetSymbol}`);
            
            if (this.memory.has(targetSymbol)) {
                const positions = this.memory.get(targetSymbol);
                console.log(`Found ${positions.length} positions in memory for ${targetSymbol}`);
                
                // Find a valid matching position
                for (const pos of positions) {
                    const card = grid[pos.row][pos.col];
                    
                    // Check if this is a different card and still available
                    if ((pos.row !== firstCard.row || pos.col !== firstCard.col) &&
                        !card.isMatched && !card.isRevealed) {
                        console.log(`✅ AI found match in memory! Position (${pos.row}, ${pos.col})`);
                        return pos;
                    }
                }
            } else {
                console.log(`❌ No memory of ${targetSymbol} yet`);
            }
        }
        
        // No match found in memory, pick a random unrevealed card
        const available = [];
        for (let i = 0; i < grid.length; i++) {
            for (let j = 0; j < grid[0].length; j++) {
                if (!grid[i][j].isMatched && !grid[i][j].isRevealed) {
                    available.push({row: i, col: j});
                }
            }
        }
        
        if (available.length === 0) return null;
        
        const randomChoice = available[Math.floor(Math.random() * available.length)];
        console.log(`🎲 AI picks random card at (${randomChoice.row}, ${randomChoice.col})`);
        return randomChoice;
    }
    
    getMemorySize() {
        let total = 0;
        for (const positions of this.memory.values()) {
            total += positions.length;
        }
        return total;
    }
    
    getMemoryDetails() {
        const details = [];
        for (const [symbol, positions] of this.memory.entries()) {
            details.push({
                symbol: symbol,
                positions: positions.map(p => `(${p.row},${p.col})`).join(', ')
            });
        }
        return details;
    }
    
    clearMemory() {
        this.memory.clear();
    }
}

const ai = new AIPlayer();
const moveStack = new Stack();

// Symbol set for cards
const symbols = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍒', '🍑', '🍍', '🥝', '🍉', '🍋', '🥥', '🍆', '🥕', '🌽', '🥑'];

// Mode Selection
function selectMode(mode) {
    gameState.gameMode = mode;
    gameState.isAIGame = (mode === 'ai');
    
    document.getElementById('dsInfo').classList.add('hidden');
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('difficultySelect').classList.remove('hidden');
}

function backToModeSelect() {
    document.getElementById('difficultySelect').classList.add('hidden');
    document.getElementById('modeSelect').style.display = 'block';
    document.getElementById('dsInfo').classList.remove('hidden');
}

// Start Game Function
function startGame(difficulty) {
    let level;
    switch(difficulty) {
        case 'easy':
            level = difficultyTree.easier;
            break;
        case 'medium':
            level = difficultyTree;
            break;
        case 'hard':
            level = difficultyTree.harder;
            break;
        default:
            level = difficultyTree;
    }
    
    gameState.rows = level.rows;
    gameState.cols = level.cols;
    gameState.aiDelay = level.aiDelay;
    gameState.difficulty = difficulty;
    
    document.getElementById('difficultySelect').classList.add('hidden');
    document.getElementById('gameContainer').style.display = 'block';
    
    // Update UI labels based on game mode
    if (gameState.gameMode === 'multiplayer') {
        document.getElementById('player1Icon').textContent = '👤';
        document.getElementById('player1Label').textContent = 'Player 1';
        document.getElementById('player2Icon').textContent = '👥';
        document.getElementById('player2Label').textContent = 'Player 2';
        
        // Hide AI-specific elements in multiplayer
        document.querySelector('.btn-memory').style.display = 'none';
        document.getElementById('statsPanel').children[1].style.display = 'none'; // AI Memory stat
    } else {
        document.getElementById('player1Icon').textContent = '👤';
        document.getElementById('player1Label').textContent = 'Player';
        document.getElementById('player2Icon').textContent = '🤖';
        document.getElementById('player2Label').textContent = 'AI';
        
        // Show AI-specific elements in AI mode
        document.querySelector('.btn-memory').style.display = 'flex';
        document.getElementById('statsPanel').children[1].style.display = 'flex'; // AI Memory stat
    }
    
    initializeGame();
    // Mark the game as active so handlers and AI know play is ongoing
    gameState.isActive = true;
}

// Initialize Game
function initializeGame() {
    const totalCards = gameState.rows * gameState.cols;
    gameState.totalPairs = totalCards / 2;
    
    // Create pairs of symbols
    let cards = [];
    for (let i = 0; i < gameState.totalPairs; i++) {
        cards.push(symbols[i], symbols[i]);
    }
    
    shuffleArray(cards);
    
    // Create 2D grid
    gameState.grid = [];
    let idx = 0;
    for (let i = 0; i < gameState.rows; i++) {
        gameState.grid[i] = [];
        for (let j = 0; j < gameState.cols; j++) {
            gameState.grid[i][j] = new Card(cards[idx++], i, j);
        }
    }
    
    resetScores();
    renderBoard();
    updateStatistics();
}

// Shuffle Array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Render Board
function renderBoard() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    board.className = `game-board grid-${gameState.rows}x${gameState.cols}`;
    
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            const card = gameState.grid[i][j];
            const cardElement = createCardElement(card, i, j);
            board.appendChild(cardElement);
        }
    }
}

// Create Card Element
function createCardElement(card, row, col) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.row = row;
    cardDiv.dataset.col = col;
    
    if (card.isRevealed) cardDiv.classList.add('flipped');
    if (card.isMatched) cardDiv.classList.add('matched');
    
    // Disable cards if it's AI's turn (only in AI mode)
    if (gameState.isAIGame && !gameState.isPlayer1Turn) {
        cardDiv.classList.add('disabled');
    }
    
    cardDiv.innerHTML = `
        <div class="card-inner">
            <div class="card-face card-back"></div>
            <div class="card-face card-front">${card.symbol}</div>
        </div>
    `;
    
    cardDiv.addEventListener('click', () => handleCardClick(row, col));
    
    return cardDiv;
}

// Handle Card Click
function handleCardClick(row, col) {
    if (!gameState.isActive) return; // ignore clicks when no active game
    if (gameState.isProcessing) return;
    
    // In AI mode, block clicks during AI turn
    if (gameState.isAIGame && !gameState.isPlayer1Turn) return;
    
    const card = gameState.grid[row][col];
    if (card.isRevealed || card.isMatched) return;
    
    flipCard(row, col);
    gameState.flippedCards.push({row, col});
    
    if (gameState.flippedCards.length === 2) {
        gameState.isProcessing = true;
        setTimeout(checkMatch, 1000);
    }
}

// Flip Card
function flipCard(row, col) {
    const card = gameState.grid[row][col];
    card.reveal();
    
    const cardElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cardElement.classList.add('flipped');
}

// Unflip Card
function unflipCard(row, col) {
    const card = gameState.grid[row][col];
    card.hide();
    
    const cardElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cardElement.classList.remove('flipped');
}

// Check Match
function checkMatch() {
    const [card1, card2] = gameState.flippedCards;
    const symbol1 = gameState.grid[card1.row][card1.col].symbol;
    const symbol2 = gameState.grid[card2.row][card2.col].symbol;
    
    if (symbol1 === symbol2) {
        // Match found!
        gameState.grid[card1.row][card1.col].setMatched();
        gameState.grid[card2.row][card2.col].setMatched();
        
        if (gameState.isPlayer1Turn) {
            gameState.player1Score++;
        } else {
            gameState.player2Score++;
        }
        
        gameState.matchedPairs++;
        
        const elem1 = document.querySelector(`[data-row="${card1.row}"][data-col="${card1.col}"]`);
        const elem2 = document.querySelector(`[data-row="${card2.row}"][data-col="${card2.col}"]`);
        elem1.classList.add('matched');
        elem2.classList.add('matched');
        
        // AI forgets matched cards (only in AI mode)
        if (gameState.isAIGame) {
            ai.forgetCard(symbol1, card1.row, card1.col);
            ai.forgetCard(symbol2, card2.row, card2.col);
        }
        
        // Push to stack
        moveStack.push({card1, card2, isPlayer1: gameState.isPlayer1Turn});
        
        updateScore();
        updateStatistics();
        
        if (gameState.isAIGame) {
            updateAIMemoryDisplay();
        }
        
        if (checkGameOver()) {
            setTimeout(showGameOver, 500);
        }
    } else {
        // No match - AI learns from revealed cards (only in AI mode)
        if (gameState.isAIGame) {
            ai.rememberCard(symbol1, card1.row, card1.col);
            ai.rememberCard(symbol2, card2.row, card2.col);
        }
        
        const elem1 = document.querySelector(`[data-row="${card1.row}"][data-col="${card1.col}"]`);
        const elem2 = document.querySelector(`[data-row="${card2.row}"][data-col="${card2.col}"]`);
        elem1.classList.add('no-match');
        elem2.classList.add('no-match');
        
        setTimeout(() => {
            unflipCard(card1.row, card1.col);
            unflipCard(card2.row, card2.col);
            elem1.classList.remove('no-match');
            elem2.classList.remove('no-match');
        }, 500);
        
        // Update AI memory display after learning
        if (gameState.isAIGame) {
            updateAIMemoryDisplay();
        }
    }
    
    gameState.flippedCards = [];
    gameState.isProcessing = false;
    
    // Update statistics immediately
    if (gameState.isAIGame) {
        updateStatistics();
    }
    
    if (!checkGameOver()) {
        switchTurn();
    }
}

// Switch Turn
function switchTurn() {
    gameState.isPlayer1Turn = !gameState.isPlayer1Turn;
    
    const indicator = document.getElementById('turnIndicator');
    const cards = document.querySelectorAll('.card:not(.matched)');
    
    if (gameState.isPlayer1Turn) {
        if (gameState.gameMode === 'multiplayer') {
            indicator.innerHTML = '<span class="turn-icon">👤</span><span class="turn-text">Player 1\'s Turn</span>';
        } else {
            indicator.innerHTML = '<span class="turn-icon">👤</span><span class="turn-text">Your Turn! Click a card</span>';
        }
        indicator.className = 'turn-indicator player';
        cards.forEach(card => card.classList.remove('disabled'));
    } else {
        if (gameState.gameMode === 'multiplayer') {
            indicator.innerHTML = '<span class="turn-icon">👥</span><span class="turn-text">Player 2\'s Turn</span>';
            indicator.className = 'turn-indicator player2';
            cards.forEach(card => card.classList.remove('disabled'));
        } else {
            indicator.innerHTML = '<span class="turn-icon">🤖</span><span class="turn-text">AI\'s Turn... Thinking...</span>';
            indicator.className = 'turn-indicator ai';
            cards.forEach(card => card.classList.add('disabled'));
            
            document.getElementById('aiThinking').classList.add('show');
            setTimeout(() => {
                document.getElementById('aiThinking').classList.remove('show');
                if (!gameState.isActive) return; // aborted (game exited)
                aiTurn();
            }, gameState.aiDelay);
        }
    }
}

// AI Turn with FIXED memory usage
function aiTurn() {
    if (!gameState.isActive) { gameState.isProcessing = false; return; }
    if (gameState.isProcessing) return;
    
    gameState.isProcessing = true;
    
    console.log('\n=== AI TURN START ===');
    console.log('AI Memory before turn:', ai.getMemorySize(), 'cards');
    
    // AI picks first card
    const card1 = ai.makeMove(gameState.grid);
    if (!card1) {
        gameState.isProcessing = false;
        switchTurn();
        return;
    }
    
    flipCard(card1.row, card1.col);
    
    setTimeout(() => {
        // AI picks second card based on memory
        const card2 = ai.makeMove(gameState.grid, card1);
        if (!card2) {
            unflipCard(card1.row, card1.col);
            gameState.isProcessing = false;
            switchTurn();
            return;
        }
        
        flipCard(card2.row, card2.col);
        
        setTimeout(() => {
            const symbol1 = gameState.grid[card1.row][card1.col].symbol;
            const symbol2 = gameState.grid[card2.row][card2.col].symbol;
            
            if (symbol1 === symbol2) {
                console.log('✅ AI FOUND A MATCH!');
                // AI found match
                gameState.grid[card1.row][card1.col].setMatched();
                gameState.grid[card2.row][card2.col].setMatched();
                gameState.player2Score++;
                gameState.matchedPairs++;
                
                const elem1 = document.querySelector(`[data-row="${card1.row}"][data-col="${card1.col}"]`);
                const elem2 = document.querySelector(`[data-row="${card2.row}"][data-col="${card2.col}"]`);
                elem1.classList.add('matched');
                elem2.classList.add('matched');
                
                ai.forgetCard(symbol1, card1.row, card1.col);
                ai.forgetCard(symbol2, card2.row, card2.col);
                
                updateScore();
                updateStatistics();
                updateAIMemoryDisplay();
                
                if (checkGameOver()) {
                    setTimeout(showGameOver, 500);
                }
            } else {
                console.log('❌ AI did not match');
                // AI remembers what it saw
                ai.rememberCard(symbol1, card1.row, card1.col);
                ai.rememberCard(symbol2, card2.row, card2.col);
                
                // Update immediately after remembering
                updateStatistics();
                updateAIMemoryDisplay();
                
                setTimeout(() => {
                    unflipCard(card1.row, card1.col);
                    unflipCard(card2.row, card2.col);
                }, 500);
            }
            
            console.log('AI Memory after turn:', ai.getMemorySize(), 'cards');
            console.log('=== AI TURN END ===\n');
            
            gameState.isProcessing = false;
            
            if (!checkGameOver()) {
                switchTurn();
            }
        }, 1000);
    }, 1000);
}

// Undo Move
function undoMove() {
    if (moveStack.isEmpty() || gameState.isProcessing) return;
    
    // Only allow undoing player 1's moves
    if (!gameState.isPlayer1Turn) return;
    
    const lastMove = moveStack.pop();
    if (lastMove.isPlayer1) {
        gameState.grid[lastMove.card1.row][lastMove.card1.col].isMatched = false;
        gameState.grid[lastMove.card2.row][lastMove.card2.col].isMatched = false;
        gameState.player1Score--;
        gameState.matchedPairs--;
        
        unflipCard(lastMove.card1.row, lastMove.card1.col);
        unflipCard(lastMove.card2.row, lastMove.card2.col);
        
        const elem1 = document.querySelector(`[data-row="${lastMove.card1.row}"][data-col="${lastMove.card1.col}"]`);
        const elem2 = document.querySelector(`[data-row="${lastMove.card2.row}"][data-col="${lastMove.card2.col}"]`);
        elem1.classList.remove('matched');
        elem2.classList.remove('matched');
        
        updateScore();
        updateStatistics();
    }
}

// Update Score
function updateScore() {
    document.getElementById('playerScore').textContent = gameState.player1Score;
    document.getElementById('aiScore').textContent = gameState.player2Score;
    
    const totalPairs = gameState.totalPairs;
    const player1Percent = (gameState.player1Score / totalPairs) * 100;
    const player2Percent = (gameState.player2Score / totalPairs) * 100;
    
    document.getElementById('playerBar').style.width = player1Percent + '%';
    document.getElementById('aiBar').style.width = player2Percent + '%';
}

// Update Statistics
function updateStatistics() {
    document.getElementById('moveCount').textContent = moveStack.size();
    
    // Only update AI memory in AI mode
    if (gameState.isAIGame) {
        document.getElementById('aiMemory').textContent = ai.getMemorySize() + ' cards';
    }
    
    document.getElementById('matchedPairs').textContent = 
        `${gameState.matchedPairs}/${gameState.totalPairs}`;
}

// Toggle AI Memory Display
function toggleAIMemory() {
    if (!gameState.isAIGame) return; // Don't show in multiplayer mode
    
    const display = document.getElementById('aiMemoryDisplay');
    display.style.display = display.style.display === 'none' ? 'block' : 'none';
    updateAIMemoryDisplay();
}

// Update AI Memory Display
function updateAIMemoryDisplay() {
    if (!gameState.isAIGame) return; // Don't update in multiplayer mode
    
    const content = document.getElementById('aiMemoryContent');
    const memoryDetails = ai.getMemoryDetails();
    
    if (memoryDetails.length === 0) {
        content.innerHTML = '<p style="color: #999;">AI memory is empty</p>';
    } else {
        content.innerHTML = memoryDetails.map(item => 
            `<div class="memory-item">
                <span class="memory-symbol">${item.symbol}</span>
                <span class="memory-positions">${item.positions}</span>
            </div>`
        ).join('');
    }
}

// Toggle Statistics
function toggleStats() {
    const panel = document.getElementById('statsPanel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

// Reset Scores
function resetScores() {
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    gameState.matchedPairs = 0;
    gameState.isPlayer1Turn = true;
    moveStack.clear();
    ai.clearMemory();
    updateScore();
    updateStatistics();
    
    const indicator = document.getElementById('turnIndicator');
    if (gameState.gameMode === 'multiplayer') {
        indicator.innerHTML = '<span class="turn-icon">👤</span><span class="turn-text">Player 1\'s Turn</span>';
    } else {
        indicator.innerHTML = '<span class="turn-icon">👤</span><span class="turn-text">Your Turn! Click a card</span>';
    }
    indicator.className = 'turn-indicator player';
}

// Check Game Over
function checkGameOver() {
    return gameState.matchedPairs >= gameState.totalPairs;
}

// Show Game Over
function showGameOver() {
    const gameOver = document.getElementById('gameOver');
    const emoji = document.getElementById('resultEmoji');
    const title = document.getElementById('resultTitle');
    const score = document.getElementById('finalScore');
    const stats = document.getElementById('gameStats');
    
    if (gameState.player1Score > gameState.player2Score) {
        emoji.textContent = '🎉';
        title.textContent = gameState.gameMode === 'multiplayer' ? 'Player 1 Wins!' : 'You Win!';
        title.style.color = '#43e97b';
    } else if (gameState.player2Score > gameState.player1Score) {
        emoji.textContent = gameState.gameMode === 'multiplayer' ? '🎉' : '🤖';
        title.textContent = gameState.gameMode === 'multiplayer' ? 'Player 2 Wins!' : 'AI Wins!';
        title.style.color = '#fa709a';
    } else {
        emoji.textContent = '🤝';
        title.textContent = "It's a Tie!";
        title.style.color = '#667eea';
    }
    
    const player1Name = gameState.gameMode === 'multiplayer' ? 'Player 1' : 'Your';
    const player2Name = gameState.gameMode === 'multiplayer' ? 'Player 2' : 'AI';
    
    score.innerHTML = `
        <div>👤 ${player1Name} Score: <strong>${gameState.player1Score}</strong></div>
        <div>${gameState.gameMode === 'multiplayer' ? '👥' : '🤖'} ${player2Name} Score: <strong>${gameState.player2Score}</strong></div>
    `;
    
    stats.innerHTML = `
        <div><span>Total Moves (Stack):</span><span>${moveStack.size()}</span></div>
        ${gameState.isAIGame ? `<div><span>AI Memory Used:</span><span>${ai.getMemorySize()} cards</span></div>` : ''}
        <div><span>Difficulty:</span><span>${gameState.difficulty.toUpperCase()}</span></div>
        <div><span>Grid Size:</span><span>${gameState.rows}×${gameState.cols}</span></div>
        <div><span>Game Mode:</span><span>${gameState.gameMode === 'multiplayer' ? 'Multiplayer' : 'VS AI'}</span></div>
    `;
    
    gameOver.classList.add('show');
}

// Reset Game
function resetGame() {
    startGame(gameState.difficulty);
}

// Reset to Menu
function resetToMenu() {
    document.getElementById('gameOver').classList.remove('show');
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'block';
    document.getElementById('dsInfo').classList.remove('hidden');
}

// Exit current game mid-play and return to menu
function exitGame() {
    // Ask for confirmation to avoid accidental exits
    if (!confirm('Exit current game and return to the main menu?')) return;

    // Mark inactive so scheduled AI actions abort
    gameState.isActive = false;
    gameState.isProcessing = false;

    // Clear AI memory and move history for a fresh start
    ai.clearMemory();
    moveStack.clear();

    // Hide overlays and displays
    document.getElementById('aiThinking').classList.remove('show');
    const aiMem = document.getElementById('aiMemoryDisplay');
    if (aiMem) aiMem.style.display = 'none';
    document.getElementById('gameOver').classList.remove('show');

    // Reset scores/state and go back to menu
    resetScores();
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'block';
    document.getElementById('dsInfo').classList.remove('hidden');
}

// Play Again
function playAgain() {
    document.getElementById('gameOver').classList.remove('show');
    resetGame();
}

// Initialize
window.onload = () => {
    console.log('='.repeat(60));
    console.log('AI POWERED MEMORY GAME - DSA PROJECT');
    console.log('='.repeat(60));
    console.log('Data Structures Implemented:');
    console.log('  ✓ 2D Array (Grid)');
    console.log('  ✓ Stack (Move History)');
    console.log('  ✓ Binary Tree (Difficulty Levels)');
    console.log('  ✓ HashMap (AI Memory)');
    console.log('Features:');
    console.log('  ✓ VS AI Mode (with smart memory)');
    console.log('  ✓ Multiplayer Mode (2 players)');
    console.log('  ✓ Undo Functionality');
    console.log('  ✓ Real-time AI Memory Display');
    console.log('='.repeat(60));
};