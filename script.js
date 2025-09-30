// 게임 상태
const gameState = {
    canvas: null,
    ctx: null,
    score: 0,
    lives: 5,
    gameRunning: true,
    gameOver: false,
    paused: false,
    currentStage: 1,
    maxStage: 10,
    
    // 게임 객체들
    ball: null,
    paddle: null,
    bricks: [],
    items: [],
    missiles: [],
    particles: [],
    magneticFields: [],
    guideLines: [],
    
    // 아이템 효과
    multiBall: false,
    paddleExtended: false,
    missileMode: false,
    
    // 사운드
    audioContext: null,
    sounds: {}
};

// 단계별 설정
const stageConfig = {
    1: { rows: 2, speed: 1, hasGuide: true, hasGuideDots: false, pattern: 'normal' },
    2: { rows: 3, speed: 2, hasGuide: true, hasGuideDots: true, pattern: 'normal' },
    3: { rows: 4, speed: 2, hasGuide: false, hasGuideDots: false, pattern: 'normal' },
    4: { rows: 5, speed: 3, hasGuide: false, hasGuideDots: false, pattern: 'normal' },
    5: { rows: 5, speed: 3, hasGuide: false, hasGuideDots: false, pattern: 'inverse_pyramid' },
    6: { rows: 6, speed: 4, hasGuide: false, hasGuideDots: false, pattern: 'hourglass', magneticFields: true },
    7: { rows: 7, speed: 4, hasGuide: false, hasGuideDots: false, pattern: 'spiral', magneticFields: true },
    8: { rows: 8, speed: 5, hasGuide: false, hasGuideDots: false, pattern: 'zigzag', magneticFields: true },
    9: { rows: 9, speed: 5, hasGuide: false, hasGuideDots: false, pattern: 'maze', magneticFields: true },
    10: { rows: 10, speed: 6, hasGuide: false, hasGuideDots: false, pattern: 'chaos', magneticFields: true }
};

// 게임 초기화
function initGame() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // 오디오 컨텍스트 초기화
    initAudio();
    
    // 게임 객체들 초기화
    initBall();
    initPaddle();
    initBricks();
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 게임 루프 시작
    gameLoop();
}

// 오디오 초기화
function initAudio() {
    try {
        gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gameState.sounds = {
            brickBreak: createTone(800, 0.1, 'sine'),
            paddleHit: createTone(400, 0.1, 'square'),
            itemPickup: createTone(1200, 0.2, 'sawtooth'),
            missile: createTone(200, 0.3, 'triangle'),
            gameOver: createTone(150, 1, 'sine')
        };
    } catch (e) {
        console.log('Audio not supported');
    }
}

// 전자음 생성
function createTone(frequency, duration, type = 'sine') {
    return function() {
        if (!gameState.audioContext) return;
        
        const oscillator = gameState.audioContext.createOscillator();
        const gainNode = gameState.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(gameState.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, gameState.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, gameState.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, gameState.audioContext.currentTime + duration);
        
        oscillator.start(gameState.audioContext.currentTime);
        oscillator.stop(gameState.audioContext.currentTime + duration);
    };
}

// 공 초기화
function initBall() {
    const config = stageConfig[gameState.currentStage];
    const baseSpeed = config.speed;
    
    gameState.ball = {
        x: gameState.canvas.width / 2,
        y: gameState.canvas.height - 100,
        dx: baseSpeed,
        dy: -baseSpeed,
        radius: 8,
        color: '#fff',
        baseSpeed: baseSpeed
    };
}

// 패들 초기화
function initPaddle() {
    const paddleWidth = gameState.paddleExtended ? 150 : 100;
    gameState.paddle = {
        x: gameState.canvas.width / 2 - paddleWidth / 2,
        y: gameState.canvas.height - 30,
        width: paddleWidth,
        height: 15,
        color: '#3498db',
        speed: 8
    };
}

// 벽돌 초기화
function initBricks() {
    gameState.bricks = [];
    gameState.guideLines = [];
    gameState.magneticFields = [];
    
    const config = stageConfig[gameState.currentStage];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#e91e63', '#00bcd4'];
    const cols = 10;
    const brickWidth = 70;
    const brickHeight = 25;
    const padding = 5;
    const offsetTop = 50;
    const offsetLeft = (gameState.canvas.width - (cols * (brickWidth + padding) - padding)) / 2;
    
    // 가이드라인 생성
    if (config.hasGuide) {
        createGuideLines(offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding);
    }
    
    // 벽돌 패턴에 따라 생성
    createBrickPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding);
    
    // 자기장 생성 (6단계 이상)
    if (config.magneticFields) {
        createMagneticFields();
    }
}

