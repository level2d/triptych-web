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
  var TRAIL_SPEED = 0.15;

  var mouseX = -100;
  var mouseY = -100;

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

  // Shrink cursor on click
  mainDot.style.transition = 'width 0.15s, height 0.15s';
  document.addEventListener('mousedown', function () {
    mainDot.style.width = (MAIN_SIZE * 0.7) + 'px';
    mainDot.style.height = (MAIN_SIZE * 0.7) + 'px';
  });
  document.addEventListener('mouseup', function () {
    mainDot.style.width = MAIN_SIZE + 'px';
    mainDot.style.height = MAIN_SIZE + 'px';
  });

  // Animation loop
  function animate() {
    mainDot.style.left = mouseX + 'px';
    mainDot.style.top = mouseY + 'px';

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
