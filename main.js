import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';

// Constants and configurations
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 640;

const BACKGROUND_CONFIG = {
  'bg-alice-1.jpg': {
    id: 'alice1',
    name: 'Alice 1',
    path: '/bg-alice-1.jpg'
  },
  'bg-alice-2.jpg': {
    id: 'alice2',
    name: 'Alice 2',
    path: '/bg-alice-2.jpg'
  },
  'bg-alice-3.jpg': {
    id: 'alice3',
    name: 'Alice 3',
    path: '/bg-alice-3.jpg'
  },
  'bg-alice-4.jpg': {
    id: 'alice4',
    name: 'Alice 4',
    path: '/bg-alice-4.jpg'
  },
  'bg-alice-5.jpg': {
    id: 'alice5',
    name: 'Alice 5',
    path: '/bg-alice-5.jpg'
  },
  'bg-cinderella-1.jpg': {
    id: 'cinderella1',
    name: 'Cinderella 1',
    path: '/bg-cinderella-1.jpg'
  },
  'bg-cinderella-2.jpg': {
    id: 'cinderella2',
    name: 'Cinderella 2',
    path: '/bg-cinderella-2.jpg'
  },
  'bg-cinderella-3.jpg': {
    id: 'cinderella3',
    name: 'Cinderella 3',
    path: '/bg-cinderella-3.jpg'
  },
  'bg-peter-pan-1.jpg': {
    id: 'peterpan1',
    name: 'Pan 1',
    path: '/bg-peter-pan-1.jpg'
  },
  'bg-peter-pan-2.jpg': {
    id: 'peterpan2',
    name: 'Pan 2',
    path: '/bg-peter-pan-2.jpg'
  },
  'bg-peter-pan-3.jpg': {
    id: 'peterpan3',
    name: 'Pan 3',
    path: '/bg-peter-pan-3.jpg'
  },
  'bg-peter-pan-4.jpg': {
    id: 'peterpan4',
    name: 'Pan 4',
    path: '/bg-peter-pan-4.jpg'
  }
};

// DOM elements
const cameraFeed = document.getElementById('cameraFeed');
const outputCanvas = document.getElementById('outputCanvas');
const canvasContext = outputCanvas.getContext('2d');
const backgroundSelector = document.getElementById('backgroundSelector');

// Global state
let videoStream;
let net;
let currentBackground = 'bg-alice-1.jpg';
const backgroundImages = {};

// Initialize canvases with default dimensions
const maskCanvas = document.createElement('canvas');
const personCanvas = document.createElement('canvas');
maskCanvas.width = CANVAS_WIDTH;
maskCanvas.height = CANVAS_HEIGHT;
personCanvas.width = CANVAS_WIDTH;
personCanvas.height = CANVAS_HEIGHT;
const maskContext = maskCanvas.getContext('2d');
const personContext = personCanvas.getContext('2d');

// Background handling
async function loadBackgroundImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function preloadBackgrounds() {
  try {
    for (const [key, config] of Object.entries(BACKGROUND_CONFIG)) {
      const image = await loadBackgroundImage(config.path);
      backgroundImages[key] = image;
      if (key === currentBackground) {
        backgroundImages['current'] = image;
      }
    }
    initializeBackgroundSelector();
  } catch (error) {
    console.error('Error preloading backgrounds:', error);
  }
}

function drawBackgroundWithAspectRatio(image, canvas, context) {
  if (!image || !image.width || !image.height) {
    console.error('Invalid image in drawBackgroundWithAspectRatio');
    return;
  }

  const imageAspect = image.width / image.height;
  const canvasAspect = canvas.width / canvas.height;
  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let offsetX = 0;
  let offsetY = 0;

  // Changed this condition to handle portrait orientation
  if (imageAspect < canvasAspect) {
    // Image is taller than canvas (portrait)
    drawWidth = canvas.height * imageAspect;
    offsetX = (canvas.width - drawWidth) / 2;
    offsetY = 0;
  } else {
    // Image is wider than canvas (landscape)
    drawHeight = canvas.width / imageAspect;
    drawWidth = canvas.width;
    offsetY = 0; // Changed to 0 to anchor to top
  }

  // Clear the context before drawing
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw image anchored to top
  context.drawImage(
    image,
    offsetX,
    offsetY,
    drawWidth,
    drawHeight
  );
}

