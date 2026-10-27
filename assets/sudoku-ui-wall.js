/* Four unhurried UI bands. WAAPI moves only the tracks; native page scroll,
   existing image-open handlers, and the original hardware assets remain in charge. */
(() => {
  'use strict';

  function init(root) {
    const stage = root.querySelector('.ui-wall-stage');
    const columns = root.querySelector('.ui-wall-columns');
    const laneElements = [...root.querySelectorAll('.ui-wall-lane')];
    if (!stage || !columns || !laneElements.length || root.dataset.wallReady) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 720px)');
    const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)');
    const canAnimate = typeof Element.prototype.animate === 'function';
    const toggle = root.querySelector('[data-wall-toggle]');
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let frameHost = null;
    try { frameHost = window.frameElement?.closest('#section') || null; } catch (_) {}
    let inView = false, pageShown = true, hovered = false, userPaused = false;
    let frame = 0, rebuildPending = false, clones = [];

    const lanes = laneElements.map((element, index) => {
      const track = element.querySelector('.ui-wall-track');
      const group = track?.querySelector('.ui-wall-group:not([data-wall-clone])');
      if (!track || !group) return null;
      return {
        element, track, group, index,
        cards: [...group.children], animation: null, distance: 0, duration: 0,
        down: element.dataset.wallDirection === 'down' ||
          (!element.dataset.wallDirection && index % 2 === 1),
      };
    }).filter(Boolean);
    if (!lanes.length) return;

    const openers = lanes.flatMap(lane => lane.cards.flatMap(card =>
      [...card.querySelectorAll('.image-open')].map(button => {
        const image = button.querySelector('.sudoku-device-screen, img');
        if (!image) return null;
        button.setAttribute('data-i18n-ignore', '');
        image.draggable = false;
        return {
          button, image,
          src: image.getAttribute('src') || button.dataset.image || '',
          label: button.dataset.caption || image.alt || '',
        };
      }).filter(Boolean)));
    if (!openers.length) return;

    const english = () => window.PortfolioI18n?.language === 'en' || /^en\b/i.test(document.documentElement.lang);
    function metadata(record, cloneButton = null) {
      const { button, image } = record;
      const en = english();
      const source = button.getAttribute(en ? 'data-wall-src-en' : 'data-wall-src-zh') || record.src;
      const label = button.getAttribute(en ? 'data-wall-label-en' : 'data-wall-label-zh') || record.label;
      const target = cloneButton || button;
      const targetImage = cloneButton?.querySelector('.sudoku-device-screen, img') || image;
      if (targetImage.getAttribute('src') !== source || targetImage.style.opacity === '0') {
        targetImage.style.opacity = '0';
        if (targetImage.getAttribute('src') !== source) targetImage.src = source;
        const expected = targetImage.src;
        targetImage.decode().then(() => {
          if (targetImage.src === expected) targetImage.style.opacity = '';
        }).catch(() => {});
      }
      targetImage.alt = cloneButton ? '' : label;
      targetImage.draggable = false;
      target.dataset.image = source;
      target.dataset.caption = label;
      target.setAttribute('aria-label', en ? `Enlarge ${label}` : `放大查看${label}`);
      const caption = target.closest('.ui-wall-card')?.querySelector('[data-wall-caption]');
      if (caption) { caption.textContent = label; caption.setAttribute('data-i18n-ignore', ''); }
    }
    function language() {
      openers.forEach(record => metadata(record));
      clones.forEach(({ record, button }) => metadata(record, button));
      controls();
    }
    function controls() {
      if (!toggle) return;
      const isStatic = reduced.matches || !canAnimate;
      const en = english();
      toggle.disabled = isStatic;
      toggle.setAttribute('aria-pressed', String(userPaused || isStatic));
      toggle.setAttribute('data-i18n-ignore', '');
      const label = isStatic ? (en ? 'Motion disabled' : '动态已关闭') :
        userPaused ? (en ? 'Play' : '播放') : (en ? 'Pause' : '暂停');
      const labelNode = toggle.querySelector('[data-wall-toggle-label]');
      if (labelNode) labelNode.textContent = label;
      else toggle.textContent = label;
      toggle.setAttribute('aria-label', isStatic ? label :
        (en ? `${label} interface gallery` : `${label}界面展示`));
    }
    function blocked() {
      const focusedCard = document.activeElement?.closest?.('.ui-wall-open');
      return !pageShown || document.hidden || !inView || hovered || userPaused ||
        Boolean(focusedCard && root.contains(focusedCard)) ||
        Boolean(document.querySelector('#media-viewer[open], #portfolio-video-detail[open]')) ||
        Boolean(frameHost && !frameHost.classList.contains('on'));
    }
    function sync() {
      const isStatic = reduced.matches || !canAnimate;
      const paused = blocked();
      root.dataset.wallState = isStatic ? 'static' : paused ? 'paused' : 'running';
      root.dataset.wallInView = String(inView);
      lanes.forEach(lane => {
        if (!lane.animation) return;
        if (paused || isStatic) lane.animation.pause();
        else lane.animation.play();
      });
      controls();
    }
    function fraction(lane) {
      if (!lane.animation || !lane.duration) return null;
      return ((Number(lane.animation.currentTime || 0) % lane.duration) + lane.duration) % lane.duration / lane.duration;
    }
    function removeClones() {
      clones = [];
      lanes.forEach(lane => {
        lane.animation?.cancel(); lane.animation = null;
        lane.track.querySelectorAll('[data-wall-clone]').forEach(group => group.remove());
      });
    }
    function duplicate(lane) {
      const copy = lane.group.cloneNode(true);
      copy.setAttribute('data-wall-clone', '');
      copy.setAttribute('data-i18n-ignore', '');
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('inert', '');
      copy.inert = true;
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      copy.querySelectorAll('button, a, input, select, textarea, [tabindex], [contenteditable]').forEach(element => {
        element.setAttribute('tabindex', '-1'); element.removeAttribute('autofocus');
        if (element.hasAttribute('contenteditable')) element.setAttribute('contenteditable', 'false');
      });
      const sourceButtons = [...lane.group.querySelectorAll('.image-open')];
      [...copy.querySelectorAll('.image-open')].forEach((button, index) => {
        const record = openers.find(item => item.button === sourceButtons[index]);
        if (!record) return;
        // The inert copy has no listener or tab stop. stage capture hit-testing
        // forwards a pointer activation to this original, already-bound opener.
        button.classList.remove('image-open');
        button.dataset.wallCloneButton = '';
        metadata(record, button);
        clones.push({ button, record, lane });
      });
      lane.track.append(copy);
    }
    function measureVisibility() {
      const rect = stage.getBoundingClientRect();
      inView = rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
    }
    function rebuild() {
      rebuildPending = false;
      const previous = lanes.map(fraction);
      removeClones();
      // Moving existing cards preserves their original image-open listeners and
      // keeps every source available when four desktop bands become two.
      const count = compact.matches ? Math.min(2, lanes.length) : lanes.length;
      lanes.forEach((lane, index) => {
        lane.element.classList.toggle('is-wall-unused', index >= count);
        lane.cards.forEach(card => lanes[index % count].group.append(card));
      });
      const animated = canAnimate && !reduced.matches;
      root.classList.toggle('is-wall-animated', animated);
      root.dataset.wallColumns = String(count);
      if (animated) lanes.slice(0, count).forEach(lane => {
        const gap = parseFloat(getComputedStyle(lane.track).rowGap) || 0;
        // Computed height is unrotated and preserves fractional CSS pixels;
        // the columns' slight tilt must not distort the seamless loop distance.
        lane.distance = (parseFloat(getComputedStyle(lane.group).height) || lane.group.offsetHeight) + gap;
        if (!lane.distance) return;
        duplicate(lane);
        const requested = Number(lane.element.dataset.wallSpeed || root.dataset.wallSpeed || 18);
        const speed = Number.isFinite(requested) && requested > 0 ? requested : 18;
        lane.duration = lane.distance / speed * 1000;
        lane.animation = lane.track.animate([
          { transform: 'translate3d(0,0,0)' },
          { transform: `translate3d(0,${-lane.distance}px,0)` },
        ], { duration: lane.duration, iterations: Infinity, easing: 'linear', direction: lane.down ? 'reverse' : 'normal' });
        lane.animation.pause();
        const requestedPhase = Number(lane.element.dataset.wallPhase);
        const initial = lane.element.hasAttribute('data-wall-phase') && Number.isFinite(requestedPhase)
          ? clamp(requestedPhase, 0, .9999) : [.04, .42, .21, .63][lane.index % 4];
        lane.animation.currentTime = (previous[lane.index] ?? initial) * lane.duration;
      });
      measureVisibility();
      sync();
      if (root.contains(document.activeElement)) revealFocused(document.activeElement);
    }
    function schedule(rebuildNeeded = false) {
      rebuildPending ||= rebuildNeeded;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (rebuildPending) rebuild();
        else { measureVisibility(); sync(); }
      });
    }
    function revealFocused(element) {
      const card = element.closest?.('.ui-wall-card');
      const lane = lanes.find(item => item.group.contains(element));
      if (!card || !lane?.animation || !lane.distance) return;
      lane.animation.pause();
      const viewport = stage.getBoundingClientRect();
      const rect = card.getBoundingClientRect();
      if (rect.top >= viewport.top + 12 && rect.bottom <= viewport.bottom - 12) return;
      const progress = fraction(lane) || 0;
      const currentY = -lane.distance * (lane.down ? 1 - progress : progress);
      const delta = viewport.top + viewport.height / 2 - (rect.top + rect.height / 2);
      const nextY = clamp(currentY + delta, -lane.distance + .1, 0);
      const next = lane.down ? 1 + nextY / lane.distance : -nextY / lane.distance;
      lane.animation.currentTime = clamp(next, .000001, .999999) * lane.duration;
    }
    function focusIn(event) { sync(); revealFocused(event.target); }
    function focusOut() { schedule(); }
    function proxyClick(event) {
      if (event.button !== 0 || event.detail === 0 || !root.classList.contains('is-wall-animated')) return;
      if (event.target.closest?.('.image-open')) return;
      // Inert descendants are omitted from pointer targeting. Their visual
      // rectangles still exist; testing them here makes every visible copy
      // open the same native lightbox as its original.
      const viewport = stage.getBoundingClientRect();
      if (event.clientX < viewport.left || event.clientX > viewport.right ||
          event.clientY < viewport.top || event.clientY > viewport.bottom) return;
      const hit = clones.find(({ button }) => {
        const rect = button.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom;
      });
      if (!hit) return;
      event.preventDefault(); event.stopPropagation();
      revealFocused(hit.record.button);
      hit.record.button.click();
      sync();
    }
    function enter() { hovered = hoverCapable.matches; sync(); }
    function leave() { hovered = false; sync(); }
    function hide() { pageShown = false; sync(); }
    function show() { pageShown = true; schedule(true); }

    stage.addEventListener('click', proxyClick, true);
    stage.addEventListener('pointerenter', enter);
    stage.addEventListener('pointerleave', leave);
    root.addEventListener('focusin', focusIn);
    root.addEventListener('focusout', focusOut);
    toggle?.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    document.addEventListener('visibilitychange', () => schedule());
    document.addEventListener('portfolio:video-detail', () => schedule());
    addEventListener('portfolio:language', language);
    addEventListener('pagehide', hide);
    addEventListener('pageshow', show);
    addEventListener('resize', () => schedule(true), { passive: true });
    reduced.addEventListener('change', () => schedule(true));
    compact.addEventListener('change', () => schedule(true));
    hoverCapable.addEventListener('change', () => { hovered = false; sync(); });
    const visibility = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting); sync();
    }, { threshold: 0 }) : null;
    visibility?.observe(stage);
    if (!visibility) addEventListener('scroll', () => schedule(), { passive: true });
    const resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule(true)) : null;
    resizer?.observe(stage);
    lanes.forEach(lane => resizer?.observe(lane.group));
    const modalObserver = typeof MutationObserver === 'function' ? new MutationObserver(() => schedule()) : null;
    document.querySelectorAll('#media-viewer, #portfolio-video-detail').forEach(dialog => {
      modalObserver?.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    });
    if (frameHost) modalObserver?.observe(frameHost, { attributes: true, attributeFilter: ['class'] });
    document.fonts?.ready.then(() => schedule(true));
    root.dataset.wallReady = 'true';
    language();
    rebuild();
  }

  function boot() { document.querySelectorAll('.sudoku-ui-wall').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
