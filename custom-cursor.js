/**
 * Custom Cursor with Trail Effect
 * Purple circle cursor (#AF00F1) with a subtle trailing effect
 * Multiply blend mode on link/button hover
 */

(function () {
  // Skip on touch-only devices
  if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

  var MAIN_SIZE = 20;
  var HOVER_SIZE = 40;
  var TRAIL_COUNT = 5;
  var TRAIL_COLOR = '#AF00F1';
  var TRAIL_SPEED = 0.15;

  var mouseX = -100;
  var mouseY = -100;
  var isHovering = false;

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
  mainDot.style.transition = 'width 0.2s, height 0.2s, opacity 0.2s, mix-blend-mode 0.2s';
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
    dot.style.transition = 'opacity 0.2s';
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
    for (var i = 0; i < trails.length; i++) {
      trails[i].el.style.opacity = trails[i].baseOpacity.toFixed(2);
    }
  });

  // Check if element or any parent is a link/button
  function isClickable(el) {
    while (el && el !== document.documentElement) {
      var tag = el.tagName;
      if (tag === 'A' || tag === 'BUTTON') return true;
      var role = el.getAttribute('role');
      if (role === 'button' || role === 'link') return true;
      if (el.onclick || el.getAttribute('data-href')) return true;
      var cs = window.getComputedStyle(el).cursor;
      if (cs === 'pointer') return true;
      el = el.parentElement;
    }
    return false;
  }

  // Update hover state
  function updateHoverState() {
    var el = document.elementFromPoint(mouseX, mouseY);
    var hovering = el ? isClickable(el) : false;

    if (hovering !== isHovering) {
      isHovering = hovering;
      if (hovering) {
        mainDot.style.width = HOVER_SIZE + 'px';
        mainDot.style.height = HOVER_SIZE + 'px';
        mainDot.style.mixBlendMode = 'multiply';
        mainDot.style.opacity = '0.7';
        mainDot.style.boxShadow = 'none';
        // Fade out trails on hover
        for (var i = 0; i < trails.length; i++) {
          trails[i].el.style.opacity = '0';
        }
      } else {
        mainDot.style.width = MAIN_SIZE + 'px';
        mainDot.style.height = MAIN_SIZE + 'px';
        mainDot.style.mixBlendMode = 'normal';
        mainDot.style.opacity = '1';
        mainDot.style.boxShadow = '0 0 10px ' + TRAIL_COLOR + ', 0 0 20px ' + TRAIL_COLOR + '60';
        // Restore trails
        for (var j = 0; j < trails.length; j++) {
          trails[j].el.style.opacity = trails[j].baseOpacity.toFixed(2);
        }
      }
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

    // Check hover every 6 frames (~10 times/sec) to avoid perf hit
    hoverCheckCounter++;
    if (hoverCheckCounter % 6 === 0) {
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
