const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');

const groundY = canvas.height - 70;
const worldSpeed = 5;
const input = {
  left: false,
  right: false,
  jump: false,
  shoot: false,
  shootBack: false,
};

const state = {
  running: true,
  score: 0,
  lives: 3,
  lastTime: 0,
  spawnTimer: 0,
  shotTimer: 0,
  flashTimer: 0,
  clouds: [],
  bullets: [],
  enemies: [],
};

const player = {
  x: 170,
  y: groundY - 54,
  w: 42,
  h: 54,
  vy: 0,
  onGround: true,
  facing: 1,
  invulnerable: 0,
};

function resetGame() {
  state.running = true;
  state.score = 0;
  state.lives = 3;
  state.spawnTimer = 0;
  state.shotTimer = 0;
  state.flashTimer = 0;
  state.clouds = Array.from({ length: 8 }, (_, index) => ({
    x: index * 130 + Math.random() * 60,
    y: 50 + Math.random() * 120,
    size: 22 + Math.random() * 34,
    speed: 0.3 + Math.random() * 0.5,
  }));
  state.bullets = [];
  state.enemies = [];

  player.x = 170;
  player.y = groundY - player.h;
  player.vy = 0;
  player.onGround = true;
  player.invulnerable = 0;

  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  livesEl.textContent = String(state.lives);
}

function createEnemy() {
  const typeRoll = Math.random();
  const size = typeRoll > 0.7 ? 42 : 30;
  const enemy = {
    x: canvas.width + 30,
    y: groundY - size,
    w: size,
    h: size,
    speed: 2.5 + Math.random() * 2.5,
    hp: typeRoll > 0.7 ? 2 : 1,
    color: typeRoll > 0.7 ? '#f97316' : '#ef4444',
  };

  state.enemies.push(enemy);
}

function shoot(direction = player.facing) {
  if (!state.running) return;
  const now = performance.now();
  if (now - state.shotTimer < 180) return;

  state.shotTimer = now;
  const bullet = {
    x: direction === 1 ? player.x + player.w + 4 : player.x - 4,
    y: player.y + player.h * 0.55,
    r: 6,
    speed: 10 * direction,
  };

  state.bullets.push(bullet);
}

function handleInput() {
  if (input.left) {
    player.x -= 7;
    player.facing = -1;
  }
  if (input.right) {
    player.x += 7;
    player.facing = 1;
  }
  player.x = Math.max(40, Math.min(canvas.width - 120, player.x));

  if (input.jump && player.onGround) {
    player.vy = -15;
    player.onGround = false;
  }

  if (input.shoot && !input.shootBack) {
    shoot(player.facing);
  }
  if (input.shootBack) {
    shoot(-player.facing);
  }
}