// 가이드라인 생성
function createGuideLines(offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding) {
    const config = stageConfig[gameState.currentStage];
    
    // 수직 가이드라인
    for (let c = 0; c <= cols; c++) {
        gameState.guideLines.push({
            type: 'vertical',
            x: offsetLeft + c * (brickWidth + padding),
            y: offsetTop,
            endY: offsetTop + config.rows * (brickHeight + padding),
            color: 'rgba(255, 255, 255, 0.3)'
        });
    }
    
    // 수평 가이드라인
    for (let r = 0; r <= config.rows; r++) {
        gameState.guideLines.push({
            type: 'horizontal',
            y: offsetTop + r * (brickHeight + padding),
            x: offsetLeft,
            endX: offsetLeft + cols * (brickWidth + padding),
            color: 'rgba(255, 255, 255, 0.3)'
        });
    }
    
    // 가이드 점 생성 (2단계)
    if (config.hasGuideDots) {
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < cols; c++) {
                gameState.guideLines.push({
                    type: 'dot',
                    x: offsetLeft + c * (brickWidth + padding) + brickWidth/2,
                    y: offsetTop + r * (brickHeight + padding) + brickHeight/2,
                    radius: 3,
                    color: 'rgba(255, 255, 255, 0.6)'
                });
            }
        }
    }
}

// 벽돌 패턴 생성
function createBrickPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding) {
    const enhancedBrickChance = Math.min(0.1 + (gameState.currentStage - 5) * 0.05, 0.4);
    
    switch (config.pattern) {
        case 'normal':
            createNormalPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedBrickChance);
            break;
        case 'inverse_pyramid':
            createInversePyramidPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedBrickChance);
            break;
        case 'hourglass':
            createHourglassPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedBrickChance);
            break;
        case 'spiral':
            createSpiralPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedBrickChance);
            break;
        case 'zigzag':
            createZigzagPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedBrickChance);
            break;
        case 'maze':
            createMazePattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedBrickChance);
            break;
        case 'chaos':
            createChaosPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedBrickChance);
            break;
    }
}

// 일반 패턴
function createNormalPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedChance) {
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < cols; c++) {
            const isEnhanced = Math.random() < enhancedChance;
            gameState.bricks.push({
                x: offsetLeft + c * (brickWidth + padding),
                y: offsetTop + r * (brickHeight + padding),
                width: brickWidth,
                height: brickHeight,
                color: colors[r % colors.length],
                visible: true,
                enhanced: isEnhanced,
                hits: isEnhanced ? 2 : 1
            });
        }
    }
}

// 역 피라미드 패턴
function createInversePyramidPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedChance) {
    for (let r = 0; r < config.rows; r++) {
        const startCol = Math.floor((cols - (r + 1)) / 2);
        const endCol = startCol + (r + 1);
        
        for (let c = startCol; c < endCol; c++) {
            const isEnhanced = Math.random() < enhancedChance;
            gameState.bricks.push({
                x: offsetLeft + c * (brickWidth + padding),
                y: offsetTop + r * (brickHeight + padding),
                width: brickWidth,
                height: brickHeight,
                color: colors[r % colors.length],
                visible: true,
                enhanced: isEnhanced,
                hits: isEnhanced ? 2 : 1
            });
        }
    }
}

// 모래시계 패턴
function createHourglassPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedChance) {
    const midRow = Math.floor(config.rows / 2);
    
    for (let r = 0; r < config.rows; r++) {
        let startCol, endCol;
        
        if (r <= midRow) {
            // 위쪽: 역 피라미드
            startCol = Math.floor((cols - (r + 1)) / 2);
            endCol = startCol + (r + 1);
        } else {
            // 아래쪽: 피라미드
            const reverseR = config.rows - 1 - r;
            startCol = Math.floor((cols - (reverseR + 1)) / 2);
            endCol = startCol + (reverseR + 1);
        }
        
        for (let c = startCol; c < endCol; c++) {
            const isEnhanced = Math.random() < enhancedChance;
            gameState.bricks.push({
                x: offsetLeft + c * (brickWidth + padding),
                y: offsetTop + r * (brickHeight + padding),
                width: brickWidth,
                height: brickHeight,
                color: colors[r % colors.length],
                visible: true,
                enhanced: isEnhanced,
                hits: isEnhanced ? 2 : 1
            });
        }
    }
}

