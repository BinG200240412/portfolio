/* Align to the visible font ink, rather than the centre of its line box. */
(() => {
  'use strict';
  const text = document.getElementById('text');
  const dot = document.getElementById('dot');
  if (!text || !dot) return;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.setAttribute('data-i18n-ignore', '');
  probe.inert = true;
  probe.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;white-space:pre;width:max-content;';
  const sample = document.createTextNode('');
  const baseline = document.createElement('span');
  baseline.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;';
  probe.append(sample, baseline);
  document.body.append(probe);
  let frame = 0;
  function align() {
    frame = 0;
    const style = getComputedStyle(text);
    const value = text.textContent.trim() || 'Who am I ?';
    for (const property of ['font-family', 'font-weight', 'font-size', 'font-style', 'line-height', 'letter-spacing']) {
      probe.style.setProperty(property, style.getPropertyValue(property), 'important');
    }
    sample.textContent = value;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink = context.measureText(value);
    if (!Number.isFinite(ink.actualBoundingBoxAscent) || !Number.isFinite(ink.actualBoundingBoxDescent)) return;
    const box = probe.getBoundingClientRect();
    const baselineY = baseline.getBoundingClientRect().top - box.top;
    const offset = baselineY + (ink.actualBoundingBoxDescent - ink.actualBoundingBoxAscent) / 2 - box.height / 2;
    dot.style.setProperty('--title-dot-offset', `${offset.toFixed(2)}px`);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(align); }
  new MutationObserver(schedule).observe(text, { childList: true, subtree: true, characterData: true });
  new ResizeObserver(schedule).observe(text);
  addEventListener('resize', schedule, { passive: true });
  addEventListener('portfolio:language', schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  addEventListener('pageshow', schedule);
  schedule();
})();