function update(dt) {
  if (!state.running) return;

  handleInput();

  player.vy += 0.65 * dt * 0.06;
  player.y += player.vy * dt * 0.06;

  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  state.score += dt * 0.02;
  updateHud();

  for (const cloud of state.clouds) {
    cloud.x -= cloud.speed * dt * 0.06;
    if (cloud.x < -100) {
      cloud.x = canvas.width + 100;
      cloud.y = 30 + Math.random() * 120;
    }
  }

  state.spawnTimer += dt;
  if (state.spawnTimer > 900) {
    state.spawnTimer = 0;
    createEnemy();
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.speed * dt * 0.06;
  }
  state.bullets = state.bullets.filter(
    (bullet) => bullet.x > -30 && bullet.x < canvas.width + 30,
  );

  for (const enemy of state.enemies) {
    enemy.x -= (worldSpeed + enemy.speed) * dt * 0.06;
  }
  state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.w > -10);

  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    let hitEnemy = false;

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      const touching =
        bullet.x + bullet.r > enemy.x &&
        bullet.x - bullet.r < enemy.x + enemy.w &&
        bullet.y + bullet.r > enemy.y &&
        bullet.y - bullet.r < enemy.y + enemy.h;

      if (touching) {
        enemy.hp -= 1;
        state.bullets.splice(i, 1);
        hitEnemy = true;

        if (enemy.hp <= 0) {
          state.score += 10;
          state.enemies.splice(j, 1);
        }
        break;
      }
    }

    if (hitEnemy) {
      break;
    }
  }

  if (player.invulnerable > 0) {
    player.invulnerable -= dt;
  }

  for (const enemy of state.enemies) {
    const overlap =
      player.x < enemy.x + enemy.w &&
      player.x + player.w > enemy.x &&
      player.y < enemy.y + enemy.h &&
      player.y + player.h > enemy.y;

    if (overlap && player.invulnerable <= 0) {
      state.lives -= 1;
      player.invulnerable = 1200;
      state.flashTimer = 260;
      state.enemies = state.enemies.filter((item) => item !== enemy);

      if (state.lives <= 0) {
        state.running = false;
        break;
      }
    }
  }

  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const cloud of state.clouds) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.size * 0.4, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 0.5, cloud.y + 5, cloud.size * 0.35, 0, Math.PI * 2);
    ctx.arc(cloud.x - cloud.size * 0.5, cloud.y + 5, cloud.size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#93c5fd';
  for (let i = 0; i < 5; i += 1) {
    const hillX = (i * 250) - (state.score * 0.1) % 250;
    ctx.beginPath();
    ctx.moveTo(hillX, canvas.height);
    ctx.quadraticCurveTo(hillX + 120, 300, hillX + 240, canvas.height);
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = '#166534';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.fillStyle = '#22c55e';
  for (let x = -10; x < canvas.width + 40; x += 40) {
    ctx.fillRect(x, groundY + 18, 24, 8);
  }

  ctx.strokeStyle = '#14532d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();
}

function drawPlayer() {
  const blink = player.invulnerable > 0 && Math.floor(player.invulnerable / 80) % 2 === 0;
  if (blink) return;

  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(player.x + 8, player.y + 8, player.w - 16, 16);

  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(player.x + player.w - 8, player.y + 16, 12, 10);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(player.x + (player.facing === 1 ? player.w : -10), player.y + 18, 10, 6);
}

function drawBullets() {
  ctx.fillStyle = '#facc15';
  for (const bullet of state.bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);

    ctx.fillStyle = '#fff';
    ctx.fillRect(enemy.x + 6, enemy.y + 7, enemy.w - 12, 8);
    ctx.fillStyle = '#111827';
    ctx.fillRect(enemy.x + 10, enemy.y + 22, 6, 6);
    ctx.fillRect(enemy.x + enemy.w - 16, enemy.y + 22, 6, 6);
  }
}

function drawGameOver() {
  if (state.running) return;

  ctx.fillStyle = 'rgba(15,23,42,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '26px sans-serif';
  ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 30);
}

function render() {
  drawBackground();
  drawGround();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawGameOver();

  if (state.flashTimer > 0) {
    state.flashTimer -= 1;
    ctx.fillStyle = `rgba(248, 113, 113, ${Math.min(0.35, state.flashTimer / 400)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function loop(timestamp) {
  const dt = Math.min(32, timestamp - state.lastTime || 16);
  state.lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = true;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = true;

  if (event.code === 'Space') {
    event.preventDefault();
    input.shoot = true;
  }

  if (event.code === 'ArrowUp' || event.code === 'KeyW') {
    input.jump = true;
  }

  if (event.code === 'KeyJ') input.shoot = true;
  if (event.code === 'KeyK') input.shootBack = true;
  if (event.code === 'KeyR' && !state.running) resetGame();
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = false;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = false;
  if (event.code === 'ArrowUp' || event.code === 'KeyW') input.jump = false;
  if (event.code === 'Space' || event.code === 'KeyJ') input.shoot = false;
  if (event.code === 'KeyK') input.shootBack = false;
});

resetGame();
requestAnimationFrame(loop);