// 나선 패턴
function createSpiralPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedChance) {
    const centerX = cols / 2;
    const centerY = config.rows / 2;
    const positions = [];
    
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < cols; c++) {
            const distance = Math.sqrt((c - centerX) ** 2 + (r - centerY) ** 2);
            if (distance <= config.rows / 2) {
                positions.push({ r, c, distance });
            }
        }
    }
    
    positions.sort((a, b) => a.distance - b.distance);
    
    positions.forEach((pos, index) => {
        const isEnhanced = Math.random() < enhancedChance;
        gameState.bricks.push({
            x: offsetLeft + pos.c * (brickWidth + padding),
            y: offsetTop + pos.r * (brickHeight + padding),
            width: brickWidth,
            height: brickHeight,
            color: colors[pos.r % colors.length],
            visible: true,
            enhanced: isEnhanced,
            hits: isEnhanced ? 2 : 1
        });
    });
}

// 지그재그 패턴
function createZigzagPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedChance) {
    for (let r = 0; r < config.rows; r++) {
        const startCol = r % 2 === 0 ? 0 : 1;
        for (let c = startCol; c < cols; c += 2) {
            const isEnhanced = Math.random() < enhancedChance;
            gameState.bricks.push({
                x: offsetLeft + c * (brickWidth + padding),
                y: offsetTop + r * (brickHeight + padding),
                width: brickWidth,
                height: brickHeight,
                color: colors[r % colors.length],
                visible: true,
                enhanced: isEnhanced,
                hits: isEnhanced ? 2 : 1
            });
        }
    }
}

// 미로 패턴
function createMazePattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedChance) {
    const maze = generateMaze(config.rows, cols);
    
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (maze[r][c] === 1) {
                const isEnhanced = Math.random() < enhancedChance;
                gameState.bricks.push({
                    x: offsetLeft + c * (brickWidth + padding),
                    y: offsetTop + r * (brickHeight + padding),
                    width: brickWidth,
                    height: brickHeight,
                    color: colors[r % colors.length],
                    visible: true,
                    enhanced: isEnhanced,
                    hits: isEnhanced ? 2 : 1
                });
            }
        }
    }
}

// 혼돈 패턴
function createChaosPattern(config, colors, offsetTop, offsetLeft, cols, brickWidth, brickHeight, padding, enhancedChance) {
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.7) { // 70% 확률로 벽돌 생성
                const isEnhanced = Math.random() < enhancedChance;
                gameState.bricks.push({
                    x: offsetLeft + c * (brickWidth + padding),
                    y: offsetTop + r * (brickHeight + padding),
                    width: brickWidth,
                    height: brickHeight,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    visible: true,
                    enhanced: isEnhanced,
                    hits: isEnhanced ? 2 : 1
                });
            }
        }
    }
}

// 미로 생성 알고리즘
function generateMaze(rows, cols) {
    const maze = Array(rows).fill().map(() => Array(cols).fill(0));
    
    // 외곽 벽 생성
    for (let r = 0; r < rows; r++) {
        maze[r][0] = 1;
        maze[r][cols-1] = 1;
    }
    for (let c = 0; c < cols; c++) {
        maze[0][c] = 1;
        maze[rows-1][c] = 1;
    }
    
    // 내부 패턴 생성
    for (let r = 1; r < rows - 1; r += 2) {
        for (let c = 1; c < cols - 1; c += 2) {
            if (Math.random() < 0.6) {
                maze[r][c] = 1;
                // 연결된 벽 추가
                if (Math.random() < 0.5 && c + 1 < cols - 1) {
                    maze[r][c + 1] = 1;
                }
                if (Math.random() < 0.5 && r + 1 < rows - 1) {
                    maze[r + 1][c] = 1;
                }
            }
        }
    }
    
    return maze;
}

