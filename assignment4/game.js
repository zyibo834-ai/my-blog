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
    endlessButton: $("#endlessButton"),
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
    inspirationLabel: $("#inspirationLabel"),
    timeLabel: $("#timeLabel"),
    bestScoreLabel: $("#bestScoreLabel"),
    assistantFeed: $("#assistantFeed"),
    assistantForm: $("#assistantForm"),
    assistantInput: $("#assistantInput"),
    eventStrip: $("#eventStrip"),
    modal: $("#gameOverModal"),
    gameOverBadge: $("#gameOverBadge"),
    gameOverTitle: $("#gameOverTitle"),
    finalScore: $("#finalScore"),
    finalKills: $("#finalKills"),
    finalTime: $("#finalTime"),
    gameOverSummary: $("#gameOverSummary"),
    againButton: $("#againButton"),
    changeCharacterButton: $("#changeCharacterButton"),
    installStatus: $("#installStatus"),
    upgradeModal: $("#upgradeModal"),
    upgradeGrid: $("#upgradeGrid"),
    upgradeHint: $("#upgradeHint")
  };

  const ctx = els.canvas.getContext("2d");
  let canvasWidth = 960;
  let canvasHeight = 640;
  let dpr = 1;
  let audioContext = null;
  let lastHitSoundAt = 0;
  const SOUND_VOLUME = 1.9;
  const FINAL_BOSS_WAVE = 6;

  const characters = {
    methodologist: {
      id: "methodologist",
      name: "Method Student",
      ability: "Method Lock",
      color: "#2f80ed",
      accent: "#c9f24d",
      speed: 260,
      radius: 17,
      maxFocus: 102,
      focusRegen: 19,
      shotCost: 6,
      shotDelay: 0.18,
      shotDamage: 29,
      shotSpeed: 700,
      abilityCooldown: 9.2
    },
    labGuardian: {
      id: "labGuardian",
      name: "Lab Guardian",
      ability: "Defense Setup",
      color: "#32c6c0",
      accent: "#ef4444",
      speed: 215,
      radius: 22,
      maxFocus: 124,
      focusRegen: 14,
      shotCost: 8,
      shotDelay: 0.27,
      shotDamage: 38,
      shotSpeed: 560,
      abilityCooldown: 13.5
    },
    nightCoder: {
      id: "nightCoder",
      name: "Night Coder",
      ability: "Overload Build",
      color: "#a67cff",
      accent: "#f5c542",
      speed: 350,
      radius: 14,
      maxFocus: 76,
      focusRegen: 22,
      shotCost: 5,
      shotDelay: 0.11,
      shotDamage: 19,
      shotSpeed: 820,
      abilityCooldown: 10
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
      label: "DDL",
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
      label: "REV",
      color: "#f5c542",
      outline: "#11130f",
      radius: 23,
      hp: 120,
      speed: 50,
      damage: 22,
      score: 170,
      wobble: 0.24
    },
    committee: {
      label: "COM",
      color: "#a67cff",
      outline: "#fffdf7",
      radius: 36,
      hp: 520,
      speed: 34,
      damage: 36,
      score: 720,
      wobble: 0.12
    },
    finalBoss: {
      label: "FINAL",
      color: "#ff2e63",
      outline: "#fffdf7",
      radius: 60,
      hp: 5200,
      speed: 42,
      damage: 112,
      score: 5600,
      wobble: 0.08
    }
  };

  const upgradePool = [
    {
      id: "sharpShots",
      title: "Sharp Argument",
      tag: "Power",
      desc: "Projectile damage increases by 22%, helping with high-health reviewers.",
      apply() {
        state.damageBonus += 0.22;
      }
    },
    {
      id: "quickDraft",
      title: "Rapid Draft",
      tag: "Fire Rate",
      desc: "Shot delay is reduced by 14% for a denser defense rhythm.",
      apply() {
        state.shotDelayMult *= 0.86;
      }
    },
    {
      id: "wideMargin",
      title: "Wide Margins",
      tag: "Area",
      desc: "Projectiles become larger and gain a little piercing power.",
      apply() {
        state.projectileRadiusBonus += 2;
        state.pierceBonus += 0.2;
      }
    },
    {
      id: "coffeeRefill",
      title: "Coffee Refill",
      tag: "Focus",
      desc: "Max focus increases by 18 and regeneration improves.",
      apply() {
        state.player.maxFocus += 18;
        state.player.focus = Math.min(state.player.maxFocus, state.player.focus + 28);
        state.focusRegenBonus += 5;
      }
    },
    {
      id: "literatureShield",
      title: "Literature Shield",
      tag: "Defense",
      desc: "The thesis immediately recovers 15 integrity and gains passive repair.",
      apply() {
        state.thesis.health = clamp(state.thesis.health + 15, 0, state.thesis.maxHealth);
        state.thesisRegen += 0.55;
      }
    },
    {
      id: "doubleBlind",
      title: "Double-Blind Counter",
      tag: "Trajectory",
      desc: "Each shot fires two extra narrow-angle side projectiles.",
      apply() {
        state.sideShots += 1;
      }
    },
    {
      id: "committeePrep",
      title: "Mock Defense Drill",
      tag: "Boss",
      desc: "Deal 25% extra damage to bosses and reviewers.",
      apply() {
        state.heavyDamageBonus += 0.25;
      }
    },
    {
      id: "citationCombo",
      title: "Citation Combo",
      tag: "Score",
      desc: "Combos last longer and score gains increase by 18%.",
      apply() {
        state.comboDuration += 0.9;
        state.scoreBonus *= 1.18;
      }
    }
  ];

  const powerUpTypes = {
    rapid: {
      name: "Machine Gun",
      short: "Machine Gun",
      color: "#ff2e63",
      duration: 5.5,
      weight: 28,
      desc: "Fire rate surges and focus cost is reduced."
    },
    blast: {
      name: "AreaBlast",
      short: "Blast",
      color: "#f5c542",
      duration: 6,
      weight: 24,
      desc: "Projectiles deal area damage on hit."
    },
    scatter: {
      name: "Scatter Argument",
      short: "Scatter",
      color: "#32c6c0",
      duration: 6,
      weight: 22,
      desc: "Each shot fires two extra side projectiles."
    },
    shield: {
      name: "Temporary Shield",
      short: "Shield",
      color: "#a67cff",
      duration: 7,
      weight: 16,
      desc: "The thesis gains a shield and repairs slightly."
    },
    freeze: {
      name: "Freeze Field",
      short: "Freeze",
      color: "#2f80ed",
      duration: 4.8,
      weight: 18,
      desc: "All threats are significantly slowed."
    }
  };

  const CARD_DRAW_COST = 30;
  const HAND_LIMIT = 3;

  const argumentCards = [
    {
      id: "citationRain",
      name: "Citations",
      rarity: "common",
      tag: "Homing",
      desc: "Creates 6 homing citation projectiles.",
      weight: 34,
      use() {
        for (let i = 0; i < 6; i += 1) {
          const angle = (Math.PI * 2 * i) / 6;
          state.projectiles.push({
            x: state.player.x + Math.cos(angle) * 24,
            y: state.player.y + Math.sin(angle) * 24,
            vx: Math.cos(angle) * 220,
            vy: Math.sin(angle) * 220,
            radius: 6 + state.projectileRadiusBonus,
            damage: 26 * (1 + state.damageBonus),
            color: "#32c6c0",
            life: 2.1,
            pierce: 0.1 + state.pierceBonus,
            homing: true
          });
        }
      }
    },
    {
      id: "experimentResult",
      name: "Experimental Results",
      rarity: "rare",
      tag: "Area",
      desc: "Deals area damage to threats near the thesis.",
      weight: 22,
      use() {
        for (const enemy of state.enemies) {
          if (distance(enemy, state.thesis) < 210) {
            enemy.hp -= 72 * (1 + state.damageBonus);
            enemy.hitFlash = 0.14;
            spawnSparks(enemy.x, enemy.y, "#f5c542", 12);
          }
        }
        addFloatingText(state.thesis.x, state.thesis.y - 88, "Experimental Results", "#f5c542", 1.0);
        state.screenShake = Math.max(state.screenShake, 0.8);
      }
    },
    {
      id: "theoryShield",
      name: "Theory Framework",
      rarity: "common",
      tag: "Shield",
      desc: "Gain a shield and restore thesis integrity.",
      weight: 26,
      use() {
        state.thesis.shield = Math.max(state.thesis.shield, 7);
        state.thesis.health = clamp(state.thesis.health + 16, 0, state.thesis.maxHealth);
        addFloatingText(state.thesis.x, state.thesis.y - 78, "+16 Thesis", "#32c6c0", 1.0);
      }
    },
    {
      id: "polishedLanguage",
      name: "Polished Language",
      rarity: "common",
      tag: "Control",
      desc: "Greatly slows all threats for 5 seconds.",
      weight: 25,
      use() {
        state.slowTime = Math.max(state.slowTime, 5);
        for (const enemy of state.enemies) {
          spawnSparks(enemy.x, enemy.y, "#2f80ed", 5);
        }
      }
    },
    {
      id: "rebuttalStrike",
      name: "Rebuttal",
      rarity: "rare",
      tag: "Heavy Hit",
      desc: "Deals heavy damage to reviewers and bosses.",
      weight: 18,
      use() {
        const heavyTargets = state.enemies.filter((enemy) => enemy.type === "reviewer" || enemy.type === "committee" || enemy.type === "finalBoss");
        const targets = heavyTargets.length
          ? heavyTargets
          : [...state.enemies].sort((a, b) => distance(a, state.thesis) - distance(b, state.thesis));
        for (const enemy of targets.slice(0, 3)) {
          enemy.hp -= 150 * (1 + state.damageBonus + state.heavyDamageBonus);
          enemy.hitFlash = 0.18;
          spawnSparks(enemy.x, enemy.y, "#ef4444", 22);
          addFloatingText(enemy.x, enemy.y - enemy.radius - 18, "Rebuttal", "#ef4444", 0.9);
        }
        state.screenShake = Math.max(state.screenShake, 0.95);
      }
    },
    {
      id: "figureEvidence",
      name: "Figure Evidence",
      rarity: "epic",
      tag: "Turret",
      desc: "Deploys 4 evidence turrets around the thesis.",
      weight: 10,
      use() {
        for (let i = 0; i < 4; i += 1) {
          const angle = (Math.PI * 2 * i) / 4;
          state.turrets.push({
            x: state.thesis.x + Math.cos(angle) * 96,
            y: state.thesis.y + Math.sin(angle) * 96,
            cooldown: i * 0.18,
            life: 9
          });
        }
      }
    },
    {
      id: "statSignificant",
      name: "Statistically Significant",
      rarity: "epic",
      tag: "Burst",
      desc: "Greatly boosts damage and score for 8 seconds.",
      weight: 9,
      use() {
        state.cardBuffs.crit = Math.max(state.cardBuffs.crit, 8);
        addFloatingText(state.player.x, state.player.y - 44, "p < 0.05", "#f5c542", 1.0);
      }
    },
    {
      id: "advisorIntervention",
      name: "Advisor Intervention",
      rarity: "legendary",
      tag: "Clear",
      desc: "Clears many threats and repairs the thesis.",
      weight: 4,
      use() {
        const targets = [...state.enemies]
          .sort((a, b) => distance(a, state.thesis) - distance(b, state.thesis))
          .slice(0, 8);
        for (const enemy of targets) {
          enemy.hp -= enemy.type === "committee" || enemy.type === "finalBoss" ? 260 : 999;
          enemy.hitFlash = 0.2;
          spawnSparks(enemy.x, enemy.y, "#a67cff", 20);
        }
        state.thesis.health = clamp(state.thesis.health + 22, 0, state.thesis.maxHealth);
        state.screenShake = Math.max(state.screenShake, 1.4);
        addAssistantMessage("system", "Advisor: I will cover this section, but prepare earlier next time.");
      }
    }
  ];

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
    endless: false,
    paused: false,
    elapsed: 0,
    score: 0,
    kills: 0,
    inspiration: 0,
    hand: [],
    turrets: [],
    cardBuffs: { crit: 0 },
    powerUps: {},
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
    damageBonus: 0,
    shotDelayMult: 1,
    projectileRadiusBonus: 0,
    pierceBonus: 0,
    focusRegenBonus: 0,
    thesisRegen: 0,
    scoreBonus: 1,
    sideShots: 0,
    heavyDamageBonus: 0,
    comboDuration: 2.3,
    upgradePending: false,
    upgradeChoices: [],
    offeredUpgrades: [],
    nextUpgradeWave: 2,
    bossSpawnedForWave: 0,
    finalBossSpawned: false,
    finalBossActive: false,
    victory: false,
    screenShake: 0,
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
    const parentRect = els.canvas.parentElement ? els.canvas.parentElement.getBoundingClientRect() : rect;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const measuredWidth = rect.width || parentRect.width || 960;
    const measuredHeight = rect.height || Math.min(window.innerHeight * 0.64, 680) || 640;
    canvasWidth = Math.max(320, Math.floor(measuredWidth));
    canvasHeight = Math.max(420, Math.floor(measuredHeight));
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

  function centerGameActors() {
    if (state.thesis) {
      state.thesis.x = canvasWidth / 2;
      state.thesis.y = canvasHeight / 2;
    }
    if (state.player) {
      state.player.x = canvasWidth / 2;
      state.player.y = canvasHeight * 0.72;
      pointer.x = state.player.x;
      pointer.y = state.player.y - 80;
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
    document.body.classList.toggle("is-game-active", name === "playing" || name === "gameover");
  }

  function startGame(options = {}) {
    const settings = typeof options === "boolean" ? { practice: options } : options;
    const practice = Boolean(settings.practice);
    const endless = Boolean(settings.endless);
    const character = characters[state.selectedCharacter];
    setScreen("playing");
    resizeCanvas();
    state.practice = practice;
    state.endless = endless;
    state.paused = false;
    state.elapsed = 0;
    state.score = 0;
    state.kills = 0;
    state.inspiration = 0;
    state.hand = [];
    state.turrets = [];
    state.cardBuffs = { crit: 0 };
    state.powerUps = {};
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
    state.damageBonus = 0;
    state.shotDelayMult = 1;
    state.projectileRadiusBonus = 0;
    state.pierceBonus = 0;
    state.focusRegenBonus = 0;
    state.thesisRegen = 0;
    state.scoreBonus = 1;
    state.sideShots = 0;
    state.heavyDamageBonus = 0;
    state.comboDuration = 2.3;
    state.upgradePending = false;
    state.upgradeChoices = [];
    state.offeredUpgrades = [];
    state.nextUpgradeWave = 2;
    state.bossSpawnedForWave = 0;
    state.finalBossSpawned = false;
    state.finalBossActive = false;
    state.victory = false;
    state.screenShake = 0;
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
    window.requestAnimationFrame(() => {
      resizeCanvas();
      centerGameActors();
    });
    els.modal.classList.remove("is-visible");
    els.modal.setAttribute("aria-hidden", "true");
    closeUpgradeModal();
    els.pauseSlate.classList.remove("is-visible");
    clearAssistant();
    addAssistantMessage("system", endless
      ? `${character.name} is ready. Endless Mode has no final boss; survive longer and chase a higher score.`
      : `${character.name} is ready. Prioritize color-aura monsters; they drop temporary boosts like Machine Gun and Area Blast.`);
    pushEvent(endless ? "Endless Mode started" : practice ? "Practice Mode started" : "Thesis defense started");
    playStartSound();
  }

  function endGame(victory = false) {
    state.mode = "gameover";
    state.paused = false;
    state.victory = victory;
    state.finalBossActive = false;
    closeUpgradeModal();
    pointer.down = false;
    const finalScore = Math.floor(state.score + state.elapsed * 5 + state.thesis.health * 8 + (victory ? 1800 : 0));
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
    els.gameOverBadge.textContent = victory ? "Defense Passed" : "Defense Over";
    els.gameOverTitle.textContent = victory ? "Defense Passed! Your thesis survived the final review." : "The committee broke through your thesis defense.";
    els.gameOverSummary.textContent = victory
      ? `You defeated the final boss, the Defense Chair, reached wave ${state.wave}, and cleared ${state.kills} threats.`
      : `Reached wave ${state.wave}, and cleared ${state.kills} threats.`;
    els.modal.classList.add("is-visible");
    els.modal.setAttribute("aria-hidden", "false");
    addAssistantMessage(victory ? "system" : "warning", victory ? "Advisor: The Defense Chair is defeated. Your thesis passed final review and is ready to present." : makeGameOverAdvice());
    pushEvent(victory ? "Defense Passed" : "Defense Over");
    if (victory) {
      playPowerUpSound("shield");
      playExplosionSound(1.2);
    } else {
      beep(110, 0.12, "sawtooth", 0.05);
    }
  }

  function makeGameOverAdvice() {
    if (state.thesis.health <= 0 && state.kills < 12) {
      return "Advisor tip: In early waves, defend near the thesis and intercept red deadlines before chasing bugs.";
    }
    if (state.kills > 35) {
      return "Advisor tip: Good run. Next time, save your ability cooldown before reviewers cluster up.";
    }
    return "Advisor tip: Your tempo was stable. Do not empty focus all at once; save abilities for mixed threat waves.";
  }

  function offerUpgrade() {
    if (!els.upgradeModal || !els.upgradeGrid) {
      return;
    }
    pointer.down = false;
    state.upgradePending = true;
    state.upgradeChoices = pickUpgradeChoices();
    els.upgradeHint.textContent = `Wave ${state.wave}: choose one upgrade before the next wave.`;
    els.upgradeGrid.innerHTML = "";

    for (const upgrade of state.upgradeChoices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";
      button.innerHTML = `<span>${upgrade.tag}</span><strong>${upgrade.title}</strong><p>${upgrade.desc}</p>`;
      button.addEventListener("click", () => applyUpgrade(upgrade));
      els.upgradeGrid.appendChild(button);
    }

    els.upgradeModal.classList.add("is-visible");
    els.upgradeModal.setAttribute("aria-hidden", "false");
    addAssistantMessage("system", "Choose an upgrade before the next wave. If damage is low, pick power; if the thesis is in danger, pick defense.");
    pushEvent("Choose an upgrade");
  }

  function pickUpgradeChoices() {
    const available = upgradePool.filter((upgrade) => {
      const timesTaken = state.offeredUpgrades.filter((id) => id === upgrade.id).length;
      return timesTaken < 2;
    });
    const pool = available.length >= 3 ? available : upgradePool;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  function applyUpgrade(upgrade) {
    upgrade.apply();
    state.offeredUpgrades.push(upgrade.id);
    state.upgradePending = false;
    closeUpgradeModal();
    addFloatingText(canvasWidth / 2, 96, upgrade.title, "#c9f24d", 1.5);
    addAssistantMessage("system", `Selected "${upgrade.title}". Your defense is stronger. Keep protecting the thesis.`);
    pushEvent(`Upgrade complete: ${upgrade.title}`);
    state.screenShake = Math.max(state.screenShake, 0.45);
    beep(520, 0.08, "triangle", 0.04);
  }

  function closeUpgradeModal() {
    if (!els.upgradeModal) {
      return;
    }
    state.upgradePending = false;
    els.upgradeModal.classList.remove("is-visible");
    els.upgradeModal.setAttribute("aria-hidden", "true");
  }

  function drawArgumentCard(free = false) {
    if (!free && (state.mode !== "playing" || state.paused || state.upgradePending)) {
      return false;
    }
    if (!state.player || state.hand.length >= HAND_LIMIT) {
      pushEvent("Hand is full. Use an argument card first.");
      return false;
    }
    if (!free && state.inspiration < CARD_DRAW_COST) {
      pushEvent("Not enough inspiration. Clear threats to gain more.");
      addFloatingText(state.player.x, state.player.y - 42, "Not enough inspiration", "#ef4444", 0.8);
      return false;
    }
    if (!free) {
      state.inspiration -= CARD_DRAW_COST;
    }
    const card = weightedCardDraw();
    state.hand.push(card);
    renderCardHand();
    addFloatingText(state.player.x, state.player.y - 52, `Drew: ${card.name}`, rarityColor(card.rarity), 1.0);
    pushEvent(`Drew argument card: ${card.name}`);
    beep(card.rarity === "legendary" ? 760 : 560, 0.08, "triangle", 0.035);
    return true;
  }

  function weightedCardDraw() {
    const total = argumentCards.reduce((sum, card) => sum + card.weight, 0);
    let roll = Math.random() * total;
    for (const card of argumentCards) {
      roll -= card.weight;
      if (roll <= 0) {
        return card;
      }
    }
    return argumentCards[0];
  }

  function useArgumentCard(index) {
    if (state.mode !== "playing" || state.paused || state.upgradePending) {
      return;
    }
    const card = state.hand[index];
    if (!card) {
      return;
    }
    state.hand.splice(index, 1);
    card.use();
    renderCardHand();
    addAssistantMessage("system", `Used argument card "${card.name}": ${card.desc}`);
    pushEvent(`Used card: ${card.name}`);
    state.screenShake = Math.max(state.screenShake, card.rarity === "legendary" ? 1.2 : 0.45);
    beep(420, 0.06, "square", 0.03);
  }

  function renderCardHand() {
    // Card UI was replaced by automatic colored-monster power-ups.
  }

  function rarityLabel(rarity) {
    return {
      common: "Common",
      rare: "Rare",
      epic: "Epic",
      legendary: "Legendary"
    }[rarity] || "Common";
  }

  function rarityColor(rarity) {
    return {
      common: "#c9f24d",
      rare: "#32c6c0",
      epic: "#f5c542",
      legendary: "#a67cff"
    }[rarity] || "#c9f24d";
  }

  function update(dt) {
    if (state.mode !== "playing" || state.paused || state.upgradePending) {
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
      addAssistantMessage("system", `Wave ${state.wave} is here. Prioritize monsters with color auras; they instantly grant temporary boosts.`);
      pushEvent(`Wave ${state.wave} started`);
      beep(440 + state.wave * 18, 0.08, "triangle", 0.04);
      if (state.wave >= state.nextUpgradeWave) {
        offerUpgrade();
        state.nextUpgradeWave += 1;
      }
    }

    state.slowTime = Math.max(0, state.slowTime - dt);
    state.speedBoost = Math.max(0, state.speedBoost - dt);
    state.screenShake = Math.max(0, state.screenShake - dt * 8);
    state.cardBuffs.crit = Math.max(0, state.cardBuffs.crit - dt);
    for (const key of Object.keys(state.powerUps)) {
      state.powerUps[key] = Math.max(0, state.powerUps[key] - dt);
    }
    state.thesis.shield = Math.max(0, state.thesis.shield - dt);
    state.thesis.hitFlash = Math.max(0, state.thesis.hitFlash - dt);
    state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
    state.player.shotCooldown = Math.max(0, state.player.shotCooldown - dt);
    state.player.abilityCooldown = Math.max(0, state.player.abilityCooldown - dt);
    state.player.focus = clamp(
      state.player.focus + (characters[state.selectedCharacter].focusRegen + state.focusRegenBonus) * dt,
      0,
      state.player.maxFocus
    );
    if (state.thesisRegen > 0) {
      state.thesis.health = clamp(state.thesis.health + state.thesisRegen * dt, 0, state.thesis.maxHealth);
    }
    if (state.selectedCharacter === "labGuardian" && distance(state.player, state.thesis) < 150) {
      state.thesis.health = clamp(state.thesis.health + 0.32 * dt, 0, state.thesis.maxHealth);
      state.player.focus = clamp(state.player.focus + 1.2 * dt, 0, state.player.maxFocus);
    }

    updatePlayer(dt);
    updateSpawning(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateTurrets(dt);
    cleanupDeadEnemies();
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
    if (keys.has("left")) xInput -= 1;
    if (keys.has("right")) xInput += 1;
    if (keys.has("up")) yInput -= 1;
    if (keys.has("down")) yInput += 1;

    const magnitude = Math.hypot(xInput, yInput) || 1;
    const boost = state.speedBoost > 0 ? 1.34 : 1;
    const reviewerAura = state.enemies.some((enemy) =>
      (enemy.type === "reviewer" || enemy.type === "committee" || enemy.type === "finalBoss") && distance(enemy, state.player) < enemy.radius + 138
    );
    const speed = character.speed * boost * (reviewerAura ? 0.78 : 1);
    state.player.vx = (xInput / magnitude) * speed;
    state.player.vy = (yInput / magnitude) * speed;
    state.player.x = clamp(state.player.x + state.player.vx * dt, state.player.radius + 4, canvasWidth - state.player.radius - 4);
    state.player.y = clamp(state.player.y + state.player.vy * dt, state.player.radius + 4, canvasHeight - state.player.radius - 4);

    const aimX = pointer.x - state.player.x;
    const aimY = pointer.y - state.player.y;
    if (Math.hypot(aimX, aimY) > 4) {
      state.player.angle = Math.atan2(aimY, aimX);
    }

    if ((pointer.down || keys.has("fire")) && state.player.shotCooldown <= 0) {
      fireProjectile();
    }

    if (keys.has("ability")) {
      useAbility();
    }
  }

  function fireProjectile() {
    const character = characters[state.selectedCharacter];
    const rapidActive = state.powerUps.rapid > 0;
    const blastActive = state.powerUps.blast > 0;
    const scatterActive = state.powerUps.scatter > 0;
    const shotCost = rapidActive ? character.shotCost * 0.38 : character.shotCost;
    if (state.player.focus < shotCost) {
      return;
    }
    state.player.focus -= shotCost;
    state.player.shotCooldown = character.shotDelay * state.shotDelayMult * (rapidActive ? 0.28 : 1);

    const angle = state.player.angle;
    const angles = [angle];
    const extraSideShots = state.sideShots + (scatterActive ? 1 : 0);
    for (let i = 0; i < extraSideShots; i += 1) {
      const spread = 0.13 + i * 0.08;
      angles.push(angle - spread, angle + spread);
    }
    const offset = state.player.radius + 8;
    for (const shotAngle of angles) {
      const guardianShot = character.id === "labGuardian";
      const coderShot = character.id === "nightCoder";
      const methodShot = character.id === "methodologist";
      state.projectiles.push({
        x: state.player.x + Math.cos(shotAngle) * offset,
        y: state.player.y + Math.sin(shotAngle) * offset,
        vx: Math.cos(shotAngle) * character.shotSpeed,
        vy: Math.sin(shotAngle) * character.shotSpeed,
        radius: (guardianShot ? 7 : 5) + state.projectileRadiusBonus + (blastActive ? 1 : 0),
        damage: character.shotDamage * (1 + state.damageBonus) * (rapidActive ? 0.78 : 1),
        color: blastActive ? powerUpTypes.blast.color : rapidActive ? powerUpTypes.rapid.color : character.accent,
        life: guardianShot ? 1.05 : 1.3,
        pierce: (methodShot ? 0.18 : coderShot ? 0.08 : 0.04) + state.pierceBonus,
        blastRadius: blastActive ? 82 : guardianShot ? 18 : 0
      });
    }
    playShot(rapidActive);
  }

  function useAbility() {
    const character = characters[state.selectedCharacter];
    if (state.player.abilityCooldown > 0 || state.player.focus < 20) {
      return;
    }
    state.player.focus -= 20;
    state.player.abilityCooldown = character.abilityCooldown;

    if (character.id === "methodologist") {
      state.slowTime = 3.4;
      const targets = [...state.enemies]
        .sort((a, b) => distance(a, state.player) - distance(b, state.player))
        .slice(0, 3);
      for (const enemy of targets) {
        enemy.hp -= enemy.type === "finalBoss" ? 42 : 76;
        enemy.hitFlash = 0.18;
        spawnSparks(enemy.x, enemy.y, "#2f80ed", 16);
        addFloatingText(enemy.x, enemy.y - enemy.radius - 16, "Locked", "#2f80ed", 0.8);
      }
      state.player.focus = clamp(state.player.focus + 8, 0, state.player.maxFocus);
      addFloatingText(state.player.x, state.player.y - 40, "Method Lock", "#c9f24d", 1.1);
      pushEvent("Method Lock released");
    }

    if (character.id === "labGuardian") {
      state.thesis.shield = Math.max(state.thesis.shield, 6.5);
      state.thesis.health = clamp(state.thesis.health + 10, 0, state.thesis.maxHealth);
      state.turrets.push({
        x: state.thesis.x,
        y: state.thesis.y - 118,
        cooldown: 0,
        life: 6.5
      });
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
      addFloatingText(state.thesis.x, state.thesis.y - 70, "Defense Setup", "#32c6c0", 1.2);
      pushEvent("Defense Setup activated");
    }

    if (character.id === "nightCoder") {
      state.speedBoost = 3.6;
      state.powerUps.rapid = Math.max(state.powerUps.rapid || 0, 2.4);
      state.player.invulnerable = 0.25;
      state.player.focus = clamp(state.player.focus + 8, 0, state.player.maxFocus);
      const shots = 12;
      for (let i = 0; i < shots; i += 1) {
        const angle = (Math.PI * 2 * i) / shots;
        state.projectiles.push({
          x: state.player.x + Math.cos(angle) * 24,
          y: state.player.y + Math.sin(angle) * 24,
          vx: Math.cos(angle) * 710,
          vy: Math.sin(angle) * 710,
          radius: 5,
          damage: 18,
          color: "#f5c542",
          life: 0.85,
          pierce: 0.2
        });
      }
      addFloatingText(state.player.x, state.player.y - 40, "Overload Build", "#f5c542", 1.1);
      pushEvent("Overload Build triggered");
    }

    playAbilitySound(character.id);
  }

  function updateSpawning(dt) {
    if (!state.endless && state.wave >= FINAL_BOSS_WAVE && !state.finalBossSpawned) {
      spawnFinalBoss();
      return;
    }
    if (state.finalBossActive) {
      return;
    }
    if (state.wave % 3 === 0 && state.bossSpawnedForWave !== state.wave) {
      state.bossSpawnedForWave = state.wave;
      spawnEnemy("committee");
      state.spawnTimer = 1.2;
      state.screenShake = Math.max(state.screenShake, 0.9);
      addFloatingText(canvasWidth / 2, 124, "Committee Arrives", "#a67cff", 1.8);
      addAssistantMessage("warning", "Boss wave! The committee has high health and summons threats. Keep your distance.");
      pushEvent("Boss wave started");
      playExplosionSound(1.1);
      return;
    }

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

  function spawnFinalBoss() {
    state.finalBossSpawned = true;
    state.finalBossActive = true;
    state.spawnTimer = 999;
    state.enemies = state.enemies.filter((enemy) => enemy.type === "finalBoss");
    spawnEnemyAt("finalBoss", canvasWidth / 2, -70, {
      hp: threatTypes.finalBoss.hp,
      speed: threatTypes.finalBoss.speed,
      damage: threatTypes.finalBoss.damage,
      score: threatTypes.finalBoss.score,
      mutation: null,
      isFinalBoss: true,
      breakpoints: [0.7, 0.4, 0.15],
      brokenTimer: 0
    });
    for (let i = 0; i < 2; i += 1) {
      spawnEnemyAt("reviewer", canvasWidth / 2 + (i === 0 ? -160 : 160), 42, {
        size: 0.9,
        hp: 96,
        speed: 68,
        damage: 14,
        score: 36,
        splitLevel: 1,
        mutation: i === 0 ? "rapid" : null
      });
    }
    state.screenShake = Math.max(state.screenShake, 1.6);
    addFloatingText(canvasWidth / 2, 132, "Final Defense Chair Arrives", "#ff2e63", 2.2);
    addAssistantMessage("warning", "Final boss! The Chair enters with reviewer guards. Defeat aura guards for boosts, then focus the boss.");
    pushEvent("Final boss fight started");
    playExplosionSound(1.5);
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
    const mutation = choosePowerUpMutation(typeName);
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
      specialTimer: typeName === "committee" ? 3.2 : lerp(1.1, 2.4, Math.random()),
      dashTimer: 0,
      splitLevel: 0,
      mutation,
      hitFlash: 0
    });
  }

  function spawnEnemyAt(typeName, x, y, options = {}) {
    const type = threatTypes[typeName];
    const difficulty = state.practice ? 0.82 : 1;
    const size = options.size || 1;
    const mutation = Object.prototype.hasOwnProperty.call(options, "mutation") ? options.mutation : null;
    state.enemies.push({
      id: cryptoRandomId(),
      type: typeName,
      x,
      y,
      radius: type.radius * size,
      hp: (options.hp || type.hp) * (1 + state.wave * 0.04) * difficulty,
      maxHp: (options.hp || type.hp) * (1 + state.wave * 0.04) * difficulty,
      speed: (options.speed || type.speed) * (1 + state.wave * 0.035) * difficulty,
      damage: (options.damage || type.damage) * difficulty,
      score: options.score || Math.floor(type.score * size),
      phase: Math.random() * Math.PI * 2,
      specialTimer: options.specialTimer || lerp(1.1, 2.5, Math.random()),
      dashTimer: 0,
      splitLevel: options.splitLevel || 0,
      mutation,
      hitFlash: 0
    });
  }

  function choosePowerUpMutation(typeName) {
    const baseChance = typeName === "committee"
      ? 0.75
      : typeName === "reviewer"
        ? 0.34
        : clamp(0.18 + state.wave * 0.025, 0.18, 0.38);
    if (Math.random() > baseChance) {
      return null;
    }
    const entries = Object.entries(powerUpTypes);
    const total = entries.reduce((sum, [, power]) => sum + power.weight, 0);
    let roll = Math.random() * total;
    for (const [id, power] of entries) {
      roll -= power.weight;
      if (roll <= 0) {
        return id;
      }
    }
    return "rapid";
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
      if (enemy.type === "finalBoss") {
        enemy.brokenTimer = Math.max(0, (enemy.brokenTimer || 0) - dt);
        checkFinalBossBreak(enemy);
      }
      const dx = state.thesis.x - enemy.x;
      const dy = state.thesis.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const px = -ny;
      const py = nx;
      const wobble = Math.sin(state.elapsed * (2.2 + type.wobble * 4) + enemy.phase) * type.wobble;
      enemy.specialTimer -= dt;
      enemy.dashTimer = Math.max(0, enemy.dashTimer - dt);
      if (enemy.type === "deadline" && enemy.specialTimer <= 0) {
        enemy.dashTimer = 0.5;
        enemy.specialTimer = lerp(1.8, 2.8, Math.random());
        spawnSparks(enemy.x, enemy.y, "#ef4444", 8);
      }
      if (enemy.type === "committee" && enemy.specialTimer <= 0) {
        enemy.specialTimer = 4.2;
        for (let n = 0; n < 2; n += 1) {
          const angle = Math.random() * Math.PI * 2;
          spawnEnemyAt("bug", enemy.x + Math.cos(angle) * 46, enemy.y + Math.sin(angle) * 46, {
            size: 0.72,
            hp: 22,
            speed: 118,
            damage: 5,
            score: 18,
            splitLevel: 1
          });
        }
        addFloatingText(enemy.x, enemy.y - enemy.radius - 18, "Follow-up", "#a67cff", 0.9);
        spawnSparks(enemy.x, enemy.y, "#a67cff", 12);
      }
      if (enemy.type === "finalBoss" && enemy.specialTimer <= 0) {
        const phaseTwo = enemy.hp < enemy.maxHp * 0.6;
        const enraged = enemy.hp < enemy.maxHp * 0.25;
        enemy.specialTimer = enraged ? 0.95 : phaseTwo ? 1.45 : 2.1;
        const summonCount = enraged ? 10 : phaseTwo ? 7 : 5;
        for (let n = 0; n < summonCount; n += 1) {
          const angle = -Math.PI / 2 + (n - (summonCount - 1) / 2) * (enraged ? 0.34 : 0.46);
          const summonType = enraged && n % 3 !== 1 ? "deadline" : phaseTwo && n % 2 === 0 ? "deadline" : n === 1 ? "reviewer" : "bug";
          spawnEnemyAt(summonType, enemy.x + Math.cos(angle) * 78, enemy.y + Math.sin(angle) * 78, {
            size: summonType === "reviewer" ? 0.86 : enraged ? 0.92 : 0.82,
            hp: summonType === "reviewer" ? 138 : summonType === "deadline" ? (enraged ? 72 : 50) : 46,
            speed: summonType === "deadline" ? (enraged ? 225 : 184) : summonType === "reviewer" ? 92 : 154,
            damage: summonType === "reviewer" ? 22 : enraged ? 15 : 10,
            score: enraged ? 38 : 28,
            splitLevel: 1,
            mutation: Math.random() < (enraged ? 0.06 : 0.12) ? choosePowerUpMutation(summonType) : null
          });
        }
        if (enraged) {
          state.slowTime = 0;
          state.screenShake = Math.max(state.screenShake, 1.4);
          damageThesis(state.thesis.shield > 0 ? 3.5 : 8.5);
          addFloatingText(enemy.x, enemy.y - enemy.radius - 24, "Final Pressure", "#ff2e63", 1.1);
        } else if (phaseTwo) {
          state.slowTime = Math.max(0, state.slowTime - 0.7);
          state.screenShake = Math.max(state.screenShake, 0.95);
          addFloatingText(enemy.x, enemy.y - enemy.radius - 24, "Final Follow-up", "#ff2e63", 1.0);
        } else {
          addFloatingText(enemy.x, enemy.y - enemy.radius - 24, "Chair Question", "#ff2e63", 1.0);
        }
        spawnBlast(enemy.x, enemy.y, enemy.radius + (enraged ? 108 : 72), "#ff2e63");
        playExplosionSound(enraged ? 1.05 : 0.75);
      }
      const slow = state.slowTime > 0 ? (enemy.type === "finalBoss" ? 0.78 : 0.55) : 1;
      const dash = enemy.dashTimer > 0 ? 2.35 : 1;
      enemy.x += (nx + px * wobble) * enemy.speed * slow * dash * dt;
      enemy.y += (ny + py * wobble) * enemy.speed * slow * dash * dt;

      if (distance(enemy, state.thesis) < enemy.radius + state.thesis.radius) {
        const impactDamage = enemy.type === "finalBoss" && enemy.hp < enemy.maxHp * 0.25 ? enemy.damage * 1.65 : enemy.damage;
        damageThesis(impactDamage);
        addFloatingText(state.thesis.x, state.thesis.y - 58, `-${Math.ceil(impactDamage)}`, "#ef4444", 0.8);
        spawnSparks(enemy.x, enemy.y, type.color, 16);
        if (enemy.type === "finalBoss") {
          enemy.x -= nx * 150;
          enemy.y -= ny * 150;
          enemy.specialTimer = Math.min(enemy.specialTimer, 0.65);
          state.screenShake = Math.max(state.screenShake, 1.8);
          continue;
        }
        state.enemies.splice(i, 1);
        continue;
      }

      if (
        state.player.invulnerable <= 0 &&
        distance(enemy, state.player) < enemy.radius + state.player.radius
      ) {
        state.player.focus = Math.max(0, state.player.focus - 14);
        const hit = enemy.type === "finalBoss" ? (state.thesis.shield > 0 ? 7 : 22) : state.thesis.shield > 0 ? 1 : 4;
        damageThesis(hit);
        spawnSparks(state.player.x, state.player.y, "#fffdf7", 10);
        state.player.invulnerable = 0.85;
        if (enemy.type === "finalBoss") {
          state.player.focus = Math.max(0, state.player.focus - 28);
          enemy.x -= nx * 88;
          enemy.y -= ny * 88;
          continue;
        }
        state.enemies.splice(i, 1);
      }
    }
  }

  function updateProjectiles(dt) {
    for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = state.projectiles[i];
      if (projectile.homing) {
        const target = nearestEnemyTo(projectile);
        if (target) {
          const angle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
          const speed = Math.hypot(projectile.vx, projectile.vy) || 420;
          projectile.vx = lerp(projectile.vx, Math.cos(angle) * speed, 0.09);
          projectile.vy = lerp(projectile.vy, Math.sin(angle) * speed, 0.09);
        }
      }
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
          const heavyBonus = (enemy.type === "reviewer" || enemy.type === "committee" || enemy.type === "finalBoss") ? state.heavyDamageBonus : 0;
          const critBonus = state.cardBuffs.crit > 0 ? 0.55 : 0;
          const bossArmor = enemy.type === "finalBoss" ? finalBossDamageMultiplier(projectile, enemy) : 1;
          enemy.hp -= projectile.damage * (1 + heavyBonus + critBonus) * bossArmor;
          enemy.hitFlash = 0.08;
          spawnSparks(projectile.x, projectile.y, projectile.color, 5);
          playHit();

          if (projectile.blastRadius > 0) {
            for (const other of state.enemies) {
              if (other === enemy) {
                continue;
              }
              const blastDistance = distance(projectile, other);
              if (blastDistance < projectile.blastRadius + other.radius) {
                const falloff = 1 - blastDistance / Math.max(projectile.blastRadius + other.radius, 1);
                const otherArmor = other.type === "finalBoss" ? finalBossDamageMultiplier(projectile, other) : 1;
                other.hp -= projectile.damage * (0.42 + falloff * 0.38) * otherArmor;
                other.hitFlash = 0.08;
              }
            }
            spawnBlast(projectile.x, projectile.y, projectile.blastRadius, projectile.color);
            playExplosionSound(0.55);
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

  function updateTurrets(dt) {
    for (let i = state.turrets.length - 1; i >= 0; i -= 1) {
      const turret = state.turrets[i];
      turret.life -= dt;
      turret.cooldown -= dt;
      if (turret.life <= 0) {
        state.turrets.splice(i, 1);
        continue;
      }
      const target = nearestEnemyTo(turret);
      if (target && turret.cooldown <= 0) {
        const angle = Math.atan2(target.y - turret.y, target.x - turret.x);
        turret.cooldown = 0.52;
        state.projectiles.push({
          x: turret.x,
          y: turret.y,
          vx: Math.cos(angle) * 560,
          vy: Math.sin(angle) * 560,
          radius: 4,
          damage: 18 * (1 + state.damageBonus),
          color: "#f5c542",
          life: 1.1,
          pierce: 0
        });
      }
    }
  }

  function nearestEnemyTo(origin) {
    let best = null;
    let bestDistance = Infinity;
    for (const enemy of state.enemies) {
      const d = distance(origin, enemy);
      if (d < bestDistance) {
        best = enemy;
        bestDistance = d;
      }
    }
    return best;
  }

  function checkFinalBossBreak(enemy) {
    if (!enemy.breakpoints || !enemy.breakpoints.length) {
      return;
    }
    const next = enemy.breakpoints[0];
    if (enemy.hp / enemy.maxHp > next) {
      return;
    }
    enemy.breakpoints.shift();
    enemy.brokenTimer = 5;
    enemy.specialTimer = Math.max(enemy.specialTimer, 2.2);
    state.screenShake = Math.max(state.screenShake, 1.8);
    spawnBlast(enemy.x, enemy.y, enemy.radius + 126, "#c9f24d");
    addFloatingText(enemy.x, enemy.y - enemy.radius - 34, "Broken!", "#c9f24d", 1.35);
    addAssistantMessage("system", "Boss armor is broken! This is your burst window. Focus fire on the boss.");
    pushEvent("Final boss broken");
    playPowerUpSound("blast");
  }

  function finalBossDamageMultiplier(projectile, enemy) {
    let multiplier = 0.48;
    if (enemy && enemy.brokenTimer > 0) {
      multiplier += 0.62;
    }
    if (projectile.blastRadius > 0) {
      multiplier += 0.26;
    }
    if (state.powerUps.rapid > 0) {
      multiplier += 0.16;
    }
    if (state.powerUps.scatter > 0) {
      multiplier += 0.1;
    }
    if (state.cardBuffs.crit > 0) {
      multiplier += 0.1;
    }
    return Math.min(multiplier, enemy && enemy.brokenTimer > 0 ? 1.65 : 1.05);
  }

  function killEnemy(index) {
    const enemy = state.enemies[index];
    const type = threatTypes[enemy.type];
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = state.comboDuration;
    const comboBonus = Math.min(state.combo * 6, 90);
    const critScoreBonus = state.cardBuffs.crit > 0 ? 1.3 : 1;
    const gained = Math.floor((enemy.score + comboBonus + state.wave * 6) * state.scoreBonus * critScoreBonus);
    state.score += gained;
    addFloatingText(enemy.x, enemy.y - 12, `+${gained}`, type.color, 0.75);
    spawnSparks(enemy.x, enemy.y, type.color, enemy.type === "finalBoss" ? 72 : enemy.type === "committee" ? 42 : 18);
    state.screenShake = Math.max(state.screenShake, enemy.type === "finalBoss" ? 1.8 : enemy.type === "committee" ? 1.2 : 0.35);
    if (enemy.mutation) {
      activatePowerUp(enemy.mutation, enemy);
    }
    if (enemy.type === "bug" && enemy.splitLevel < 1 && state.wave >= 2 && Math.random() < 0.38) {
      for (let n = 0; n < 2; n += 1) {
        const angle = Math.random() * Math.PI * 2;
        spawnEnemyAt("bug", enemy.x + Math.cos(angle) * 22, enemy.y + Math.sin(angle) * 22, {
          size: 0.62,
          hp: 18,
          speed: 118,
          damage: 4,
          score: 16,
          splitLevel: enemy.splitLevel + 1
        });
      }
      addFloatingText(enemy.x, enemy.y + 18, "Split", "#c9f24d", 0.7);
    }
    if (enemy.type === "committee") {
      state.thesis.health = clamp(state.thesis.health + 12, 0, state.thesis.maxHealth);
      addAssistantMessage("system", "The committee was pushed back! Thesis integrity recovers 12, but the next wave will be denser.");
      addFloatingText(state.thesis.x, state.thesis.y - 76, "+12 Thesis", "#32c6c0", 1.0);
    }
    const defeatedFinalBoss = enemy.type === "finalBoss";
    state.enemies.splice(index, 1);
    if (defeatedFinalBoss) {
      state.enemies = [];
      state.projectiles = [];
      state.thesis.health = clamp(state.thesis.health + 18, 0, state.thesis.maxHealth);
      addFloatingText(state.thesis.x, state.thesis.y - 86, "Defense Passed", "#c9f24d", 1.5);
      playExplosionSound(1.5);
      window.setTimeout(() => endGame(true), 450);
      return;
    }
    if (state.combo === 6 || state.combo === 12 || state.combo === 20) {
      addAssistantMessage("system", `Cleared ${state.combo} threats in a row. Good rhythm. Aim between the thesis and the nearest edge for easier interceptions.`);
    }
    playKillSound(enemy.type, state.combo);
  }

  function cleanupDeadEnemies() {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      if (state.enemies[i].hp <= 0) {
        killEnemy(i);
      }
    }
  }

  function activatePowerUp(id, enemy) {
    const power = powerUpTypes[id];
    if (!power) {
      return;
    }
    state.powerUps[id] = Math.max(state.powerUps[id] || 0, power.duration);
    addFloatingText(enemy.x, enemy.y - enemy.radius - 26, power.name, power.color, 1.15);
    spawnBlast(enemy.x, enemy.y, enemy.radius + 54, power.color);
    state.screenShake = Math.max(state.screenShake, id === "blast" ? 1.05 : 0.75);
    pushEvent(`Boost gained: ${power.name}`);

    if (id === "shield") {
      state.thesis.shield = Math.max(state.thesis.shield, power.duration);
      state.thesis.health = clamp(state.thesis.health + 10, 0, state.thesis.maxHealth);
      addFloatingText(state.thesis.x, state.thesis.y - 78, "+10 Thesis", power.color, 1.0);
    }
    if (id === "freeze") {
      state.slowTime = Math.max(state.slowTime, power.duration);
    }
    if (id === "rapid") {
      addAssistantMessage("system", "Machine Gun boost active: hold mouse or Space to spray, and clear fast deadlines first.");
    } else if (id === "blast") {
      addAssistantMessage("system", "Area Blast boost active: aim at the center of a pack, and one hit can damage many threats.");
    }
    playPowerUpSound(id);
  }

  function damageThesis(amount) {
    const shielded = state.thesis.shield > 0;
    const finalDamage = shielded ? amount * 0.35 : amount;
    state.thesis.health = clamp(state.thesis.health - finalDamage, 0, state.thesis.maxHealth);
    state.thesis.hitFlash = 0.15;
    state.screenShake = Math.max(state.screenShake, shielded ? 0.35 : 0.65);
    if (state.thesis.health < 35 && !state.lowHealthWarned) {
      state.lowHealthWarned = true;
      addAssistantMessage("warning", "Thesis integrity is below 35%. Circle around the thesis and let low-health threats enter your fire line.");
      pushEvent("Thesis integrity critical");
    }
    playDamageSound(shielded);
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

  function spawnBlast(x, y, radius, color) {
    const count = Math.max(16, Math.floor(radius / 3));
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      state.particles.push({
        x: x + Math.cos(angle) * radius * 0.28,
        y: y + Math.sin(angle) * radius * 0.28,
        vx: Math.cos(angle) * radius * 2.3,
        vy: Math.sin(angle) * radius * 2.3,
        radius: 3.2,
        color,
        life: 0.42,
        maxLife: 0.42
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
    const committeeCount = state.enemies.filter((enemy) => enemy.type === "committee").length;
    const finalBossCount = state.enemies.filter((enemy) => enemy.type === "finalBoss").length;
    const nearest = nearestEnemyDistance();
    let flag = "";
    let text = "";

    if (finalBossCount > 0) {
      flag = "finalBoss";
      const boss = state.enemies.find((enemy) => enemy.type === "finalBoss");
      const enraged = boss && boss.hp < boss.maxHp * 0.25;
      text = enraged
        ? "Advisor: The chair has entered Final Pressure. Do not stand too close; clear fast deadlines first, then attack during Machine Gun or Blast boosts."
        : "Advisor: The Final Defense Chair is active. Kill summons for boosts, then focus the boss during Machine Gun or Blast windows.";
    } else if (committeeCount > 0) {
      flag = "committee";
      text = "Advisor: The committee is active. Do not stand in its slow zone; kite backward and clear its summons.";
    } else if (state.thesis.health < 45) {
      flag = "health";
      text = "Advisor: Thesis pressure is high. Tighten the defense around the thesis, then clear threats from the outside.";
    } else if (state.player.focus < state.player.maxFocus * 0.28) {
      flag = "focus";
      text = "Advisor: Focus is low. Stop firing for two seconds, reposition, then focus fire.";
    } else if (deadlineCount >= 3) {
      flag = "deadline";
      text = "Advisor: Multiple deadlines detected. Prioritize the red fast targets; they deal damage quickly.";
    } else if (reviewerCount >= 2) {
      flag = "reviewer";
      text = "Advisor: Reviewers are clustering. Wait until they enter the inner zone, then use abilities to clear them.";
    } else if (nearest > 260 && state.enemies.length > 0) {
      flag = "spacing";
      text = "Advisor: Threats are still outside. Stand between the largest threat group and the thesis, not directly on top of it.";
    } else {
      flag = "tempo";
      text = `Advisor: Wave ${state.wave} is stable. Current scoring pace is about ${Math.round(state.score / Math.max(state.elapsed, 1) * 60)} points per minute.`;
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
    els.inspirationLabel.textContent = activePowerUpText();
    els.timeLabel.textContent = formatTime(state.elapsed);

    const character = characters[state.selectedCharacter];
    if (state.player.abilityCooldown <= 0) {
      els.abilityButton.disabled = false;
      els.abilityCooldown.textContent = state.player.focus >= 20 ? "Ready" : "Focus Low";
    } else {
      els.abilityButton.disabled = true;
      els.abilityCooldown.textContent = `${state.player.abilityCooldown.toFixed(1)}s`;
    }
    els.abilityName.textContent = character.ability;

  }

  function activePowerUpText() {
    const active = Object.entries(state.powerUps || {})
      .filter(([, time]) => time > 0)
      .sort((a, b) => b[1] - a[1]);
    if (!active.length) {
      return "None";
    }
    const [id, time] = active[0];
    return `${powerUpTypes[id].short} ${Math.ceil(time)}s`;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    if (state.screenShake > 0) {
      const shake = state.screenShake * 8;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawBackground();

    if (!state.thesis || !state.player) {
      ctx.restore();
      return;
    }

    drawThreatPaths();
    drawThesis();
    drawTurrets();
    for (const projectile of state.projectiles) drawProjectile(projectile);
    for (const enemy of state.enemies) drawEnemy(enemy);
    drawPlayer();
    drawParticles();
    drawFloatingText();
    drawReticle();
    ctx.restore();
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

    const activePower = Object.entries(state.powerUps || {})
      .filter(([, time]) => time > 0)
      .sort((a, b) => b[1] - a[1])[0];
    if (activePower) {
      const power = powerUpTypes[activePower[0]];
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = power.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 22 + Math.sin(state.elapsed * 13) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

  function drawTurrets() {
    for (const turret of state.turrets) {
      ctx.save();
      ctx.translate(turret.x, turret.y);
      ctx.fillStyle = "#fffdf7";
      ctx.strokeStyle = "#11130f";
      ctx.lineWidth = 3;
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.fillStyle = "#f5c542";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = "#11130f";
      ctx.font = "900 11px Microsoft YaHei, Noto Sans SC, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Fig", 0, 0);
      ctx.restore();
    }
  }

  function drawEnemy(enemy) {
    const type = threatTypes[enemy.type];
    const mutation = enemy.mutation ? powerUpTypes[enemy.mutation] : null;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.type === "reviewer" || enemy.type === "committee" || enemy.type === "finalBoss") {
      ctx.save();
      ctx.globalAlpha = enemy.type === "finalBoss" ? 0.2 : enemy.type === "committee" ? 0.16 : 0.1;
      ctx.fillStyle = enemy.type === "finalBoss" ? "#ff2e63" : enemy.type === "committee" ? "#a67cff" : "#f5c542";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + (enemy.type === "finalBoss" ? 176 : 138), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (enemy.type === "finalBoss") {
      const enraged = enemy.hp < enemy.maxHp * 0.25;
      const broken = enemy.brokenTimer > 0;
      ctx.save();
      ctx.globalAlpha = broken ? 0.65 : enraged ? 0.52 : 0.38;
      ctx.strokeStyle = broken ? "#c9f24d" : "#ff2e63";
      ctx.lineWidth = enraged ? 9 : 7;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + (enraged ? 28 : 18) + Math.sin(state.elapsed * (enraged ? 9 : 5)) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = enraged ? 0.22 : 0.14;
      ctx.rotate(-state.elapsed * 0.8);
      ctx.strokeRect(-enemy.radius - 28, -enemy.radius - 28, enemy.radius * 2 + 56, enemy.radius * 2 + 56);
      ctx.restore();
    }
    if (mutation) {
      ctx.save();
      ctx.globalAlpha = 0.28 + Math.sin(state.elapsed * 9 + enemy.phase) * 0.08;
      ctx.strokeStyle = mutation.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 9 + Math.sin(state.elapsed * 7 + enemy.phase) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = mutation.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
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
      if (enemy.dashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-enemy.radius * 2.2, -enemy.radius * 0.3, enemy.radius * 2.8, enemy.radius * 0.6);
        ctx.restore();
      }
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
      if (enemy.type === "finalBoss") {
        ctx.fillStyle = "#fffdf7";
        ctx.fillRect(-enemy.radius + 12, enemy.radius * 0.15, enemy.radius * 2 - 24, 8);
        ctx.fillRect(-enemy.radius + 12, enemy.radius * 0.38, enemy.radius * 1.45, 8);
      }
    }

    if (mutation) {
      ctx.fillStyle = mutation.color;
      ctx.strokeStyle = "#11130f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.radius * 0.62, -enemy.radius * 0.62, Math.max(5, enemy.radius * 0.28), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = enemy.type === "deadline" || enemy.type === "finalBoss" ? "#fffdf7" : "#11130f";
    ctx.font = "900 12px Microsoft YaHei, Noto Sans SC, Cascadia Mono, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type.label, 0, 0);

    const hpWidth = enemy.type === "finalBoss" ? enemy.radius * 3.6 : enemy.radius * 2;
    const hpHeight = enemy.type === "finalBoss" ? 7 : 4;
    ctx.fillStyle = "rgba(17, 19, 15, 0.35)";
    ctx.fillRect(-hpWidth / 2, enemy.radius + 10, hpWidth, hpHeight);
    ctx.fillStyle = enemy.type === "finalBoss" && enemy.brokenTimer > 0 ? "#c9f24d" : enemy.type === "finalBoss" ? "#ff2e63" : "#fffdf7";
    ctx.fillRect(-hpWidth / 2, enemy.radius + 10, hpWidth * clamp(enemy.hp / enemy.maxHp, 0, 1), hpHeight);
    if (enemy.type === "finalBoss") {
      ctx.fillStyle = "#fffdf7";
      ctx.font = "900 13px Microsoft YaHei, Noto Sans SC, Cascadia Mono, Consolas, monospace";
      ctx.fillText(enemy.brokenTimer > 0 ? "Broken" : "Final Defense Chair", 0, -enemy.radius - 18);
    }
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
    ctx.font = "900 18px Microsoft YaHei, Noto Sans SC, Cascadia Mono, Consolas, monospace";
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
    const committeeCount = state.enemies.filter((enemy) => enemy.type === "committee").length;
    const finalBossCount = state.enemies.filter((enemy) => enemy.type === "finalBoss").length;

    if (text.includes("boss") || text.includes("committee") || text.includes("chair")) {
      if (state.endless) {
        return "Current mode is Endless: no final boss appears, but a committee mini-boss still arrives every 3 waves. Survive longer and chase a higher score.";
      }
      if (finalBossCount) {
        return "The final boss is active. Clear summons for color boosts, then focus the boss from a safe distance during Machine Gun or Area Blast windows. Defeat it to win.";
      }
      return committeeCount
        ? "A boss is active. Leave the purple slow zone, clear summons, then use abilities and damage upgrades to focus it down."
        : `A mini-boss appears on wave 3, and the final boss appears on wave ${FINAL_BOSS_WAVE}. Save Focus and ability cooldowns before boss waves.`;
    }
    if (text.includes("boost") || text.includes("color") || text.includes("machine gun") || text.includes("area") || text.includes("buff")) {
      return "Monsters with color auras drop timed boosts: red Machine Gun, yellow Area Blast, cyan Scatter, purple Shield, and blue Freeze. Kill them first.";
    }
    if (text.includes("score") || text.includes("grade") || text.includes("point")) {
      return `Score comes from threats cleared, streaks, survival time, and remaining thesis integrity. Current score: ${Math.floor(state.score).toLocaleString()}.`;
    }
    if (text.includes("deadline") || text.includes("red") || text.includes("fast")) {
      return `There are ${deadlineCount} deadlines on the field. They are fast and damaging, so intercept them first.`;
    }
    if (text.includes("review") || text.includes("r2") || text.includes("peer")) {
      return reviewerCount
        ? `There are ${reviewerCount} reviewers. Keep distance and wear them down; use abilities when they enter the inner zone.`
        : "There are no reviewers right now. Save Focus for the next high-health threat.";
    }
    if (text.includes("focus") || text.includes("energy") || text.includes("ability")) {
      return `Focus is now ${focus}%. Normal shots cost little Focus, but special abilities need at least 20 Focus and have cooldowns.`;
    }
    if (text.includes("thesis") || text.includes("health") || text.includes("integrity")) {
      return `Thesis integrity is now ${thesis}%. If it drops below 40%, circle near the center and let threats enter your fire line.`;
    }
    if (text.includes("character") || text.includes("defender")) {
      return `Current defender: ${characters[state.selectedCharacter].name}. Best for ${state.selectedCharacter === "nightCoder" ? "fast kiting and short overload bursts, but do not abandon the thesis" : state.selectedCharacter === "labGuardian" ? "building a defensive position around the thesis with shields, repairs, and turrets" : "steady shooting and Method Lock control to clear high-priority threats"}.`;
    }
    return `Current situation: wave ${state.wave}, thesis integrity ${thesis}%, Focus ${focus}%, and ${state.enemies.length} threats on the field. Stay between the largest threat group and the thesis.`;
  }


  function beep(frequency, duration, type, gainValue) {
    playTone(frequency, duration, type, gainValue);
  }

  function isMuted() {
    return !audioContext || els.muteButton.dataset.muted === "true";
  }

  function playTone(frequency, duration, type = "sine", gainValue = 0.025, options = {}) {
    if (isMuted()) {
      return;
    }
    const now = audioContext.currentTime + (options.delay || 0);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue * SOUND_VOLUME), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playNoise(duration = 0.08, gainValue = 0.025, filterFrequency = 1200) {
    if (isMuted()) {
      return;
    }
    const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(gainValue * SOUND_VOLUME, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start();
  }

  function playShot(rapid = false) {
    playTone(rapid ? 920 : 680, rapid ? 0.032 : 0.045, "square", rapid ? 0.012 : 0.018, {
      endFrequency: rapid ? 520 : 360
    });
    playNoise(rapid ? 0.025 : 0.035, rapid ? 0.006 : 0.01, rapid ? 2400 : 1800);
  }

  function playHit() {
    if (!audioContext || audioContext.currentTime - lastHitSoundAt < 0.035) {
      return;
    }
    lastHitSoundAt = audioContext.currentTime;
    playTone(240, 0.026, "triangle", 0.012, { endFrequency: 150 });
  }

  function playKillSound(enemyType, combo) {
    const base = enemyType === "committee" ? 150 : enemyType === "reviewer" ? 260 : 360;
    playTone(base, 0.055, "triangle", 0.026, { endFrequency: base * 1.7 });
    playTone(base * 2.1 + Math.min(combo, 12) * 8, 0.075, "square", 0.012, { delay: 0.035 });
    if (enemyType === "committee") {
      playExplosionSound(1.3);
    }
  }

  function playExplosionSound(scale = 1) {
    playTone(120 * scale, 0.16, "sawtooth", 0.042, { endFrequency: 42 });
    playNoise(0.16, 0.035 * scale, 560);
  }

  function playPowerUpSound(id) {
    const base = id === "rapid" ? 760 : id === "blast" ? 420 : id === "shield" ? 540 : id === "freeze" ? 360 : 620;
    playTone(base, 0.08, "triangle", 0.04, { endFrequency: base * 1.8 });
    playTone(base * 1.5, 0.1, "square", 0.018, { delay: 0.055, endFrequency: base * 2.2 });
  }

  function playAbilitySound(characterId) {
    if (characterId === "labGuardian") {
      playTone(300, 0.13, "sine", 0.04, { endFrequency: 620 });
      playTone(450, 0.16, "triangle", 0.018, { delay: 0.04, endFrequency: 900 });
      return;
    }
    if (characterId === "nightCoder") {
      playExplosionSound(0.85);
      playTone(720, 0.12, "square", 0.026, { endFrequency: 980 });
      return;
    }
    playTone(520, 0.14, "triangle", 0.036, { endFrequency: 220 });
    playNoise(0.1, 0.018, 900);
  }

  function playDamageSound(shielded) {
    playTone(shielded ? 260 : 130, shielded ? 0.06 : 0.11, "sawtooth", shielded ? 0.025 : 0.045, {
      endFrequency: shielded ? 180 : 55
    });
    if (!shielded) {
      playNoise(0.08, 0.025, 360);
    }
  }

  function playStartSound() {
    playTone(260, 0.07, "square", 0.028, { endFrequency: 390 });
    playTone(520, 0.08, "triangle", 0.025, { delay: 0.06, endFrequency: 780 });
  }

  function unlockAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!audioContext && AudioCtor) {
      audioContext = new AudioCtor();
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
    pushEvent(state.paused ? "Paused" : "Defense resumed");
  }

  function isTypingTarget(target) {
    return target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
  }

  function normalizeControlKey(event) {
    const codeMap = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      KeyW: "up",
      KeyS: "down",
      KeyA: "left",
      KeyD: "right",
      KeyE: "ability",
      KeyP: "pause",
      Space: "fire"
    };
    if (codeMap[event.code]) {
      return codeMap[event.code];
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
    return {
      arrowup: "up",
      arrowdown: "down",
      arrowleft: "left",
      arrowright: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      e: "ability",
      p: "pause",
      " ": "fire",
      spacebar: "fire"
    }[key] || key;
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
      startGame({ practice: false, endless: false });
    });

    els.practiceButton.addEventListener("click", () => {
      unlockAudio();
      startGame({ practice: true, endless: false });
    });

    els.endlessButton.addEventListener("click", () => {
      unlockAudio();
      startGame({ practice: false, endless: true });
    });

    els.pauseButton.addEventListener("click", togglePause);
    els.restartButton.addEventListener("click", () => startGame({ practice: state.practice, endless: state.endless }));
    els.againButton.addEventListener("click", () => startGame({ practice: state.practice, endless: state.endless }));
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
      els.muteButton.querySelector("span").textContent = muted ? "S" : "M";
      pushEvent(muted ? "Sound on" : "Sound off");
    });

    els.assistantForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = els.assistantInput.value.trim();
      if (!value) return;
      addAssistantMessage("user", value);
      els.assistantInput.value = "";
      els.assistantInput.blur();
      window.setTimeout(() => {
        addAssistantMessage("system", answerAdvisorQuestion(value));
      }, 180);
    });

    window.addEventListener("keydown", (event) => {
      if (isTypingTarget(event.target)) return;
      const key = normalizeControlKey(event);
      if (["up", "down", "left", "right", "fire", "ability", "pause"].includes(key)) {
        event.preventDefault();
      }
      if (key === "pause") {
        togglePause();
      }
      keys.add(key);
    });

    window.addEventListener("keyup", (event) => {
      keys.delete(normalizeControlKey(event));
    });

    window.addEventListener("blur", () => {
      keys.clear();
      pointer.down = false;
    });

    window.addEventListener("focus", () => {
      keys.clear();
      pointer.down = false;
    });

    els.canvas.addEventListener("pointermove", handlePointerMove);
    els.canvas.addEventListener("pointerdown", (event) => {
      unlockAudio();
      if (document.activeElement && isTypingTarget(document.activeElement)) {
        document.activeElement.blur();
      }
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
        els.installStatus.textContent = "Installable";
      }).catch(() => {
        els.installStatus.textContent = "Web Version";
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
    els.inspirationLabel.textContent = "None";
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
        startGame({ practice: params.get("practice") === "1", endless: params.get("endless") === "1" });
        seedDemoAction();
      }, 120);
    }
  }

  function seedDemoAction() {
    state.elapsed = 10;
    const placements = [
      { type: "bug", x: 120, y: 120, mutation: "rapid" },
      { type: "deadline", x: canvasWidth - 120, y: 155, mutation: "blast" },
      { type: "bug", x: canvasWidth - 180, y: canvasHeight - 105, mutation: "scatter" },
      { type: "reviewer", x: 128, y: canvasHeight - 118, mutation: "shield" }
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
        specialTimer: item.type === "committee" ? 3.2 : lerp(1.1, 2.4, Math.random()),
        dashTimer: 0,
        splitLevel: 0,
        mutation: item.mutation,
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
    addAssistantMessage("system", "Demo setup: color-aura monsters are already on the field. Kill them first to gain Machine Gun, Area Blast, Scatter, or Shield.");
    pushEvent("Demo wave created");
  }
})();
