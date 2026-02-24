/**
 * Custom Cursor with Smooth Bezier Trail
 * Purple circle cursor (#AF00F1) with a smooth bezier-curved tail (#E8E2D3)
 * Shrinks and changes color on link/button hover (contrast-aware)
 */

(function () {
  if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

  var MAIN_SIZE = 20;
  var HOVER_SIZE = 15;
  var CURSOR_COLOR = '#AF00F1';
  var LIGHT_COLOR = '#FFFFFF';
  var DARK_COLOR = '#343434';
  var TRAIL_LENGTH = 30;
  var TRAIL_START_WIDTH = 18;
  var TRAIL_MAX_DIST = 500;
  var SMOOTHING = 0.45;

  // Trail gradient: #AF00F1 (start) → #E8E2D3 (end)
  var TRAIL_START_R = 175, TRAIL_START_G = 0, TRAIL_START_B = 241;
  var TRAIL_END_R = 232, TRAIL_END_G = 226, TRAIL_END_B = 211;

  var mouseX = -100;
  var mouseY = -100;
  var isHovering = false;
  var hoverColor = LIGHT_COLOR;
  var mouseVisible = true;

  // Smoothed trail points — each point eases toward the one ahead of it
  var points = [];
  for (var h = 0; h < TRAIL_LENGTH; h++) {
    points.push({ x: -100, y: -100 });
  }

  // Inject style to hide default cursor
  var style = document.createElement('style');
  style.textContent = '*, *::before, *::after { cursor: none !important; }';
  document.head.appendChild(style);

  // Create canvas for the trail
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Create main cursor dot
  var mainDot = document.createElement('div');
  mainDot.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:99999;border-radius:50%;transform:translate(-50%,-50%);will-change:transform;'
    + 'width:' + MAIN_SIZE + 'px;height:' + MAIN_SIZE + 'px;'
    + 'background-color:' + CURSOR_COLOR + ';'
    + 'box-shadow:0 0 10px ' + CURSOR_COLOR + ',0 0 20px ' + CURSOR_COLOR + '60;'
    + 'transition:width 0.2s ease,height 0.2s ease,background-color 0.2s ease,box-shadow 0.2s ease,opacity 0.2s ease;';
  document.body.appendChild(mainDot);

  // Track mouse
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
    mainDot.style.backgroundColor = CURSOR_COLOR;
    mainDot.style.boxShadow = '0 0 10px ' + CURSOR_COLOR + ',0 0 20px ' + CURSOR_COLOR + '60';
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

  // --- Smooth fading trail ---

  function updatePoints() {
    points[0].x = mouseX;
    points[0].y = mouseY;

    for (var i = 1; i < points.length; i++) {
      var ease = SMOOTHING;
      points[i].x += (points[i - 1].x - points[i].x) * ease;
      points[i].y += (points[i - 1].y - points[i].y) * ease;
    }
  }

  function drawTrail() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!mouseVisible || isHovering) return;
    if (points[0].x < -50) return;

    // Count valid points and measure total trail distance
    var count = 0;
    var totalDist = 0;
    for (var c = 0; c < points.length; c++) {
      if (points[c].x < -50) break;
      if (c > 0) {
        var dx = points[c].x - points[c - 1].x;
        var dy = points[c].y - points[c - 1].y;
        totalDist += Math.sqrt(dx * dx + dy * dy);
      }
      count++;
      if (totalDist >= TRAIL_MAX_DIST) break;
    }
    if (count < 2) return;

    // Draw from tail to head so brighter segments paint on top
    for (var i = count - 1; i >= 1; i--) {
      var progress = i / count;
      var taper = 1 - progress;
      var width = TRAIL_START_WIDTH * taper;
      if (width < 0.3) continue;

      var alpha = 0.25 * taper;

      // Interpolate color from #AF00F1 (near cursor) to #E8E2D3 (tail)
      var r = Math.round(TRAIL_START_R + (TRAIL_END_R - TRAIL_START_R) * progress);
      var g = Math.round(TRAIL_START_G + (TRAIL_END_G - TRAIL_START_G) * progress);
      var b = Math.round(TRAIL_START_B + (TRAIL_END_B - TRAIL_START_B) * progress);

      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = width;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }
  }

  // --- Animation loop ---

  var hoverCheckCounter = 0;
  function animate() {
    updatePoints();

    mainDot.style.left = mouseX + 'px';
    mainDot.style.top = mouseY + 'px';

    hoverCheckCounter++;
    if (hoverCheckCounter % 4 === 0) {
      updateHoverState();
    }

    drawTrail();
    requestAnimationFrame(animate);
  }

  animate();
})();
