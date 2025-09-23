/* newhome.js
 * Bootstraps Pavel Dobryakov's fluid simulation so the page gets a WebGL
 * distortion overlay without depending on missing modules.
 */
(function () {
  'use strict';

  if (window.__fluidDistortionBootstrapped) {
    return;
  }
  window.__fluidDistortionBootstrapped = true;

  var currentScript = document.currentScript;
  var baseForUrl = currentScript && currentScript.src ? currentScript.src : window.location.href;
  var smokeTrailsUrl;

  try {
    smokeTrailsUrl = new URL('smoke_trails.js', baseForUrl).toString();
  } catch (error) {
    smokeTrailsUrl = 'smoke_trails.js';
  }

  function startFluidDistortion() {
    if (window.__smokeTrailsInitialized || window.__smokeTrailsScriptLoading) {
      return;
    }

    if (window.config && window.step && window.pointers) {
      window.__smokeTrailsInitialized = true;
      return;
    }

    window.__smokeTrailsScriptLoading = true;

    var script = document.createElement('script');
    script.src = smokeTrailsUrl;
    script.async = false;
    script.onload = function () {
      window.__smokeTrailsInitialized = true;
      window.__smokeTrailsScriptLoading = false;
    };
    script.onerror = function (event) {
      window.__smokeTrailsScriptLoading = false;
      console.error('Failed to load smoke_trails.js for fluid distortion.', event);
    };
    document.head.appendChild(script);
  }

  function onReady() {
    startFluidDistortion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();
