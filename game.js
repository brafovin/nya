/* ===========================================================================
   CUBE DASH — ein Geometry-Dash-Klon
   Reines HTML5 Canvas + JavaScript, keine Abhängigkeiten.
   ===========================================================================*/

(() => {
  "use strict";

  // ---- Canvas-Setup -------------------------------------------------------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;   // 960
  const H = canvas.height;  // 540

  // ---- Spielkonstanten ----------------------------------------------------
  const GROUND_Y = H - 80;     // Boden-Oberkante
  const CUBE = 42;             // Würfelgröße
  const GRAVITY = 2400;        // px/s^2
  const JUMP_V = -860;         // Sprung-Anfangsgeschwindigkeit
  const SPEED = 360;           // horizontale Weltgeschwindigkeit px/s
  const TILE = 60;             // Rastergröße für Level-Editor

  // ---- Status -------------------------------------------------------------
  const STATE = { MENU: 0, PLAY: 1, DEAD: 2, WIN: 3 };
  let state = STATE.MENU;

  // ---- DOM ----------------------------------------------------------------
  const overlay = document.getElementById("overlay");
  const deadScreen = document.getElementById("dead");
  const winScreen = document.getElementById("win");
  const hud = document.getElementById("hud");
  const progressFill = document.getElementById("progressFill");
  const progressPct = document.getElementById("progressPct");
  const hudAttempt = document.getElementById("hudAttempt");
  const deadPct = document.getElementById("deadPct");
  const attemptsEl = document.getElementById("attempts");
  const bestStart = document.getElementById("bestStart");
  const bestDead = document.getElementById("bestDead");
  const winAttempts = document.getElementById("winAttempts");
  const levelpick = document.getElementById("levelpick");

  // =========================================================================
  // LEVEL-DESIGN
  // Wir bauen Level aus "Tokens" über eine Reihe von Spalten (x-Raster).
  //   _  = nichts (Lücke)
  //   .  = flacher Boden (nur Deko, Boden ist sowieso da)
  //   ^  = ein Stachel auf dem Boden  (tödlich)
  //   M  = drei Stacheln nebeneinander (über mehrere Spalten gezogen)
  //   B  = Block (Plattform, 1 Tile hoch) auf dem Boden
  //   2  = Block 2 hoch
  //   3  = Block 3 hoch
  //   J  = Sprung-Pad (gelb) — automatischer hoher Sprung
  //   x  = Stachel auf einem 1-hohen Block
  // Jede Spalte ist TILE px breit. Wir parsen das in konkrete Objekte.
  // =========================================================================

  const LEVELS = [
    {
      name: "Stereo Madness",
      color: "#00e5ff",
      bg: ["#10103a", "#1d1d5c"],
      // Lesbar: jede Zeile = ein Abschnitt, wird aneinandergehängt
      map: [
        "________________",
        "_____^____^___^_",
        "__^____^^____B__",
        "___B___^___^__^_",
        "_^__J___2___^^__",
        "____^__B__^___B_",
        "__^^___^___J___^",
        "_B__^__^^___^__B",
        "___^___B___^^___",
        "_^___^___^___^_E",
      ],
    },
    {
      name: "Back On Track",
      color: "#ff2e88",
      bg: ["#2a0a3a", "#52125c"],
      map: [
        "________________",
        "__^_^_^___2__^^_",
        "_B___^__^___B__^",
        "__^J__^^___^__3_",
        "_^___B___^^___^_",
        "___^^___J___^__B",
        "_^__^__3___^^__^",
        "__B___^^___B___^",
        "_^__^___^J___^^_",
        "___^^__^___^___E",
        "_^___B___^^__^_E",
      ],
    },
    {
      name: "Polargeist",
      color: "#6bff6b",
      bg: ["#0a2a1a", "#125c3a"],
      map: [
        "________________",
        "_^^_^^_^^__33__^^",
        "_^__^__^___^^__^_",
        "J__^^__^^_J__^^_^",
        "_^^___^^__^^__^^_",
        "__^J^__^^_^__^^_^",
        "_^^_^^__J^^__^^_^",
        "3__^^_^^__^^_J^^_",
        "_^^__^^__^^__^^_^",
        "^_^^_^^_^^__^^_^E",
        "_^^_J_^^__^^_^^_E",
        "^^__^^__^^_^^__^E",
      ],
    },
  ];

  let currentLevel = 0;
  let world = null;      // { obstacles, length }
  let attempts = 1;

  // Parst eine Level-Map in eine flache Liste von Objekten.
  function buildWorld(level) {
    const obstacles = [];
    let col = 6; // Vorlauf, damit der Spieler Zeit hat

    for (const row of level.map) {
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        const x = col * TILE;
        switch (c) {
          case "^":
            obstacles.push(spike(x, GROUND_Y));
            break;
          case "B":
            obstacles.push(block(x, GROUND_Y - TILE, TILE, TILE));
            break;
          case "2":
            obstacles.push(block(x, GROUND_Y - TILE * 2, TILE, TILE * 2));
            break;
          case "3":
            obstacles.push(block(x, GROUND_Y - TILE * 3, TILE, TILE * 3));
            break;
          case "J":
            obstacles.push(pad(x, GROUND_Y));
            break;
          case "E":
            // Endmarkierung — Position merken
            break;
          default:
            break;
        }
        col++;
      }
    }
    const length = col * TILE + W * 0.5;
    return { obstacles, length, level };
  }

  function spike(x, groundY) {
    const s = TILE * 0.7;
    return {
      type: "spike",
      x: x + (TILE - s) / 2,
      y: groundY - s,
      w: s,
      h: s,
      deadly: true,
    };
  }
  function block(x, y, w, h) {
    return { type: "block", x, y, w, h, deadly: false };
  }
  function pad(x, groundY) {
    const s = TILE * 0.55;
    return {
      type: "pad",
      x: x + (TILE - s) / 2,
      y: groundY - 12,
      w: s,
      h: 12,
      deadly: false,
    };
  }

  // =========================================================================
  // SPIELER
  // =========================================================================
  const player = {
    x: 160,
    y: 0,
    vy: 0,
    onGround: true,
    angle: 0,        // Rotation beim Springen
    trail: [],
  };

  function resetPlayer() {
    player.x = 160;
    player.y = GROUND_Y - CUBE;
    player.vy = 0;
    player.onGround = true;
    player.angle = 0;
    player.trail = [];
  }

  // =========================================================================
  // KAMERA / WELT-SCROLL
  // =========================================================================
  let camX = 0; // Welt-Versatz nach links

  // =========================================================================
  // PARTIKEL
  // =========================================================================
  let particles = [];
  function burst(x, y, color, n = 24) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 260;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 80,
        life: 0.6 + Math.random() * 0.5,
        max: 1.1,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }
  function landDust(x, y) {
    for (let i = 0; i < 6; i++) {
      particles.push({
        x, y,
        vx: -SPEED * 0.4 + (Math.random() - 0.5) * 60,
        vy: -Math.random() * 120,
        life: 0.3,
        max: 0.3,
        color: "rgba(255,255,255,0.6)",
        size: 2 + Math.random() * 3,
      });
    }
  }

  // =========================================================================
  // AUDIO — prozedurale Chiptune-Musik + Soundeffekte (Web Audio API)
  // Keine externen Dateien: alles wird live im Browser synthetisiert.
  // =========================================================================
  const TRACKS = [
    {
      // Stereo Madness — treibend, a-moll
      bpm: 140,
      lead: [9, null, 12, 16, 21, 16, 12, null, 7, null, 11, 14, 17, 14, 11, null],
      bass: [-3, -3, 4, 4, -5, -5, 0, 0],
    },
    {
      // Back On Track — e-moll
      bpm: 132,
      lead: [16, null, 19, 16, 14, null, 12, 14, 16, null, 21, 19, 16, 14, 12, null],
      bass: [4, 4, -1, -1, 0, 0, 2, 2],
    },
    {
      // Polargeist — schnell, C-Dur
      bpm: 152,
      lead: [12, 16, 19, 24, 19, 16, 12, 16, 14, 17, 21, 17, 14, 11, 7, null],
      bass: [0, 0, 5, 5, 7, 7, -3, -3],
    },
  ];

  const Sound = (() => {
    let ctx = null, master, musicGain, sfxGain, noiseBuf = null;
    let muted = false;
    let schedTimer = null;
    let nextNoteTime = 0;
    let step = 0;
    let track = null;
    let playing = false;
    const LOOKAHEAD = 25;       // ms
    const AHEAD = 0.12;         // s

    // semitone (von C4) -> Frequenz
    function freq(n) { return 261.63 * Math.pow(2, n / 12); }

    function init() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.30; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
      // Rausch-Puffer für Hi-Hats / Explosion
      const len = ctx.sampleRate * 1.0;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }

    function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }

    // --- Basis-Tongenerator mit ADSR-Hüllkurve ---------------------------
    function tone(f, t, dur, type, vol, dest, slideTo) {
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || sfxGain);
      o.start(t); o.stop(t + dur + 0.02);
    }

    function noise(t, dur, vol, hpFreq) {
      if (!ctx || !noiseBuf) return;
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      const g = ctx.createGain();
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = hpFreq || 6000;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(hp); hp.connect(g); g.connect(sfxGain);
      s.start(t); s.stop(t + dur + 0.02);
    }

    // --- Sequencer -------------------------------------------------------
    function scheduleStep(s, t) {
      const secPer16 = 60 / track.bpm / 4;
      // Lead (eine Oktave höher, Square)
      const ln = track.lead[s];
      if (ln != null) tone(freq(ln + 12), t, secPer16 * 1.6, "square", 0.18, musicGain);
      // Bass (alle 2 Steps, Triangle)
      if (s % 2 === 0) {
        const bn = track.bass[s / 2];
        if (bn != null) tone(freq(bn - 12), t, secPer16 * 1.9, "triangle", 0.30, musicGain);
      }
      // Kick auf Viertel
      if (s % 4 === 0) tone(150, t, 0.12, "sine", 0.45, musicGain, 50);
      // Hi-Hat auf Achtel-Offbeats
      if (s % 2 === 1) noise(t, 0.03, 0.06, 8000);
    }

    function scheduler() {
      if (!ctx || !track) return;
      const secPer16 = 60 / track.bpm / 4;
      while (nextNoteTime < ctx.currentTime + AHEAD) {
        scheduleStep(step, nextNoteTime);
        nextNoteTime += secPer16;
        step = (step + 1) % 16;
      }
    }

    function startMusic(levelIndex) {
      init(); resume();
      if (!ctx) return;
      track = TRACKS[levelIndex % TRACKS.length];
      step = 0;
      nextNoteTime = ctx.currentTime + 0.08;
      playing = true;
      if (schedTimer) clearInterval(schedTimer);
      schedTimer = setInterval(scheduler, LOOKAHEAD);
    }

    function stopMusic() {
      playing = false;
      if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
    }

    // --- Soundeffekte ----------------------------------------------------
    function jump() { init(); resume(); if (!ctx) return; const t = ctx.currentTime; tone(520, t, 0.12, "square", 0.25, sfxGain, 900); }
    function pad() { init(); resume(); if (!ctx) return; const t = ctx.currentTime; tone(400, t, 0.22, "sawtooth", 0.28, sfxGain, 1500); }
    function click() { init(); resume(); if (!ctx) return; const t = ctx.currentTime; tone(660, t, 0.08, "square", 0.2, sfxGain, 880); }
    function death() {
      init(); resume(); if (!ctx) return; const t = ctx.currentTime;
      tone(300, t, 0.5, "sawtooth", 0.35, sfxGain, 40);
      tone(200, t, 0.5, "square", 0.25, sfxGain, 30);
      noise(t, 0.4, 0.4, 1200);
    }
    function win() {
      init(); resume(); if (!ctx) return; let t = ctx.currentTime;
      const seq = [0, 4, 7, 12, 16, 19];
      seq.forEach((n, i) => tone(freq(n), t + i * 0.11, 0.25, "square", 0.3, sfxGain));
    }

    function toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    }
    function isMuted() { return muted; }

    return { startMusic, stopMusic, jump, pad, click, death, win, toggleMute, isMuted, resume, init, isPlaying: () => playing };
  })();

  // =========================================================================
  // EINGABE
  // =========================================================================
  let holding = false;

  function pressJump() {
    if (state === STATE.PLAY) {
      tryJump();
    } else if (state === STATE.MENU) {
      startGame();
    } else if (state === STATE.DEAD) {
      startGame();
    } else if (state === STATE.WIN) {
      // im Win-Screen nichts automatisch
    }
  }

  function tryJump() {
    if (player.onGround) {
      player.vy = JUMP_V;
      player.onGround = false;
      burst(player.x + CUBE / 2, player.y + CUBE, currentColor(), 8);
      Sound.jump();
    }
  }

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
      e.preventDefault();
      if (!holding) pressJump();
      holding = true;
    }
  });
  window.addEventListener("keyup", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) holding = false;
  });

  canvas.addEventListener("mousedown", (e) => { e.preventDefault(); holding = true; pressJump(); });
  window.addEventListener("mouseup", () => { holding = false; });
  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); holding = true; pressJump(); }, { passive: false });
  window.addEventListener("touchend", () => { holding = false; });

  // Overlays per Klick auf Buttons
  document.getElementById("startBtn").addEventListener("click", () => { Sound.click(); startGame(); });
  document.getElementById("retryBtn").addEventListener("click", () => { Sound.click(); startGame(); });
  document.getElementById("menuBtn").addEventListener("click", () => { Sound.click(); toMenu(); });
  document.getElementById("winMenuBtn").addEventListener("click", () => { Sound.click(); toMenu(); });
  document.getElementById("winNextBtn").addEventListener("click", () => {
    Sound.click();
    currentLevel = (currentLevel + 1) % LEVELS.length;
    startGame();
  });

  // Ton an/aus
  const muteBtn = document.getElementById("muteBtn");
  function updateMuteBtn() {
    const m = Sound.isMuted();
    muteBtn.textContent = m ? "🔇" : "🔊";
    muteBtn.classList.toggle("muted", m);
  }
  muteBtn.addEventListener("click", () => { Sound.init(); Sound.resume(); Sound.toggleMute(); updateMuteBtn(); });
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyM") { Sound.init(); Sound.toggleMute(); updateMuteBtn(); }
  });

  // =========================================================================
  // HIGHSCORE (localStorage)
  // =========================================================================
  function bestKey(i) { return "cubedash_best_" + i; }
  function getBest(i) { return parseInt(localStorage.getItem(bestKey(i)) || "0", 10); }
  function setBest(i, pct) {
    if (pct > getBest(i)) localStorage.setItem(bestKey(i), String(pct));
  }

  // =========================================================================
  // SPIELABLAUF
  // =========================================================================
  function currentColor() { return LEVELS[currentLevel].color; }

  function buildLevelPicker() {
    levelpick.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.textContent = (i + 1) + ". " + lv.name;
      if (i === currentLevel) b.classList.add("active");
      b.addEventListener("click", () => {
        currentLevel = i;
        buildLevelPicker();
        bestStart.textContent = getBest(currentLevel) + "%";
      });
      levelpick.appendChild(b);
    });
  }

  function toMenu() {
    state = STATE.MENU;
    Sound.stopMusic();
    overlay.classList.remove("hidden");
    deadScreen.classList.add("hidden");
    winScreen.classList.add("hidden");
    hud.classList.add("hidden");
    buildLevelPicker();
    bestStart.textContent = getBest(currentLevel) + "%";
  }

  function startGame() {
    if (state === STATE.DEAD || state === STATE.WIN) {
      attempts++;
    } else {
      attempts = 1;
    }
    state = STATE.PLAY;
    world = buildWorld(LEVELS[currentLevel]);
    camX = 0;
    particles = [];
    resetPlayer();
    overlay.classList.add("hidden");
    deadScreen.classList.add("hidden");
    winScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    hudAttempt.textContent = attempts;
    document.documentElement.style.setProperty("--accent", currentColor());
    Sound.startMusic(currentLevel);
  }

  function die() {
    state = STATE.DEAD;
    Sound.stopMusic();
    Sound.death();
    const pct = progressPercent();
    setBest(currentLevel, pct);
    burst(player.x + CUBE / 2, player.y + CUBE / 2, "#ff4444", 40);
    burst(player.x + CUBE / 2, player.y + CUBE / 2, currentColor(), 30);
    // kurze Verzögerung, damit die Explosion sichtbar ist
    deadPct.textContent = pct + "%";
    attemptsEl.textContent = attempts;
    bestDead.textContent = getBest(currentLevel) + "%";
    setTimeout(() => {
      if (state === STATE.DEAD) {
        deadScreen.classList.remove("hidden");
        hud.classList.add("hidden");
      }
    }, 550);
  }

  function winGame() {
    state = STATE.WIN;
    Sound.stopMusic();
    Sound.win();
    setBest(currentLevel, 100);
    burst(player.x + CUBE / 2, player.y + CUBE / 2, "#6bff6b", 60);
    winAttempts.textContent = attempts;
    winScreen.classList.remove("hidden");
    hud.classList.add("hidden");
  }

  function progressPercent() {
    const p = Math.min(100, Math.max(0, (camX / (world.length - W)) * 100));
    return Math.round(p);
  }

  // =========================================================================
  // KOLLISION
  // =========================================================================
  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Spitz-genaue Kollision für Dreiecks-Stacheln (etwas nachsichtig)
  function hitsSpike(px, py, pw, ph, s) {
    // Hitbox des Stachels kleiner als visuell -> fair
    const inset = s.w * 0.22;
    return aabb(px, py, pw, ph, s.x + inset, s.y + s.h * 0.3, s.w - inset * 2, s.h * 0.7);
  }

  function update(dt) {
    if (state !== STATE.PLAY) return;

    // Welt scrollt
    camX += SPEED * dt;

    // Schwerkraft
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    // Rotation: in der Luft drehen, am Boden auf 90°-Raster einrasten
    if (!player.onGround) {
      player.angle += dt * 6.0; // ~ eine Umdrehung pro Sprung
    } else {
      const snap = Math.round(player.angle / (Math.PI / 2)) * (Math.PI / 2);
      player.angle += (snap - player.angle) * Math.min(1, dt * 20);
    }

    const px = player.x;
    const wpx = px + camX; // Welt-Koordinate des Spielers

    // Standard: Boden
    let groundLevel = GROUND_Y;
    let wasOnGround = player.onGround;
    player.onGround = false;

    // Plattform-Kollision (Blöcke): von oben landen, seitlich tödlich
    for (const o of world.obstacles) {
      if (o.type === "block") {
        // sichtbar bei o.x..o.x+w in Weltkoordinaten
        const overlapX = wpx + CUBE > o.x && wpx < o.x + o.w;
        if (!overlapX) continue;

        const cubeBottom = player.y + CUBE;
        // landet oben drauf?
        if (player.vy >= 0 && cubeBottom - player.vy * dt <= o.y + 1) {
          if (cubeBottom >= o.y && player.y < o.y) {
            player.y = o.y - CUBE;
            player.vy = 0;
            player.onGround = true;
            groundLevel = o.y;
            continue;
          }
        }
        // sonst: seitlicher / unterer Treffer = Tod
        if (aabb(wpx, player.y, CUBE, CUBE, o.x, o.y, o.w, o.h)) {
          die();
          return;
        }
      } else if (o.type === "spike") {
        if (hitsSpike(wpx, player.y, CUBE, CUBE, o)) {
          die();
          return;
        }
      } else if (o.type === "pad") {
        if (aabb(wpx, player.y, CUBE, CUBE, o.x, o.y - 4, o.w, o.h + 8) && player.vy >= -50) {
          player.vy = JUMP_V * 1.35; // Boost
          player.onGround = false;
          burst(o.x + o.w / 2, o.y, "#ffd54a", 18);
          Sound.pad();
        }
      }
    }

    // Boden
    if (player.y + CUBE >= groundLevel) {
      player.y = groundLevel - CUBE;
      player.vy = 0;
      if (!player.onGround && !wasOnGround) {
        // gerade gelandet (außer wir standen schon auf einem Block)
      }
      if (!wasOnGround) landDust(player.x + CUBE / 2, groundLevel);
      player.onGround = true;
    }

    // Halten = wiederholt springen, sobald wieder am Boden
    if (holding && player.onGround) tryJump();

    // Trail
    player.trail.unshift({ x: player.x, y: player.y, a: player.angle });
    if (player.trail.length > 8) player.trail.pop();

    // Partikel
    updateParticles(dt);

    // Ziel erreicht?
    if (camX >= world.length - W) {
      winGame();
      return;
    }

    // HUD
    const pct = progressPercent();
    progressFill.style.width = pct + "%";
    progressPct.textContent = pct + "%";
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // =========================================================================
  // RENDERING
  // =========================================================================
  let bgOffset = 0;

  function draw() {
    const lv = LEVELS[currentLevel] || LEVELS[0];

    // Hintergrund-Gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, lv.bg[0]);
    g.addColorStop(1, lv.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Parallax-Gitter
    drawGrid(lv.color);

    if (state === STATE.PLAY || state === STATE.DEAD) {
      drawObstacles(lv.color);
      drawGround(lv.color);
      if (state === STATE.PLAY) drawPlayer(lv.color);
    } else {
      drawGround(lv.color);
    }

    drawParticles();
  }

  function drawGrid(color) {
    bgOffset = (camX * 0.4) % 80;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let x = -bgOffset; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // Schwebende Deko-Quadrate (langsamer Parallax)
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    const slow = (camX * 0.15) % 300;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 300 - slow) % (W + 200)) - 100 + (i * 53) % 200;
      const s = 30 + (i % 3) * 20;
      const y = 60 + (i * 67) % 240;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(i * 0.5 + camX * 0.0008);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGround(color) {
    // Boden-Fläche
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // leuchtende Bodenlinie
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // scrollende Bodentextur
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const off = camX % 40;
    for (let x = -off; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 20, H);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawObstacles(color) {
    for (const o of world.obstacles) {
      const sx = o.x - camX; // Bildschirm-X
      if (sx > W + 80 || sx + o.w < -80) continue;

      if (o.type === "spike") {
        drawSpike(sx, o.y, o.w, o.h, color);
      } else if (o.type === "block") {
        drawBlock(sx, o.y, o.w, o.h, color);
      } else if (o.type === "pad") {
        drawPad(sx, o.y, o.w, o.h);
      }
    }
  }

  function drawSpike(x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = "#16162c";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBlock(x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = "#1a1a30";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
    // inneres Detail
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + w - 6, y + h - 6);
    ctx.moveTo(x + w - 6, y + 6);
    ctx.lineTo(x + 6, y + h - 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawPad(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = "#ffd54a";
    ctx.shadowColor = "#ffd54a";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(color) {
    // Trail
    for (let i = player.trail.length - 1; i >= 0; i--) {
      const t = player.trail[i];
      const a = (1 - i / player.trail.length) * 0.25;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(t.x + CUBE / 2, t.y + CUBE / 2);
      ctx.rotate(t.a);
      ctx.fillStyle = color;
      ctx.fillRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE);
      ctx.restore();
    }

    // Würfel
    ctx.save();
    ctx.translate(player.x + CUBE / 2, player.y + CUBE / 2);
    ctx.rotate(player.angle);

    // Körper
    const grd = ctx.createLinearGradient(-CUBE / 2, -CUBE / 2, CUBE / 2, CUBE / 2);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "#ffffff");
    ctx.fillStyle = grd;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    roundRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Rand
    ctx.strokeStyle = "#0a0a14";
    ctx.lineWidth = 3;
    roundRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE, 8);
    ctx.stroke();

    // "Gesicht" / inneres Quadrat
    ctx.fillStyle = "rgba(10,10,20,0.85)";
    const inner = CUBE * 0.42;
    roundRect(-inner / 2, -inner / 2, inner, inner, 4);
    ctx.fill();

    // Augen
    ctx.fillStyle = "#fff";
    ctx.fillRect(-inner / 2 + 3, -3, 4, 6);
    ctx.fillRect(inner / 2 - 7, -3, 4, 6);

    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // =========================================================================
  // HAUPTSCHLEIFE
  // =========================================================================
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // Clamp gegen Tab-Wechsel-Sprünge

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // =========================================================================
  // START
  // =========================================================================
  resetPlayer();
  buildLevelPicker();
  bestStart.textContent = getBest(currentLevel) + "%";
  requestAnimationFrame(loop);
})();