// 자기장 생성
function createMagneticFields() {
    const fieldCount = Math.min(3 + gameState.currentStage - 6, 8);
    
    for (let i = 0; i < fieldCount; i++) {
        gameState.magneticFields.push({
            x: Math.random() * (gameState.canvas.width - 100) + 50,
            y: Math.random() * (gameState.canvas.height - 200) + 100,
            radius: 60 + Math.random() * 40,
            strength: 0.5 + Math.random() * 0.5,
            type: Math.random() < 0.5 ? 'attract' : 'repel'
        });
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 마우스 이벤트
    gameState.canvas.addEventListener('mousemove', handleMouseMove);
    
    // 조이스틱 이벤트
    setupJoystick();
    
    // 터치 이벤트 (모바일)
    gameState.canvas.addEventListener('touchmove', handleTouchMove);
}

// 마우스 이동 처리
function handleMouseMove(e) {
    if (!gameState.gameRunning) return;
    
    const rect = gameState.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    gameState.paddle.x = mouseX - gameState.paddle.width / 2;
    
    // 패들 경계 제한
    if (gameState.paddle.x < 0) gameState.paddle.x = 0;
    if (gameState.paddle.x > gameState.canvas.width - gameState.paddle.width) {
        gameState.paddle.x = gameState.canvas.width - gameState.paddle.width;
    }
}

// 터치 이동 처리
function handleTouchMove(e) {
    e.preventDefault();
    if (!gameState.gameRunning) return;
    
    const rect = gameState.canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    gameState.paddle.x = touchX - gameState.paddle.width / 2;
    
    if (gameState.paddle.x < 0) gameState.paddle.x = 0;
    if (gameState.paddle.x > gameState.canvas.width - gameState.paddle.width) {
        gameState.paddle.x = gameState.canvas.width - gameState.paddle.width;
    }
}

// 조이스틱 설정
function setupJoystick() {
    const joystick = document.getElementById('joystick');
    const knob = document.getElementById('joystickKnob');
    let isDragging = false;
    
    knob.addEventListener('mousedown', (e) => {
        isDragging = true;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 30;
        
        if (distance <= maxDistance) {
            knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
            
            // 패들 이동
            const moveAmount = (deltaX / maxDistance) * gameState.paddle.speed * 2;
            gameState.paddle.x += moveAmount;
            
            if (gameState.paddle.x < 0) gameState.paddle.x = 0;
            if (gameState.paddle.x > gameState.canvas.width - gameState.paddle.width) {
                gameState.paddle.x = gameState.canvas.width - gameState.paddle.width;
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        knob.style.transform = 'translate(-50%, -50%)';
    });
}

// 게임 루프
function gameLoop() {
    if (!gameState.gameRunning) return;
    
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 게임 업데이트
function update() {
    if (gameState.gameOver || gameState.paused) return;
    
    updateBall();
    updateItems();
    updateMissiles();
    updateParticles();
    updateMagneticFields();
    checkCollisions();
    checkGameOver();
    checkStageComplete();
}

// 공 업데이트
function updateBall() {
    gameState.ball.x += gameState.ball.dx;
    gameState.ball.y += gameState.ball.dy;
    
    // 벽 충돌
    if (gameState.ball.x <= gameState.ball.radius || gameState.ball.x >= gameState.canvas.width - gameState.ball.radius) {
        gameState.ball.dx = -gameState.ball.dx;
    }
    if (gameState.ball.y <= gameState.ball.radius) {
        gameState.ball.dy = -gameState.ball.dy;
    }
    
    // 바닥에 떨어짐
    if (gameState.ball.y >= gameState.canvas.height) {
        gameState.lives--;
        updateUI(); // 생명 UI 업데이트 추가
        if (gameState.lives <= 0) {
            gameOver();
        } else {
            resetBall();
        }
    }
}

// 공 리셋
function resetBall() {
    gameState.ball.x = gameState.canvas.width / 2;
    gameState.ball.y = gameState.canvas.height - 100;
    gameState.ball.dx = 4;
    gameState.ball.dy = -4;
}

// 아이템 업데이트
function updateItems() {
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        item.y += 3;
        
        if (item.y > gameState.canvas.height) {
            gameState.items.splice(i, 1);
        }
    }
}

// 미사일 업데이트
function updateMissiles() {
    for (let i = gameState.missiles.length - 1; i >= 0; i--) {
        const missile = gameState.missiles[i];
        missile.y -= 5;
        
        if (missile.y < 0) {
            gameState.missiles.splice(i, 1);
        }
    }
}

// 파티클 업데이트
function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        
        if (particle.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// 자기장 업데이트
function updateMagneticFields() {
    for (let field of gameState.magneticFields) {
        const dx = gameState.ball.x - field.x;
        const dy = gameState.ball.y - field.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < field.radius) {
            const force = field.strength * (1 - distance / field.radius);
            const angle = Math.atan2(dy, dx);
            
            if (field.type === 'attract') {
                gameState.ball.dx -= Math.cos(angle) * force * 0.1;
                gameState.ball.dy -= Math.sin(angle) * force * 0.1;
            } else {
                gameState.ball.dx += Math.cos(angle) * force * 0.1;
                gameState.ball.dy += Math.sin(angle) * force * 0.1;
            }
        }
    }
}

// 단계 완료 체크
function checkStageComplete() {
    const allBricksDestroyed = gameState.bricks.every(brick => !brick.visible);
    if (allBricksDestroyed) {
        if (gameState.currentStage < gameState.maxStage) {
            nextStage();
        } else {
            gameState.gameOver = true;
            gameState.sounds.gameOver();
            showGameOver(true);
        }
    }
}

// 다음 단계로 진행
function nextStage() {
    gameState.currentStage++;
    gameState.score += 100 * gameState.currentStage; // 단계 보너스
    updateUI();
    
    // 새로운 단계 초기화
    initBall();
    initPaddle();
    initBricks();
    
    // 단계 시작 메시지
    showStageMessage();
}

// 단계 메시지 표시
function showStageMessage() {
    const message = document.createElement('div');
    message.className = 'stage-message';
    message.innerHTML = `
        <h2>Stage ${gameState.currentStage}</h2>
        <p>준비하세요!</p>
    `;
    message.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: #3498db;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        border: 3px solid #3498db;
        box-shadow: 0 0 30px rgba(52, 152, 219, 0.8);
        z-index: 1000;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 2000);
}

// 충돌 검사
function checkCollisions() {
    // 패들과 공 충돌
    if (gameState.ball.y + gameState.ball.radius >= gameState.paddle.y &&
        gameState.ball.x >= gameState.paddle.x &&
        gameState.ball.x <= gameState.paddle.x + gameState.paddle.width &&
        gameState.ball.dy > 0) {
        
        gameState.ball.dy = -Math.abs(gameState.ball.dy);
        gameState.sounds.paddleHit();
    }
    
    // 벽돌과 공 충돌
    for (let brick of gameState.bricks) {
        if (!brick.visible) continue;
        
        if (gameState.ball.x + gameState.ball.radius >= brick.x &&
            gameState.ball.x - gameState.ball.radius <= brick.x + brick.width &&
            gameState.ball.y + gameState.ball.radius >= brick.y &&
            gameState.ball.y - gameState.ball.radius <= brick.y + brick.height) {
            
            // 강화된 벽돌 처리
            if (brick.enhanced) {
                brick.hits--;
                if (brick.hits <= 0) {
                    brick.visible = false;
                    gameState.score += 20; // 강화된 벽돌은 더 많은 점수
                } else {
                    gameState.score += 5; // 첫 번째 타격 점수
                }
            } else {
                brick.visible = false;
                gameState.score += 10;
            }
            
            updateUI(); // 점수 UI 업데이트 추가
            gameState.sounds.brickBreak();
            
            // 파티클 효과
            createParticles(brick.x + brick.width/2, brick.y + brick.height/2);
            
            // 아이템 생성 (10% 확률)
            if (Math.random() < 0.1) {
                createItem(brick.x + brick.width/2, brick.y + brick.height/2);
            }
            
            // 공 방향 변경
            gameState.ball.dy = -gameState.ball.dy;
            break;
        }
    }
    
    // 아이템과 패들 충돌
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        if (item.y + 20 >= gameState.paddle.y &&
            item.x >= gameState.paddle.x &&
            item.x <= gameState.paddle.x + gameState.paddle.width) {
            
            applyItemEffect(item.type);
            gameState.sounds.itemPickup();
            gameState.items.splice(i, 1);
        }
    }
    
    // 미사일과 벽돌 충돌
    for (let i = gameState.missiles.length - 1; i >= 0; i--) {
        const missile = gameState.missiles[i];
        for (let brick of gameState.bricks) {
            if (!brick.visible) continue;
            
            if (missile.x >= brick.x && missile.x <= brick.x + brick.width &&
                missile.y >= brick.y && missile.y <= brick.y + brick.height) {
                
                brick.visible = false;
                gameState.score += 10;
                updateUI(); // 점수 UI 업데이트 추가
                gameState.sounds.brickBreak();
                createParticles(brick.x + brick.width/2, brick.y + brick.height/2);
                gameState.missiles.splice(i, 1);
                break;
            }
        }
    }
}

// 아이템 생성
function createItem(x, y) {
    const types = ['multiBall', 'extendPaddle', 'missile'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    gameState.items.push({
        x: x - 10,
        y: y,
        width: 20,
        height: 20,
        type: type,
        color: getItemColor(type)
    });
}

// 아이템 색상
function getItemColor(type) {
    switch (type) {
        case 'multiBall': return '#f1c40f';
        case 'extendPaddle': return '#2ecc71';
        case 'missile': return '#e74c3c';
        default: return '#fff';
    }
}

// 아이템 효과 적용
function applyItemEffect(type) {
    switch (type) {
        case 'multiBall':
            gameState.multiBall = true;
            setTimeout(() => { gameState.multiBall = false; }, 10000);
            break;
        case 'extendPaddle':
            gameState.paddleExtended = true;
            gameState.paddle.width = 150;
            setTimeout(() => {
                gameState.paddleExtended = false;
                gameState.paddle.width = 100;
            }, 10000);
            break;
        case 'missile':
            gameState.missileMode = true;
            setTimeout(() => { gameState.missileMode = false; }, 10000);
            break;
    }
}

// 파티클 생성
function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            life: 30,
            color: '#fff'
        });
    }
}

