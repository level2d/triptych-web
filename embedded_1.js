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

var pointLight = new THREE.PointLight(0x5A5A5A, 1.2, 20);
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
// main particle material tinted to #D900FF
var spriteMaterial = new THREE.SpriteMaterial({
  map: baseTexture,
  color: 0xD900FF,
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending
});

var particleData = [];
for (var i = 0; i < particleCount; i++) {
// make particles slightly smaller and tighter in size variance
var particleSize = 0.015 + Math.random() * 0.025; // world units, smaller and varied
// clone material per-particle so we can tint/opacity/blending individually for glow
var mat = spriteMaterial.clone();
mat.transparent = true;
mat.opacity = 1.0;
mat.blending = THREE.NormalBlending;
var particle = new THREE.Sprite(mat);
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
  material: mat,
  baseScale: particleSize,
  baseOpacity: mat.opacity,
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
// interaction tuning: make cursor repulsion centered, tighter and snappier
var attractionStrength = 0.025; // weaker long-term attachment so particles don't lag behind
var returnStrength = 0.006; // faster return to home position when not influenced
// tightened influence so particles react directly at the cursor and don't disperse far
var influenceRadius = 1.8; // world units
var disperseRadius = 0.9; // radius inside which particles get an immediate impulse
var disperseStrength = 0.18; // reduced repulsion force for shorter dispersion
var disperseDuration = 0.9; // shorter, snappier dispersal

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
  // update mouse speed (world units)
  mouseSpeed = mouse.distanceTo(prevMouse);
  if (!mouseHasMoved) mouseHasMoved = true;
  pointLight.position.set(mouse.x, mouse.y, 5);
});

// ...existing code...

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
  // make mouseSpeed decay faster so releases respond quickly
  mouseSpeed *= 0.8;

  // compute approx world distance that corresponds to 100 screen pixels at current camera
  var px = 100; // pixels
  var worldPerPixelX = (camera.right - camera.left) / window.innerWidth;
  var worldGlowRadius = px * worldPerPixelX;

for (var i = 0; i < particleData.length; i++) {
var data = particleData[i];
var particle = data.particle;
var mat = data.material;
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

    // glow effect when within ~100px (worldGlowRadius)
    if (mat) {
      if (distance < worldGlowRadius) {
        // glow intensity (0..1) based on proximity
        var g = 1 - distance / worldGlowRadius;
        mat.blending = THREE.AdditiveBlending;
        mat.opacity = 0.35 * g + 0.65 * (1 - g); // slight brightening
        var s = data.baseScale * (1 + 0.6 * g);
        particle.scale.set(s, s, 1);
      } else {
        // restore
        mat.blending = THREE.NormalBlending;
        mat.opacity = data.baseOpacity;
        particle.scale.set(data.baseScale, data.baseScale, 1);
      }
    }

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
// Anti-magnetic repulsion: apply to ALL particles within influenceRadius
if (distance < influenceRadius) {
  // vector from mouse to particle
  var rx = particle.position.x - mouse.x;
  var ry = particle.position.y - mouse.y;
  var d = Math.max(distance, 0.0001);
  var falloff = 1 - (d / influenceRadius);
  // stronger near the cursor with a squared falloff for a snappy bounce
  var repulse = disperseStrength * Math.pow(falloff, 2);
  // immediate displacement (visible bounce)
  particle.position.x += (rx / d) * repulse * 0.9;
  particle.position.y += (ry / d) * repulse * 0.9;
  // velocity impulse so particle continues to move away
  velocity.x += (rx / d) * repulse * 0.9 + (Math.random() - 0.5) * 0.001;
  velocity.y += (ry / d) * repulse * 0.9 + (Math.random() - 0.5) * 0.001;
  // mark dispersing briefly so return logic still applies
  data.dispersing = true;
  data.disperseTime = time;
  data.disperseDirection.set(rx / d, ry / d, 0);
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
    window.addEventListener('resize', sizeToWindow);
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