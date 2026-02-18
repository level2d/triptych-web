/**
 * Custom Cursor with Trail Effect
 * Purple circle cursor (#AF00F1) with a subtle trailing effect
 */

(function () {
  // Skip on touch-only devices
  if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

  var MAIN_SIZE = 20;
  var TRAIL_COUNT = 5;
  var TRAIL_COLOR = '#AF00F1';
  var ALT_COLOR = '#FFFFFF';
  var TRAIL_SPEED = 0.15;

  // RGB of #AF00F1 for color distance comparison
  var TARGET_R = 175, TARGET_G = 0, TARGET_B = 241;
  var COLOR_THRESHOLD = 80; // How close a color must be to trigger the switch

  var mouseX = -100;
  var mouseY = -100;
  var currentColor = TRAIL_COLOR;

  // Inject styles to hide default cursor
  var style = document.createElement('style');
  style.textContent =
    '*, *::before, *::after { cursor: none !important; }' +
    '.cc-dot { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 99999; border-radius: 50%; transform: translate(-50%, -50%); }';
  document.head.appendChild(style);

  // Create main cursor dot
  var mainDot = document.createElement('div');
  mainDot.className = 'cc-dot';
  mainDot.style.width = MAIN_SIZE + 'px';
  mainDot.style.height = MAIN_SIZE + 'px';
  mainDot.style.backgroundColor = TRAIL_COLOR;
  mainDot.style.boxShadow = '0 0 10px ' + TRAIL_COLOR + ', 0 0 20px ' + TRAIL_COLOR + '60';
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
    document.body.appendChild(dot);
    trails.push({ el: dot, x: -100, y: -100 });
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
    for (var i = 0; i < trails.length; i++) {
      var scale = 1 - ((i + 1) / (TRAIL_COUNT + 1));
      trails[i].el.style.opacity = (0.4 * scale).toFixed(2);
    }
  });

  // Parse an rgb/rgba string into [r, g, b]
  function parseColor(str) {
    if (!str) return null;
    var match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
  }

  // Check if a color is close to our purple
  function isSimilarColor(r, g, b) {
    var dr = r - TARGET_R;
    var dg = g - TARGET_G;
    var db = b - TARGET_B;
    return Math.sqrt(dr * dr + dg * dg + db * db) < COLOR_THRESHOLD;
  }

  // Walk up the DOM to find the effective background color
  function getEffectiveBg(el) {
    while (el && el !== document.documentElement) {
      var bg = window.getComputedStyle(el).backgroundColor;
      var parsed = parseColor(bg);
      if (parsed && !(parsed[0] === 0 && parsed[1] === 0 && parsed[2] === 0 &&
          bg.indexOf('rgba') === 0 && bg.indexOf(', 0)') !== -1)) {
        return parsed;
      }
      el = el.parentElement;
    }
    return null;
  }

  // Check element under cursor and swap color if needed
  function updateCursorColor() {
    var el = document.elementFromPoint(mouseX, mouseY);
    if (!el) return;

    var shouldBeWhite = false;

    // Check background color (walk up tree)
    var bg = getEffectiveBg(el);
    if (bg && isSimilarColor(bg[0], bg[1], bg[2])) {
      shouldBeWhite = true;
    }

    // Check text color of the element itself
    var textColor = parseColor(window.getComputedStyle(el).color);
    if (textColor && isSimilarColor(textColor[0], textColor[1], textColor[2])) {
      shouldBeWhite = true;
    }

    var newColor = shouldBeWhite ? ALT_COLOR : TRAIL_COLOR;
    if (newColor !== currentColor) {
      currentColor = newColor;
      var shadow = shouldBeWhite
        ? '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4)'
        : '0 0 10px ' + TRAIL_COLOR + ', 0 0 20px ' + TRAIL_COLOR + '60';
      mainDot.style.backgroundColor = newColor;
      mainDot.style.boxShadow = shadow;
      for (var i = 0; i < trails.length; i++) {
        trails[i].el.style.backgroundColor = newColor;
      }
    }
  }

  // Shrink cursor on click
  mainDot.style.transition = 'width 0.15s, height 0.15s, background-color 0.2s, box-shadow 0.2s';
  document.addEventListener('mousedown', function () {
    mainDot.style.width = (MAIN_SIZE * 0.7) + 'px';
    mainDot.style.height = (MAIN_SIZE * 0.7) + 'px';
  });
  document.addEventListener('mouseup', function () {
    mainDot.style.width = MAIN_SIZE + 'px';
    mainDot.style.height = MAIN_SIZE + 'px';
  });

  // Animation loop
  var colorCheckCounter = 0;
  function animate() {
    mainDot.style.left = mouseX + 'px';
    mainDot.style.top = mouseY + 'px';

    // Check color every 6 frames (~10 times/sec) to avoid perf hit
    colorCheckCounter++;
    if (colorCheckCounter % 6 === 0) {
      updateCursorColor();
    }

    var leaderX = mouseX;
    var leaderY = mouseY;

    for (var i = 0; i < trails.length; i++) {
      var t = trails[i];
      // Each trail dot follows the one ahead of it with easing
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