// 미사일 발사
function fireMissile() {
    if (!gameState.missileMode) return;
    
    gameState.missiles.push({
        x: gameState.paddle.x + gameState.paddle.width / 2,
        y: gameState.paddle.y,
        width: 4,
        height: 10
    });
    gameState.sounds.missile();
}

// 게임 오버 체크
function checkGameOver() {
    const allBricksDestroyed = gameState.bricks.every(brick => !brick.visible);
    if (allBricksDestroyed) {
        gameState.gameOver = true;
        gameState.sounds.gameOver();
        showGameOver(true);
    }
}

// 게임 오버
function gameOver() {
    gameState.gameOver = true;
    gameState.gameRunning = false;
    gameState.sounds.gameOver();
    showGameOver(false);
}

// 게임 오버 화면
function showGameOver(won) {
    const message = won ? '축하합니다! 모든 벽돌을 깨뜨렸습니다!' : '게임 오버!';
    const finalScore = `최종 점수: ${gameState.score}`;
    
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.innerHTML = `
        <h2>${message}</h2>
        <p>${finalScore}</p>
        <button onclick="restartGame()">다시 시작</button>
    `;
    
    document.body.appendChild(gameOverDiv);
}

// 게임 재시작
function restartGame() {
    gameState.score = 0;
    gameState.lives = 5;
    gameState.gameOver = false;
    gameState.gameRunning = true;
    gameState.items = [];
    gameState.missiles = [];
    gameState.particles = [];
    gameState.multiBall = false;
    gameState.paddleExtended = false;
    gameState.missileMode = false;
    
    document.querySelector('.game-over')?.remove();
    
    initBall();
    initPaddle();
    initBricks();
    
    updateUI();
    gameLoop();
}

