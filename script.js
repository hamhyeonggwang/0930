// 게임 상태
const gameState = {
    canvas: null,
    ctx: null,
    score: 0,
    lives: 5,
    gameRunning: true,
    gameOver: false,
    
    // 게임 객체들
    ball: null,
    paddle: null,
    bricks: [],
    items: [],
    missiles: [],
    particles: [],
    
    // 아이템 효과
    multiBall: false,
    paddleExtended: false,
    missileMode: false,
    
    // 사운드
    audioContext: null,
    sounds: {}
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
    gameState.ball = {
        x: gameState.canvas.width / 2,
        y: gameState.canvas.height - 100,
        dx: 4,
        dy: -4,
        radius: 8,
        color: '#fff'
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
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#e91e63', '#00bcd4'];
    const rows = 8;
    const cols = 10;
    const brickWidth = 70;
    const brickHeight = 25;
    const padding = 5;
    const offsetTop = 50;
    const offsetLeft = (gameState.canvas.width - (cols * (brickWidth + padding) - padding)) / 2;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            gameState.bricks.push({
                x: offsetLeft + c * (brickWidth + padding),
                y: offsetTop + r * (brickHeight + padding),
                width: brickWidth,
                height: brickHeight,
                color: colors[r % colors.length],
                visible: true
            });
        }
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
    if (gameState.gameOver) return;
    
    updateBall();
    updateItems();
    updateMissiles();
    updateParticles();
    checkCollisions();
    checkGameOver();
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
            
            brick.visible = false;
            gameState.score += 10;
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
    
    // 벽돌 그리기
    for (let brick of gameState.bricks) {
        if (!brick.visible) continue;
        
        gameState.ctx.fillStyle = brick.color;
        gameState.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        gameState.ctx.strokeStyle = '#fff';
        gameState.ctx.lineWidth = 2;
        gameState.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
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

// 미사일 발사 (스페이스바)
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState.gameRunning) {
        fireMissile();
    }
});

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    updateUI();
});
