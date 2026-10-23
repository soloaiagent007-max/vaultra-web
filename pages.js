(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Quantum City background: no download for reduced-motion visitors (they keep the still);
  // small screens get the 480p loop. Streams after page load; pauses when the tab is hidden.
  var v = document.querySelector('.city-video');
  if (v && !reduce) {
    var start = function () {
      var small = window.matchMedia('(max-width: 760px)').matches;
      v.querySelectorAll('source').forEach(function (s) {
        s.src = (small && s.getAttribute('data-src-small')) || s.getAttribute('data-src');
      });
      v.load();
      var p = v.play && v.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) v.pause();
      else { var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }

  // "JOIN THE BETA LIST NOW" jumps to the form and focuses the email field.
  document.querySelectorAll('.js-focus-email').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var input = document.getElementById('email');
      var card = document.getElementById('join');
      if (!input || !card) return;
      e.preventDefault();
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setTimeout(function () { input.focus({ preventScroll: true }); }, reduce ? 0 : 450);
    });
  });
})();
