/**
 * Parallax Scrolling Effect
 * Adds depth-based parallax movement to elements as the user scrolls.
 *
 * Usage: Add data attributes to any Webflow element:
 *   data-parallax="0.3"      → Scroll speed multiplier (0 = fixed, 1 = normal scroll)
 *                               Values < 1 scroll slower (background feel)
 *                               Values > 1 scroll faster (foreground feel)
 *                               Negative values scroll opposite direction
 *   data-parallax-dir="x"    → Optional: "y" (default), "x", or "both"
 *   data-parallax-scale="1.1" → Optional: Scale up/down as element enters viewport
 *   data-parallax-opacity     → Optional: Fade in as element enters viewport
 */

(function () {
  var elements = [];

  function init() {
    var nodes = document.querySelectorAll('[data-parallax]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.3;
      var dir = el.getAttribute('data-parallax-dir') || 'y';
      var scale = el.getAttribute('data-parallax-scale');
      var fadeIn = el.hasAttribute('data-parallax-opacity');

      elements.push({
        el: el,
        speed: speed,
        dir: dir,
        scale: scale ? parseFloat(scale) : null,
        fadeIn: fadeIn
      });

      // Ensure smooth rendering
      el.style.willChange = 'transform';
    }
  }

  function getViewportProgress(el) {
    var rect = el.getBoundingClientRect();
    var winH = window.innerHeight;
    // 0 = element just entering bottom, 1 = element just leaving top
    return 1 - (rect.top + rect.height) / (winH + rect.height);
  }

  function update() {
    var scrollY = window.pageYOffset;

    for (var i = 0; i < elements.length; i++) {
      var item = elements[i];
      var el = item.el;
      var rect = el.getBoundingClientRect();
      var winH = window.innerHeight;

      // Only animate elements near the viewport (with generous buffer)
      if (rect.top > winH + 200 || rect.bottom < -200) continue;

      // Calculate offset from center of viewport
      var centerOffset = rect.top + rect.height / 2 - winH / 2;
      var shift = centerOffset * item.speed * -1;

      var tx = 0, ty = 0;
      if (item.dir === 'y' || item.dir === 'both') ty = shift;
      if (item.dir === 'x' || item.dir === 'both') tx = shift;

      var transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';

      // Optional scale
      if (item.scale !== null) {
        var progress = getViewportProgress(el);
        var clampedProgress = Math.max(0, Math.min(1, progress));
        // Scale interpolates from 1 to target as element crosses viewport
        var s = 1 + (item.scale - 1) * clampedProgress;
        transform += ' scale(' + s.toFixed(3) + ')';
      }

      el.style.transform = transform;

      // Optional fade in
      if (item.fadeIn) {
        var vp = getViewportProgress(el);
        // Fade in over the first 30% of viewport travel
        var opacity = Math.max(0, Math.min(1, vp / 0.3));
        el.style.opacity = opacity.toFixed(3);
      }
    }

    requestAnimationFrame(update);
  }

  function start() {
    init();
    if (elements.length > 0) {
      update();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
