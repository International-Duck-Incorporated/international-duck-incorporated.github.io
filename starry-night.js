/*
 * Starry Night background adaptation for the espress0 profile.
 * Based on StarryNightVibrant by ElPioterro:
 * https://github.com/ElPioterro/StarryNightVibrant
 *
 * StarryNightVibrant is MIT licensed, Copyright (c) 2025 ElPioterro.
 * Its shooting-star effect credits Delroy Prithvi's MIT-licensed animation:
 * https://codepen.io/delroyprithvi/pen/LYyJROR
 */
(function () {
  'use strict';

  function init() {
    if (!document.body.classList.contains('starry-night-page')) return;

    const layer = document.createElement('div');
    layer.className = 'starrynight-bg-container';
    layer.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const area = innerWidth * innerHeight;
    const starCount = Math.max(90, Math.min(360, Math.round(area / 5200)));
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < starCount; index++) {
      const star = document.createElement('i');
      const size = Math.random() < .72 ? 1 : 2;
      star.className = `starrynight-star starrynight-twinkle-${index % 4 + 1}`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.opacity = `${.35 + Math.random() * .65}`;
      star.style.animationDelay = `${-Math.random() * 8}s`;
      star.style.animationDuration = `${4 + Math.random() * 5}s`;
      fragment.appendChild(star);
    }

    if (!reduceMotion) {
      for (let index = 0; index < 4; index++) {
        const shootingStar = document.createElement('span');
        shootingStar.className = 'starrynight-shooting-star';
        shootingStar.style.top = `${-5 + Math.random() * 42}%`;
        shootingStar.style.right = `${Math.random() * 75}%`;
        shootingStar.style.animationDelay = `${index * 3 + Math.random() * 4}s`;
        shootingStar.style.animationDuration = `${4 + Math.random() * 3}s`;
        fragment.appendChild(shootingStar);
      }
    }

    layer.appendChild(fragment);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
