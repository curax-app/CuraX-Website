import {createRotatingHero} from './rotating-hero.js';

const root = document.querySelector('[data-curax-hero]');
if (root) {
  const hero = createRotatingHero(root, window.CURAX_CONFIG?.partnerHero || {});
  window.addEventListener('pagehide', event => { if (!event.persisted) hero.dispose(); });
  window.addEventListener('pageshow', event => { if (event.persisted) hero.refresh(); });
}
