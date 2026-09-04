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
  cleared: false,
  score: 0,
  lives: 3,
  lastTime: 0,
  spawnTimer: 0,
  shotTimer: 0,
  flashTimer: 0,
  clouds: [],
  bullets: [],
  enemies: [],
  boss: null,
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
  state.cleared = false;
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
  state.boss = null;

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
  if (state.boss || state.cleared) return;

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

function createBoss() {
  state.boss = {
    x: canvas.width + 80,
    y: groundY - 120,
    w: 120,
    h: 120,
    hp: 12,
    maxHp: 12,
    speed: 1.8,
    phase: 0,
  };
  state.enemies = [];
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

  if (state.score >= 200 && !state.boss && !state.cleared) {
    createBoss();
  }

  updateHud();

  for (const cloud of state.clouds) {
    cloud.x -= cloud.speed * dt * 0.06;
    if (cloud.x < -100) {
      cloud.x = canvas.width + 100;
      cloud.y = 30 + Math.random() * 120;
    }
  }

  if (!state.boss) {
    state.spawnTimer += dt;
    if (state.spawnTimer > 900) {
      state.spawnTimer = 0;
      createEnemy();
    }
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.speed * dt * 0.06;
  }
  state.bullets = state.bullets.filter(
    (bullet) => bullet.x > -30 && bullet.x < canvas.width + 30,
  );

  if (state.boss) {
    state.boss.phase += dt;
    if (state.boss.x > canvas.width - 240) {
      state.boss.x -= state.boss.speed * dt * 0.06;
    } else {
      state.boss.x = canvas.width - 240;
      state.boss.y = groundY - state.boss.h + Math.sin(state.boss.phase / 220) * 18;
    }
  } else {
    for (const enemy of state.enemies) {
      enemy.x -= (worldSpeed + enemy.speed) * dt * 0.06;
    }
    state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.w > -10);
  }

  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    let hitEnemy = false;

    if (state.boss) {
      const touchingBoss =
        bullet.x + bullet.r > state.boss.x &&
        bullet.x - bullet.r < state.boss.x + state.boss.w &&
        bullet.y + bullet.r > state.boss.y &&
        bullet.y - bullet.r < state.boss.y + state.boss.h;

      if (touchingBoss) {
        state.boss.hp -= 1;
        state.bullets.splice(i, 1);
        hitEnemy = true;

        if (state.boss.hp <= 0) {
          state.score += 100;
          state.cleared = true;
          state.running = false;
          state.boss = null;
          updateHud();
        }
      }
    }

    if (hitEnemy) {
      continue;
    }

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
      continue;
    }
  }

  if (player.invulnerable > 0) {
    player.invulnerable -= dt;
  }

  if (state.boss) {
    const overlap =
      player.x < state.boss.x + state.boss.w &&
      player.x + player.w > state.boss.x &&
      player.y < state.boss.y + state.boss.h &&
      player.y + player.h > state.boss.y;

    if (overlap && player.invulnerable <= 0) {
      state.lives -= 1;
      player.invulnerable = 1200;
      state.flashTimer = 260;

      if (state.lives <= 0) {
        state.running = false;
      }
    }
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
  ctx.fillStyle = '#08001c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const cloud of state.clouds) {
    ctx.fillStyle = '#00f6ff';
    ctx.fillRect(Math.floor(cloud.x), Math.floor(cloud.y), 2, 2);
  }

  ctx.fillStyle = '#170f46';
  for (let i = 0; i < 5; i += 1) {
    const hillX = (i * 250) - (state.score * 0.1) % 250;
    ctx.beginPath();
    ctx.moveTo(hillX, canvas.height);
    ctx.lineTo(hillX + 120, 300);
    ctx.lineTo(hillX + 240, canvas.height);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 0, 168, 0.35)';
  ctx.lineWidth = 1;
  for (let x = -canvas.height; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, groundY);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = groundY + 12; y < canvas.height; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawGround() {
  ctx.fillStyle = '#09051f';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.strokeStyle = '#00f6ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();
}

function drawPlayer() {
  const blink = player.invulnerable > 0 && Math.floor(player.invulnerable / 80) % 2 === 0;
  if (blink) return;

  ctx.shadowColor = '#00f6ff';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#1155cc';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#00f6ff';
  ctx.strokeRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#e8faff';
  ctx.fillRect(player.x + 8, player.y + 8, player.w - 16, 16);

  ctx.fillStyle = '#ff00a8';
  ctx.fillRect(player.x + player.w - 8, player.y + 16, 12, 10);

  ctx.fillStyle = '#050014';
  ctx.fillRect(player.x + (player.facing === 1 ? player.w : -10), player.y + 18, 10, 6);
}

function drawBullets() {
  ctx.shadowColor = '#faff00';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#faff00';
  for (const bullet of state.bullets) {
    ctx.fillRect(bullet.x - bullet.r, bullet.y - 2, bullet.r * 2, 4);
  }
  ctx.shadowBlur = 0;
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.shadowColor = '#ff00a8';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#d41472';
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00f6ff';
    ctx.fillRect(enemy.x + 6, enemy.y + 7, enemy.w - 12, 8);
    ctx.fillStyle = '#050014';
    ctx.fillRect(enemy.x + 10, enemy.y + 22, 6, 6);
    ctx.fillRect(enemy.x + enemy.w - 16, enemy.y + 22, 6, 6);
  }

  if (state.boss) {
    const boss = state.boss;
    ctx.shadowColor = '#ff00a8';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#42145f';
    ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#21103f';
    ctx.fillRect(boss.x + 20, boss.y + 20, boss.w - 40, 18);
    ctx.fillStyle = '#ff00a8';
    ctx.fillRect(boss.x + 16, boss.y + 20, ((boss.hp / boss.maxHp) * (boss.w - 32)), 18);

    ctx.strokeStyle = '#00f6ff';
    ctx.strokeRect(boss.x, boss.y, boss.w, boss.h);
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(boss.x + 26, boss.y + 52, 16, 16);
    ctx.fillRect(boss.x + boss.w - 42, boss.y + 52, 16, 16);
  }
}

function drawGameOver() {
  if (state.running) return;

  ctx.fillStyle = 'rgba(15,23,42,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.cleared ? 'Clear!' : 'Game Over', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '26px sans-serif';
  ctx.fillText(state.cleared ? 'Press R to play again' : 'Press R to restart', canvas.width / 2, canvas.height / 2 + 30);
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
