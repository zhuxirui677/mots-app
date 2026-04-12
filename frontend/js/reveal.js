/**
 * reveal.js — IntersectionObserver scroll reveal
 * Elements with class "reveal" fade up when they enter the viewport.
 * On landing page they have inline animation-delay so they fire on load.
 * On other pages (survey, letter) they fire on scroll.
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((el) => {
    // Pause until in view (landing hero items already have delays via CSS)
    el.style.animationPlayState = 'paused';
    io.observe(el);
  });
})();
