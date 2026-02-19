/**
 * Custom Cursor with Smooth Trail
 * Purple circle cursor (#AF00F1) with a solid fading/tapering tail
 * Shrinks and changes color on link/button hover (contrast-aware)
 */

(function () {
  // Skip on touch-only devices
  if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

  var MAIN_SIZE = 20;
  var HOVER_SIZE = 15;
  var TRAIL_COLOR = '#AF00F1';
  var LIGHT_COLOR = '#FFFFFF';
  var DARK_COLOR = '#343434';
  var TRAIL_LENGTH = 30;
  var TRAIL_START_WIDTH = 10;

  var mouseX = -100;
  var mouseY = -100;
  var isHovering = false;
  var hoverColor = LIGHT_COLOR;
  var mouseVisible = true;

  // Store position history for the trail
  var history = [];
  for (var h = 0; h < TRAIL_LENGTH; h++) {
    history.push({ x: -100, y: -100 });
  }

  // Inject style to hide default cursor
  var style = document.createElement('style');
  style.textContent = '*, *::before, *::after { cursor: none !important; }';
  document.head.appendChild(style);

  // Create canvas for the trail
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // Create main cursor dot
  var mainDot = document.createElement('div');
  mainDot.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:99999;border-radius:50%;transform:translate(-50%,-50%);will-change:transform;'
    + 'width:' + MAIN_SIZE + 'px;height:' + MAIN_SIZE + 'px;'
    + 'background-color:' + TRAIL_COLOR + ';'
    + 'box-shadow:0 0 10px ' + TRAIL_COLOR + ',0 0 20px ' + TRAIL_COLOR + '60;'
    + 'transition:width 0.2s ease,height 0.2s ease,background-color 0.2s ease,box-shadow 0.2s ease,opacity 0.2s ease;';
  document.body.appendChild(mainDot);

  // Track mouse position
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener('mouseleave', function () {
    mouseVisible = false;
    mainDot.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function () {
    mouseVisible = true;
    mainDot.style.opacity = '1';
  });

  // --- Link hover detection ---

  function isClickable(el) {
    while (el && el !== document.documentElement) {
      if (!el.tagName) { el = el.parentElement; continue; }
      var tag = el.tagName.toUpperCase();
      if (tag === 'A' || tag === 'BUTTON') return true;
      if (tag === 'INPUT' && (el.type === 'submit' || el.type === 'button')) return true;
      if (tag === 'LABEL' && el.htmlFor) return true;
      var role = el.getAttribute && el.getAttribute('role');
      if (role === 'button' || role === 'link' || role === 'tab' || role === 'menuitem') return true;
      var cls = el.className || '';
      if (typeof cls === 'string' && (cls.indexOf('w-button') !== -1 || cls.indexOf('w-tab-link') !== -1 || cls.indexOf('w-nav-link') !== -1 || cls.indexOf('w-dropdown-toggle') !== -1)) return true;
      if (el.onclick || (el.getAttribute && el.getAttribute('data-href'))) return true;
      if (el.getAttribute && el.getAttribute('tabindex') === '0') return true;
      el = el.parentElement;
    }
    return false;
  }

  function parseRgba(str) {
    if (!str || str === 'transparent') return null;
    var m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) < 0.1) return null;
    return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  }

  function getBackgroundColor(el) {
    while (el && el !== document.documentElement) {
      var bg = window.getComputedStyle(el).backgroundColor;
      var parsed = parseRgba(bg);
      if (parsed) return parsed;
      el = el.parentElement;
    }
    var bodyBg = parseRgba(window.getComputedStyle(document.body).backgroundColor);
    if (bodyBg) return bodyBg;
    var htmlBg = parseRgba(window.getComputedStyle(document.documentElement).backgroundColor);
    if (htmlBg) return htmlBg;
    return [0, 0, 0];
  }

  function getLuminance(r, g, b) {
    var rs = r / 255, gs = g / 255, bs = b / 255;
    rs = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    gs = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    bs = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function getContrastColor(el) {
    var bg = getBackgroundColor(el);
    return getLuminance(bg[0], bg[1], bg[2]) > 0.4 ? DARK_COLOR : LIGHT_COLOR;
  }

  function applyHoverStyle(color) {
    hoverColor = color;
    mainDot.style.width = HOVER_SIZE + 'px';
    mainDot.style.height = HOVER_SIZE + 'px';
    mainDot.style.backgroundColor = color;
    mainDot.style.boxShadow = 'none';
  }

  function applyNormalStyle() {
    mainDot.style.width = MAIN_SIZE + 'px';
    mainDot.style.height = MAIN_SIZE + 'px';
    mainDot.style.backgroundColor = TRAIL_COLOR;
    mainDot.style.boxShadow = '0 0 10px ' + TRAIL_COLOR + ',0 0 20px ' + TRAIL_COLOR + '60';
  }

  function updateHoverState() {
    var el = document.elementFromPoint(mouseX, mouseY);
    if (!el) return;
    var hovering = isClickable(el);
    if (hovering && !isHovering) {
      isHovering = true;
      applyHoverStyle(getContrastColor(el));
    } else if (hovering && isHovering) {
      var newColor = getContrastColor(el);
      if (newColor !== hoverColor) {
        hoverColor = newColor;
        mainDot.style.backgroundColor = newColor;
      }
    } else if (!hovering && isHovering) {
      isHovering = false;
      applyNormalStyle();
    }
  }

  // Shrink on click
  document.addEventListener('mousedown', function () {
    var size = isHovering ? HOVER_SIZE * 0.7 : MAIN_SIZE * 0.7;
    mainDot.style.width = size + 'px';
    mainDot.style.height = size + 'px';
  });
  document.addEventListener('mouseup', function () {
    var size = isHovering ? HOVER_SIZE : MAIN_SIZE;
    mainDot.style.width = size + 'px';
    mainDot.style.height = size + 'px';
  });

  // --- Draw smooth trail ---

  // Parse hex to RGB for canvas
  var trailRgb = { r: 175, g: 0, b: 241 }; // #AF00F1

  function drawTrail() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!mouseVisible || isHovering) return;

    // Need at least 2 points to draw
    if (history.length < 2) return;

    // Don't draw if cursor is off-screen
    if (history[0].x < -50) return;

    for (var i = 1; i < history.length; i++) {
      var p0 = history[i - 1];
      var p1 = history[i];

      // Skip if points are off-screen
      if (p0.x < -50 || p1.x < -50) continue;

      // Progress along the tail (0 = near cursor, 1 = end of tail)
      var progress = i / history.length;

      // Width tapers from TRAIL_START_WIDTH to 1
      var width = TRAIL_START_WIDTH * (1 - progress);
      if (width < 0.5) continue;

      // Opacity fades from 0.6 to 0
      var alpha = 0.6 * (1 - progress);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = 'rgba(' + trailRgb.r + ',' + trailRgb.g + ',' + trailRgb.b + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  // --- Animation loop ---

  var hoverCheckCounter = 0;
  function animate() {
    // Shift history and add current position at the front
    for (var i = history.length - 1; i > 0; i--) {
      history[i].x = history[i - 1].x;
      history[i].y = history[i - 1].y;
    }
    history[0].x = mouseX;
    history[0].y = mouseY;

    // Position main dot
    mainDot.style.left = mouseX + 'px';
    mainDot.style.top = mouseY + 'px';

    // Check hover every 4 frames
    hoverCheckCounter++;
    if (hoverCheckCounter % 4 === 0) {
      updateHoverState();
    }

    drawTrail();
    requestAnimationFrame(animate);
  }

  animate();
})();
