(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    selectScreen: $("#selectScreen"),
    gameScreen: $("#gameScreen"),
    characterGrid: $("#characterGrid"),
    startButton: $("#startButton"),
    practiceButton: $("#practiceButton"),
    pauseButton: $("#pauseButton"),
    restartButton: $("#restartButton"),
    muteButton: $("#muteButton"),
    abilityButton: $("#abilityButton"),
    abilityName: $("#abilityName"),
    abilityCooldown: $("#abilityCooldown"),
    pauseSlate: $("#pauseSlate"),
    canvas: $("#gameCanvas"),
    thesisLabel: $("#thesisLabel"),
    thesisMeter: $("#thesisMeter"),
    focusLabel: $("#focusLabel"),
    focusMeter: $("#focusMeter"),
    scoreLabel: $("#scoreLabel"),
    waveLabel: $("#waveLabel"),
    timeLabel: $("#timeLabel"),
    bestScoreLabel: $("#bestScoreLabel"),
    assistantFeed: $("#assistantFeed"),
    assistantForm: $("#assistantForm"),
    assistantInput: $("#assistantInput"),
    eventStrip: $("#eventStrip"),
    modal: $("#gameOverModal"),
    finalScore: $("#finalScore"),
    finalKills: $("#finalKills"),
    finalTime: $("#finalTime"),
    gameOverSummary: $("#gameOverSummary"),
    againButton: $("#againButton"),
    changeCharacterButton: $("#changeCharacterButton"),
    installStatus: $("#installStatus")
  };

  const ctx = els.canvas.getContext("2d");
  let canvasWidth = 960;
  let canvasHeight = 640;
  let dpr = 1;
  let audioContext = null;

  const characters = {
    methodologist: {
      id: "methodologist",
      name: "Methodologist",
      ability: "Focus Pulse",
      color: "#2f80ed",
      accent: "#c9f24d",
      speed: 270,
      radius: 17,
      maxFocus: 100,
      focusRegen: 19,
      shotCost: 6,
      shotDelay: 0.16,
      shotDamage: 30,
      shotSpeed: 690,
      abilityCooldown: 8.5
    },
    labGuardian: {
      id: "labGuardian",
      name: "Lab Guardian",
      ability: "Shield Review",
      color: "#32c6c0",
      accent: "#ef4444",
      speed: 225,
      radius: 20,
      maxFocus: 118,
      focusRegen: 16,
      shotCost: 7,
      shotDelay: 0.2,
      shotDamage: 34,
      shotSpeed: 620,
      abilityCooldown: 11
    },
    nightCoder: {
      id: "nightCoder",
      name: "Night Coder",
      ability: "Debug Burst",
      color: "#a67cff",
      accent: "#f5c542",
      speed: 330,
      radius: 15,
      maxFocus: 86,
      focusRegen: 21,
      shotCost: 5,
      shotDelay: 0.12,
      shotDamage: 24,
      shotSpeed: 760,
      abilityCooldown: 9.5
    }
  };

  const threatTypes = {
    bug: {
      label: "BUG",
      color: "#c9f24d",
      outline: "#11130f",
      radius: 15,
      hp: 42,
      speed: 76,
      damage: 8,
      score: 45,
      wobble: 0.5
    },
    deadline: {
      label: "DUE",
      color: "#ef4444",
      outline: "#fffdf7",
      radius: 17,
      hp: 34,
      speed: 124,
      damage: 12,
      score: 70,
      wobble: 0.16
    },
    reviewer: {
      label: "R2",
      color: "#f5c542",
      outline: "#11130f",
      radius: 23,
      hp: 120,
      speed: 50,
      damage: 22,
      score: 170,
      wobble: 0.24
    }
  };

  const keys = new Set();
  const pointer = {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    down: false
  };

  const state = {
    selectedCharacter: "methodologist",
    mode: "select",
    practice: false,
    paused: false,
    elapsed: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    wave: 1,
    spawnTimer: 0,
    waveAnnounced: 1,
    assistantTimer: 0,
    lastAdvisorFlag: "",
    highScore: readHighScore(),
    player: null,
    thesis: null,
    enemies: [],
    projectiles: [],
    particles: [],
    floatingText: [],
    slowTime: 0,
    speedBoost: 0,
    lowHealthWarned: false,
    finalStats: null
  };

  els.bestScoreLabel.textContent = state.highScore.toLocaleString();

  function readHighScore() {
    try {
      return Number(localStorage.getItem("defend-thesis-best") || 0);
    } catch (error) {
      return 0;
    }
  }

  function writeHighScore(value) {
    try {
      localStorage.setItem("defend-thesis-best", String(value));
    } catch (error) {
      // Local storage can be disabled in private browser modes.
    }
  }

  function resizeCanvas() {
    const rect = els.canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(320, Math.floor(rect.width));
    canvasHeight = Math.max(360, Math.floor(rect.height));
    els.canvas.width = Math.floor(canvasWidth * dpr);
    els.canvas.height = Math.floor(canvasHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (state.thesis) {
      state.thesis.x = canvasWidth / 2;
      state.thesis.y = canvasHeight / 2;
    }
    if (state.player) {
      state.player.x = clamp(state.player.x, 30, canvasWidth - 30);
      state.player.y = clamp(state.player.y, 30, canvasHeight - 30);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function setScreen(name) {
    state.mode = name;
    els.selectScreen.classList.toggle("is-active", name === "select");
    els.gameScreen.classList.toggle("is-active", name === "playing" || name === "gameover");
  }

  function startGame(practice = false) {
    resizeCanvas();
    const character = characters[state.selectedCharacter];
    state.practice = practice;
    state.paused = false;
    state.elapsed = 0;
    state.score = 0;
    state.kills = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.wave = 1;
    state.spawnTimer = 0.65;
    state.waveAnnounced = 1;
    state.assistantTimer = 2.5;
    state.lastAdvisorFlag = "";
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.floatingText = [];
    state.slowTime = 0;
    state.speedBoost = 0;
    state.lowHealthWarned = false;
    state.finalStats = null;
    state.thesis = {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      radius: 48,
      health: 100,
      maxHealth: 100,
      shield: 0,
      hitFlash: 0
    };
    state.player = {
      x: canvasWidth / 2,
      y: canvasHeight * 0.72,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: character.radius,
      focus: character.maxFocus,
      maxFocus: character.maxFocus,
      shotCooldown: 0,
      abilityCooldown: 0,
      dashTrail: 0,
      invulnerable: 0
    };

    pointer.x = state.player.x;
    pointer.y = state.player.y - 80;
    els.abilityName.textContent = character.ability;
    setScreen("playing");
    els.modal.classList.remove("is-visible");
    els.modal.setAttribute("aria-hidden", "true");
    els.pauseSlate.classList.remove("is-visible");
    clearAssistant();
    addAssistantMessage("system", `${character.name} online. I will watch the thesis integrity and call out tactical changes.`);
    pushEvent(practice ? "Low pressure run started" : "Defense run started");
    beep(260, 0.04, "square", 0.04);
  }

  function endGame() {
    state.mode = "gameover";
    state.paused = false;
    pointer.down = false;
    const finalScore = Math.floor(state.score + state.elapsed * 5 + state.thesis.health * 8);
    state.score = Math.max(state.score, finalScore);
    state.finalStats = {
      score: finalScore,
      kills: state.kills,
      time: state.elapsed
    };

    if (finalScore > state.highScore) {
      state.highScore = finalScore;
      writeHighScore(finalScore);
      els.bestScoreLabel.textContent = finalScore.toLocaleString();
    }

    els.finalScore.textContent = finalScore.toLocaleString();
    els.finalKills.textContent = String(state.kills);
    els.finalTime.textContent = formatTime(state.elapsed);
    els.gameOverSummary.textContent = `Wave ${state.wave} reached with ${state.kills} threats cleared.`;
    els.modal.classList.add("is-visible");
    els.modal.setAttribute("aria-hidden", "false");
    addAssistantMessage("warning", makeGameOverAdvice());
    pushEvent("Defense closed");
    beep(110, 0.12, "sawtooth", 0.05);
  }

  function makeGameOverAdvice() {
    if (state.thesis.health <= 0 && state.kills < 12) {
      return "Advisor note: stay closer to the thesis for the first wave and intercept deadlines before chasing bugs.";
    }
    if (state.kills > 35) {
      return "Advisor note: the defense lasted well. Next improvement is ability timing before reviewer clusters arrive.";
    }
    return "Advisor note: the run was stable. Spend focus in short bursts and save the special ability for mixed waves.";
  }

  function update(dt) {
    if (state.mode !== "playing" || state.paused) {
      return;
    }

    state.elapsed += dt;
    state.wave = 1 + Math.floor(state.elapsed / 24);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0) {
      state.combo = 0;
    }

    if (state.wave !== state.waveAnnounced) {
      state.waveAnnounced = state.wave;
      addFloatingText(canvasWidth / 2, 86, `Wave ${state.wave}`, "#f5c542", 1.6);
      addAssistantMessage("system", `Wave ${state.wave}. Threat speed is increasing; protect the center lane first.`);
      pushEvent(`Wave ${state.wave} started`);
      beep(440 + state.wave * 18, 0.08, "triangle", 0.04);
    }

    state.slowTime = Math.max(0, state.slowTime - dt);
    state.speedBoost = Math.max(0, state.speedBoost - dt);
    state.thesis.shield = Math.max(0, state.thesis.shield - dt);
    state.thesis.hitFlash = Math.max(0, state.thesis.hitFlash - dt);
    state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
    state.player.shotCooldown = Math.max(0, state.player.shotCooldown - dt);
    state.player.abilityCooldown = Math.max(0, state.player.abilityCooldown - dt);
    state.player.focus = clamp(
      state.player.focus + characters[state.selectedCharacter].focusRegen * dt,
      0,
      state.player.maxFocus
    );

    updatePlayer(dt);
    updateSpawning(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateAssistant(dt);
    updateHud();

    if (state.thesis.health <= 0) {
      endGame();
    }
  }

  function updatePlayer(dt) {
    const character = characters[state.selectedCharacter];
    let xInput = 0;
    let yInput = 0;
    if (keys.has("arrowleft") || keys.has("a")) xInput -= 1;
    if (keys.has("arrowright") || keys.has("d")) xInput += 1;
    if (keys.has("arrowup") || keys.has("w")) yInput -= 1;
    if (keys.has("arrowdown") || keys.has("s")) yInput += 1;

    const magnitude = Math.hypot(xInput, yInput) || 1;
    const boost = state.speedBoost > 0 ? 1.34 : 1;
    const speed = character.speed * boost;
    state.player.vx = (xInput / magnitude) * speed;
    state.player.vy = (yInput / magnitude) * speed;
    state.player.x = clamp(state.player.x + state.player.vx * dt, state.player.radius + 4, canvasWidth - state.player.radius - 4);
    state.player.y = clamp(state.player.y + state.player.vy * dt, state.player.radius + 4, canvasHeight - state.player.radius - 4);

    const aimX = pointer.x - state.player.x;
    const aimY = pointer.y - state.player.y;
    if (Math.hypot(aimX, aimY) > 4) {
      state.player.angle = Math.atan2(aimY, aimX);
    }

    if ((pointer.down || keys.has(" ")) && state.player.shotCooldown <= 0) {
      fireProjectile();
    }

    if (keys.has("e")) {
      useAbility();
    }
  }

  function fireProjectile() {
    const character = characters[state.selectedCharacter];
    if (state.player.focus < character.shotCost) {
      return;
    }
    state.player.focus -= character.shotCost;
    state.player.shotCooldown = character.shotDelay;

    const angle = state.player.angle;
    const offset = state.player.radius + 8;
    state.projectiles.push({
      x: state.player.x + Math.cos(angle) * offset,
      y: state.player.y + Math.sin(angle) * offset,
      vx: Math.cos(angle) * character.shotSpeed,
      vy: Math.sin(angle) * character.shotSpeed,
      radius: 5,
      damage: character.shotDamage,
      color: character.accent,
      life: 1.3,
      pierce: character.id === "nightCoder" ? 0.15 : 0
    });
    beep(620, 0.018, "square", 0.012);
  }

  function useAbility() {
    const character = characters[state.selectedCharacter];
    if (state.player.abilityCooldown > 0 || state.player.focus < 20) {
      return;
    }
    state.player.focus -= 20;
    state.player.abilityCooldown = character.abilityCooldown;

    if (character.id === "methodologist") {
      state.slowTime = 4.2;
      state.thesis.health = clamp(state.thesis.health + 4, 0, state.thesis.maxHealth);
      for (const enemy of state.enemies) {
        const d = distance(enemy, state.player);
        if (d < 210) {
          enemy.hp -= 42;
          const nx = (enemy.x - state.player.x) / Math.max(d, 1);
          const ny = (enemy.y - state.player.y) / Math.max(d, 1);
          enemy.x += nx * 42;
          enemy.y += ny * 42;
          spawnSparks(enemy.x, enemy.y, "#2f80ed", 10);
        }
      }
      addFloatingText(state.player.x, state.player.y - 40, "Focus Pulse", "#c9f24d", 1.1);
      pushEvent("Focus Pulse released");
    }

    if (character.id === "labGuardian") {
      state.thesis.shield = 6;
      state.thesis.health = clamp(state.thesis.health + 9, 0, state.thesis.maxHealth);
      for (let i = 0; i < 34; i += 1) {
        const angle = (Math.PI * 2 * i) / 34;
        state.particles.push({
          x: state.thesis.x + Math.cos(angle) * 62,
          y: state.thesis.y + Math.sin(angle) * 62,
          vx: Math.cos(angle) * 22,
          vy: Math.sin(angle) * 22,
          radius: 3,
          color: "#32c6c0",
          life: 0.9,
          maxLife: 0.9
        });
      }
      addFloatingText(state.thesis.x, state.thesis.y - 70, "Shield Review", "#32c6c0", 1.2);
      pushEvent("Shield Review active");
    }

    if (character.id === "nightCoder") {
      state.speedBoost = 3.4;
      state.player.invulnerable = 0.7;
      const shots = 14;
      for (let i = 0; i < shots; i += 1) {
        const angle = (Math.PI * 2 * i) / shots;
        state.projectiles.push({
          x: state.player.x + Math.cos(angle) * 24,
          y: state.player.y + Math.sin(angle) * 24,
          vx: Math.cos(angle) * 710,
          vy: Math.sin(angle) * 710,
          radius: 5,
          damage: 26,
          color: "#f5c542",
          life: 0.85,
          pierce: 0.2
        });
      }
      addFloatingText(state.player.x, state.player.y - 40, "Debug Burst", "#f5c542", 1.1);
      pushEvent("Debug Burst deployed");
    }

    beep(180, 0.07, "sawtooth", 0.04);
  }

  function updateSpawning(dt) {
    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) {
      return;
    }
    spawnEnemy();

    const practiceScale = state.practice ? 1.3 : 1;
    const wavePressure = Math.max(0.32, 1.05 - state.wave * 0.065);
    state.spawnTimer = wavePressure * practiceScale * lerp(0.78, 1.22, Math.random());

    if (state.wave > 3 && Math.random() < 0.22) {
      spawnEnemy("bug");
    }
  }

  function chooseThreatType() {
    const wave = state.wave;
    const roll = Math.random();
    const deadlineChance = clamp(0.2 + wave * 0.035, 0.2, 0.42);
    const reviewerChance = wave < 2 ? 0 : clamp((wave - 1) * 0.035, 0.04, 0.22);
    if (roll < reviewerChance) return "reviewer";
    if (roll < reviewerChance + deadlineChance) return "deadline";
    return "bug";
  }

  function spawnEnemy(forceType) {
    const typeName = forceType || chooseThreatType();
    const type = threatTypes[typeName];
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = Math.random() * canvasWidth;
      y = -type.radius - 10;
    } else if (side === 1) {
      x = canvasWidth + type.radius + 10;
      y = Math.random() * canvasHeight;
    } else if (side === 2) {
      x = Math.random() * canvasWidth;
      y = canvasHeight + type.radius + 10;
    } else {
      x = -type.radius - 10;
      y = Math.random() * canvasHeight;
    }

    const difficulty = state.practice ? 0.82 : 1;
    state.enemies.push({
      id: cryptoRandomId(),
      type: typeName,
      x,
      y,
      radius: type.radius,
      hp: type.hp * (1 + state.wave * 0.055) * difficulty,
      maxHp: type.hp * (1 + state.wave * 0.055) * difficulty,
      speed: type.speed * (1 + state.wave * 0.045) * difficulty,
      damage: type.damage * difficulty,
      score: type.score,
      phase: Math.random() * Math.PI * 2,
      hitFlash: 0
    });
  }

  function cryptoRandomId() {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0].toString(16);
    }
    return Math.random().toString(16).slice(2);
  }

  function updateEnemies(dt) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      const type = threatTypes[enemy.type];
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      const dx = state.thesis.x - enemy.x;
      const dy = state.thesis.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const px = -ny;
      const py = nx;
      const wobble = Math.sin(state.elapsed * (2.2 + type.wobble * 4) + enemy.phase) * type.wobble;
      const slow = state.slowTime > 0 ? 0.55 : 1;
      enemy.x += (nx + px * wobble) * enemy.speed * slow * dt;
      enemy.y += (ny + py * wobble) * enemy.speed * slow * dt;

      if (distance(enemy, state.thesis) < enemy.radius + state.thesis.radius) {
        damageThesis(enemy.damage);
        addFloatingText(state.thesis.x, state.thesis.y - 58, `-${Math.ceil(enemy.damage)}`, "#ef4444", 0.8);
        spawnSparks(enemy.x, enemy.y, type.color, 16);
        state.enemies.splice(i, 1);
        continue;
      }

      if (
        state.player.invulnerable <= 0 &&
        distance(enemy, state.player) < enemy.radius + state.player.radius
      ) {
        state.player.focus = Math.max(0, state.player.focus - 14);
        const hit = state.thesis.shield > 0 ? 1 : 4;
        damageThesis(hit);
        spawnSparks(state.player.x, state.player.y, "#fffdf7", 10);
        state.player.invulnerable = 0.85;
        state.enemies.splice(i, 1);
      }
    }
  }

  function updateProjectiles(dt) {
    for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = state.projectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;

      if (
        projectile.life <= 0 ||
        projectile.x < -40 ||
        projectile.x > canvasWidth + 40 ||
        projectile.y < -40 ||
        projectile.y > canvasHeight + 40
      ) {
        state.projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        if (distance(projectile, enemy) < projectile.radius + enemy.radius) {
          enemy.hp -= projectile.damage;
          enemy.hitFlash = 0.08;
          spawnSparks(projectile.x, projectile.y, projectile.color, 5);

          if (enemy.hp <= 0) {
            killEnemy(j);
          }

          if (projectile.pierce > 0) {
            projectile.pierce -= 0.2;
          } else {
            hit = true;
          }
          break;
        }
      }

      if (hit) {
        state.projectiles.splice(i, 1);
      }
    }
  }

  function killEnemy(index) {
    const enemy = state.enemies[index];
    const type = threatTypes[enemy.type];
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = 2.3;
    const comboBonus = Math.min(state.combo * 6, 90);
    const gained = Math.floor(type.score + comboBonus + state.wave * 6);
    state.score += gained;
    addFloatingText(enemy.x, enemy.y - 12, `+${gained}`, type.color, 0.75);
    spawnSparks(enemy.x, enemy.y, type.color, 18);
    state.enemies.splice(index, 1);
    if (state.combo === 6 || state.combo === 12 || state.combo === 20) {
      addAssistantMessage("system", `${state.combo} threat chain. Good tempo; keep the cursor between the thesis and the nearest edge.`);
    }
    beep(360 + Math.min(state.combo, 12) * 20, 0.028, "triangle", 0.018);
  }

  function damageThesis(amount) {
    const shielded = state.thesis.shield > 0;
    const finalDamage = shielded ? amount * 0.35 : amount;
    state.thesis.health = clamp(state.thesis.health - finalDamage, 0, state.thesis.maxHealth);
    state.thesis.hitFlash = 0.15;
    if (state.thesis.health < 35 && !state.lowHealthWarned) {
      state.lowHealthWarned = true;
      addAssistantMessage("warning", "Integrity is below 35%. Circle the thesis and let low-health bugs come to you.");
      pushEvent("Low thesis integrity");
    }
    beep(shielded ? 220 : 150, 0.045, "sawtooth", 0.025);
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    for (let i = state.floatingText.length - 1; i >= 0; i -= 1) {
      const item = state.floatingText[i];
      item.life -= dt;
      item.y -= 28 * dt;
      if (item.life <= 0) {
        state.floatingText.splice(i, 1);
      }
    }
  }

  function spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = lerp(40, 160, Math.random());
      const life = lerp(0.22, 0.58, Math.random());
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: lerp(2, 5, Math.random()),
        color,
        life,
        maxLife: life
      });
    }
  }

  function addFloatingText(x, y, text, color, life) {
    state.floatingText.push({ x, y, text, color, life, maxLife: life });
  }

  function updateAssistant(dt) {
    state.assistantTimer -= dt;
    if (state.assistantTimer > 0) {
      return;
    }
    state.assistantTimer = lerp(6.5, 9.5, Math.random());

    const deadlineCount = state.enemies.filter((enemy) => enemy.type === "deadline").length;
    const reviewerCount = state.enemies.filter((enemy) => enemy.type === "reviewer").length;
    const nearest = nearestEnemyDistance();
    let flag = "";
    let text = "";

    if (state.thesis.health < 45) {
      flag = "health";
      text = "Advisor: thesis pressure is high. Use the thesis as bait, then sweep threats from the outside edge.";
    } else if (state.player.focus < state.player.maxFocus * 0.28) {
      flag = "focus";
      text = "Advisor: focus is low. Stop firing for two seconds and reposition before the next burst.";
    } else if (deadlineCount >= 3) {
      flag = "deadline";
      text = "Advisor: deadline stack detected. Prioritize the red fast targets; they convert pressure into damage quickly.";
    } else if (reviewerCount >= 2) {
      flag = "reviewer";
      text = "Advisor: reviewer cluster. Save ability until they enter the inner ring, then clear the slow heavy targets.";
    } else if (nearest > 260 && state.enemies.length > 0) {
      flag = "spacing";
      text = "Advisor: threats are still wide. Stand between the largest group and the thesis, not on top of the thesis.";
    } else {
      flag = "tempo";
      text = `Advisor: wave ${state.wave} is stable. Current score pace is ${Math.round(state.score / Math.max(state.elapsed, 1) * 60)} per minute.`;
    }

    if (flag !== state.lastAdvisorFlag) {
      addAssistantMessage("system", text);
      state.lastAdvisorFlag = flag;
    }
  }

  function nearestEnemyDistance() {
    if (!state.enemies.length) {
      return Infinity;
    }
    return Math.min(...state.enemies.map((enemy) => distance(enemy, state.thesis)));
  }

  function updateHud() {
    const thesisPercent = Math.round((state.thesis.health / state.thesis.maxHealth) * 100);
    const focusPercent = Math.round((state.player.focus / state.player.maxFocus) * 100);
    els.thesisLabel.textContent = `${thesisPercent}%`;
    els.thesisMeter.style.width = `${thesisPercent}%`;
    els.focusLabel.textContent = `${focusPercent}%`;
    els.focusMeter.style.width = `${focusPercent}%`;
    els.scoreLabel.textContent = Math.floor(state.score).toLocaleString();
    els.waveLabel.textContent = String(state.wave);
    els.timeLabel.textContent = formatTime(state.elapsed);

    const character = characters[state.selectedCharacter];
    if (state.player.abilityCooldown <= 0) {
      els.abilityButton.disabled = false;
      els.abilityCooldown.textContent = state.player.focus >= 20 ? "Ready" : "Need Focus";
    } else {
      els.abilityButton.disabled = true;
      els.abilityCooldown.textContent = `${state.player.abilityCooldown.toFixed(1)}s`;
    }
    els.abilityName.textContent = character.ability;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawBackground();

    if (!state.thesis || !state.player) {
      return;
    }

    drawThreatPaths();
    drawThesis();
    for (const projectile of state.projectiles) drawProjectile(projectile);
    for (const enemy of state.enemies) drawEnemy(enemy);
    drawPlayer();
    drawParticles();
    drawFloatingText();
    drawReticle();
  }

  function drawBackground() {
    ctx.fillStyle = "#11130f";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = "#fffdf7";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvasWidth; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate(-0.04);
    ctx.fillStyle = "rgba(246, 244, 239, 0.035)";
    ctx.fillRect(-canvasWidth * 0.3, -canvasHeight * 0.34, canvasWidth * 0.6, canvasHeight * 0.68);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(201, 242, 77, 0.28)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawThreatPaths() {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#fffdf7";
    ctx.lineWidth = 1;
    for (const enemy of state.enemies) {
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(state.thesis.x, state.thesis.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawThesis() {
    const t = state.thesis;
    ctx.save();
    ctx.translate(t.x, t.y);

    if (t.hitFlash > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${t.hitFlash * 2.5})`;
      ctx.beginPath();
      ctx.arc(0, 0, t.radius + 24, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t.shield > 0) {
      ctx.strokeStyle = "rgba(50, 198, 192, 0.9)";
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, t.radius + 26 + Math.sin(state.elapsed * 8) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.rotate(-0.08);
    ctx.fillStyle = "#11130f";
    ctx.fillRect(-38, -46, 78, 94);
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(-45, -52, 78, 94);
    ctx.strokeStyle = "#11130f";
    ctx.lineWidth = 4;
    ctx.strokeRect(-45, -52, 78, 94);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-33, -38, 50, 7);
    ctx.fillStyle = "#11130f";
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(-33, -18 + i * 10, 49 + (i % 2) * 14, 3);
    }

    ctx.rotate(0.08);
    ctx.strokeStyle = "#c9f24d";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, t.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (t.health / t.maxHealth));
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    const character = characters[state.selectedCharacter];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    if (state.speedBoost > 0 || p.invulnerable > 0) {
      ctx.fillStyle = "rgba(245, 197, 66, 0.18)";
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 16 + Math.sin(state.elapsed * 18) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#11130f";
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(4, -5, p.radius + 18, 10);
    ctx.strokeStyle = "#11130f";
    ctx.lineWidth = 3;
    ctx.strokeRect(4, -5, p.radius + 18, 10);

    ctx.fillStyle = character.accent;
    ctx.beginPath();
    ctx.moveTo(p.radius - 2, -13);
    ctx.lineTo(p.radius + 20, 0);
    ctx.lineTo(p.radius - 2, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawProjectile(projectile) {
    ctx.save();
    ctx.fillStyle = projectile.color;
    ctx.strokeStyle = "#11130f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const type = threatTypes[enemy.type];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.sin(state.elapsed * 2 + enemy.phase) * 0.14);
    const flash = enemy.hitFlash > 0;

    ctx.fillStyle = flash ? "#fffdf7" : type.color;
    ctx.strokeStyle = type.outline;
    ctx.lineWidth = 4;

    if (enemy.type === "bug") {
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius * 1.15, enemy.radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-enemy.radius * 0.9, -enemy.radius * 0.7);
      ctx.lineTo(-enemy.radius * 1.55, -enemy.radius * 1.15);
      ctx.moveTo(-enemy.radius * 0.6, enemy.radius * 0.75);
      ctx.lineTo(-enemy.radius * 1.35, enemy.radius * 1.22);
      ctx.moveTo(enemy.radius * 0.55, -enemy.radius * 0.78);
      ctx.lineTo(enemy.radius * 1.25, -enemy.radius * 1.25);
      ctx.moveTo(enemy.radius * 0.55, enemy.radius * 0.75);
      ctx.lineTo(enemy.radius * 1.25, enemy.radius * 1.2);
      ctx.stroke();
    } else if (enemy.type === "deadline") {
      ctx.beginPath();
      ctx.moveTo(enemy.radius * 1.25, 0);
      ctx.lineTo(-enemy.radius * 0.9, -enemy.radius);
      ctx.lineTo(-enemy.radius * 0.5, 0);
      ctx.lineTo(-enemy.radius * 0.9, enemy.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
      ctx.strokeRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
      ctx.fillStyle = "#11130f";
      ctx.fillRect(-enemy.radius + 8, -enemy.radius + 9, enemy.radius * 2 - 16, 5);
      ctx.fillRect(-enemy.radius + 8, -enemy.radius + 20, enemy.radius * 2 - 24, 5);
    }

    ctx.fillStyle = enemy.type === "deadline" ? "#fffdf7" : "#11130f";
    ctx.font = "900 10px Cascadia Mono, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type.label, 0, 0);

    const hpWidth = enemy.radius * 2;
    ctx.fillStyle = "rgba(17, 19, 15, 0.35)";
    ctx.fillRect(-hpWidth / 2, enemy.radius + 10, hpWidth, 4);
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(-hpWidth / 2, enemy.radius + 10, hpWidth * (enemy.hp / enemy.maxHp), 4);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFloatingText() {
    ctx.save();
    ctx.font = "900 18px Cascadia Mono, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const item of state.floatingText) {
      const alpha = clamp(item.life / item.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = item.color;
      ctx.strokeStyle = "#11130f";
      ctx.lineWidth = 4;
      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  function drawReticle() {
    if (state.mode !== "playing") {
      return;
    }
    ctx.save();
    ctx.strokeStyle = "rgba(255, 253, 247, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 12, 0, Math.PI * 2);
    ctx.moveTo(pointer.x - 18, pointer.y);
    ctx.lineTo(pointer.x - 6, pointer.y);
    ctx.moveTo(pointer.x + 6, pointer.y);
    ctx.lineTo(pointer.x + 18, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - 18);
    ctx.lineTo(pointer.x, pointer.y - 6);
    ctx.moveTo(pointer.x, pointer.y + 6);
    ctx.lineTo(pointer.x, pointer.y + 18);
    ctx.stroke();
    ctx.restore();
  }

  function clearAssistant() {
    els.assistantFeed.innerHTML = "";
    els.eventStrip.textContent = "";
  }

  function addAssistantMessage(kind, text) {
    const div = document.createElement("div");
    div.className = `message ${kind}`;
    div.textContent = text;
    els.assistantFeed.appendChild(div);
    while (els.assistantFeed.children.length > 9) {
      els.assistantFeed.removeChild(els.assistantFeed.firstElementChild);
    }
    els.assistantFeed.scrollTop = els.assistantFeed.scrollHeight;
  }

  function pushEvent(text) {
    els.eventStrip.textContent = text;
  }

  function answerAdvisorQuestion(input) {
    const text = input.toLowerCase();
    const thesis = state.thesis ? Math.round(state.thesis.health) : 100;
    const focus = state.player ? Math.round((state.player.focus / state.player.maxFocus) * 100) : 100;
    const deadlineCount = state.enemies.filter((enemy) => enemy.type === "deadline").length;
    const reviewerCount = state.enemies.filter((enemy) => enemy.type === "reviewer").length;

    if (text.includes("score") || text.includes("grade") || text.includes("point")) {
      return `Score comes from cleared threats, combo chains, survival time, and remaining thesis integrity. Current score: ${Math.floor(state.score).toLocaleString()}.`;
    }
    if (text.includes("deadline") || text.includes("red") || text.includes("fast")) {
      return `There are ${deadlineCount} deadlines on the board. They are fast and high damage, so intercept them before bugs.`;
    }
    if (text.includes("review") || text.includes("r2") || text.includes("peer")) {
      return reviewerCount
        ? `Reviewer count is ${reviewerCount}. Keep distance, chip them down, then use the special ability when they cross the inner ring.`
        : "No reviewer is currently active. Save focus and build position for the next heavy target.";
    }
    if (text.includes("focus") || text.includes("energy") || text.includes("ability")) {
      return `Focus is at ${focus}%. Single shots are cheap, but the special ability needs 20 focus and a cooldown window.`;
    }
    if (text.includes("thesis") || text.includes("health") || text.includes("integrity")) {
      return `Thesis integrity is ${thesis}%. If it drops below 40%, orbit close to the center and let threats enter your firing line.`;
    }
    if (text.includes("character") || text.includes("defender")) {
      return `${characters[state.selectedCharacter].name} is active. This build rewards ${state.selectedCharacter === "nightCoder" ? "fast movement and burst clearing" : state.selectedCharacter === "labGuardian" ? "shield timing and center control" : "balanced positioning and accurate shooting"}.`;
    }
    return `Current read: wave ${state.wave}, thesis ${thesis}%, focus ${focus}%, ${state.enemies.length} active threats. The safest play is to stand between the largest cluster and the thesis.`;
  }

  function beep(frequency, duration, type, gainValue) {
    if (!audioContext || els.muteButton.dataset.muted === "true") {
      return;
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function unlockAudio() {
    if (!audioContext && window.AudioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  function togglePause() {
    if (state.mode !== "playing") {
      return;
    }
    state.paused = !state.paused;
    els.pauseSlate.classList.toggle("is-visible", state.paused);
    els.pauseButton.querySelector("span").textContent = state.paused ? ">" : "II";
    pushEvent(state.paused ? "Paused" : "Resumed");
  }

  function isTypingTarget(target) {
    return target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
  }

  function handlePointerMove(event) {
    const rect = els.canvas.getBoundingClientRect();
    pointer.x = clamp(event.clientX - rect.left, 0, canvasWidth);
    pointer.y = clamp(event.clientY - rect.top, 0, canvasHeight);
  }

  function initEvents() {
    els.characterGrid.addEventListener("click", (event) => {
      const card = event.target.closest(".character-card");
      if (!card) return;
      state.selectedCharacter = card.dataset.character;
      $$(".character-card").forEach((item) => item.classList.toggle("is-selected", item === card));
      const character = characters[state.selectedCharacter];
      els.abilityName.textContent = character.ability;
      beep(300, 0.02, "square", 0.012);
    });

    els.startButton.addEventListener("click", () => {
      unlockAudio();
      startGame(false);
    });

    els.practiceButton.addEventListener("click", () => {
      unlockAudio();
      startGame(true);
    });

    els.pauseButton.addEventListener("click", togglePause);
    els.restartButton.addEventListener("click", () => startGame(state.practice));
    els.againButton.addEventListener("click", () => startGame(state.practice));
    els.changeCharacterButton.addEventListener("click", () => {
      els.modal.classList.remove("is-visible");
      els.modal.setAttribute("aria-hidden", "true");
      setScreen("select");
    });
    els.abilityButton.addEventListener("click", useAbility);

    els.muteButton.addEventListener("click", () => {
      unlockAudio();
      const muted = els.muteButton.dataset.muted === "true";
      els.muteButton.dataset.muted = muted ? "false" : "true";
      els.muteButton.querySelector("span").textContent = muted ? "A" : "M";
      pushEvent(muted ? "Audio enabled" : "Audio muted");
    });

    els.assistantForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = els.assistantInput.value.trim();
      if (!value) return;
      addAssistantMessage("user", value);
      els.assistantInput.value = "";
      window.setTimeout(() => {
        addAssistantMessage("system", answerAdvisorQuestion(value));
      }, 180);
    });

    window.addEventListener("keydown", (event) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "e", "p"].includes(key)) {
        event.preventDefault();
      }
      if (key === "p") {
        togglePause();
      }
      keys.add(key);
    });

    window.addEventListener("keyup", (event) => {
      keys.delete(event.key.toLowerCase());
    });

    window.addEventListener("blur", () => {
      keys.clear();
      pointer.down = false;
    });

    els.canvas.addEventListener("pointermove", handlePointerMove);
    els.canvas.addEventListener("pointerdown", (event) => {
      unlockAudio();
      handlePointerMove(event);
      pointer.down = true;
      els.canvas.setPointerCapture(event.pointerId);
    });
    els.canvas.addEventListener("pointerup", (event) => {
      pointer.down = false;
      if (els.canvas.hasPointerCapture(event.pointerId)) {
        els.canvas.releasePointerCapture(event.pointerId);
      }
    });
    els.canvas.addEventListener("pointerleave", () => {
      pointer.down = false;
    });

    window.addEventListener("resize", resizeCanvas);
  }

  function initInstallSupport() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").then(() => {
        els.installStatus.textContent = "PWA Ready";
      }).catch(() => {
        els.installStatus.textContent = "Web Build";
      });
    }
  }

  function frame(now) {
    const dt = Math.min(0.034, (now - frame.last) / 1000 || 0);
    frame.last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  frame.last = performance.now();

  resizeCanvas();
  initEvents();
  initInstallSupport();
  updateHudPlaceholder();
  initDemoMode();
  requestAnimationFrame(frame);

  function updateHudPlaceholder() {
    els.thesisLabel.textContent = "100%";
    els.thesisMeter.style.width = "100%";
    els.focusLabel.textContent = "100%";
    els.focusMeter.style.width = "100%";
    els.scoreLabel.textContent = "0";
    els.waveLabel.textContent = "1";
    els.timeLabel.textContent = "00:00";
    els.abilityName.textContent = characters[state.selectedCharacter].ability;
    els.abilityCooldown.textContent = "Ready";
  }

  function initDemoMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "game") {
      const requestedCharacter = params.get("character");
      if (characters[requestedCharacter]) {
        state.selectedCharacter = requestedCharacter;
        $$(".character-card").forEach((item) => {
          item.classList.toggle("is-selected", item.dataset.character === requestedCharacter);
        });
      }
      window.setTimeout(() => {
        startGame(params.get("practice") === "1");
        seedDemoAction();
      }, 120);
    }
  }

  function seedDemoAction() {
    state.elapsed = 10;
    const placements = [
      { type: "bug", x: 120, y: 120 },
      { type: "deadline", x: canvasWidth - 120, y: 155 },
      { type: "bug", x: canvasWidth - 180, y: canvasHeight - 105 },
      { type: "reviewer", x: 128, y: canvasHeight - 118 }
    ];
    for (const item of placements) {
      const type = threatTypes[item.type];
      state.enemies.push({
        id: cryptoRandomId(),
        type: item.type,
        x: item.x,
        y: item.y,
        radius: type.radius,
        hp: type.hp,
        maxHp: type.hp,
        speed: type.speed,
        damage: type.damage,
        score: type.score,
        phase: Math.random() * Math.PI * 2,
        hitFlash: 0
      });
    }
    for (let i = 0; i < 4; i += 1) {
      const angle = -0.25 + i * 0.15;
      state.projectiles.push({
        x: state.player.x + 30 + i * 8,
        y: state.player.y - 15 + i * 4,
        vx: Math.cos(angle) * 620,
        vy: Math.sin(angle) * 620,
        radius: 5,
        damage: 28,
        color: "#c9f24d",
        life: 0.9,
        pierce: 0
      });
    }
    addAssistantMessage("system", "Demo read: mixed wave visible. Red deadlines should be cleared before the reviewer reaches the inner ring.");
    pushEvent("Demo wave seeded");
  }
})();
