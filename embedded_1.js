/* embedded_1.js */
(function () {
  'use strict';

  function start() {
    console.log('Embedded script loaded');

    // ----- container & canvas -----
    var container = document.getElementById('custom-embed-div');
    if (!container) {
      container = document.createElement('div');
      container.id = 'custom-embed-div';
      document.body.appendChild(container);
    }

    var canvas = document.getElementById('webglCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'webglCanvas';
      container.appendChild(canvas);
    }

    // ----- dependency check -----
    if (typeof THREE === 'undefined') {
      console.error('THREE.js is not loaded. Check your script source.');
      return;
    }

    // ----- three.js setup -----
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    function sizeToWindow() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  // Preserve aspect ratio so particles (sprites) don't get stretched
  var aspect = window.innerWidth / window.innerHeight;
  var halfHeight = 5;
  var halfWidth = halfHeight * aspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
    }

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
    camera.position.z = 5;

    // Lights
    var ambientLight = new THREE.AmbientLight(0x444444, 0.5);
    scene.add(ambientLight);

    var pointLight = new THREE.PointLight(0xDF009A, 1.2, 20);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // ----- particles (soft sprites for rounded dust look) -----
    var particleCount = 450;
    var particles = new THREE.Group();
    scene.add(particles);

    // create a soft circular texture (radial gradient)
    function createSoftCircleTexture(size, innerColor, outerColor) {
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var ctx = c.getContext('2d');
      var grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(1, outerColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      var tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      return tex;
    }

    var baseTexture = createSoftCircleTexture(128, 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0.02)');
    var spriteMaterial = new THREE.SpriteMaterial({
      map: baseTexture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    var particleData = [];
    for (var i = 0; i < particleCount; i++) {
      var particleSize = 0.03 + Math.random() * 0.06; // world units, small and varied
      var particle = new THREE.Sprite(spriteMaterial);
      particle.scale.set(particleSize, particleSize, 1);

      // initial positions will be spread across the camera frustum — populate roughly now,
      // and we'll call spreadParticles() after sizing to guarantee full-screen coverage.
      var initialPosition = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        0
      );
      particle.position.copy(initialPosition);
      particles.add(particle);

      var driftSpeed = 0.0002 + Math.random() * 0.0006;
      var oscillationSpeed = 0.00015 + Math.random() * 0.0004;
      var oscillationAmplitude = 0.001 + Math.random() * 0.003;

      particleData.push({
        particle: particle,
        initialPosition: initialPosition,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.0015,
          (Math.random() - 0.5) * 0.0015,
          0
        ),
        phase: Math.random() * Math.PI * 2,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        driftSpeed: driftSpeed,
        oscillationSpeed: oscillationSpeed,
        oscillationAmplitude: oscillationAmplitude,
        attached: false,
        attachPoint: new THREE.Vector3(0, 0, 0),
        capturePoint: new THREE.Vector3(0, 0, 0),
        captureTime: 0,
        timeOffset: Math.random() * 1000,
        releaseChance: 0.01 + Math.random() * 0.03,
        dispersing: false,
        disperseTime: 0,
        disperseDirection: new THREE.Vector3(0, 0, 0)
      });
    }

    // Spread particles across the visible frustum using the current camera bounds
    function spreadParticles() {
      // ensure camera projection is up-to-date
      var left = camera.left;
      var right = camera.right;
      var top = camera.top;
      var bottom = camera.bottom;

      for (var i = 0; i < particleData.length; i++) {
        var d = particleData[i];
        // spread across full width/height with slight padding
        var padX = (right - left) * 0.05;
        var padY = (top - bottom) * 0.05;
        var x = left + padX + Math.random() * (right - left - padX * 2);
        var y = bottom + padY + Math.random() * (top - bottom - padY * 2);
        d.initialPosition.set(x, y, 0);
        // place particle at or near its initial position, with a tiny random offset
        d.particle.position.set(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, 0);
      }
    }

    // ----- interaction -----
    var mouse = new THREE.Vector3(0, 0, 0);
    var prevMouse = new THREE.Vector3(0, 0, 0);
    var attractionStrength = 0.04;
    var returnStrength = 0.003;
    var influenceRadius = 3.0;
    var disperseRadius = 2.0;
    var disperseStrength = 0.1;
    var disperseDuration = 2.0;

    function getDetachDistance() {
      return (50 / window.innerWidth) * 10;
    }

    var mouseHasMoved = false;
    var mouseSpeed = 0;

    window.addEventListener('mousemove', function (event) {
      prevMouse.copy(mouse);
      var x = (event.clientX / window.innerWidth) * 2 - 1;
      var y = -(event.clientY / window.innerHeight) * 2 + 1;
      mouse.set(x * 5, y * 5, 0);
      mouseSpeed = mouse.distanceTo(prevMouse);
      if (!mouseHasMoved) mouseHasMoved = true;
      pointLight.position.set(mouse.x, mouse.y, 5);
    });

    // breeze
    var breezeTime = 0;
    var breezeDirection = new THREE.Vector3(
      (Math.random() - 0.5) * 0.0005,
      (Math.random() - 0.5) * 0.0005,
      0
    );

    // ----- animation loop -----
    function animate() {
      requestAnimationFrame(animate);

      breezeTime += 0.01;
      if (breezeTime > 5) {
        breezeTime = 0;
        breezeDirection.set(
          (Math.random() - 0.5) * 0.0005,
          (Math.random() - 0.5) * 0.0005,
          0
        );
      }

      var time = performance.now() * 0.001;
      var detachDistance = getDetachDistance();
      mouseSpeed *= 0.95;

      for (var i = 0; i < particleData.length; i++) {
        var data = particleData[i];
        var particle = data.particle;
        var initialPosition = data.initialPosition;
        var velocity = data.velocity;

        data.phaseX += data.oscillationSpeed;
        data.phaseY += data.oscillationSpeed * 0.7;

        var brownianX = Math.sin(time * 0.3 + data.timeOffset) * data.oscillationAmplitude;
        var brownianY = Math.cos(time * 0.4 + data.timeOffset) * data.oscillationAmplitude;
        var driftX = Math.sin(data.phaseX) * data.driftSpeed;
        var driftY = Math.cos(data.phaseY) * data.driftSpeed;
        var breezeEffect = Math.sin(time * 0.1 + data.timeOffset * 0.2) * 0.3 + 0.7;

        if (!data.dispersing && !data.attached) {
          particle.position.x += brownianX + driftX + (breezeDirection.x * breezeEffect) + velocity.x;
          particle.position.y += brownianY + driftY + (breezeDirection.y * breezeEffect) + velocity.y;
        }

        var distanceFromCenter = particle.position.length();
        if (distanceFromCenter > 4.5) {
          particle.position.x -= particle.position.x * 0.0005;
          particle.position.y -= particle.position.y * 0.0005;
        }

        if (mouseHasMoved) {
          var dx = mouse.x - particle.position.x;
          var dy = mouse.y - particle.position.y;
          var distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < disperseRadius && !data.dispersing && !data.attached) {
            data.dispersing = true;
            data.disperseTime = time;
            data.disperseDirection.set(-dx, -dy, 0).normalize();
          }

          if (data.dispersing) {
            var disperseElapsed = time - data.disperseTime;
            if (disperseElapsed > disperseDuration) {
              data.dispersing = false;
            } else {
              var strength = disperseStrength * (1 - disperseElapsed / disperseDuration);
              particle.position.x += data.disperseDirection.x * strength;
              particle.position.y += data.disperseDirection.y * strength;
            }
          } else {
            if (distance < influenceRadius && !data.attached && distance >= disperseRadius) {
              data.attached = true;
              data.attachPoint.copy(mouse);
              data.capturePoint.copy(particle.position);
              data.captureTime = time;
            }

            if (data.attached) {
              var cursorMovementDistance = Math.sqrt(
                Math.pow(mouse.x - data.capturePoint.x, 2) +
                Math.pow(mouse.y - data.capturePoint.y, 2)
              );
              var attachDuration = time - data.captureTime;
              var timeBasedReleaseChance = Math.min(0.01 * attachDuration, 0.1);
              var speedBasedReleaseChance = mouseSpeed * 2;
              var randomReleaseChance = data.releaseChance;
              var releaseChance = timeBasedReleaseChance + speedBasedReleaseChance + randomReleaseChance;

              if (cursorMovementDistance > detachDistance ||
                  Math.random() < releaseChance ||
                  distance < disperseRadius) {
                data.attached = false;
                if (distance < disperseRadius) {
                  data.dispersing = true;
                  data.disperseTime = time;
                  data.disperseDirection.set(-dx, -dy, 0).normalize();
                }
              } else {
                var timeAttenuatedStrength = attractionStrength * Math.max(0.2, 1 - (attachDuration * 0.1));
                var strength2 = timeAttenuatedStrength * (1 - distance / influenceRadius);
                particle.position.x += dx * strength2;
                particle.position.y += dy * strength2;
              }
            }
          }
        }

        if (!data.attached && (!data.dispersing || (time - data.disperseTime > disperseDuration * 0.7))) {
          var returnFactor = !data.dispersing
            ? returnStrength
            : returnStrength * ((time - data.disperseTime) / disperseDuration - 0.7) / 0.3;
          particle.position.x += (initialPosition.x - particle.position.x) * returnFactor;
          particle.position.y += (initialPosition.y - particle.position.y) * returnFactor;
        }
      }

      renderer.render(scene, camera);
    }

    // ----- start -----
    sizeToWindow();
    // After sizing, distribute particles across the entire frustum
    spreadParticles();
    animate();
    window.addEventListener('resize', function () {
      sizeToWindow();
      spreadParticles();
    });
  }

  // Run immediately if DOM is ready; otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
