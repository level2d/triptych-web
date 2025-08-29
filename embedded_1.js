document.addEventListener('DOMContentLoaded', function() {
    console.log('Embedded script loaded');

    // Create a new div and insert it before the closing </body> tag
    var newDiv = document.createElement('div');
    newDiv.id = 'custom-embed-div'; // Optional: set an ID

    // Create canvas for THREE.js
    var canvas = document.createElement('canvas');
    canvas.id = 'webglCanvas';

    newDiv.appendChild(canvas);

    // Insert as the first child of <body>
    document.body.appendChild(newDiv);

    // Particle system code
    if (typeof THREE === 'undefined') {
        console.error("THREE.js is not loaded. Check your script source.");
        return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
    camera.position.z = 5;

    // Add soft ambient and point lighting for subtle glow
    const ambientLight = new THREE.AmbientLight(0x444444, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x5A5A5A, 1.2, 20);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Particle system
    const particleCount = 550;
    const particles = new THREE.Group();
    scene.add(particles);

    const particleData = [];

    // Create particles with varied sizes for more dust-like appearance
    for (let i = 0; i < particleCount; i++) {
        const particleSize = 0.010 + Math.random() * 0.01; // Reverted to smaller size
        const particleGeometry = new THREE.SphereGeometry(particleSize, 6, 6);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0x5A5A5A,
            emissive: 0x5A5A5A,
            emissiveIntensity: 0.5, // Softer glow
            shininess: 20
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        const initialPosition = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            0
        );
        particle.position.copy(initialPosition);
        particles.add(particle);

        const driftSpeed = 0.0002 + Math.random() * 0.0005;
        const oscillationSpeed = 0.00015 + Math.random() * 0.0003;
        const oscillationAmplitude = 0.001 + Math.random() * 0.002;

        particleData.push({
            particle,
            initialPosition,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.001,
                (Math.random() - 0.5) * 0.001,
                0
            ),
            phase: Math.random() * Math.PI * 2,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            driftSpeed,
            oscillationSpeed,
            oscillationAmplitude,
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

    const mouse = new THREE.Vector3(0, 0, 0);
    const prevMouse = new THREE.Vector3(0, 0, 0);
    const attractionStrength = 0.04;
    const returnStrength = 0.003;
    const influenceRadius = 3.0;
    const disperseRadius = 2.0;
    const disperseStrength = 0.1;
    const disperseDuration = 2.0;

    const getDetachDistance = () => {
        return (50 / window.innerWidth) * 10;
    };

    let mouseHasMoved = false;
    let mouseSpeed = 0;

    window.addEventListener("mousemove", (event) => {
        prevMouse.copy(mouse);
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        mouse.set(x * 5, y * 5, 0);
        mouseSpeed = mouse.distanceTo(prevMouse);
        if (!mouseHasMoved) {
            mouseHasMoved = true;
        }
        pointLight.position.set(mouse.x, mouse.y, 5);
    });

    let breezeTime = 0;
    let breezeDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 0.0005,
        (Math.random() - 0.5) * 0.0005,
        0
    );

    function animate() {
        requestAnimationFrame(animate);
        breezeTime += 0.01;
        if (breezeTime > 5) {
            breezeTime = 0;
            breezeDirection = new THREE.Vector3(
                (Math.random() - 0.5) * 0.0005,
                (Math.random() - 0.5) * 0.0005,
                0
            );
        }
        const time = performance.now() * 0.001;
        const detachDistance = getDetachDistance();
        mouseSpeed *= 0.95;

        particleData.forEach(data => {
            const { particle, initialPosition, velocity, attachPoint, capturePoint, timeOffset } = data;
            data.phaseX += data.oscillationSpeed;
            data.phaseY += data.oscillationSpeed * 0.7;
            const brownianX = Math.sin(time * 0.3 + timeOffset) * data.oscillationAmplitude;
            const brownianY = Math.cos(time * 0.4 + timeOffset) * data.oscillationAmplitude;
            const driftX = Math.sin(data.phaseX) * data.driftSpeed;
            const driftY = Math.cos(data.phaseY) * data.driftSpeed;
            const breezeEffect = Math.sin(time * 0.1 + timeOffset * 0.2) * 0.3 + 0.7;
            if (!data.dispersing && !data.attached) {
                particle.position.x += brownianX + driftX + (breezeDirection.x * breezeEffect) + velocity.x;
                particle.position.y += brownianY + driftY + (breezeDirection.y * breezeEffect) + velocity.y;
            }
            const distanceFromCenter = particle.position.length();
            if (distanceFromCenter > 4.5) {
                particle.position.x -= particle.position.x * 0.0005;
                particle.position.y -= particle.position.y * 0.0005;
            }
            if (mouseHasMoved) {
                const dx = mouse.x - particle.position.x;
                const dy = mouse.y - particle.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < disperseRadius && !data.dispersing && !data.attached) {
                    data.dispersing = true;
                    data.disperseTime = time;
                    data.disperseDirection.set(-dx, -dy, 0).normalize();
                }
                if (data.dispersing) {
                    const disperseElapsed = time - data.disperseTime;
                    if (disperseElapsed > disperseDuration) {
                        data.dispersing = false;
                    } else {
                        const strength = disperseStrength * (1 - disperseElapsed / disperseDuration);
                        particle.position.x += data.disperseDirection.x * strength;
                        particle.position.y += data.disperseDirection.y * strength;
                    }
                } else {
                    if (distance < influenceRadius && !data.attached && distance >= disperseRadius) {
                        data.attached = true;
                        attachPoint.copy(mouse);
                        capturePoint.copy(particle.position);
                        data.captureTime = time;
                    }
                    if (data.attached) {
                        const cursorMovementDistance = Math.sqrt(
                            Math.pow(mouse.x - capturePoint.x, 2) +
                            Math.pow(mouse.y - capturePoint.y, 2)
                        );
                        const attachDuration = time - data.captureTime;
                        const timeBasedReleaseChance = Math.min(0.01 * attachDuration, 0.1);
                        const speedBasedReleaseChance = mouseSpeed * 2;
                        const randomReleaseChance = data.releaseChance;
                        const releaseChance = timeBasedReleaseChance + speedBasedReleaseChance + randomReleaseChance;
                        if (
                            cursorMovementDistance > detachDistance ||
                            Math.random() < releaseChance ||
                            distance < disperseRadius
                        ) {
                            data.attached = false;
                            if (distance < disperseRadius) {
                                data.dispersing = true;
                                data.disperseTime = time;
                                data.disperseDirection.set(-dx, -dy, 0).normalize();
                            }
                        } else {
                            const timeAttenuatedStrength = attractionStrength * Math.max(0.2, 1 - (attachDuration * 0.1));
                            const strength = timeAttenuatedStrength * (1 - distance / influenceRadius);
                            particle.position.x += dx * strength;
                            particle.position.y += dy * strength;
                        }
                    }
                }
            }
            if (!data.attached && (!data.dispersing || (time - data.disperseTime > disperseDuration * 0.7))) {
                const returnFactor = !data.dispersing ? returnStrength :
                    returnStrength * ((time - data.disperseTime) / disperseDuration - 0.7) / 0.3;
                particle.position.x += (initialPosition.x - particle.position.x) * returnFactor;
                particle.position.y += (initialPosition.y - particle.position.y) * returnFactor;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener("resize", () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.left = -5;
        camera.right = 5;
        camera.top = 5;
        camera.bottom = -5;
        camera.updateProjectionMatrix();
    });
});
