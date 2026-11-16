// Decorative 3D tilt for the hero water drop. Follows the pointer; does nothing when reduced motion is requested.
(function () {
  const hero = document.querySelector('.eco-hero');
  const body = document.querySelector('.hero-orb__body');
  if (!hero || !body || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frame = 0;
  hero.addEventListener('pointermove', event => {
    const r = hero.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - 0.5;
    const y = (event.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      body.style.setProperty('--orb-ry', `${(x * 36).toFixed(1)}deg`);
      body.style.setProperty('--orb-rx', `${(-y * 28).toFixed(1)}deg`);
    });
  });
  hero.addEventListener('pointerleave', () => {
    body.style.removeProperty('--orb-ry');
    body.style.removeProperty('--orb-rx');
  });
})();