// UI 업데이트
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('stage').textContent = gameState.currentStage;
}

// 그리기 함수
function draw() {
    // 캔버스 클리어
    gameState.ctx.fillStyle = '#1a1a1a';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    // 공 그리기
    gameState.ctx.beginPath();
    gameState.ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    gameState.ctx.fillStyle = gameState.ball.color;
    gameState.ctx.fill();
    gameState.ctx.shadowBlur = 10;
    gameState.ctx.shadowColor = gameState.ball.color;
    
    // 패들 그리기
    gameState.ctx.fillStyle = gameState.paddle.color;
    gameState.ctx.fillRect(gameState.paddle.x, gameState.paddle.y, gameState.paddle.width, gameState.paddle.height);
    
    // 가이드라인 그리기
    for (let guide of gameState.guideLines) {
        gameState.ctx.strokeStyle = guide.color;
        gameState.ctx.lineWidth = 1;
        gameState.ctx.setLineDash([5, 5]);
        
        if (guide.type === 'vertical') {
            gameState.ctx.beginPath();
            gameState.ctx.moveTo(guide.x, guide.y);
            gameState.ctx.lineTo(guide.x, guide.endY);
            gameState.ctx.stroke();
        } else if (guide.type === 'horizontal') {
            gameState.ctx.beginPath();
            gameState.ctx.moveTo(guide.x, guide.y);
            gameState.ctx.lineTo(guide.endX, guide.y);
            gameState.ctx.stroke();
        } else if (guide.type === 'dot') {
            gameState.ctx.fillStyle = guide.color;
            gameState.ctx.beginPath();
            gameState.ctx.arc(guide.x, guide.y, guide.radius, 0, Math.PI * 2);
            gameState.ctx.fill();
        }
    }
    
    // 자기장 그리기
    for (let field of gameState.magneticFields) {
        gameState.ctx.strokeStyle = field.type === 'attract' ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        gameState.ctx.lineWidth = 2;
        gameState.ctx.setLineDash([]);
        gameState.ctx.beginPath();
        gameState.ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
        gameState.ctx.stroke();
        
        // 자기장 중심 표시
        gameState.ctx.fillStyle = field.type === 'attract' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
        gameState.ctx.beginPath();
        gameState.ctx.arc(field.x, field.y, 5, 0, Math.PI * 2);
        gameState.ctx.fill();
    }
    
    // 벽돌 그리기
    for (let brick of gameState.bricks) {
        if (!brick.visible) continue;
        
        // 강화된 벽돌은 다른 스타일
        if (brick.enhanced) {
            gameState.ctx.fillStyle = brick.color;
            gameState.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            gameState.ctx.strokeStyle = '#ffd700';
            gameState.ctx.lineWidth = 3;
            gameState.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            
            // 강화 표시
            gameState.ctx.fillStyle = '#ffd700';
            gameState.ctx.font = 'bold 12px Arial';
            gameState.ctx.textAlign = 'center';
            gameState.ctx.fillText('★', brick.x + brick.width/2, brick.y + brick.height/2 + 4);
        } else {
            gameState.ctx.fillStyle = brick.color;
            gameState.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            gameState.ctx.strokeStyle = '#fff';
            gameState.ctx.lineWidth = 2;
            gameState.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        }
    }
    
    // 아이템 그리기
    for (let item of gameState.items) {
        gameState.ctx.fillStyle = item.color;
        gameState.ctx.fillRect(item.x, item.y, item.width, item.height);
        gameState.ctx.shadowBlur = 5;
        gameState.ctx.shadowColor = item.color;
    }
    
    // 미사일 그리기
    for (let missile of gameState.missiles) {
        gameState.ctx.fillStyle = '#ff6b6b';
        gameState.ctx.fillRect(missile.x, missile.y, missile.width, missile.height);
    }
    
    // 파티클 그리기
    for (let particle of gameState.particles) {
        gameState.ctx.fillStyle = particle.color;
        gameState.ctx.fillRect(particle.x, particle.y, 2, 2);
    }
    
    // 그림자 리셋
    gameState.ctx.shadowBlur = 0;
    gameState.ctx.shadowColor = 'transparent';
}

// 키보드 이벤트
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState.gameRunning && !gameState.gameOver) {
            if (gameState.missileMode) {
                fireMissile();
            } else {
                // 일시정지 토글
                gameState.paused = !gameState.paused;
                if (gameState.paused) {
                    showPauseMessage();
                } else {
                    hidePauseMessage();
                }
            }
        }
    }
});

// 일시정지 메시지 표시
function showPauseMessage() {
    const message = document.createElement('div');
    message.id = 'pause-message';
    message.innerHTML = `
        <h2>일시정지</h2>
        <p>스페이스바를 눌러 계속하세요</p>
    `;
    message.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: #f39c12;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        border: 3px solid #f39c12;
        box-shadow: 0 0 30px rgba(243, 156, 18, 0.8);
        z-index: 1000;
    `;
    
    document.body.appendChild(message);
}

// 일시정지 메시지 숨기기
function hidePauseMessage() {
    const message = document.getElementById('pause-message');
    if (message) {
        message.remove();
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    updateUI();
});
