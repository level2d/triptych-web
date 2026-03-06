// Liquid Glass Effect for .nav-content-container
(function () {
  const nav = document.querySelector('.nav-content-container');
  if (!nav) return;

  // Store original styles to layer on top of
  const originalBg = getComputedStyle(nav).backgroundColor;

  // Apply liquid glass base styles
  Object.assign(nav.style, {
    backdropFilter: 'blur(10px) saturate(1.8) brightness(1.05)',
    WebkitBackdropFilter: 'blur(10px) saturate(1.8) brightness(1.05)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%)',
    boxShadow: `
      0 1px 0 0 rgba(255,255,255,0.12) inset,
      0 -1px 0 0 rgba(255,255,255,0.04) inset,
      0 8px 32px -8px rgba(0,0,0,0.5),
      0 2px 8px -2px rgba(0,0,0,0.3)
    `,
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'box-shadow 0.4s ease, backdrop-filter 0.4s ease',
  });

  // Force border-radius with !important to override Webflow styles
  nav.style.setProperty('border-radius', '0px 0px 16px 16px', 'important');

  // Create the refraction/caustic highlight layer
  const sheen = document.createElement('div');
  Object.assign(sheen.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    pointerEvents: 'none',
    zIndex: '0',
    background: 'radial-gradient(ellipse 120% 80% at 30% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)',
    transition: 'background 0.3s ease',
  });
  nav.insertBefore(sheen, nav.firstChild);

  // Make sure nav children sit above the sheen
  Array.from(nav.children).forEach((child) => {
    if (child !== sheen) {
      child.style.position = child.style.position || 'relative';
      child.style.zIndex = child.style.zIndex || '1';
    }
  });

  // Mouse-tracking caustic light effect
  nav.addEventListener('mousemove', (e) => {
    const rect = nav.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    sheen.style.background = `
      radial-gradient(ellipse 200px 150px at ${x}% ${y}%, rgba(255,255,255,0.15) 0%, transparent 70%),
      radial-gradient(ellipse 120% 80% at 30% 0%, rgba(255,255,255,0.08) 0%, transparent 60%)
    `;
  });

  nav.addEventListener('mouseleave', () => {
    sheen.style.background = 'radial-gradient(ellipse 120% 80% at 30% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)';
  });

  // Subtle scroll-reactive depth shift
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const shadowOpacity = Math.min(0.5 + scrollY * 0.002, 0.8);

        nav.style.boxShadow = `
          0 1px 0 0 rgba(255,255,255,0.12) inset,
          0 -1px 0 0 rgba(255,255,255,0.04) inset,
          0 8px 32px -8px rgba(0,0,0,${shadowOpacity}),
          0 2px 8px -2px rgba(0,0,0,${shadowOpacity * 0.6})
        `;

        // Re-enforce border-radius in case Webflow resets it
        nav.style.setProperty('border-radius', '0px 0px 16px 16px', 'important');

        ticking = false;
      });
      ticking = true;
    }
  });
})();
