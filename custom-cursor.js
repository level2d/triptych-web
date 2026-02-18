/**
 * Custom Cursor with Trail Effect
 * Purple circle cursor (#AF00F1) with a subtle trailing effect
 * Shrinks and changes color on link/button hover (contrast-aware)
 */

(function () {
  // Skip on touch-only devices
  if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

  var MAIN_SIZE = 20;
  var HOVER_SIZE = 15;
  var TRAIL_COUNT = 5;
  var TRAIL_COLOR = '#AF00F1';
  var LIGHT_COLOR = '#FFFFFF';
  var DARK_COLOR = '#343434';
  var TRAIL_SPEED = 0.15;

  var mouseX = -100;
  var mouseY = -100;
  var isHovering = false;
  var hoverColor = LIGHT_COLOR;

  // Inject styles to hide default cursor
  var style = document.createElement('style');
  style.textContent =
    '*, *::before, *::after { cursor: none !important; }' +
    '.cc-dot { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 99999; border-radius: 50%; transform: translate(-50%, -50%); will-change: transform, left, top; }';
  document.head.appendChild(style);

  // Create main cursor dot
  var mainDot = document.createElement('div');
  mainDot.className = 'cc-dot';
  mainDot.style.width = MAIN_SIZE + 'px';
  mainDot.style.height = MAIN_SIZE + 'px';
  mainDot.style.backgroundColor = TRAIL_COLOR;
  mainDot.style.boxShadow = '0 0 10px ' + TRAIL_COLOR + ', 0 0 20px ' + TRAIL_COLOR + '60';
  mainDot.style.transition = 'width 0.2s ease, height 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease';
  document.body.appendChild(mainDot);

  // Create trail dots
  var trails = [];
  for (var i = 0; i < TRAIL_COUNT; i++) {
    var dot = document.createElement('div');
    dot.className = 'cc-dot';
    var scale = 1 - ((i + 1) / (TRAIL_COUNT + 1));
    var size = Math.round(MAIN_SIZE * scale);
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.backgroundColor = TRAIL_COLOR;
    dot.style.opacity = (0.4 * scale).toFixed(2);
    dot.style.transition = 'opacity 0.2s ease, background-color 0.2s ease';
    document.body.appendChild(dot);
    trails.push({ el: dot, x: -100, y: -100, baseOpacity: 0.4 * scale });
  }

  // Track mouse position
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Hide cursor when it leaves the window
  document.addEventListener('mouseleave', function () {
    mainDot.style.opacity = '0';
    for (var i = 0; i < trails.length; i++) {
      trails[i].el.style.opacity = '0';
    }
  });

  document.addEventListener('mouseenter', function () {
    mainDot.style.opacity = '1';
    if (!isHovering) {
      for (var i = 0; i < trails.length; i++) {
        trails[i].el.style.opacity = trails[i].baseOpacity.toFixed(2);
      }
    }
  });

  // Check if element or any ancestor is a link/button
  function isClickable(el) {
    while (el && el !== document.documentElement) {
      if (!el.tagName) { el = el.parentElement; continue; }
      var tag = el.tagName.toUpperCase();

      // Standard clickable elements
      if (tag === 'A' || tag === 'BUTTON') return true;
      if (tag === 'INPUT' && (el.type === 'submit' || el.type === 'button')) return true;
      if (tag === 'LABEL' && el.htmlFor) return true;

      // ARIA roles
      var role = el.getAttribute && el.getAttribute('role');
      if (role === 'button' || role === 'link' || role === 'tab' || role === 'menuitem') return true;

      // Webflow classes
      var cls = el.className || '';
      if (typeof cls === 'string' && (cls.indexOf('w-button') !== -1 || cls.indexOf('w-tab-link') !== -1 || cls.indexOf('w-nav-link') !== -1 || cls.indexOf('w-dropdown-toggle') !== -1)) return true;

      // Data attributes and onclick
      if (el.onclick || (el.getAttribute && el.getAttribute('data-href'))) return true;

      // Tabindex makes it interactive
      if (el.getAttribute && el.getAttribute('tabindex') === '0') return true;

      el = el.parentElement;
    }
    return false;
  }

  // Parse rgb/rgba string to [r, g, b, a]
  function parseRgba(str) {
    if (!str || str === 'transparent') return null;
    var m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    var a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (a < 0.1) return null; // treat near-transparent as transparent
    return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  }

  // Get effective background by walking up the DOM
  function getBackgroundColor(el) {
    while (el && el !== document.documentElement) {
      var bg = window.getComputedStyle(el).backgroundColor;
      var parsed = parseRgba(bg);
      if (parsed) return parsed;
      el = el.parentElement;
    }
    // Check body and html as fallback
    var bodyBg = parseRgba(window.getComputedStyle(document.body).backgroundColor);
    if (bodyBg) return bodyBg;
    var htmlBg = parseRgba(window.getComputedStyle(document.documentElement).backgroundColor);
    if (htmlBg) return htmlBg;
    // Default: assume dark background
    return [0, 0, 0];
  }

  // Calculate relative luminance (WCAG formula)
  function getLuminance(r, g, b) {
    var rs = r / 255, gs = g / 255, bs = b / 255;
    rs = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    gs = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    bs = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // Pick cursor hover color based on background contrast
  function getContrastColor(el) {
    var bg = getBackgroundColor(el);
    var luminance = getLuminance(bg[0], bg[1], bg[2]);
    // Light background → dark cursor, dark background → white cursor
    return luminance > 0.4 ? DARK_COLOR : LIGHT_COLOR;
  }

  // Apply hover state styling
  function applyHoverStyle(color) {
    hoverColor = color;
    mainDot.style.width = HOVER_SIZE + 'px';
    mainDot.style.height = HOVER_SIZE + 'px';
    mainDot.style.backgroundColor = color;
    mainDot.style.boxShadow = 'none';
    // Fade out trails on hover
    for (var i = 0; i < trails.length; i++) {
      trails[i].el.style.opacity = '0';
    }
  }

  // Restore normal state styling
  function applyNormalStyle() {
    mainDot.style.width = MAIN_SIZE + 'px';
    mainDot.style.height = MAIN_SIZE + 'px';
    mainDot.style.backgroundColor = TRAIL_COLOR;
    mainDot.style.boxShadow = '0 0 10px ' + TRAIL_COLOR + ', 0 0 20px ' + TRAIL_COLOR + '60';
    // Restore trails
    for (var i = 0; i < trails.length; i++) {
      trails[i].el.style.opacity = trails[i].baseOpacity.toFixed(2);
    }
  }

  // Update hover state
  function updateHoverState() {
    var el = document.elementFromPoint(mouseX, mouseY);
    if (!el) return;

    var hovering = isClickable(el);

    if (hovering && !isHovering) {
      isHovering = true;
      applyHoverStyle(getContrastColor(el));
    } else if (hovering && isHovering) {
      // Still hovering — update color in case we moved to a different bg
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

  // Shrink cursor on click
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

  // Animation loop
  var hoverCheckCounter = 0;
  function animate() {
    mainDot.style.left = mouseX + 'px';
    mainDot.style.top = mouseY + 'px';

    // Check hover every 4 frames (~15 times/sec)
    hoverCheckCounter++;
    if (hoverCheckCounter % 4 === 0) {
      updateHoverState();
    }

    var leaderX = mouseX;
    var leaderY = mouseY;

    for (var i = 0; i < trails.length; i++) {
      var t = trails[i];
      var speed = TRAIL_SPEED * (1 - i * 0.02);
      t.x += (leaderX - t.x) * speed;
      t.y += (leaderY - t.y) * speed;
      t.el.style.left = t.x + 'px';
      t.el.style.top = t.y + 'px';
      leaderX = t.x;
      leaderY = t.y;
    }

    requestAnimationFrame(animate);
  }

  animate();
})();
