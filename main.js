(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Hero video: sources are attached by JS (data-src) so reduced-motion and no-JS visitors
  // never download it — they get the poster / static image instead.
  var video = document.querySelector('.hero-video');
  if (video && !reduce) {
    var startVideo = function () {
      // Safari plays VP9 WebM but ignores alpha; use the navy MP4 there (blended away with screen mode).
      var ua = navigator.userAgent;
      var isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(ua);
      video.querySelectorAll('source').forEach(function (s) {
        if (isSafari && s.type === 'video/webm') { s.remove(); return; }
        s.src = s.getAttribute('data-src');
      });
      video.addEventListener('loadeddata', function () {
        if (/\.mp4(\?|$)/.test(video.currentSrc)) video.classList.add('is-mp4');
      });
      video.preload = 'auto';
      video.load();
      var p = video.play && video.play();
      if (p && p.catch) p.catch(function () {});
    };
    // Let the poster, text and fonts paint first; then stream the video.
    if (document.readyState === 'complete') startVideo();
    else window.addEventListener('load', startVideo, { once: true });
  }

  // Matrix-style code stream (lightweight canvas, ~20fps, paused when hidden, off for reduced motion)
  var canvas = document.querySelector('.code-stream');
  if (!canvas || reduce || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var glyphs = '01VAULTRA<>/{}[]=+*#$KEYCARD0123456789ABCDEF'.split('');
  var fontSize, cols, drops, speeds, w, h, last = 0, raf = 0, running = true;
  var isSmall = window.innerWidth < 760;
  var step = isSmall ? 70 : 50; // ms per frame

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fontSize = isSmall ? 13 : 15;
    var spacing = isSmall ? 2.4 : 1.9; // sparser columns = cheaper
    cols = Math.ceil(w / (fontSize * spacing));
    drops = []; speeds = [];
    for (var i = 0; i < cols; i++) { drops[i] = Math.random() * -h / fontSize; speeds[i] = 0.4 + Math.random() * 0.8; }
    ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, w, h);
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (t - last < step) return;
    last = t;
    ctx.fillStyle = 'rgba(5, 7, 15, 0.14)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = fontSize + 'px ui-monospace, Menlo, Consolas, monospace';
    var colW = w / cols;
    for (var i = 0; i < cols; i++) {
      var y = drops[i] * fontSize;
      if (y > 0) {
        var ch = glyphs[(Math.random() * glyphs.length) | 0];
        ctx.fillStyle = Math.random() < 0.06 ? '#cfe9ff' : (i % 5 === 0 ? '#8c7bff' : '#2f8cff');
        ctx.fillText(ch, i * colW, y);
      }
      drops[i] += speeds[i];
      if (y > h && Math.random() > 0.975) drops[i] = Math.random() * -20;
    }
  }

  resize();
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { isSmall = window.innerWidth < 760; step = isSmall ? 70 : 50; resize(); }, 200); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
    else if (!running) { running = true; raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);
})();