// UI handling
function initializeBackgroundSelector() {
  backgroundSelector.innerHTML = '';
  Object.entries(BACKGROUND_CONFIG).forEach(([key, config]) => {
    const button = document.createElement('button');
    button.setAttribute('data-background', key);
    button.textContent = config.name;
    backgroundSelector.appendChild(button);
  });
}

// Original settings from desktop
// architecture: 'ResNet50',
// outputStride: 16, // Lower number = more accurate but slower
// multiplier: 1.0, // Higher number = more accurate but slower
// quantBytes: 4,
// modelUrl: undefined

// Camera and BodyPix setup
async function loadBodyPix() {
  try {
    net = await bodyPix.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    });
    console.log('BodyPix model loaded.');
  } catch (error) {
    console.error('Error loading BodyPix:', error);
  }
}

async function setupCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: CANVAS_WIDTH },
        height: { ideal: CANVAS_HEIGHT }
      },
      audio: false,
    });
    cameraFeed.srcObject = videoStream;

    // Wait for video metadata to load
    await new Promise((resolve) => {
      cameraFeed.onloadedmetadata = () => {
        outputCanvas.width = cameraFeed.videoWidth;
        outputCanvas.height = cameraFeed.videoHeight;
        maskCanvas.width = cameraFeed.videoWidth;
        maskCanvas.height = cameraFeed.videoHeight;
        personCanvas.width = cameraFeed.videoWidth;
        personCanvas.height = cameraFeed.videoHeight;
        resolve();
      };
    });

    // Wait for video to start playing
    await new Promise((resolve) => {
      cameraFeed.onplay = resolve;
      cameraFeed.play().catch(console.error);
    });

    renderFrame();
  } catch (error) {
    console.error('Error accessing camera:', error);
  }
}

// Main render loop
async function renderFrame() {
  if (!net || !cameraFeed.videoWidth || !cameraFeed.videoHeight || !backgroundImages['current']) {
    requestAnimationFrame(renderFrame);
    return;
  }

  try {
    const segmentation = await net.segmentPerson(cameraFeed, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.7,
      maxDetections: 1,
      scoreThreshold: 0.4
    });

    // Clear and draw background
    canvasContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    drawBackgroundWithAspectRatio(backgroundImages['current'], outputCanvas, canvasContext);

    // Create and apply mask
    if (maskCanvas.width && maskCanvas.height) {
      const maskImageData = maskContext.createImageData(maskCanvas.width, maskCanvas.height);
      for (let i = 0; i < segmentation.data.length; i++) {
        const pixelIndex = i * 4;
        const value = segmentation.data[i] ? 255 : 0;
        maskImageData.data.set([value, value, value, value], pixelIndex);
      }
      maskContext.putImageData(maskImageData, 0, 0);
      maskContext.filter = 'blur(4px)';
      maskContext.drawImage(maskCanvas, 0, 0);

      // Draw person with mask
      personContext.drawImage(cameraFeed, 0, 0);
      personContext.globalCompositeOperation = 'destination-in';
      personContext.drawImage(maskCanvas, 0, 0);
      personContext.globalCompositeOperation = 'source-over';

      // Composite final image
      canvasContext.drawImage(personCanvas, 0, 0);
    }
  } catch (error) {
    console.error('Error in renderFrame:', error);
  }

  requestAnimationFrame(renderFrame);
}

// Event listeners
backgroundSelector.addEventListener('click', (event) => {
  if (event.target.tagName === 'BUTTON') {
    const newBackground = event.target.dataset.background;
    if (backgroundImages[newBackground]) {
      currentBackground = newBackground;
      backgroundImages['current'] = backgroundImages[newBackground];
      
      const changeEvent = new CustomEvent('backgroundChanged', {
        detail: { background: newBackground, config: BACKGROUND_CONFIG[newBackground] }
      });
      document.dispatchEvent(changeEvent);
    }
  }
});

document.addEventListener('backgroundChanged', (event) => {
  const { config } = event.detail;
  const backgroundGraphicImage = document.getElementById('backgroundGraphicImage');
  if (backgroundGraphicImage) {
    backgroundGraphicImage.style.backgroundImage = `url(${config.path})`;
  }
});

// Initialize application
async function init() {
  try {
    await loadBodyPix();
    await preloadBackgrounds();
    await setupCamera();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

init();