/**
 * Website Cost Calculator
 * Interactive calculator for estimating website project costs
 */

(function () {
  // Base prices for each site type
  const siteTypeBasePrices = {
    traditional: 5000,
    microsite: 3000,
    onepager: 4000,
    platform: 25000
  };

  const tradBasePrices = [5000, 10000, 30000, 60000, 90000];
  const cmsPrices = {
    craft:     [4000, 6000, 12000, 30000, 45000],
    wordpress: [5000, 7500, 15000, 35000, 50000],
    drupal:    [5500, 8000, 16000, 38000, 55000],
    custom:    [15000, 20500, 35000, 65000, 100000]
  };
  const contentPrices = {
    self:    [0, 0, 0, 0, 0],
    help:    [500, 1500, 5000, 20000, 35000],
    full:    [1000, 5000, 10000, 35000, 60000],
    cleanup: [400, 1200, 4000, 12000, 20000]
  };
  const microBasePrices = [3000, 4500, 7000];

  let previousTotal = 0;
  let previousSupport = 0;

  function getVal(name, fallback) {
    if (fallback === undefined) fallback = null;
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : fallback;
  }

  function triggerFlash(element) {
    if (!element) return;
    element.classList.remove('wc-flash');
    void element.offsetWidth;
    element.classList.add('wc-flash');

    setTimeout(function () {
      element.classList.remove('wc-flash');
    }, 50);
  }

  function updateVisibility() {
    var type = getVal('siteType', null);
    var secTrad = document.getElementById('sec-traditional');
    var secMicro = document.getElementById('sec-microsite');
    var msgCustom = document.getElementById('msg-custom-scope');
    var microWarning = document.getElementById('micro-pages-warning');

    if (!secTrad || !secMicro || !msgCustom) return;

    secTrad.classList.add('hidden');
    secMicro.classList.add('hidden');
    msgCustom.classList.add('hidden');
    if (microWarning) microWarning.classList.remove('visible');

    if (type === 'traditional') {
      secTrad.classList.remove('hidden');
      var pgVal = getVal('tradPages', null);
      var subDep = document.getElementById('sub-trad-dependent');
      if (subDep) subDep.classList.toggle('hidden', pgVal === null);

      var subCms = document.getElementById('sub-trad-cms-type');
      if (subCms) subCms.classList.toggle('hidden', getVal('tradCMSNeeded') !== 'yes');

    } else if (type === 'microsite') {
      secMicro.classList.remove('hidden');
      var pgVal2 = getVal('microPages', null);
      var subDep2 = document.getElementById('sub-micro-dependent');

      if (pgVal2 === '3' && microWarning) {
        microWarning.classList.add('visible');
      }

      if (subDep2) subDep2.classList.toggle('hidden', pgVal2 === null);

    } else if (type === 'onepager' || type === 'platform') {
      msgCustom.classList.remove('hidden');
    }
  }

  function calculate() {
    updateVisibility();
    var fixedCosts = 0;
    var percentageModifiers = 0;
    var qualityMult = parseFloat(getVal('quality', '1'));
    var siteType = getVal('siteType', null);

    // Set base price immediately based on site type
    if (siteType && siteTypeBasePrices[siteType]) {
      fixedCosts = siteTypeBasePrices[siteType];
    }

    if (siteType === 'traditional') {
      var pageIdx = parseInt(getVal('tradPages', '-1'));
      if (pageIdx >= 0 && pageIdx < tradBasePrices.length) {
        fixedCosts = tradBasePrices[pageIdx];

        if (getVal('tradCMSNeeded') === 'yes') {
          var cmsType = getVal('tradCMSType', 'craft');
          if (cmsPrices[cmsType]) {
            fixedCosts += cmsPrices[cmsType][pageIdx];
          }
        }

        var contentType = getVal('tradContent', 'self');
        if (contentPrices[contentType]) {
          fixedCosts += contentPrices[contentType][pageIdx];
        }

        percentageModifiers += parseFloat(getVal('tradPerf', '0'));
      }
    } else if (siteType === 'microsite') {
      var microIdx = parseInt(getVal('microPages', '-1'));

      if (microIdx >= 0 && microIdx < 3) {
        fixedCosts = microBasePrices[microIdx];
        fixedCosts += parseFloat(getVal('microLifespan', '500'));
        fixedCosts += parseFloat(getVal('microLaunch', '0'));
      }
    }

    var adjustedFixed = fixedCosts * qualityMult;

    // Global percentage modifiers
    percentageModifiers += parseFloat(getVal('globalInteractive', '0'));
    percentageModifiers += parseFloat(getVal('globalDesign', '0.15'));
    percentageModifiers += parseFloat(getVal('globalData', '0'));
    percentageModifiers += parseFloat(getVal('globalHosting', '0.07'));
    percentageModifiers += parseFloat(getVal('globalAccess', '0'));

    var integrationChks = document.querySelectorAll('.integration-chk:checked');
    for (var i = 0; i < integrationChks.length; i++) {
      percentageModifiers += parseFloat(integrationChks[i].value || '0');
    }

    var totalCost = adjustedFixed + (adjustedFixed * percentageModifiers);
    var low = totalCost * 0.90;
    var high = totalCost * 1.10;
    var fmt = function (n) {
      return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    var targetTotal = document.getElementById('wc-display-total');
    var targetSupport = document.getElementById('wc-display-support');

    if (targetTotal) {
      if (totalCost > 0) {
        targetTotal.innerText = fmt(low) + ' \u2013 ' + fmt(high);
        targetTotal.classList.remove('wc-pending');

        if (totalCost > previousTotal && previousTotal > 0) {
          triggerFlash(targetTotal);
        }
      } else {
        targetTotal.innerText = 'Select options above';
        targetTotal.classList.add('wc-pending');
      }
      previousTotal = totalCost;
    }

    if (targetSupport) {
      var supportVal = parseFloat(getVal('globalSupport', '0'));
      if (supportVal > 0) {
        targetSupport.innerText = fmt(supportVal) + ' / mo';
        targetSupport.classList.remove('wc-none');

        if (supportVal > previousSupport && previousSupport >= 0) {
          triggerFlash(targetSupport);
        }
      } else {
        targetSupport.innerText = '$0 / mo';
        targetSupport.classList.add('wc-none');
      }
      previousSupport = supportVal;
    }
  }

  // Initialize when DOM is ready
  function init() {
    var wcRoot = document.getElementById('wc-root');
    if (wcRoot) {
      var inputs = wcRoot.querySelectorAll('input');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('change', calculate);
      }
      calculate();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
