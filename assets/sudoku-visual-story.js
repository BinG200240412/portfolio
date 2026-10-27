/* One stationary device, paired with the visual-system argument being read.
 * Native scrolling and CSS own the layout; this module only changes screen
 * pixels, highlights, and the single analytical leader. */
(() => {
  'use strict';

  function init() {
    const root = document.getElementById('visual-system');
    const column = root?.querySelector('.visual-system-column');
    const stage = root?.querySelector('.visual-device-stage');
    const svg = stage?.querySelector('.visual-device-overlay');
    const screens = [...(stage?.querySelectorAll('[data-visual-screen]') || [])];
    const elements = [...(column?.querySelectorAll('[data-visual-step]') || [])];
    if (!root || !column || !stage || !svg || screens.length !== 2 || !elements.length) return;

    const NS = 'http://www.w3.org/2000/svg';
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = matchMedia('(max-width: 720px)');
    const viewer = document.getElementById('media-viewer');
    const opener = stage.querySelector('.visual-device-open') || stage.closest('.visual-device-open');
    const caption = root.querySelector('.visual-device-caption');
    const feedback = root.querySelector('.visual-device-feedback');
    const targets = svg.querySelector('.visual-targets') || svg.appendChild(document.createElementNS(NS, 'g'));
    const leader = svg.querySelector('.visual-leader') || svg.appendChild(document.createElementNS(NS, 'g'));
    targets.classList.add('visual-targets');
    leader.classList.add('visual-leader');
    let frameHost = null;
    try { frameHost = window.frameElement?.closest('#section') || null; } catch (_) {}

    const absolute = source => new URL(source, document.baseURI).href;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const parse = (source, fallback) => {
      try { const value = JSON.parse(source); return Array.isArray(value) ? value : fallback; }
      catch (_) { return fallback; }
    };
    const steps = elements.map((element, index) => ({
      element,
      id: element.getAttribute('data-visual-step') || `visual-${index + 1}`,
      image: absolute(element.getAttribute('data-visual-image') || screens[0].getAttribute('src')),
      label: element.getAttribute('data-visual-label') || element.querySelector('h3,figcaption')?.textContent.trim() || '',
      bounds: parse(element.getAttribute('data-visual-targets'), []).filter(box =>
        Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0),
      anchor: parse(element.getAttribute('data-visual-anchor'), [0, 30]),
      anchorTarget: element.getAttribute('data-visual-anchor-target') || '',
    }));
    const t = source => window.PortfolioI18n?.t(source) ?? source;
    const english = () => window.PortfolioI18n?.language === 'en' || /^en\b/i.test(document.documentElement.lang);
    const seen = new Set();
    const images = new Map();
    const reveal = { targets: 1, line: 1 };
    let shownScreen = 0, shownStep = -1, wantedStep = -1, request = 0, frame = 0;
    let path = null, point = null, boxes = [], pathLength = 0, leaderVisible = false, marksVisible = false;
    let growth = null, swap = null, settleSwap = null, deferred = null;
    let growthChildren = [];
    let pageShown = true, suspended = false, disposed = false, trigger = null;

    screens.forEach((screen, index) => {
      screen.style.opacity = index ? '0' : '1';
      screen.setAttribute('aria-hidden', index ? 'true' : 'false');
      screen.dataset.visualActive = index ? 'false' : 'true';
    });
    root.dataset.visualState = 'ready';
    root.dataset.visualInView = 'false';
    root.classList.add('visual-story-ready');

    function blocked() {
      return !pageShown || document.hidden || viewer?.open ||
        Boolean(document.querySelector('#portfolio-video-detail[open]')) ||
        Boolean(frameHost && !frameHost.classList.contains('on'));
    }
    function inView() {
      const rect = root.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.width > 0;
    }
    function state(value) {
      root.dataset.visualState = value;
      stage.dataset.visualState = value;
    }
    function message(failed = false) {
      if (!feedback) return;
      feedback.hidden = !failed;
      feedback.textContent = failed
        ? (english() ? 'The interface could not load. The previous screen is still shown.' : '界面暂未加载，已保留上一画面。')
        : '';
    }
    function metadata(step) {
      const label = t(step.label);
      screens.forEach(screen => { screen.alt = label; });
      if (opener) {
        opener.dataset.image = step.image;
        opener.dataset.caption = label;
        opener.setAttribute('aria-label', english() ? `Enlarge ${label}` : `放大查看${label}`);
      }
      if (caption) caption.textContent = label;
      root.dataset.visualStep = step.id;
      stage.dataset.visualStep = step.id;
      stage.dataset.visualImage = step.image;
    }

    function preload(source) {
      if (images.has(source)) return images.get(source);
      const promise = new Promise((resolve, reject) => {
        const image = new Image();
        let timer, finished = false;
        const done = success => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          image.onload = image.onerror = null;
          if (success && image.naturalWidth) resolve(source);
          else reject(new Error('visual-screen-unavailable'));
        };
        image.onload = async () => {
          if (typeof image.decode === 'function') {
            try { await image.decode(); } catch (_) { /* loaded image is still usable */ }
          }
          done(true);
        };
        image.onerror = () => done(false);
        timer = setTimeout(() => done(false), 8000);
        image.src = source;
      });
      images.set(source, promise);
      promise.catch(() => { if (images.get(source) === promise) images.delete(source); });
      return promise;
    }
    function warm(index) {
      [index - 1, index + 1, index + 2].forEach(next => {
        if (steps[next]) preload(steps[next].image).catch(() => {});
      });
    }

    function stopSwap() {
      if (settleSwap) { settleSwap(false); settleSwap = null; }
      swap?.kill(); swap = null;
      screens.forEach((screen, index) => { screen.style.opacity = index === shownScreen ? '1' : '0'; });
    }
    function stopGrowth() {
      growth?.kill(); growth = null;
      if (gsap && growthChildren.length) gsap.set(growthChildren, { clearProps: 'opacity,transform' });
      growthChildren = [];
    }
    function paint() {
      targets.style.opacity = marksVisible ? String(reveal.targets * .9) : '0';
      leader.style.opacity = marksVisible && leaderVisible ? String(reveal.targets * .78) : '0';
      if (path) {
        path.style.strokeDasharray = `${pathLength} ${pathLength}`;
        path.style.strokeDashoffset = String(-pathLength * (1 - reveal.line));
      }
      if (point) point.style.opacity = String(reveal.targets);
    }
    function make(name, attrs) {
      const element = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
      return element;
    }
    function buildMarks(step) {
      targets.replaceChildren(); leader.replaceChildren();
      boxes = step.bounds.map(() => {
        const rect = make('rect', {
          class: 'visual-target', fill: 'none', stroke: 'currentColor',
          'stroke-width': 1.4, 'stroke-dasharray': '.1 3.7', 'stroke-linecap': 'round',
          'vector-effect': 'non-scaling-stroke',
        });
        targets.append(rect); return rect;
      });
      path = make('path', { class: 'visual-connection', fill: 'none', stroke: 'currentColor',
        'stroke-width': 1, 'stroke-linejoin': 'miter', 'vector-effect': 'non-scaling-stroke' });
      point = make('circle', { class: 'visual-connection-point', r: 2, fill: 'currentColor' });
      leader.append(path, point);
      root.dataset.visualTargetCount = String(boxes.length);
    }
    function geometry() {
      if (shownStep < 0) return;
      const step = steps[shownStep], stageRect = stage.getBoundingClientRect();
      const photo = screens[shownScreen].getBoundingClientRect(), note = step.element.getBoundingClientRect();
      if (!stageRect.width || !stageRect.height || !photo.width || !photo.height) return;
      svg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
      const regions = step.bounds.map(([x, y, width, height], index) => {
        const region = {
          x: photo.left - stageRect.left + photo.width * clamp(x, 0, 100) / 100,
          y: photo.top - stageRect.top + photo.height * clamp(y, 0, 100) / 100,
          width: photo.width * Math.min(width, 100 - clamp(x, 0, 100)) / 100,
          height: photo.height * Math.min(height, 100 - clamp(y, 0, 100)) / 100,
        };
        Object.entries(region).forEach(([key, value]) => boxes[index]?.setAttribute(key, value));
        return region;
      });
      leaderVisible = !narrow.matches && regions.length > 0;
      if (regions.length) {
        const anchor = step.anchor.length === 2 && step.anchor.every(Number.isFinite) ? step.anchor : [0, 30];
        let anchorRect = null;
        if (step.anchorTarget) {
          try { anchorRect = step.element.querySelector(step.anchorTarget)?.getBoundingClientRect() || null; }
          catch (_) { /* Invalid optional selector falls back to percentage anchoring. */ }
          if (anchorRect && (!anchorRect.width || !anchorRect.height)) anchorRect = null;
        }
        const noteY = anchorRect ? anchorRect.top + anchorRect.height / 2
          : note.top + note.height * clamp(anchor[1], 0, 100) / 100;
        const start = {
          x: anchorRect ? anchorRect.left - stageRect.left - 12
            : note.left - stageRect.left + note.width * clamp(anchor[0], 0, 100) / 100 - 12,
          y: noteY - stageRect.top,
        };
        // The end is inside the highlighted UI, not on the hardware bezel.
        const region = regions[0], end = {
          x: region.x + region.width - Math.min(3, region.width / 2),
          y: region.y + region.height / 2,
        };
        const direction = start.x >= end.x ? 1 : -1;
        const distance = Math.abs(start.x - end.x);
        const shortDiagonal = Math.min(22, distance * .12);
        const targetRun = Math.min(140, Math.max(22, distance * .35), Math.max(0, distance - shortDiagonal));
        const firstX = start.x - direction * Math.max(0, distance - shortDiagonal - targetRun);
        const bendX = firstX - direction * shortDiagonal;
        const bendY = start.y + Math.sign(end.y - start.y) * Math.min(20, Math.abs(end.y - start.y));
        path.setAttribute('d', `M ${start.x} ${start.y} H ${firstX} L ${bendX} ${bendY} V ${end.y} H ${end.x}`);
        point.setAttribute('cx', end.x); point.setAttribute('cy', end.y);
        pathLength = path.getTotalLength();
        leaderVisible = leaderVisible && noteY > 64 && noteY < innerHeight - 20;
      }
      paint();
    }

    function grow(step, animate) {
      stopGrowth();
      buildMarks(step);
      marksVisible = true;
      reveal.targets = animate ? 0 : 1;
      reveal.line = animate ? 0 : 1;
      geometry();
      if (!animate || !gsap) { state('complete'); return; }
      state('growing');
      const children = [...step.element.children].filter(element => !element.matches('script,style'));
      growthChildren = children;
      growth = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: () => {
        growth = null; growthChildren = []; geometry(); state('complete');
      } });
      growth.to(reveal, { targets: 1, duration: .2, onUpdate: paint }, 0)
        .to(reveal, { line: 1, duration: .58, onUpdate: paint }, .06);
      if (children.length) growth.fromTo(children, { opacity: .6, x: 7 }, {
        opacity: 1, x: 0, duration: .36, stagger: .045, clearProps: 'opacity,transform',
      }, .14);
      if (suspended) growth.pause();
    }
    function crossfade(incomingIndex, outgoingIndex) {
      if (reduced.matches || !gsap) {
        screens[incomingIndex].style.opacity = '1';
        screens[outgoingIndex].style.opacity = '0';
        return Promise.resolve(true);
      }
      return new Promise(resolve => {
        let finished = false;
        const done = success => {
          if (finished) return;
          finished = true;
          if (settleSwap === done) settleSwap = null;
          resolve(success);
        };
        settleSwap = done;
        swap = gsap.timeline({ onComplete: () => { swap = null; done(true); } });
        swap.fromTo(screens[incomingIndex], { opacity: 0 }, { opacity: 1, duration: .22, ease: 'power1.out' }, 0)
          .to(screens[outgoingIndex], { opacity: 0, duration: .22, ease: 'power1.out' }, 0);
        if (suspended) swap.pause();
      });
    }
    async function activate(index) {
      if (!steps[index] || disposed) return;
      wantedStep = index;
      const step = steps[index], serial = ++request;
      root.dataset.visualPendingStep = step.id;
      stopSwap(); stopGrowth();
      marksVisible = false;
      targets.style.opacity = '0'; leader.style.opacity = '0';
      message(false); state('loading');
      warm(index);
      try {
        await preload(step.image);
        if (serial !== request || disposed) return;
        if (blocked()) { deferred = index; return; }
        const currentSource = absolute(screens[shownScreen].getAttribute('src'));
        if (currentSource !== step.image) {
          const incomingIndex = 1 - shownScreen;
          const incoming = screens[incomingIndex];
          incoming.src = step.image;
          if (typeof incoming.decode === 'function') await incoming.decode();
          if (serial !== request || disposed) return;
          state('switching');
          const finished = await crossfade(incomingIndex, shownScreen);
          if (!finished || serial !== request || disposed) return;
          shownScreen = incomingIndex;
        }
        shownStep = index;
        screens.forEach((screen, screenIndex) => {
          const active = screenIndex === shownScreen;
          screen.style.opacity = active ? '1' : '0';
          screen.setAttribute('aria-hidden', active ? 'false' : 'true');
          screen.dataset.visualActive = active ? 'true' : 'false';
        });
        steps.forEach((item, itemIndex) => {
          item.element.classList.toggle('is-visual-current', itemIndex === index);
          item.element.classList.toggle('is-visual-active', itemIndex === index);
          item.element.classList.toggle('is-visual-unavailable', false);
          if (itemIndex === index) item.element.setAttribute('aria-current', 'step');
          else item.element.removeAttribute('aria-current');
        });
        metadata(step);
        delete root.dataset.visualPendingStep;
        const animate = !seen.has(index) && !reduced.matches;
        seen.add(index);
        grow(step, animate);
        schedule();
      } catch (_) {
        if (serial !== request || disposed) return;
        screens.forEach((screen, screenIndex) => { screen.style.opacity = screenIndex === shownScreen ? '1' : '0'; });
        step.element.classList.add('is-visual-unavailable');
        delete root.dataset.visualPendingStep;
        message(true); state('failed');
      }
    }

    function readingLine() {
      if (!narrow.matches) return innerHeight * .45;
      const phone = stage.getBoundingClientRect();
      return Math.min(innerHeight * .85, Math.max(innerHeight * .55, phone.bottom + 100));
    }
    function candidate() {
      const line = readingLine();
      const anchors = steps.map(step => {
        const rect = step.element.getBoundingClientRect();
        return rect.top + Math.min(40, rect.height * .12);
      });
      let next = 0;
      anchors.forEach((top, index) => { if (top <= line) next = index; });
      if (wantedStep >= 0 && next > wantedStep && anchors[next] > line - 12) return wantedStep;
      if (wantedStep >= 0 && next < wantedStep && anchors[wantedStep] < line + 12) return wantedStep;
      return next;
    }
    function render() {
      frame = 0;
      if (disposed) return;
      const disabled = blocked();
      const visible = inView();
      root.dataset.visualInView = String(visible && !disabled);
      svg.style.visibility = visible && !disabled ? 'visible' : 'hidden';
      if (disabled !== suspended) {
        suspended = disabled;
        if (disabled) { growth?.pause(); swap?.pause(); }
        else { growth?.play(); swap?.play(); }
      }
      if (!visible || disabled) return;
      const next = candidate();
      if (deferred !== null) {
        deferred = null;
        activate(next);
      } else if (next !== wantedStep) activate(next);
      geometry();
    }
    function schedule() {
      if (!frame && !disposed) frame = requestAnimationFrame(render);
    }
    function refresh() {
      trigger?.refresh();
      schedule();
    }
    function language() {
      if (shownStep >= 0) metadata(steps[shownStep]);
      if (root.dataset.visualState === 'failed') message(true);
      refresh();
    }
    function motion() {
      if (reduced.matches) {
        swap?.progress(1);
        growth?.progress(1);
      }
      refresh();
    }
    function hide() { pageShown = false; schedule(); }
    function show() { pageShown = true; refresh(); }

    if (gsap && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      trigger = ScrollTrigger.create({
        trigger: root, start: 'top bottom', end: 'bottom top',
        onUpdate: schedule, onEnter: schedule, onEnterBack: schedule,
        onLeave: schedule, onLeaveBack: schedule, onRefresh: schedule,
      });
    } else addEventListener('scroll', schedule, { passive: true });
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    resize?.observe(root); resize?.observe(stage); resize?.observe(column);
    const modalObserver = typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null;
    if (viewer) modalObserver?.observe(viewer, { attributes: true, attributeFilter: ['open'] });
    const videoViewer = document.getElementById('portfolio-video-detail');
    if (videoViewer) modalObserver?.observe(videoViewer, { attributes: true, attributeFilter: ['open'] });
    if (frameHost) modalObserver?.observe(frameHost, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', refresh, { passive: true });
    addEventListener('portfolio:language', language);
    addEventListener('pagehide', hide); addEventListener('pageshow', show);
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', motion);
    narrow.addEventListener('change', refresh);
    document.fonts?.ready.then(refresh);
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
