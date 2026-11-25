/* Vaultra — Code Catch: Expert Lvl 100, 30-second web challenge.
   Just for fun: scores stay in this browser (localStorage) and do not carry over to the app.
   Vanilla canvas, no external requests, no audio. */
(function () {
  'use strict';

  var root = document.getElementById('code-catch');
  if (!root) return;
  var canvas = root.querySelector('.cc-canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Logical play field (scaled to the element, crisp on high-DPI)
  var W = 360, H = 540;
  var LANES = 9, LANE_W = W / LANES;
  var GAME_TIME = 30;
  var START_LIVES = 3;
  var BEST_KEY = 'vaultra-codecatch-best';

  var COL = {
    bg: '#03050b',
    grid: 'rgba(79, 179, 255, 0.07)',
    blue: '#2f8cff',
    neon: '#4fb3ff',
    cyan: '#6fd3ff',
    gold: '#ffbf3c',
    amber: '#ff9d1c',
    red: '#ff2e4d',
    redDeep: '#a3001f',
    white: '#eaf3ff'
  };
  var GLYPHS = ['01', '10', 'A7', 'FF', '3C', '9E', '0x', '7B', 'C4', '{}', '<>', 'E1', '5D', '#'];

  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(reduceMQ && reduceMQ.matches); }

  var screens = {};
  Array.prototype.forEach.call(root.querySelectorAll('[data-screen]'), function (el) {
    screens[el.getAttribute('data-screen')] = el;
  });
  function out(name) { return root.querySelector('[data-out="' + name + '"]'); }
  var live = root.querySelector('.cc-live');

  var best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { best = 0; }

  // ---------- State ----------
  var S = null;
  var running = false, paused = false, rafId = 0, lastTs = 0;
  var keys = { left: false, right: false };

  function newState() {
    return {
      t: 0,
      score: 0,
      caught: 0,
      lives: START_LIVES,
      px: W / 2,
      target: W / 2,
      py: H - 52,
      items: [],
      fx: [],
      rowTimer: 0.35,
      codeTimer: 0,
      gap: 3,
      lifeDropped: false,
      invuln: 0,
      flash: 0,
      shake: 0,
      gridOff: 0
    };
  }

  // ---------- Layout / DPR ----------
  var scale = 1;
  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * (H / W) * dpr);
    scale = canvas.width / W;
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);

  // ---------- Input ----------
  function toLogicalX(clientX) {
    var r = canvas.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  }
  var dragging = false;
  canvas.addEventListener('pointerdown', function (e) {
    if (!running || paused) return;
    dragging = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    S.target = toLogicalX(e.clientX);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!running || paused) return;
    if (e.pointerType === 'mouse' || dragging) {
      S.target = toLogicalX(e.clientX);
      if (dragging) e.preventDefault();
    }
  });
  function endDrag() { dragging = false; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  // Belt and braces for older mobile browsers: no page scroll while dragging on the canvas
  canvas.addEventListener('touchmove', function (e) { if (running) e.preventDefault(); }, { passive: false });

  function keyDir(e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
    if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
    return null;
  }
  document.addEventListener('keydown', function (e) {
    if (!running || paused || e.metaKey || e.ctrlKey || e.altKey) return;
    var d = keyDir(e);
    if (!d) return;
    keys[d] = true;
    e.preventDefault();
  });
  document.addEventListener('keyup', function (e) {
    var d = keyDir(e);
    if (d) keys[d] = false;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && running && !paused) pause();
  });
  window.addEventListener('blur', function () { keys.left = keys.right = false; });

  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var a = btn.getAttribute('data-action');
    if (a === 'start' || a === 'again') start();
    else if (a === 'resume') resume();
  });

  // ---------- Screens ----------
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = (k !== name); });
    root.classList.toggle('is-playing', !name);
  }
  function focusIn(name) {
    var b = screens[name] && screens[name].querySelector('button');
    if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
  }

  function start() {
    S = newState();
    keys.left = keys.right = false;
    running = true; paused = false;
    show(null);
    var r = canvas.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      try { canvas.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { canvas.scrollIntoView(); }
    }
    if (live) live.textContent = 'Game started. 30 seconds, 3 lives.';
    lastTs = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }
  function pause() {
    paused = true;
    keys.left = keys.right = false;
    cancelAnimationFrame(rafId);
    show('pause');
    draw();
  }
  function resume() {
    if (!running) return;
    paused = false;
    show(null);
    lastTs = 0;
    rafId = requestAnimationFrame(loop);
  }
  function finish(timeUp) {
    running = false;
    cancelAnimationFrame(rafId);
    var isBest = S.score > best;
    if (isBest) {
      best = S.score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* private mode */ }
    }
    out('reason').textContent = timeUp ? "TIME'S UP" : 'SYSTEM CRASH';
    out('score').textContent = S.score;
    out('best').textContent = best;
    out('newbest').hidden = !(isBest && S.score > 0);
    draw();
    show('end');
    focusIn('end');
    if (live) live.textContent = (timeUp ? "Time's up. " : 'Out of lives. ') + 'Score ' + S.score + '. Best ' + best + '.';
  }

  // ---------- Spawning ----------
  function ramp() { return Math.min(1, S.t / GAME_TIME); }

  // A row of red hazards with a guaranteed 2-lane gap that never jumps more than 2 lanes
  function spawnRow() {
    var k = ramp();
    var shift = Math.floor(Math.random() * 5) - 2; // -2..2
    var g = Math.max(0, Math.min(LANES - 2, S.gap + shift));
    S.gap = g;
    var vy = 300 + 80 * k;
    var fill = 0.68 + 0.17 * k;
    for (var i = 0; i < LANES; i++) {
      if (i === g || i === g + 1) continue;
      if (Math.random() > fill) continue;
      S.items.push({ type: 'haz', x: i * LANE_W + LANE_W / 2, y: -20, w: LANE_W - 8, h: 20, vy: vy, spin: Math.random() * 6 });
    }
    // Bonus life rides in the safe gap at ~15s
    if (!S.lifeDropped && S.t >= 15) {
      S.lifeDropped = true;
      S.items.push({ type: 'life', x: (g + 1) * LANE_W, y: -20, w: 24, h: 22, vy: vy });
    }
  }
  function spawnCode() {
    var k = ramp();
    var kc = Math.random() < 0.12;
    S.items.push({
      type: kc ? 'kc' : 'code',
      x: 14 + Math.random() * (W - 28),
      y: -16,
      w: kc ? 26 : 22,
      h: kc ? 18 : 16,
      vy: (230 + Math.random() * 130) * (1 + 0.2 * k),
      text: GLYPHS[(Math.random() * GLYPHS.length) | 0],
      gold: !kc && Math.random() < 0.3
    });
  }

  // ---------- Update ----------
  function overlap(a, bx, by, bw, bh) {
    return Math.abs(a.x - bx) * 2 < a.w + bw && Math.abs(a.y - by) * 2 < a.h + bh;
  }
  function burst(x, y, color, n) {
    if (reduced()) return;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140;
      S.fx.push({ kind: 'p', x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, life: 0.45, max: 0.45, c: color });
    }
  }
  function floatText(x, y, text, color) {
    S.fx.push({ kind: 't', x: x, y: y, vx: 0, vy: -50, life: 0.7, max: 0.7, text: text, c: color });
  }

  function update(dt) {
    S.t += dt;
    if (S.t >= GAME_TIME) { S.t = GAME_TIME; finish(true); return; }

    // Movement: keys move at a fixed speed, pointer glides fast toward its target
    var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) {
      S.px += dir * 560 * dt;
      S.target = S.px;
    } else {
      var dx = S.target - S.px, maxStep = 1500 * dt;
      S.px += Math.abs(dx) <= maxStep ? dx : (dx > 0 ? maxStep : -maxStep);
    }
    S.px = Math.max(26, Math.min(W - 26, S.px));

    // Spawns
    S.rowTimer -= dt;
    if (S.rowTimer <= 0) { spawnRow(); S.rowTimer += 0.6 - 0.1 * ramp(); }
    S.codeTimer -= dt;
    while (S.codeTimer <= 0) { spawnCode(); S.codeTimer += 0.1 - 0.035 * ramp(); }

    if (S.invuln > 0) S.invuln -= dt;
    if (S.flash > 0) S.flash -= dt;
    if (S.shake > 0) S.shake -= dt;
    if (!reduced()) S.gridOff = (S.gridOff + dt * 90) % 30;

    // Catcher hitboxes: generous for catching, forgiving for hazards
    var cx = S.px, cy = S.py;
    for (var i = S.items.length - 1; i >= 0; i--) {
      var it = S.items[i];
      it.y += it.vy * dt;
      if (it.spin !== undefined) it.spin += dt * 4;
      var hit = false;
      if (it.type === 'haz') {
        if (S.invuln <= 0 && overlap(it, cx, cy + 2, 34, 22)) {
          hit = true;
          S.lives--;
          S.invuln = 1.1;
          S.flash = 0.35;
          S.shake = reduced() ? 0 : 0.3;
          burst(it.x, it.y, COL.red, 14);
          floatText(cx, cy - 30, '-1 LIFE', COL.red);
          if (S.lives <= 0) { S.items.splice(i, 1); finish(false); return; }
        }
      } else if (overlap(it, cx, cy - 4, 54, 30)) {
        hit = true;
        if (it.type === 'life') {
          S.lives++;
          burst(it.x, it.y, COL.cyan, 16);
          floatText(it.x, it.y - 12, '+1 LIFE', COL.cyan);
        } else if (it.type === 'kc') {
          S.score += 5; S.caught++;
          burst(it.x, it.y, COL.gold, 12);
          floatText(it.x, it.y - 12, '+5 KC', COL.gold);
        } else {
          S.score += it.gold ? 2 : 1; S.caught++;
          burst(it.x, it.y, it.gold ? COL.gold : COL.neon, 6);
          floatText(it.x, it.y - 10, it.gold ? '+2' : '+1', it.gold ? COL.gold : COL.cyan);
        }
      }
      if (hit || it.y > H + 30) S.items.splice(i, 1);
    }

    for (var j = S.fx.length - 1; j >= 0; j--) {
      var f = S.fx[j];
      f.life -= dt;
      if (f.life <= 0) { S.fx.splice(j, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.kind === 'p') f.vy += 320 * dt;
    }
  }

  // ---------- Draw ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W / 2, H * 0.85, 10, W / 2, H * 0.85, H * 0.8);
    g.addColorStop(0, 'rgba(47, 140, 255, 0.16)');
    g.addColorStop(1, 'rgba(3, 5, 11, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COL.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = LANE_W; x < W; x += LANE_W) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    var off = S ? S.gridOff : 0;
    for (var y = -30 + off; y < H; y += 30) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    // floor line
    ctx.strokeStyle = 'rgba(111, 211, 255, 0.35)';
    ctx.beginPath(); ctx.moveTo(0, H - 22.5); ctx.lineTo(W, H - 22.5); ctx.stroke();
  }

  function drawV(x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = COL.neon;
    ctx.shadowBlur = 16;
    // Outer V
    ctx.beginPath();
    ctx.moveTo(-26, -16); ctx.lineTo(-14, -16); ctx.lineTo(0, 8); ctx.lineTo(14, -16);
    ctx.lineTo(26, -16); ctx.lineTo(4, 18); ctx.lineTo(-4, 18); ctx.closePath();
    var gr = ctx.createLinearGradient(0, -16, 0, 18);
    gr.addColorStop(0, COL.gold);
    gr.addColorStop(1, COL.amber);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = COL.cyan;
    ctx.stroke();
    // inner neon core
    ctx.beginPath();
    ctx.moveTo(-19, -12); ctx.lineTo(0, 13); ctx.lineTo(19, -12);
    ctx.strokeStyle = 'rgba(111, 211, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawItem(it, now) {
    if (it.type === 'haz') {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.shadowColor = COL.red;
      ctx.shadowBlur = 12;
      roundRect(-it.w / 2, -it.h / 2, it.w, it.h, 3);
      ctx.fillStyle = COL.redDeep;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = COL.red;
      ctx.stroke();
      // warning X
      ctx.strokeStyle = '#ffd6dc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
      ctx.stroke();
      ctx.restore();
    } else if (it.type === 'kc') {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.shadowColor = COL.gold;
      ctx.shadowBlur = 10;
      roundRect(-13, -9, 26, 18, 3);
      ctx.fillStyle = '#1a1205';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = COL.gold;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = COL.gold;
      ctx.fillRect(-10, -5, 6, 4);
      ctx.font = '800 8px Orbitron, Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('KC', 10, 3);
      ctx.restore();
    } else if (it.type === 'life') {
      var pulse = reduced() ? 1 : 1 + 0.12 * Math.sin(now * 10);
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = COL.cyan;
      ctx.shadowBlur = 16;
      heart(0, 0, 11, COL.cyan);
      ctx.restore();
    } else {
      ctx.save();
      ctx.font = '700 13px "Courier New", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = it.gold ? COL.amber : COL.blue;
      ctx.shadowBlur = 8;
      ctx.fillStyle = it.gold ? COL.gold : COL.neon;
      ctx.fillText(it.text, it.x, it.y);
      ctx.restore();
    }
  }

  function heart(x, y, r, color) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawHud() {
    var t = S ? S.t : 0;
    var left = Math.max(0, GAME_TIME - t);
    var band = ctx.createLinearGradient(0, 0, 0, 58);
    band.addColorStop(0, 'rgba(3, 5, 11, 0.92)');
    band.addColorStop(1, 'rgba(3, 5, 11, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, W, 58);
    // time bar
    ctx.fillStyle = 'rgba(79, 179, 255, 0.15)';
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = left <= 5 ? COL.red : COL.cyan;
    ctx.fillRect(0, 0, W * (left / GAME_TIME), 4);

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '700 11px Orbitron, Inter, system-ui, sans-serif';
    ctx.fillStyle = COL.gold;
    ctx.textAlign = 'left';
    ctx.fillText('LVL 100', 10, 12);
    ctx.fillStyle = COL.white;
    ctx.textAlign = 'right';
    ctx.fillText('SCORE ' + (S ? S.score : 0), W - 10, 12);
    ctx.textAlign = 'center';
    ctx.font = '800 22px Orbitron, Inter, system-ui, sans-serif';
    ctx.fillStyle = left <= 5 ? COL.red : COL.cyan;
    ctx.shadowColor = left <= 5 ? COL.red : COL.blue;
    ctx.shadowBlur = 10;
    ctx.fillText(Math.ceil(left).toString(), W / 2, 10);
    ctx.restore();

    var lives = S ? S.lives : START_LIVES;
    for (var i = 0; i < lives; i++) heart(16 + i * 18, 40, 6, COL.cyan);
  }

  function draw() {
    if (!canvas.width) return;
    var now = performance.now() / 1000;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (S && S.shake > 0) {
      var m = 5 * (S.shake / 0.3);
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    drawBackground();
    if (S) {
      for (var i = 0; i < S.items.length; i++) drawItem(S.items[i], now);
      var blink = S.invuln > 0 && Math.floor(S.invuln * 12) % 2 === 0;
      drawV(S.px, S.py, 1, blink ? 0.35 : 1);
      for (var j = 0; j < S.fx.length; j++) {
        var f = S.fx[j], a = f.life / f.max;
        ctx.globalAlpha = a;
        ctx.fillStyle = f.c;
        if (f.kind === 'p') ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3);
        else {
          ctx.font = '800 12px Orbitron, Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, f.x, f.y);
        }
      }
      ctx.globalAlpha = 1;
      if (S.flash > 0) {
        ctx.fillStyle = 'rgba(255, 46, 77,' + (reduced() ? 0.12 : 0.3) * (S.flash / 0.35) + ')';
        ctx.fillRect(-10, -10, W + 20, H + 20);
      }
    } else {
      // Attract frame behind the start screen
      var demo = [[60, 120, 'A7'], [140, 210, '01'], [250, 90, 'FF'], [300, 260, '3C'], [90, 330, '9E']];
      demo.forEach(function (d, k) { drawItem({ type: 'code', x: d[0], y: d[1], text: d[2], gold: k % 2 === 1 }, now); });
      drawItem({ type: 'kc', x: 200, y: 300 }, now);
      for (var h = 0; h < LANES; h++) if (h !== 4 && h !== 5) drawItem({ type: 'haz', x: h * LANE_W + LANE_W / 2, y: 400, w: LANE_W - 8, h: 20 }, now);
      drawV(W / 2 + LANE_W / 2, H - 52, 1, 1);
    }
    drawHud();
  }

  function loop(ts) {
    if (!running || paused) return;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    update(dt);
    draw();
    if (running && !paused) rafId = requestAnimationFrame(loop);
  }

  out('best').textContent = best;
  show('start');
  resize();
})();
